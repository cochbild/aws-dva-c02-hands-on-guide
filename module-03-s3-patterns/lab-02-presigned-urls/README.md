# Lab 3.2 — Presigned URLs

> 🟢 **Free tier** — Lambda + S3 only. Negligible cost.

## What you'll learn

- How to generate a presigned **PUT** URL from a Lambda so a browser can upload directly to S3 without AWS credentials
- How to generate a presigned **GET** URL with a short expiry
- The difference between IAM-user-signed (up to 7 days) and STS-signed (capped at session length) URLs
- How `Content-Type` and `x-amz-server-side-encryption` headers are bound to the signature

## Exam blueprint reference

- D1 TS1 — *"API design"*, *"Writing code that uses AWS services by using APIs and SDKs"*
- D2 TS1 — *"Configuring programmatic access to AWS"*, *"Securing applications by using bearer tokens"* (presigned URLs are AWS's bearer-token equivalent)
- D2 TS3 — *"Sanitizing sensitive data"*

## Theory primer

### What a presigned URL actually is

It's a regular S3 URL with **SigV4 query parameters** attached:

```
https://my-bucket.s3.us-east-1.amazonaws.com/uploads/photo.jpg
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=AKIA.../20260101/us-east-1/s3/aws4_request
  &X-Amz-Date=20260101T120000Z
  &X-Amz-Expires=3600
  &X-Amz-SignedHeaders=host;x-amz-server-side-encryption
  &X-Amz-Signature=...
```

The signature **includes** specific headers (those listed in `X-Amz-SignedHeaders`). The client **must** send those headers with the same values, or the signature will fail.

### Generating presigned URLs has no API call

`generate_presigned_url()` in boto3 is **purely client-side computation** — no network round trip. It signs a URL using whatever credentials the SDK has loaded.

### Expiration rules

- IAM-user long-term creds: signed URL valid up to **7 days** (604,800 seconds)
- STS temporary creds: valid up to the **session expiration** (commonly 1 hour, max 12 hours, max 36h for SSO sessions)
- Lambda execution role: STS-derived, **typically 1 hour** — your URL effectively can't outlive ~1 hour even if you specify `ExpiresIn=86400`
- Cannot be revoked. The signature is valid until expiry. **Set short windows.**

### Method-binding

A URL signed for `put_object` is only valid for `PUT`. You can't reuse it for `GET`. To allow the client to do both, sign two URLs.

### Header-binding

When you generate a presigned URL with parameters like `ContentType` or `ServerSideEncryption`, those become signed headers. The client **must** send those exact headers on the request. This is how a backend can **force** a specific encryption mode or content type.

```python
url = s3.generate_presigned_url(
    'put_object',
    Params={
        'Bucket': bucket,
        'Key': key,
        'ContentType': 'image/jpeg',
        'ServerSideEncryption': 'AES256',
    },
    ExpiresIn=300,
)
# Client must PUT with both headers, exactly.
```

## Architecture

```
You ──► API call ──► PresignerLambda ──► generates 2 URLs (signed locally)
                          │
                          └──► returns to you
                                    │
                                    ├── PUT URL ──► curl uploads file directly to S3
                                    └── GET URL ──► curl downloads from S3
```

## Prerequisites

- Lab 3.1 stack deployed (we reuse its bucket)
- Verify with: `aws cloudformation describe-stacks --stack-name dva-lab-03-01-bucket-basics`

## Step 1: Deploy

This lab uses the artifacts-bucket pattern (Lambda code packaging) from CONVENTIONS.md §7.

### PowerShell

```powershell
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$((aws sts get-caller-identity --query Account --output text))-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-03-02-presigned-urls `
  --capabilities CAPABILITY_IAM
```

### Bash

```bash
ARTIFACTS_BUCKET="dva-lab-artifacts-$(aws sts get-caller-identity --query Account --output text)-${AWS_DEFAULT_REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-03-02-presigned-urls \
  --capabilities CAPABILITY_IAM
```

## Step 2: Test

### Read the function name

#### PowerShell

```powershell
$FN = aws cloudformation describe-stacks `
  --stack-name dva-lab-03-02-presigned-urls `
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" `
  --output text
$FN
```

#### Bash

```bash
FN=$(aws cloudformation describe-stacks \
  --stack-name dva-lab-03-02-presigned-urls \
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" \
  --output text)
echo "$FN"
```

### Generate a PUT URL and use it

**PowerShell or Bash:**

```
aws lambda invoke --function-name $FN --cli-input-json file://payloads/get-put-url.json out.json
cat out.json
```

You'll get a JSON response with a `put_url` and a `get_url`.

### Upload via curl using the PUT URL

Extract the URL from `out.json` and use curl. The lab generates URLs that require `Content-Type: text/plain` and `x-amz-server-side-encryption: AES256` to be sent on the upload (because we baked those into the signature).

#### PowerShell

```powershell
$resp = Get-Content out.json | ConvertFrom-Json
$putUrl = $resp.put_url
$getUrl = $resp.get_url

"Hello from a presigned PUT - $(Get-Date)" | Out-File -FilePath upload.txt -Encoding ascii -NoNewline

curl.exe -X PUT `
  -H "Content-Type: text/plain" `
  -H "x-amz-server-side-encryption: AES256" `
  --data-binary "@upload.txt" `
  $putUrl
```

#### Bash

```bash
PUT_URL=$(grep -o '"put_url":"[^"]*' out.json | sed 's/.*"//')
GET_URL=$(grep -o '"get_url":"[^"]*' out.json | sed 's/.*"//')

echo "Hello from a presigned PUT - $(date)" > upload.txt

curl -X PUT \
  -H "Content-Type: text/plain" \
  -H "x-amz-server-side-encryption: AES256" \
  --data-binary @upload.txt \
  "$PUT_URL"
```

A successful PUT returns empty 200 OK. (`curl -v` to see the response code.)

### Download via the GET URL

#### PowerShell

```powershell
curl.exe $getUrl
```

#### Bash

```bash
curl "$GET_URL"
```

You'll see the contents you just uploaded.

### Verify the object landed in the bucket

**PowerShell or Bash:**

```
$STACK = "dva-lab-03-01-bucket-basics"   # PowerShell
STACK="dva-lab-03-01-bucket-basics"      # Bash

BUCKET=$(aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
aws s3api list-objects-v2 --bucket $BUCKET --prefix uploads/ --query 'Contents[].Key'
aws s3api head-object --bucket $BUCKET --key uploads/test.txt --query "{Encryption:ServerSideEncryption,ContentType:ContentType}"
```

The `head-object` response should show `"Encryption": "AES256"` (which the URL forced) and `"ContentType": "text/plain"`.

## Step 3: Compare — what happens if you change the headers?

Try the PUT again **without** the encryption header:

#### PowerShell

```powershell
curl.exe -v -X PUT -H "Content-Type: text/plain" --data-binary "@upload.txt" $putUrl
```

#### Bash

```bash
curl -v -X PUT -H "Content-Type: text/plain" --data-binary @upload.txt "$PUT_URL"
```

You'll get a **403 SignatureDoesNotMatch**. The signature was computed with that header bound; omitting it breaks the signature.

Try with a different content-type:

#### PowerShell

```powershell
curl.exe -v -X PUT -H "Content-Type: application/json" -H "x-amz-server-side-encryption: AES256" --data-binary "@upload.txt" $putUrl
```

#### Bash

```bash
curl -v -X PUT -H "Content-Type: application/json" -H "x-amz-server-side-encryption: AES256" --data-binary @upload.txt "$PUT_URL"
```

Also 403. The headers must match exactly.

This is the security mechanism: a backend that signs URLs **cannot be bypassed** by a malicious client — the client can't change the encryption or the content type without breaking the signature.

### Bonus: Test expiry

The Lambda defaults to `ExpiresIn=300` (5 minutes). Wait 5 minutes, then retry the GET URL. You'll get a 403 with `Request has expired`.

## Exam gotchas

1. **`ExpiresIn` is in seconds.** Default in many SDKs is 3600 (1 hour). Max for IAM users: 604,800 (7 days). For STS creds (Lambda exec role!), capped at the session length.
2. **Lambda execution role creds are STS-issued and last ~12 hours by default.** A presigned URL signed by your Lambda inherits that lifetime — even `ExpiresIn=86400` (24h) is silently capped.
3. **Forcing encryption via signed headers** is the canonical pattern for "frontend uploads but backend dictates settings". The exam will ask how to enforce SSE-KMS uploads from a browser; this is the answer.
4. **A presigned URL inherits the signer's permissions.** If the Lambda role can `s3:PutObject` on `bucket/uploads/*` only, the URL it generates is similarly scoped.
5. **Cannot be revoked.** Short `ExpiresIn`, every time.
6. **`generate_presigned_url` is local computation.** No network call. CloudTrail does not log URL generation.

## Cleanup

> ⚠️ Do not run `cleanup.sh` if you're continuing to Lab 3.3. This cleanup only removes the **presigner Lambda**, not the bucket — but Lab 3.3 will redeploy a different Lambda and reuse the same bucket.
>
> Either way: `cleanup.sh` here only removes Lab 3.2's stack. The bucket from Lab 3.1 stays.

#### PowerShell

```powershell
.\cleanup.ps1
```

#### Bash

```bash
bash ./cleanup.sh
```

## What's next

> 🔁 **Keep the Lab 3.1 bucket** — Lab 3.3 reuses it for multipart upload demos. You can `cleanup.sh` here (Lab 3.2's Lambda) or leave it; either way, Lab 3.3 starts cleanly.

Continue to [Lab 3.3 — Multipart upload](../lab-03-multipart-upload/README.md).
