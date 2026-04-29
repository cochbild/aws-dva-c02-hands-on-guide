# Lab 3.7 — S3 Object Lambda

> 🟢 **Free tier** — Lambda invokes are tiny and request volumes here are well within free tier. Bucket Key on regular SSE-S3 default applies; no KMS resource is created.

## What you'll learn

- The two-access-point flow: regular S3 access point + S3 **Object Lambda** access point
- How an Object Lambda function receives a presigned URL to the original object, transforms its content, and writes back to the caller via the `WriteGetObjectResponse` API
- A real-world transformation: redacting PII (Social Security-style numbers, credit-card-like patterns, email addresses) on read so the bucket can hold raw data while consumers see redacted views

## Exam blueprint reference

- **D1 TS1** — *"Architectural patterns (event-driven, microservices, monolithic)"*, *"API design"*
- **D1 TS3** — *"Cloud storage options (file, object, databases)"*, *"Differences between ephemeral and persistent data storage patterns"*
- **D2 TS3** — *"Sanitizing sensitive data"*

## Theory primer

### The S3 access-point hierarchy

```
                ┌───────────────────────────────┐
   GetObject ──►│  Object Lambda Access Point   │ ARN: arn:aws:s3-object-lambda:<region>:<account>:accesspoint/<olap-name>
                │  (the entry point clients use)│
                └───────────────┬───────────────┘
                                │ invokes Lambda with presigned URL pointing at →
                                ▼
                ┌───────────────────────────────┐
                │  Standard S3 Access Point     │ ARN: arn:aws:s3:<region>:<account>:accesspoint/<sap-name>
                └───────────────┬───────────────┘
                                │ which fronts →
                                ▼
                ┌───────────────────────────────┐
                │  S3 Bucket                    │
                └───────────────────────────────┘
```

You **must** have a regular access point in front of the bucket; the Object Lambda access point is **never** wired directly to a bucket.

Why? Because Object Lambda needs a way to fetch the original object via a presigned URL. The presigned URL points at a regular access point, not at the bucket directly. The access-point indirection lets policies be enforced consistently regardless of how the bucket is reached.

### What S3 sends to the Lambda

When a client calls GetObject on the Object Lambda access point, S3 invokes the Lambda with an event like:

```json
{
  "xAmzRequestId": "...",
  "getObjectContext": {
    "inputS3Url": "https://my-bucket.s3.us-east-1.amazonaws.com/key?X-Amz-Algorithm=...",
    "outputRoute": "...",
    "outputToken": "..."
  },
  "userRequest": {
    "url": "https://my-olap.s3-object-lambda.us-east-1.amazonaws.com/key",
    "headers": { ... }
  }
}
```

The Lambda:
1. Fetches `inputS3Url` (the presigned URL — this lets the Lambda read the object even if its IAM role can't directly read the bucket)
2. Transforms the body
3. Calls `s3.write_get_object_response()` with `RequestRoute=outputRoute`, `RequestToken=outputToken`, and the transformed body

The client doesn't know the Lambda exists. They get back a regular GetObject response with whatever the Lambda wrote.

### Where this is useful

| Use case | Transformation |
|---|---|
| **PII redaction** (this lab) | Mask SSNs, credit cards, emails before they leave the bucket |
| **Format conversion** | Serve CSV when JSON is stored, or vice versa |
| **Tenant scoping** | Stripe out rows that don't belong to the requesting tenant (caller passed in headers) |
| **Watermarking** | Burn a per-user watermark into images before serving |
| **Compression / decompression** | Store gzipped, serve uncompressed (or the reverse) |

### Limits

- Max response size: **1 GB** (you must stream chunks larger than that)
- Lambda max timeout: **60 seconds** (regardless of the function's configured timeout, S3 will time out at 60s)
- Object Lambda doesn't support PUT, only GET (and HEAD, ListObjectsV2 with v2 features)
- The presigned URL is valid for **the duration of the original request only**

## Architecture for this lab

```
                    ┌────────────────────────────────────────┐
   GetObject ──────►│  Object Lambda Access Point           │
                    │  dva-lab-03-07-olap                    │
                    └──────────────────┬─────────────────────┘
                                       │
                                       │ invokes
                                       ▼
                    ┌────────────────────────────────────────┐
                    │  Lambda: dva-lab-03-07-redactor        │
                    │  - fetches inputS3Url                  │
                    │  - regex-redacts SSN / CC / email      │
                    │  - WriteGetObjectResponse              │
                    └──────────────────┬─────────────────────┘
                                       │ presigned URL points at
                                       ▼
                    ┌────────────────────────────────────────┐
                    │  Standard Access Point                 │
                    │  dva-lab-03-07-sap                     │
                    └──────────────────┬─────────────────────┘
                                       │
                                       ▼
                    ┌────────────────────────────────────────┐
                    │  Bucket: dva-lab-03-07-<account>-<rg>  │
                    │  contains: customers.txt with PII      │
                    └────────────────────────────────────────┘
```

## Step 1: Deploy

The template creates the bucket, both access points, the Lambda, and a sample PII-laden object. Lambda is in-template (no `pip install` needed — uses only the Python stdlib + boto3).

### PowerShell or Bash

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-03-07-object-lambda --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

The stack creates a sample object as part of deploy via a Custom Resource Lambda. Watch the events — there's a brief "wait for object" phase.

## Step 2: GET via the regular access point (raw data)

This proves the bucket has plain-text PII.

### PowerShell

```powershell
$Sap = aws cloudformation describe-stacks --stack-name dva-lab-03-07-object-lambda --query "Stacks[0].Outputs[?OutputKey=='AccessPointAlias'].OutputValue" --output text
aws s3api get-object --bucket $Sap --key customers.txt raw.txt
Get-Content raw.txt
```

### Bash

```bash
SAP=$(aws cloudformation describe-stacks --stack-name dva-lab-03-07-object-lambda --query "Stacks[0].Outputs[?OutputKey=='AccessPointAlias'].OutputValue" --output text)
aws s3api get-object --bucket "$SAP" --key customers.txt raw.txt
cat raw.txt
```

You should see SSNs, credit-card-like numbers, and emails in plain text.

## Step 3: GET via the Object Lambda access point (redacted)

Same key, different access point — Lambda intercepts and rewrites.

### PowerShell

```powershell
$Olap = aws cloudformation describe-stacks --stack-name dva-lab-03-07-object-lambda --query "Stacks[0].Outputs[?OutputKey=='ObjectLambdaAccessPointAlias'].OutputValue" --output text
aws s3api get-object --bucket $Olap --key customers.txt redacted.txt
Get-Content redacted.txt
```

### Bash

```bash
OLAP=$(aws cloudformation describe-stacks --stack-name dva-lab-03-07-object-lambda --query "Stacks[0].Outputs[?OutputKey=='ObjectLambdaAccessPointAlias'].OutputValue" --output text)
aws s3api get-object --bucket "$OLAP" --key customers.txt redacted.txt
cat redacted.txt
```

You should see `[SSN-REDACTED]`, `[CC-REDACTED]`, `[EMAIL-REDACTED]` where the patterns were.

> **What just happened:** the SDK called GetObject on the OLAP. AWS turned that into a Lambda invoke with a presigned URL. The Lambda fetched the original, ran regex substitutions, and wrote the redacted body back through the `WriteGetObjectResponse` API. The SDK got a normal-looking 200 response.

## Step 4: Inspect the Lambda logs

### PowerShell or Bash

```
aws logs tail /aws/lambda/dva-lab-03-07-redactor --since 5m
```

You'll see one log entry per GetObject through the OLAP, including the redaction counts.

## Step 5: Compare — what happens if you GET a non-existent key?

### PowerShell or Bash

```
aws s3api get-object --bucket $Olap --key does-not-exist.txt out.txt
```

The Lambda's call to fetch the presigned URL returns 404. Your handler must propagate that — see how `handler.py` calls `WriteGetObjectResponse` with `StatusCode=404` and short-circuits. Without that, S3 thinks the Lambda hung and returns a 500 to the client after timeout.

## Exam gotchas

- **Object Lambda only intercepts GetObject (and HeadObject, partial ListObjectsV2).** PUT, DELETE, and CopyObject pass through to the bucket directly. If a question asks "transform on write", Object Lambda is the **wrong answer**; that's S3 Batch Operations or a Lambda triggered by ObjectCreated event.
- **Two access points are required.** Standard access point + Object Lambda access point. The OLAP isn't bound to the bucket, only to the SAP.
- **Lambda is invoked SYNCHRONOUSLY** with a 60-second hard limit imposed by S3 (regardless of Lambda's configured timeout). Long transformations should stream-and-chunk via partial responses.
- **The Lambda's IAM role doesn't need s3:GetObject on the bucket** — it has the presigned URL. It does need `s3-object-lambda:WriteGetObjectResponse`.
- **`WriteGetObjectResponse` is the API the Lambda calls back into** to deliver the response. It uses `RequestRoute` and `RequestToken` from the event payload.
- **Pricing** = Lambda invoke cost + Lambda duration + S3 GetObject (because behind the scenes the Lambda still fetched the object via the SAP) + small per-request S3 Object Lambda surcharge (~$0.005 per million requests).
- **Cross-region** is not supported. The OLAP, SAP, bucket, and Lambda must all be in the same region.
- **Object Lambda + Versioning:** the SDK passes `versionId` in `userRequest` if the client requested a specific version. You're responsible for honoring it when fetching from the presigned URL.

## Debugging tips

- **`AccessDenied` on the OLAP GetObject:** check the Lambda's role has `s3-object-lambda:WriteGetObjectResponse` on the OLAP ARN.
- **`InvalidSignatureException` while fetching the presigned URL inside the Lambda:** make sure your handler uses `urllib3` / `requests` rather than re-signing — the URL is already presigned.
- **Lambda times out:** S3 cuts the connection at 60s regardless of Lambda's configured timeout. Make sure your transformation is well under that.
- **Empty response delivered to client:** make sure `WriteGetObjectResponse` was called. If the Lambda just `return`s without calling it, the client hangs.

## Cleanup

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before Module 4.** Module 4 covers API Gateway, Cognito, CloudFront, Route 53, WAF — fresh stacks.

🎉 **Module 3 complete!** You've covered every S3 pattern in the DVA-C02 scope: bucket basics, presigned URLs, multipart uploads, encryption variants (SSE-S3 / SSE-KMS / SSE-C / DSSE / CSE), versioning + lifecycle (every storage class), event notifications (Lambda / SQS / SNS / EventBridge), and Object Lambda transformations.

Continue: [Module 4 — API Gateway, Cognito & Edge](../../module-04-api-gateway-cognito/README.md)
