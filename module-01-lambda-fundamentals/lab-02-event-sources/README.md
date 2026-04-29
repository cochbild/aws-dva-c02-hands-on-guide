# Lab 1.2 — Event Sources

> 🟢 **Free tier** — Lambda + SQS + DynamoDB on-demand + S3 (small) all sit inside perpetual free tier. Lab finishes well under any limit.

## What you'll learn

- The hard line between **push** invocations (S3, SNS, EventBridge → Lambda) and **poll** invocations (SQS / Kinesis / DynamoDB Streams via Event Source Mappings)
- Batching, batch windows, and **partial batch failures** (`ReportBatchItemFailures`)
- Failure handling per source: SQS DLQ vs `BisectBatchOnFunctionError` for streams vs Lambda Destinations for async push

## Exam blueprint reference

- **Domain 1, TS2 — Develop code for AWS Lambda → Knowledge of:** Event source mapping, Event-driven architecture
- **Domain 1, TS2 → Skills in:** Implementing Lambda triggers and event sources, Handling the event lifecycle and errors by using code (Destinations, dead-letter queues), Integrating Lambda functions with AWS services
- **Domain 1, TS3 → Knowledge of:** DynamoDB Streams, S3 events
- **Domain 4, TS3 → Knowledge of:** Messaging services (SQS, SNS)

## Theory primer

### Two ways Lambda gets invoked

#### 1. Push (the source calls `Invoke`)

The source service makes the API call. Sub-cases:

| Source | Sync or async? |
|---|---|
| API Gateway, ALB, Cognito triggers, Lex, sync `aws lambda invoke` | **Sync** — caller waits, errors returned, **no auto-retry** |
| S3 events, SNS, EventBridge, async `aws lambda invoke`, SES, CloudWatch Logs | **Async** — Lambda queues internally, returns 202, **auto-retries 2 times** (1 min, 2 min), then sends to **destination on failure** or **DLQ** |

#### 2. Poll (Lambda is the active party — Event Source Mapping = ESM)

Lambda runs a poller that reads batches and invokes your function:

| Source | Default batch | Max batch | Notes |
|---|---:|---:|---|
| SQS standard | 10 | 10,000 | Long-poll, parallel pollers |
| SQS FIFO | 10 | 10 | Per message-group ordering preserved |
| Kinesis Data Streams | 100 | 10,000 | Per shard |
| DynamoDB Streams | 100 | 10,000 | Per shard, **24h retention** |
| MSK / self-managed Kafka | 100 | 10,000 | Per partition |
| Amazon MQ | 100 | 10,000 | — |

You don't pay for the polling. AWS does it for you.

### Failure handling, by source — exam gold

**SQS:**
- Default: throwing returns the **whole batch** to the queue (visibility timeout expiry)
- After `maxReceiveCount` messages move to the SQS DLQ (set via `RedrivePolicy` on the source queue, **not** on the function)
- **`ReportBatchItemFailures`** lets the function return only failed message IDs; successes are deleted

**Kinesis / DynamoDB Streams:**
- Default: failures retry **forever**, blocking the shard ("poison pill")
- Mitigations: `BisectBatchOnFunctionError`, `MaximumRetryAttempts`, `MaximumRecordAgeInSeconds`, `OnFailure` destination (SQS or SNS), `ReportBatchItemFailures`

**Async push (S3, SNS, EventBridge):**
- 2 automatic retries with exponential backoff
- After last retry: **on-failure destination** (SQS, SNS, EventBridge bus, Lambda) **or** function-level DLQ (deprecated, use Destinations)

### S3 → Lambda specifics

- S3 events can target Lambda directly, SNS, SQS, or EventBridge
- Direct → Lambda is **async push** with no buffering
- Filters: prefix + suffix only, **no wildcards** in the middle, **only one rule per overlapping prefix per target**
- For complex filtering: route via EventBridge

### SQS poller scale-out

For SQS standard, Lambda starts with **5 concurrent batches** and adds up to **300 / minute** as backlog grows. A burst can exhaust your account-wide concurrency — set **reserved concurrency on the function** to cap it.

## Architecture

This lab has three independent sub-stacks, each demonstrating a different event source. Each is its own folder with its own template:

```
lab-02-event-sources/
├── sqs-consumer/      ← Sub-lab A: SQS poll + ReportBatchItemFailures + DLQ
├── ddb-streams/       ← Sub-lab B: DDB Streams poll + BisectBatchOnFunctionError
└── s3-trigger/        ← Sub-lab C: S3 push (async) + Destinations
```

## Prerequisites

- Lab 1.1 completed and **cleaned up**
- Artifacts bucket exists (we'll create one if not)

### Create the shared artifacts bucket (one-time per account/region)

`aws cloudformation package` needs an S3 bucket to upload Lambda code. We'll use this same bucket for the rest of the course.

#### PowerShell

```powershell
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$ACCOUNT_ID-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null
$env:ARTIFACTS_BUCKET = $ARTIFACTS_BUCKET
Write-Host "Artifacts bucket: $env:ARTIFACTS_BUCKET"
```

#### Bash

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCOUNT_ID}-${AWS_DEFAULT_REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true
export ARTIFACTS_BUCKET
echo "Artifacts bucket: $ARTIFACTS_BUCKET"
```

> Future labs reuse this bucket. The variable `$ARTIFACTS_BUCKET` (PowerShell or Bash) is referenced throughout.

## Sub-lab A — SQS consumer with partial batch failures

### Step 1: Deploy

#### PowerShell

```powershell
cd sqs-consumer

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $env:ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-01-02-sqs `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

#### Bash

```bash
cd sqs-consumer

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-01-02-sqs \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Step 2: Send messages, watch behavior

#### PowerShell

```powershell
$QUEUE_URL = aws cloudformation describe-stacks --stack-name dva-lab-01-02-sqs `
  --query "Stacks[0].Outputs[?OutputKey=='QueueUrl'].OutputValue" --output text
$DLQ_URL = aws cloudformation describe-stacks --stack-name dva-lab-01-02-sqs `
  --query "Stacks[0].Outputs[?OutputKey=='DlqUrl'].OutputValue" --output text

# Seed: 5 good messages + 1 designed to fail
.\..\scripts\seed-sqs.ps1 -QueueUrl $QUEUE_URL

# Tail logs (Ctrl+C to stop)
$FN = aws cloudformation describe-stacks --stack-name dva-lab-01-02-sqs `
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text
aws logs tail "/aws/lambda/$FN" --follow
```

#### Bash

```bash
QUEUE_URL=$(aws cloudformation describe-stacks --stack-name dva-lab-01-02-sqs \
  --query "Stacks[0].Outputs[?OutputKey=='QueueUrl'].OutputValue" --output text)
DLQ_URL=$(aws cloudformation describe-stacks --stack-name dva-lab-01-02-sqs \
  --query "Stacks[0].Outputs[?OutputKey=='DlqUrl'].OutputValue" --output text)

# Seed: 5 good messages + 1 designed to fail
../scripts/seed-sqs.sh "$QUEUE_URL"

# Tail logs (Ctrl+C to stop)
FN=$(aws cloudformation describe-stacks --stack-name dva-lab-01-02-sqs \
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text)
aws logs tail "/aws/lambda/$FN" --follow
```

After ~3 retry cycles, the failing message moves to the DLQ:

**PowerShell or Bash:**
```
aws sqs receive-message --queue-url <DLQ_URL>
```

### Step 3: Compare — turn off `ReportBatchItemFailures`

Edit `template.yaml`, remove the `FunctionResponseTypes:` block, redeploy, send the same set of messages. Now:

- The whole batch fails on the bad message
- Good messages get re-delivered (potentially many times before they all eventually pass)
- This is **why partial batch failure exists** — minimizes wasted invokes

Restore the line before continuing.

## Sub-lab B — DynamoDB Streams with BisectBatchOnFunctionError

### Step 1: Deploy

#### PowerShell

```powershell
cd ../ddb-streams

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $env:ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-01-02-ddb `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

#### Bash

```bash
cd ../ddb-streams

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-01-02-ddb \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Step 2: Insert items and watch the bisect

#### PowerShell

```powershell
$TABLE = aws cloudformation describe-stacks --stack-name dva-lab-01-02-ddb `
  --query "Stacks[0].Outputs[?OutputKey=='TableName'].OutputValue" --output text

aws dynamodb put-item --table-name $TABLE --cli-input-json file://../payloads/ddb-good-1.json
aws dynamodb put-item --table-name $TABLE --cli-input-json file://../payloads/ddb-good-2.json
aws dynamodb put-item --table-name $TABLE --cli-input-json file://../payloads/ddb-poison.json

aws logs tail "/aws/lambda/dva-lab-01-02-ddb-consumer" --follow
```

#### Bash

```bash
TABLE=$(aws cloudformation describe-stacks --stack-name dva-lab-01-02-ddb \
  --query "Stacks[0].Outputs[?OutputKey=='TableName'].OutputValue" --output text)

aws dynamodb put-item --table-name "$TABLE" --cli-input-json file://../payloads/ddb-good-1.json
aws dynamodb put-item --table-name "$TABLE" --cli-input-json file://../payloads/ddb-good-2.json
aws dynamodb put-item --table-name "$TABLE" --cli-input-json file://../payloads/ddb-poison.json

aws logs tail "/aws/lambda/dva-lab-01-02-ddb-consumer" --follow
```

You'll see the batch get retried, then split (`BisectBatchOnFunctionError`), narrowing down to the single poison record. After `MaximumRetryAttempts: 2`, that record is discarded and the good records flow through. Without bisect, the **shard would be blocked indefinitely**.

### Step 3: Compare — disable bisect

Set `BisectBatchOnFunctionError: false`, redeploy, repeat. The whole shard stalls on the poison record. **This is the canonical "poison pill" exam scenario.**

Restore before continuing.

## Sub-lab C — S3 push with Destinations

### Step 1: Deploy

#### PowerShell

```powershell
cd ../s3-trigger

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $env:ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-01-02-s3 `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

#### Bash

```bash
cd ../s3-trigger

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-01-02-s3 \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Step 2: Upload good and bad files

#### PowerShell

```powershell
$BUCKET = aws cloudformation describe-stacks --stack-name dva-lab-01-02-s3 `
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text

# Good upload
'{"hello":"world"}' | Out-File -Encoding ascii good.json
aws s3 cp good.json "s3://$BUCKET/good.json"

# Bad upload (function rejects payloads without a "hello" key)
'not json' | Out-File -Encoding ascii bad.json
aws s3 cp bad.json "s3://$BUCKET/bad.json"
```

#### Bash

```bash
BUCKET=$(aws cloudformation describe-stacks --stack-name dva-lab-01-02-s3 \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)

echo '{"hello":"world"}' > good.json
aws s3 cp good.json "s3://$BUCKET/good.json"

echo 'not json' > bad.json
aws s3 cp bad.json "s3://$BUCKET/bad.json"
```

The bad file fires async invokes. After 2 retries (~3 minutes), the failure event lands in the on-failure destination SQS queue:

**PowerShell or Bash:**
```
aws sqs receive-message \
  --queue-url <OnFailureDestQueueUrl from outputs> \
  --max-number-of-messages 10 \
  --wait-time-seconds 5
```

The message body is the **failure record** — original event + error + retry count.

### Step 3: Compare — turn off Destinations

Remove `EventInvokeConfig` from the function in `template.yaml`. Redeploy, retry the bad upload. Failures vanish silently into Lambda's CloudWatch metrics. **This is exactly why Destinations matter for async invokes.**

Restore before continuing.

## Exam gotchas

- **SQS visibility timeout ≥ Lambda timeout × 6** is the AWS-recommended ratio. Shorter = duplicate processing.
- **DLQ on the queue (SQS) vs Destination on the function (async push):** different mechanisms, different exam answers — read the question carefully.
- **Lambda doesn't delete from SQS until the batch succeeds.** Successful invocations call `DeleteMessageBatch`. A throw = nothing deleted.
- **DynamoDB Streams retention is fixed at 24 hours.** Kinesis defaults 24h but is configurable up to 365 days.
- **DDB stream view types:** `KEYS_ONLY` / `NEW_IMAGE` / `OLD_IMAGE` / `NEW_AND_OLD_IMAGES`. Default for new tables is `NEW_AND_OLD_IMAGES` only when you opt in — otherwise no stream.
- **S3 event filter rules:** prefix + suffix only, no wildcards mid-key. **Only one rule per overlapping prefix per target type** — the exam will offer "two rules on the same prefix" as a distractor.
- **`MaximumBatchingWindowInSeconds`** trades latency for batching efficiency. Higher = bigger batches = cheaper, slower.

## Cleanup

### PowerShell

```powershell
.\sqs-consumer\cleanup.ps1
.\ddb-streams\cleanup.ps1
.\s3-trigger\cleanup.ps1
```

### Bash

```bash
./sqs-consumer/cleanup.sh
./ddb-streams/cleanup.sh
./s3-trigger/cleanup.sh
```

## What's next

> 🧹 **Run cleanup** for all three sub-labs before the next lab — Lab 1.3 (versions & aliases) starts fresh.
