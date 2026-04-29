# Lab 5.4 — DLQ & Redrive

> 🟢 **Free tier** — SQS messages and Lambda invokes are well within free tier.

## What you'll learn

- The SQS DLQ pattern: `RedrivePolicy` + `maxReceiveCount` automatically moves repeatedly-failing messages to a DLQ
- How **redrive task** moves messages back from DLQ to the source queue (introduced 2022 — supersedes manual move-message scripts)
- The **redrive-allow-policy** that pins which sources a DLQ accepts (newer feature, exam-relevant)
- The difference between **SQS DLQ** (poll-based, Lambda ESM uses this) and **Lambda DLQ** (`OnFailure` destination, async invokes)

## Exam blueprint reference

- **D1 TS1** — *"Fault-tolerant design patterns (retries with exponential backoff and jitter, dead-letter queues)"*
- **D1 TS2** — *"Handling the event lifecycle and errors by using code (Lambda Destinations, dead-letter queues)"*

## Theory primer

### maxReceiveCount

The DLQ is wired via the **source queue's** `RedrivePolicy`. If the same message is **received** N times without being deleted, SQS moves it to the DLQ on the (N+1)th receive.

```
maxReceiveCount = 3
- attempt 1: consumer fails → message visible again after visibility timeout
- attempt 2: consumer fails again → still visible
- attempt 3: consumer fails again → moved to DLQ on attempt 4
```

### DLQ type must match source

Standard source → standard DLQ. FIFO source → FIFO DLQ. **Mixing them is a deploy error.**

### Lambda ESM consumes from SQS

When Lambda Event Source Mapping (ESM) polls an SQS queue, it:
- Receives a batch (up to `BatchSize` messages, default 10, max 10000)
- Invokes the Lambda once with the batch
- If the invoke **succeeds**: deletes all batch messages
- If the invoke **fails**: messages return to queue, receive count goes up, eventually DLQ

**Partial batch failure**: if you set `ReportBatchItemFailures: true` in the ESM and your Lambda returns `{"batchItemFailures": [{"itemIdentifier": "<msg-id>"}]}`, only the listed items are returned to the queue — the rest are deleted.

### Redrive task (modern way)

In 2022, AWS added a "redrive" feature: one API call moves messages from a DLQ back to its original source queue.

```
aws sqs start-message-move-task \
  --source-arn <DLQ-ARN> \
  --destination-arn <SOURCE-ARN>   # optional — defaults to original source
```

Before 2022 you had to manually receive from DLQ + send to source + delete from DLQ.

### redrive-allow-policy (locks the DLQ)

A DLQ can specify which source queues are allowed to use it. Default: `byQueue` (any queue in the same account that names this DLQ in its RedrivePolicy can use it). Lock down with `byQueueArns: [<list>]` or `denyAll`.

### SQS DLQ vs Lambda DLQ

| | SQS DLQ | Lambda DLQ |
|---|---|---|
| Trigger | Source queue's `maxReceiveCount` exceeded | Async Lambda invoke fails after retries |
| Configured on | Source queue's RedrivePolicy | Lambda function's `DeadLetterConfig` |
| What lands there | The original message | The original event payload |
| Use with | Lambda **synchronous** ESM consuming SQS | Lambda **asynchronous** invokes (S3 events, EventBridge) |

For Lambda async, **Lambda Destinations** (OnSuccess + OnFailure) are the modern preferred mechanism over Lambda DLQ.

## Architecture

```
   PutMessage  ───► SQS source queue (visTimeout=30s, maxReceive=3)
                       │
                       │ ESM polls + invokes
                       ▼
                    Lambda consumer
                       │
                       │ raises on payload.fail==true
                       ▼
                    SQS source queue (msg returns, attempt count +1)
                       │
                    after attempt 3+ →
                       │
                       ▼
                    SQS DLQ
                       │
                       │ start-message-move-task →
                       ▼
                    SQS source queue (back to retry)
```

## Step 1: Deploy

The template uses `CodeUri: src/`, so we need to `package` (upload code to S3) before `deploy`.

### PowerShell

```powershell
$ACCOUNT = aws sts get-caller-identity --query Account --output text
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$ACCOUNT-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-05-04-dlq `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Bash

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCOUNT}-${AWS_DEFAULT_REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-05-04-dlq \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Send a "good" message + a "poison" message

### PowerShell

```powershell
$Source = aws cloudformation describe-stacks --stack-name dva-lab-05-04-dlq --query "Stacks[0].Outputs[?OutputKey=='SourceQueueUrl'].OutputValue" --output text
$Dlq = aws cloudformation describe-stacks --stack-name dva-lab-05-04-dlq --query "Stacks[0].Outputs[?OutputKey=='DlqUrl'].OutputValue" --output text

# Good message — Lambda processes successfully
aws sqs send-message --queue-url $Source --message-body '{"id":"1","fail":false}'

# Poison — Lambda will fail every time
aws sqs send-message --queue-url $Source --message-body '{"id":"2","fail":true}'

# Wait ~2 minutes for the consumer Lambda to retry 3 times
Start-Sleep -Seconds 120

aws sqs receive-message --queue-url $Dlq --max-number-of-messages 5 --wait-time-seconds 2
```

### Bash

```bash
SOURCE=$(aws cloudformation describe-stacks --stack-name dva-lab-05-04-dlq --query "Stacks[0].Outputs[?OutputKey=='SourceQueueUrl'].OutputValue" --output text)
DLQ=$(aws cloudformation describe-stacks --stack-name dva-lab-05-04-dlq --query "Stacks[0].Outputs[?OutputKey=='DlqUrl'].OutputValue" --output text)

aws sqs send-message --queue-url "$SOURCE" --message-body '{"id":"1","fail":false}'
aws sqs send-message --queue-url "$SOURCE" --message-body '{"id":"2","fail":true}'

sleep 120

aws sqs receive-message --queue-url "$DLQ" --max-number-of-messages 5 --wait-time-seconds 2
```

The poison message ends up in the DLQ. The good one was processed and deleted.

## Step 3: Inspect Lambda logs

```
aws logs tail /aws/lambda/dva-lab-05-04-consumer --since 5m
```

You'll see the Lambda invoked at least 3 times for the poison message, raising each time. After the third retry, ESM gave up and SQS moved the message to the DLQ.

## Step 4: Redrive — move messages from DLQ back to source

```
DLQ_ARN=$(aws cloudformation describe-stacks --stack-name dva-lab-05-04-dlq --query "Stacks[0].Outputs[?OutputKey=='DlqArn'].OutputValue" --output text)
SOURCE_ARN=$(aws cloudformation describe-stacks --stack-name dva-lab-05-04-dlq --query "Stacks[0].Outputs[?OutputKey=='SourceQueueArn'].OutputValue" --output text)

aws sqs start-message-move-task --source-arn "$DLQ_ARN" --destination-arn "$SOURCE_ARN"
```

The task immediately starts moving messages. Check status:

```
aws sqs list-message-move-tasks --source-arn "$DLQ_ARN"
```

After the move, the messages will be processed again by the consumer Lambda. If the underlying bug is now fixed, they succeed; if not, they cycle back to DLQ after another 3 retries.

## Step 5: Compare — partial batch failure

Re-deploy the template with `BatchSize: 10` and `ReportBatchItemFailures: true`. Send 5 good + 5 poison in one batch:

```bash
for i in $(seq 1 5); do
  aws sqs send-message --queue-url "$SOURCE" --message-body '{"id":"good-'"$i"'","fail":false}'
done
for i in $(seq 1 5); do
  aws sqs send-message --queue-url "$SOURCE" --message-body '{"id":"poison-'"$i"'","fail":true}'
done
```

The Lambda processes the good messages and returns the poison IDs in `batchItemFailures`. **Only the poison messages return to the queue** — without partial batch failure, the entire 10-message batch would have returned, multiplying retries.

## Exam gotchas

- **DLQ type must match source.** Standard with standard, FIFO with FIFO.
- **`maxReceiveCount` of 1 means "no retries — DLQ on first failure"**, not zero retries.
- **DLQ visibility timeout** can differ from source. DLQ usually has a longer retention (max 14 days for the messages to be inspected before someone redrives them).
- **The DLQ is just a regular queue** — you can poll it, set redrive policies on it, etc. It's only "the DLQ" because the source queue named it.
- **Lambda ESM auto-retries before DLQ.** Failure in Lambda → message returns to queue → ESM retries → after 3 receives (default), the message goes to DLQ.
- **Without partial batch failure**, one bad apple in a batch poisons the whole batch — all 10 messages return for retry.
- **Lambda DLQ is for async invokes** (S3, EventBridge events). **SQS DLQ is for polling.** Different mechanisms.
- **Lambda Destinations** (OnSuccess + OnFailure) are preferred over Lambda DLQ — more flexible (can send to SQS / SNS / EventBridge / another Lambda).
- **redrive-allow-policy** is the newer feature that locks down which sources can use a DLQ. Most existing DLQs don't have it — defaults to "byQueue" (any in same account).

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

> 🧹 **Run cleanup before Lab 5.5.** Lab 5.5 introduces Kinesis Data Streams.

Continue: [Lab 5.5 — Kinesis Data Streams](../lab-05-kinesis-data-streams/README.md)
