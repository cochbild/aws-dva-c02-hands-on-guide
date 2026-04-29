# Lab 3.1 — Bucket basics

> 🟢 **Free tier** — fully covered by S3 Free Tier. A few small objects, no measurable cost.

## What you'll learn

- How S3 bucket naming rules and regional behavior work in practice
- That every new bucket has SSE-S3 server-side encryption on by default (since January 2023)
- How to enable and use static website hosting on a bucket

## Exam blueprint reference

- D1 TS3 — *"Cloud storage options (for example, file, object, databases)"*
- D1 TS3 — *"Differences between ephemeral and persistent data storage patterns"*
- D2 TS2 — *"Encryption at rest and in transit"*

## Theory primer

### Bucket naming rules

- **3–63 characters**, lowercase letters, numbers, dots, hyphens
- Must start and end with a letter or number
- Must be **globally unique** across all AWS accounts in the partition
- No uppercase. No underscores. No consecutive dots.
- For HTTPS / TLS, **no dots** in bucket name (dots break the wildcard cert that `*.s3.amazonaws.com` covers)

### Regional behavior

- Bucket lives in **one region**, never replicated implicitly. Cross-region requires explicit replication or `CopyObject`.
- Bucket names are **global** but the data is regional. You can list buckets globally, but to access data you address the bucket's region (`s3.us-east-1.amazonaws.com`).
- Empty bucket can be deleted in any region; non-empty needs to be emptied first.

### Default encryption — what changed in 2023

Pre-Jan 2023: new buckets created with no encryption. Objects PUT without an encryption header were stored unencrypted.

Post-Jan 2023: **all new buckets have SSE-S3 (AES-256) on by default**. You don't need to enable it. You don't need to send the encryption header. Objects PUT without explicit encryption are still encrypted.

Override with bucket-level config (we'll do that in Lab 3.4).

### Static website hosting

A bucket with website hosting enabled serves objects via HTTP from a region-specific website endpoint:

```
http://<bucket>.s3-website-<region>.amazonaws.com
```

- Serves `index.html` for `/`
- Serves a configured error doc for 4xx
- **No HTTPS** unless you front it with CloudFront
- Requires bucket policy granting `s3:GetObject` to `*`
- Requires "Block Public Access" off (or a specific carve-out)

For HTTPS / custom domain: use **CloudFront with an OAC (Origin Access Control)** instead — that's covered in Module 4.

## Architecture

```
You ──► aws s3api ──► dva-lab-03-demo-<account>-<region>
                          │
                          ├── 3 sample objects (seeded)
                          ├── default SSE-S3 encryption
                          └── static website hosting (index.html, error.html)
```

## Prerequisites

None — first lab in the module.

## Step 1: Deploy

The template creates a single S3 bucket named `dva-lab-03-demo-<AccountId>-<Region>` and enables static website hosting on it.

### PowerShell

```powershell
aws cloudformation deploy `
  --template-file template.yaml `
  --stack-name dva-lab-03-01-bucket-basics `
  --capabilities CAPABILITY_IAM
```

### Bash

```bash
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name dva-lab-03-01-bucket-basics \
  --capabilities CAPABILITY_IAM
```

### Read the bucket name into a variable

#### PowerShell

```powershell
$BUCKET = aws cloudformation describe-stacks `
  --stack-name dva-lab-03-01-bucket-basics `
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" `
  --output text
$BUCKET
```

#### Bash

```bash
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name dva-lab-03-01-bucket-basics \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text)
echo "$BUCKET"
```

## Step 2: Test

### Seed sample objects

#### PowerShell

```powershell
.\scripts\seed-data.ps1
```

#### Bash

```bash
bash ./scripts/seed-data.sh
```

You should see three objects uploaded: `index.html`, `error.html`, and `hello.txt`.

### Inspect them

**PowerShell or Bash:**

```
aws s3api list-objects-v2 --bucket $BUCKET --query 'Contents[].{Key:Key,Size:Size,Class:StorageClass}'
```

(In PowerShell: `$BUCKET`. In Bash: `"$BUCKET"`.)

### Verify default encryption is on

**PowerShell or Bash:**

```
aws s3api get-bucket-encryption --bucket $BUCKET
```

Expected output:
```json
{
    "ServerSideEncryptionConfiguration": {
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": { "SSEAlgorithm": "AES256" },
            "BucketKeyEnabled": false
        }]
    }
}
```

This is the default — we never set it. **AES256 = SSE-S3.**

### Verify per-object encryption

```
aws s3api head-object --bucket $BUCKET --key hello.txt
```

You'll see `"ServerSideEncryption": "AES256"` even though we never asked for it.

### Visit the website

#### PowerShell

```powershell
$URL = aws cloudformation describe-stacks `
  --stack-name dva-lab-03-01-bucket-basics `
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" `
  --output text
$URL
Start-Process $URL
```

#### Bash

```bash
URL=$(aws cloudformation describe-stacks \
  --stack-name dva-lab-03-01-bucket-basics \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" \
  --output text)
echo "$URL"
# macOS:    open "$URL"
# Linux:    xdg-open "$URL"
```

You should see the seeded `index.html`. Visit `$URL/does-not-exist` and you'll see `error.html`.

## Step 3: Compare — what happens if you turn off default encryption?

You can override the bucket-level default. Try this (don't keep it):

**PowerShell or Bash:**
```
aws s3api put-bucket-encryption --bucket $BUCKET --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":false}]}'
```

Already AES256, this is a no-op for our case but demonstrates the API. Try **removing** encryption entirely:

**PowerShell or Bash:**
```
aws s3api delete-bucket-encryption --bucket $BUCKET
aws s3api get-bucket-encryption --bucket $BUCKET
```

In PowerShell you may need `2>$null` after these commands to suppress error decoration. In Bash add `|| true`.

You'll get `ServerSideEncryptionConfigurationNotFoundError`. **But objects you upload still get AES256 encryption** — because as of 2023, AWS applies SSE-S3 at the platform level even without bucket configuration. Verify:

```
aws s3 cp scripts/seed-data.sh "s3://$BUCKET/test.txt"
aws s3api head-object --bucket $BUCKET --key test.txt
```

You'll still see `"ServerSideEncryption": "AES256"`. **You cannot opt out of S3 encryption at rest.**

Re-enable bucket config so the rest of the module is consistent:

```
aws s3api put-bucket-encryption --bucket $BUCKET --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":false}]}'
```

## Exam gotchas

1. **Default encryption since 2023 is SSE-S3.** Old exam dumps may say "objects not encrypted unless you ask" — that's outdated.
2. **Bucket names are globally unique.** That's why we append `${AWS::AccountId}-${AWS::Region}` in the template — collisions would block your deploy.
3. **Static website hosting is HTTP only.** For HTTPS you need CloudFront. The exam tests "static site needs HTTPS → CloudFront + OAC" pattern repeatedly.
4. **Block Public Access is on by default** on new buckets. To allow public reads (static sites), you must turn it off and add an explicit bucket policy. The template handles both.

## Cleanup

> ⚠️ **Don't run cleanup if you're continuing to Lab 3.2** — it reuses this bucket.

When you're done with Labs 3.1–3.4 (after Lab 3.4):

#### PowerShell

```powershell
.\cleanup.ps1
```

#### Bash

```bash
bash ./cleanup.sh
```

## What's next

> 🔁 **Keep this stack** — Lab 3.2 reuses this bucket for presigned URLs.

Continue to [Lab 3.2 — Presigned URLs](../lab-02-presigned-urls/README.md).
