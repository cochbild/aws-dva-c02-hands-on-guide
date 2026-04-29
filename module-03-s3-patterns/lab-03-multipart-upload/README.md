# Lab 3.3 — Multipart upload

> 🟢 **Free tier** — small object uploads, no measurable cost.

## What you'll learn

- The full multipart upload flow via the AWS CLI: `create-multipart-upload`, `upload-part`, `complete-multipart-upload`, `abort-multipart-upload`
- Why **5 MB minimum part size** matters and where it can bite you
- How **incomplete multipart uploads silently cost money** and how to lifecycle-rule them away

## Exam blueprint reference

- D1 TS3 — *"Cloud storage options"*, *"Serializing and deserializing data to provide persistence"*
- D1 TS3 — *"Managing data lifecycles"*
- D3 TS1 — *"Lambda deployment packaging"* (large packages use multipart under the hood)

## Theory primer

### When multipart matters

- **Recommended for objects > 100 MB**
- **Required for objects > 5 GB** (single PutObject is capped at 5 GB)
- **Maximum object size: 5 TB**
- **Maximum parts: 10,000**
- **Part size: 5 MB minimum** (except the last part), **5 GB maximum**

The math: 10,000 parts × 5 GB = 50,000 GB. The 5 TB cap exists because of that. Bigger parts = fewer parts; smaller parts = more parallelism.

### The flow

```
┌──────────────────────┐  ┌────────────────┐  ┌────────────────────┐
│ create-multipart-     │  │ upload-part    │  │ complete-multipart-│
│ upload                │→ │ (1..N, in any  │→ │ upload             │
│ → returns UploadId    │  │ order, parallel)│ │ → S3 stitches them │
└──────────────────────┘  │ → returns ETag │  └────────────────────┘
                          │  per part      │
                          └────────────────┘
                                  │
                                  ↓ if you stop here
                          ┌────────────────┐
                          │ ORPHAN — costs │
                          │ money forever  │
                          └────────────────┘
                                  │
                          ┌───────────────────────┐
                          │ abort-multipart-upload│
                          │ OR lifecycle rule     │
                          └───────────────────────┘
```

### Lifecycle rule for incomplete uploads

This is the single most important "tidy" rule on every S3 bucket that handles uploads:

```yaml
LifecycleConfiguration:
  Rules:
    - Id: AbortIncompleteMultipart
      Status: Enabled
      AbortIncompleteMultipartUpload:
        DaysAfterInitiation: 7
```

**Without this rule, every aborted/dropped upload sits forever, billed at full storage rates, invisible in the regular bucket listing.** You only see them with `aws s3api list-multipart-uploads`.

### CRC vs MD5

S3 returns an `ETag` for each part. For multipart uploads, the final object's `ETag` is `<md5-of-md5s>-<part-count>` (e.g., `abc123-3` for 3 parts). It is **not** an MD5 of the assembled object. Plain (non-multipart) PUTs return a true MD5 ETag.

If you need integrity verification: use the **`ChecksumAlgorithm: CRC32`** option (or SHA-256/SHA-1) — newer S3 feature, returns checksums over the whole object even for multipart.

## Architecture

```
You ──► CLI ──► dva-lab-03-demo bucket (from Lab 3.1)
            │     │
            │     ├── lifecycle rule: abort incomplete after 7 days  ← added this lab
            │     └── object: large.bin (3 parts, ~16 MB)
            │
            └──► observe with `aws s3api list-multipart-uploads`
```

## Prerequisites

- Lab 3.1 stack deployed (we reuse its bucket)
- Lab 3.2's stack does not need to be deployed for this lab; can be cleaned up if you wish

## Step 1: Deploy

This stack adds **only a lifecycle rule** to the existing Lab 3.1 bucket. It uses CloudFormation's `AWS::S3::BucketPolicy`-style attachment via a separate stack — except we don't actually use that pattern (S3 lifecycle config can't be split across stacks). Instead, this lab demonstrates **applying a lifecycle rule via the CLI directly** (no stack needed for this step) and then walks you through multipart manually.

So there's nothing to deploy with CloudFormation here — we'll modify the existing bucket via CLI.

#### PowerShell

```powershell
$BUCKET = aws cloudformation describe-stacks `
  --stack-name dva-lab-03-03-multipart-upload `
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" `
  --output text
$BUCKET

aws s3api put-bucket-lifecycle-configuration `
  --bucket $BUCKET `
  --lifecycle-configuration file://payloads/lifecycle.json
```

#### Bash

```bash
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name dva-lab-03-03-multipart-upload \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text)
echo "$BUCKET"

aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET" \
  --lifecycle-configuration file://payloads/lifecycle.json
```

Verify the rule:

**PowerShell or Bash:**
```
aws s3api get-bucket-lifecycle-configuration --bucket $BUCKET
```

## Step 2: Test — upload a 16 MB file in 3 parts

### Generate a 16 MB test file

#### PowerShell

```powershell
# 16 MB of random data
$bytes = New-Object byte[] (16MB)
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[IO.File]::WriteAllBytes("large.bin", $bytes)

# Split into 3 parts (6, 6, 4 MB - last part can be < 5 MB)
$src = [IO.File]::OpenRead("large.bin")
$buf = New-Object byte[] (6MB)
[IO.File]::WriteAllBytes("part1.bin", ($src.Read($buf, 0, $buf.Length) | Out-Null; $buf))
[IO.File]::WriteAllBytes("part2.bin", ($src.Read($buf, 0, $buf.Length) | Out-Null; $buf))
$last = New-Object byte[] (4MB)
$src.Read($last, 0, $last.Length) | Out-Null
[IO.File]::WriteAllBytes("part3.bin", $last)
$src.Close()
```

#### Bash

```bash
# 16 MB of random data
dd if=/dev/urandom of=large.bin bs=1M count=16 status=none

# Split into 3 parts (6, 6, 4 MB - last part can be < 5 MB)
dd if=large.bin of=part1.bin bs=1M count=6 status=none
dd if=large.bin of=part2.bin bs=1M count=6 skip=6 status=none
dd if=large.bin of=part3.bin bs=1M count=4 skip=12 status=none
```

### Initiate the upload

**PowerShell or Bash:**

```
aws s3api create-multipart-upload --bucket $BUCKET --key uploads/large.bin --content-type application/octet-stream
```

Save the `UploadId` from the response.

#### PowerShell

```powershell
$UPLOAD_ID = aws s3api create-multipart-upload --bucket $BUCKET --key uploads/large.bin --content-type application/octet-stream --query UploadId --output text
$UPLOAD_ID
```

#### Bash

```bash
UPLOAD_ID=$(aws s3api create-multipart-upload --bucket "$BUCKET" --key uploads/large.bin --content-type application/octet-stream --query UploadId --output text)
echo "$UPLOAD_ID"
```

### List in-progress multipart uploads

**PowerShell or Bash:**
```
aws s3api list-multipart-uploads --bucket $BUCKET
```

You'll see the upload you just started. **Notice these are invisible in `list-objects-v2` until completed.**

### Upload the three parts

#### PowerShell

```powershell
$ETAG1 = aws s3api upload-part --bucket $BUCKET --key uploads/large.bin --part-number 1 --upload-id $UPLOAD_ID --body part1.bin --query ETag --output text
$ETAG2 = aws s3api upload-part --bucket $BUCKET --key uploads/large.bin --part-number 2 --upload-id $UPLOAD_ID --body part2.bin --query ETag --output text
$ETAG3 = aws s3api upload-part --bucket $BUCKET --key uploads/large.bin --part-number 3 --upload-id $UPLOAD_ID --body part3.bin --query ETag --output text

Write-Host "Part 1: $ETAG1"
Write-Host "Part 2: $ETAG2"
Write-Host "Part 3: $ETAG3"
```

#### Bash

```bash
ETAG1=$(aws s3api upload-part --bucket "$BUCKET" --key uploads/large.bin --part-number 1 --upload-id "$UPLOAD_ID" --body part1.bin --query ETag --output text)
ETAG2=$(aws s3api upload-part --bucket "$BUCKET" --key uploads/large.bin --part-number 2 --upload-id "$UPLOAD_ID" --body part2.bin --query ETag --output text)
ETAG3=$(aws s3api upload-part --bucket "$BUCKET" --key uploads/large.bin --part-number 3 --upload-id "$UPLOAD_ID" --body part3.bin --query ETag --output text)

echo "Part 1: $ETAG1"
echo "Part 2: $ETAG2"
echo "Part 3: $ETAG3"
```

### Complete the upload

Build the parts manifest and call `complete-multipart-upload`. The script `scripts/complete-mp.sh` / `.ps1` does it from your env vars:

#### PowerShell

```powershell
.\scripts\complete-mp.ps1
```

#### Bash

```bash
bash ./scripts/complete-mp.sh
```

### Verify

```
aws s3api list-objects-v2 --bucket $BUCKET --prefix uploads/large
aws s3api head-object --bucket $BUCKET --key uploads/large.bin --query "{Size:ContentLength,ETag:ETag,Encryption:ServerSideEncryption}"
```

The `ETag` for a multipart object will look like `"abcd-3"` — a hash followed by `-<part_count>`.

## Step 3: Compare — what happens if you abandon a multipart?

Start a new upload but never complete it:

#### PowerShell

```powershell
$ORPHAN_ID = aws s3api create-multipart-upload --bucket $BUCKET --key uploads/will-never-finish.bin --query UploadId --output text
aws s3api upload-part --bucket $BUCKET --key uploads/will-never-finish.bin --part-number 1 --upload-id $ORPHAN_ID --body part1.bin
$ORPHAN_ID
```

#### Bash

```bash
ORPHAN_ID=$(aws s3api create-multipart-upload --bucket "$BUCKET" --key uploads/will-never-finish.bin --query UploadId --output text)
aws s3api upload-part --bucket "$BUCKET" --key uploads/will-never-finish.bin --part-number 1 --upload-id "$ORPHAN_ID" --body part1.bin
echo "$ORPHAN_ID"
```

Now check the bucket. The 6 MB part you uploaded **doesn't appear** in `list-objects-v2`:

```
aws s3api list-objects-v2 --bucket $BUCKET --prefix uploads/will-never-finish
```

But it **does** appear in `list-multipart-uploads`:

```
aws s3api list-multipart-uploads --bucket $BUCKET
```

**You're paying for 6 MB of storage that nothing in the console shows.** Multiply by hundreds of customers in production and that becomes real money.

Manually abort it (the lifecycle rule we set will clean it up after 7 days, but for the demo):

**PowerShell or Bash:**
```
aws s3api abort-multipart-upload --bucket $BUCKET --key uploads/will-never-finish.bin --upload-id $ORPHAN_ID
```

Verify it's gone:
```
aws s3api list-multipart-uploads --bucket $BUCKET
```

## Exam gotchas

1. **5 MB minimum part size, except the last part.** A part smaller than 5 MB that isn't the last part = `EntityTooSmall` error from `complete-multipart-upload`.
2. **Multipart uploads can pause for days.** Parts uploaded today and parts uploaded next week can be assembled into one object — useful for resumable uploads, dangerous without lifecycle rules.
3. **`list-objects-v2` does NOT show in-progress multipart uploads.** Only `list-multipart-uploads` does. Cost surprise.
4. **The ETag of a multipart object is not an MD5.** It's an MD5-of-MD5s with a `-N` suffix where N is part count. Don't use it for integrity verification — use `ChecksumAlgorithm`.
5. **Multipart is required above 5 GB.** A single `PutObject` can do up to 5 GB; anything larger must be multipart.
6. **Parts can be uploaded in parallel and out of order.** They're stitched in part-number order at completion.

## Cleanup

> ⚠️ This cleanup only removes any orphan multiparts you may have left. The Lab 3.1 bucket is preserved for Lab 3.4.

#### PowerShell

```powershell
.\cleanup.ps1
```

#### Bash

```bash
bash ./cleanup.sh
```

## What's next

> 🔁 **Keep the Lab 3.1 bucket** — Lab 3.4 will explore encryption variants on the same bucket.

Continue to [Lab 3.4 — Encryption variants](../lab-04-encryption-variants/README.md).
