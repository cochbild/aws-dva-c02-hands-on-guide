# Lab 3.4 — Encryption Variants

> 🟡 **Pennies** — one customer-managed KMS key (`$1/month` until you schedule deletion), plus negligible request charges. Cleanup schedules the KMS key for 7-day deletion (the minimum window).

## What you'll learn

- The five S3 server-side encryption variants and what's different about each
- How **S3 Bucket Keys** drop your KMS costs by ~99% for SSE-KMS
- The correct CLI syntax for SSE-C (one of the most common exam-trick distractors)

## Exam blueprint reference

- **D2 TS2 — Knowledge of:**
  - *"Encryption at rest and in transit"*
  - *"Differences between client-side encryption and server-side encryption"*
  - *"Differences between AWS managed and customer-managed AWS Key Management Service (AWS KMS) keys"*
- **D2 TS2 — Skills in:**
  - *"Using encryption keys to encrypt or decrypt data"*

## Theory primer

### The 5 encryption variants

| Variant | Who holds the key | Where stored | Per-object KMS call? |
|---|---|---|---|
| **SSE-S3** (AES256) | AWS | S3 internally (rotated by AWS) | No |
| **SSE-KMS** (aws:kms) — AWS managed (`aws/s3`) | AWS | KMS, AWS-managed key | Yes (every PUT and GET) |
| **SSE-KMS** — customer-managed | You | KMS, your CMK | Yes (every PUT and GET) |
| **SSE-C** (customer-provided) | You — sent on every request | Not stored anywhere by AWS | No |
| **Client-side** (CSE) | You | Your code | No (you encrypt before PUT) |
| **DSSE-KMS** (dual-layer) | AWS + KMS | KMS (rare; FIPS/military use) | Yes |

Since **January 2023**, all new buckets default to **SSE-S3** unless you change it. Override with bucket-level config.

### Why Bucket Keys matter

SSE-KMS without bucket keys: **every object PUT and every object GET makes a KMS API call**. If your app uploads 1M objects a day, that's 1M KMS calls/day = $10/day in KMS request charges, on top of the key's $1/month.

Bucket Keys cache the data key inside S3 for the bucket. KMS call rate drops by ~99%. Cost drops by ~99%.

You should always enable Bucket Keys when using SSE-KMS unless you have a specific compliance reason not to.

### SSE-C in 30 seconds

You generate the key client-side. Send it on every PUT/GET as headers:

```
x-amz-server-side-encryption-customer-algorithm: AES256
x-amz-server-side-encryption-customer-key: <base64 of 32-byte key>
x-amz-server-side-encryption-customer-key-MD5: <base64 of MD5 of key>
```

S3 uses your key to encrypt/decrypt, then **forgets it**. If you lose the key, the object is unrecoverable. The `--sse-c-key` argument in `aws s3api` does this for you.

## Architecture

```
                        ┌─────────────────────────────────────────────────┐
   PutObject SSE-S3 ───►│  dva-lab-03-demo bucket (from Lab 3.1)          │
                        └─────────────────────────────────────────────────┘

                        ┌─────────────────────────────────────────────────┐
   PutObject SSE-KMS ──►│  dva-lab-03-04-kms bucket (this lab)            │
                        │  + Bucket Key enabled                            │
                        └─────────────────────────────────────────────────┘
                                          │ uses
                                          ▼
                        ┌─────────────────────────────────────────────────┐
                        │  dva-lab-03-04-cmk (customer-managed KMS key)   │
                        └─────────────────────────────────────────────────┘
```

## Prerequisites

- Lab 3.1 stack still deployed (we reference its bucket).

Verify:
```
aws cloudformation describe-stacks --stack-name dva-lab-03-01-bucket-basics --query "Stacks[0].StackStatus" --output text
```
Should print `CREATE_COMPLETE` or `UPDATE_COMPLETE`.

## Step 1: Deploy

### PowerShell or Bash

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-03-04-encryption-variants --capabilities CAPABILITY_IAM
```

## Step 2: Test SSE-S3 (Lab 3.1 bucket)

### PowerShell

```powershell
$SharedBucket = aws cloudformation describe-stacks --stack-name dva-lab-03-01-bucket-basics --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text
echo "hello SSE-S3" | Out-File -FilePath sse-s3.txt -Encoding ascii
aws s3 cp sse-s3.txt "s3://$SharedBucket/sse-s3.txt"
aws s3api head-object --bucket $SharedBucket --key sse-s3.txt
```

### Bash

```bash
SHARED_BUCKET=$(aws cloudformation describe-stacks --stack-name dva-lab-03-01-bucket-basics --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
echo "hello SSE-S3" > sse-s3.txt
aws s3 cp sse-s3.txt "s3://$SHARED_BUCKET/sse-s3.txt"
aws s3api head-object --bucket "$SHARED_BUCKET" --key sse-s3.txt
```

You should see `"ServerSideEncryption": "AES256"` in the response. That's SSE-S3.

## Step 3: Test SSE-KMS with Bucket Key

### PowerShell

```powershell
$KmsBucket = aws cloudformation describe-stacks --stack-name dva-lab-03-04-encryption-variants --query "Stacks[0].Outputs[?OutputKey=='KmsBucketName'].OutputValue" --output text
echo "hello SSE-KMS" | Out-File -FilePath sse-kms.txt -Encoding ascii
aws s3 cp sse-kms.txt "s3://$KmsBucket/sse-kms.txt"
aws s3api head-object --bucket $KmsBucket --key sse-kms.txt
```

### Bash

```bash
KMS_BUCKET=$(aws cloudformation describe-stacks --stack-name dva-lab-03-04-encryption-variants --query "Stacks[0].Outputs[?OutputKey=='KmsBucketName'].OutputValue" --output text)
echo "hello SSE-KMS" > sse-kms.txt
aws s3 cp sse-kms.txt "s3://$KMS_BUCKET/sse-kms.txt"
aws s3api head-object --bucket "$KMS_BUCKET" --key sse-kms.txt
```

Look for `"ServerSideEncryption": "aws:kms"`, `"BucketKeyEnabled": true`, and `"SSEKMSKeyId": "arn:aws:kms:..."`.

## Step 4: Test SSE-C (customer-provided key)

The trickiest one to type. Generate a 32-byte key, base64 it, send it as headers:

### PowerShell

```powershell
# 32-byte key, base64-encoded
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$KeyB64 = [Convert]::ToBase64String($bytes)
$KeyMd5 = [Convert]::ToBase64String([System.Security.Cryptography.MD5]::Create().ComputeHash($bytes))

echo "hello SSE-C" | Out-File -FilePath sse-c.txt -Encoding ascii
aws s3api put-object --bucket $KmsBucket --key sse-c.txt --body sse-c.txt `
    --sse-customer-algorithm AES256 `
    --sse-customer-key $KeyB64 `
    --sse-customer-key-md5 $KeyMd5

# Read back — without the key it will fail
aws s3api get-object --bucket $KmsBucket --key sse-c.txt out.txt 2>&1 | Select-String "InvalidRequest"

# With the key it works
aws s3api get-object --bucket $KmsBucket --key sse-c.txt `
    --sse-customer-algorithm AES256 `
    --sse-customer-key $KeyB64 `
    --sse-customer-key-md5 $KeyMd5 out-with-key.txt
Get-Content out-with-key.txt
```

### Bash

```bash
KEY_B64=$(openssl rand -base64 32)
KEY_RAW=$(echo "$KEY_B64" | base64 -d)
KEY_MD5=$(echo -n "$KEY_RAW" | openssl dgst -md5 -binary | base64)

echo "hello SSE-C" > sse-c.txt
aws s3api put-object --bucket "$KMS_BUCKET" --key sse-c.txt --body sse-c.txt \
    --sse-customer-algorithm AES256 \
    --sse-customer-key "$KEY_B64" \
    --sse-customer-key-md5 "$KEY_MD5"

# Without the key, get fails
aws s3api get-object --bucket "$KMS_BUCKET" --key sse-c.txt out.txt 2>&1 | grep -i "InvalidRequest"

# With the key, it works
aws s3api get-object --bucket "$KMS_BUCKET" --key sse-c.txt \
    --sse-customer-algorithm AES256 \
    --sse-customer-key "$KEY_B64" \
    --sse-customer-key-md5 "$KEY_MD5" out-with-key.txt
cat out-with-key.txt
```

## Exam gotchas

- **The default has changed twice.** Pre-2023: no encryption. Post-Jan 2023: SSE-S3 default on new buckets. The exam may reference either era — read the question's date.
- **SSE-KMS without Bucket Keys is expensive at scale.** $0.03 per 10,000 KMS requests. Bucket Key enabled = orders of magnitude fewer KMS calls. Always enable unless required not to.
- **SSE-C: AWS forgets your key.** No way to recover an SSE-C-encrypted object if you lose the key. AWS literally never has a copy.
- **Cross-account SSE-KMS:** the KMS key policy must grant the cross-account principal `kms:Decrypt` AND `kms:GenerateDataKey`. Bucket policy alone is not enough.
- **DSSE-KMS** uses two layers of envelope encryption with two different keys. Costs 2x the KMS calls. FIPS-compliance requirement only — rare on the exam.
- **Client-side encryption (CSE)** is implemented by the SDK's encryption client. AWS doesn't see plaintext at any point. Different SDK class than regular S3 client.
- **`x-amz-server-side-encryption-aws-kms-key-id`** can be set per request — overrides the bucket default.
- **`PutBucketEncryption`** sets the default; clients can still PUT with a different encryption header.
- **Tags can't be encrypted.** Object tags are always plaintext to AWS.

## Cleanup

> ⚠️ **KMS key has a 7-day deletion window.** The cleanup script schedules it for 7-day delete (the minimum). $1/month accrues until that window closes. To delete sooner, increase the window or accept the small charge.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before Lab 3.5.** Lab 3.5 needs a fresh bucket with versioning + lifecycle — different config, separate stack.

Continue: [Lab 3.5 — Versioning & Lifecycle](../lab-05-versioning-lifecycle/README.md)
