# Lab 5.1 — SQS Standard vs FIFO

> 🟢 **Cost banner: Free tier.** SQS gives 1M requests/month perpetually free. Lambda's free tier covers all the invokes you'll do here.

## What you'll learn

- The exact behavioral differences between Standard and FIFO queues — ordering, delivery semantics, throughput, dedup.
- How **visibility timeout**, **long polling**, and **`maxReceiveCount` / DLQ** interact in real traffic.
- Why FIFO costs more and when it's worth it.

## Exam blueprint reference

- **Domain 1 / TS1 — Knowledge of:** "Differences between synchronous and asynchronous patterns"; "Fault-tolerant design patterns (retries with exponential backoff and jitter, dead-letter queues)".
- **Domain 1 / TS1 — Skills in:** "Writing code to use messaging services".
- **Domain 1 / TS2 — Knowledge of:** "Event source mapping".
- **Domain 4 / TS3 — Knowledge of:** "Messaging services (SQS, SNS)".

## Theory primer

### Standard queue

- **Best-effort ordering.** Messages usually arrive in send-order, but not guaranteed.
- **At-least-once delivery.** Network partitions or consumer crashes can cause duplicates. Your consumer must be **idempotent**.
- **Unlimited throughput.** Scales horizontally as you add producers/consumers.
- Cheaper per-message than FIFO.

### FIFO queue

- **Strict ordering** *within a `MessageGroupId`*. Messages with **different** group IDs can interleave; messages with the **same** group ID are strictly ordered.
- **Exactly-once delivery** within a 5-minute deduplication window.
- **Throughput limit:** 300 TPS / 3,000 with batching (default per-message-group mode); high-throughput mode is per-queue and raises this.
- Name **must end in `.fifo`**.

### Visibility timeout

When a consumer reads a message, SQS hides it from other consumers for the visibility timeout (default 30 s, max 12 hr). The consumer must call `DeleteMessage` before the timer expires, or the message becomes visible again and another consumer can pick it up — **causing a duplicate process**.

> **Exam-critical rule:** for Lambda + SQS via ESM, **set visibility timeout ≥ 6× your function timeout.** Why 6×? Lambda may retry within the same poller batch on certain errors. The 6× rule gives margin.

### Long polling

`ReceiveMessage` can wait 0–20 s for messages before responding. Default: 0 (short poll = "ask once and return immediately, even if empty"). Long poll = wait for messages to arrive, return as soon as any do, or after `WaitTimeSeconds`.

> **Always set `WaitTimeSeconds=20`.** Reduces empty receives → reduces cost.

### DLQ + `maxReceiveCount`

Set a `RedrivePolicy` on the source queue: `{maxReceiveCount: 5, deadLetterTargetArn: ...}`. After 5 failed receives (i.e., 5 visibility-timeout expirations without a delete), SQS moves the message to the DLQ.

> **DLQ must be the same type as the source.** Standard ↔ Standard. FIFO ↔ FIFO.

## Architecture

```
You (CLI) ──send─→ ┌────────────────────────┐
                   │ dva-lab-05-01-standard │ ──ESM──→ ConsumerLambda ──logs─→ CloudWatch
                   └────────────────────────┘                ↑
                                                  on 5 failures
                                                             ↓
                                              ┌──────────────────────────────┐
                                              │ dva-lab-05-01-standard-dlq   │
                                              └──────────────────────────────┘

You (CLI) ──send─→ ┌──────────────────────────────┐
                   │ dva-lab-05-01-orders.fifo    │ ──ESM──→ ConsumerLambdaFifo
                   └──────────────────────────────┘
```

## Prerequisites

None beyond the global setup. This lab starts fresh.

If you ran a previous Module 5 lab and skipped cleanup, run the master cleanup first or you may hit name collisions.

## Step 1: Deploy

The template creates: 1 standard queue + its DLQ, 1 FIFO queue, 2 consumer Lambdas (one per queue), the IAM roles for both, and the event source mappings.

### PowerShell

```powershell
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$(aws sts get-caller-identity --query Account --output text)-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-05-01-sqs `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
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
  --stack-name dva-lab-05-01-sqs \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Read the outputs into shell vars

**PowerShell:**
```powershell
$STACK = "dva-lab-05-01-sqs"
$STD_QUEUE  = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='StandardQueueUrl'].OutputValue" --output text
$STD_DLQ    = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='StandardDlqUrl'].OutputValue" --output text
$FIFO_QUEUE = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='FifoQueueUrl'].OutputValue" --output text
$STD_FN     = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='StandardFunctionName'].OutputValue" --output text
$FIFO_FN    = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='FifoFunctionName'].OutputValue" --output text
"Standard: $STD_QUEUE"
"FIFO:     $FIFO_QUEUE"
```

**Bash:**
```bash
STACK="dva-lab-05-01-sqs"
STD_QUEUE=$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='StandardQueueUrl'].OutputValue" --output text)
STD_DLQ=$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='StandardDlqUrl'].OutputValue" --output text)
FIFO_QUEUE=$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='FifoQueueUrl'].OutputValue" --output text)
STD_FN=$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='StandardFunctionName'].OutputValue" --output text)
FIFO_FN=$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='FifoFunctionName'].OutputValue" --output text)
echo "Standard: $STD_QUEUE"
echo "FIFO:     $FIFO_QUEUE"
```

## Step 2: Test Standard queue

### Send 10 messages to Standard

**PowerShell or Bash:** (script handles both — pick the matching one)

PowerShell:
```powershell
.\scripts\seed-standard.ps1 $STD_QUEUE
```

Bash:
```bash
./scripts/seed-standard.sh "$STD_QUEUE"
```

The script sends 10 messages with bodies `msg-001`..`msg-010`.

### Watch the consumer process them

**PowerShell:**
```powershell
aws logs tail "/aws/lambda/$STD_FN" --since 2m --follow
```

**Bash:**
```bash
aws logs tail "/aws/lambda/$STD_FN" --since 2m --follow
```

Press Ctrl-C after you see 10 "processed" lines. **Note the order.** It may match send order, or it may not — Standard makes no guarantee.

## Step 3: Test FIFO queue with `MessageGroupId`

Send 5 messages with `MessageGroupId=order-A` and 5 with `MessageGroupId=order-B`. The two groups can interleave with each other but each group is strictly ordered.

**PowerShell:**
```powershell
.\scripts\seed-fifo.ps1 $FIFO_QUEUE
```

**Bash:**
```bash
./scripts/seed-fifo.sh "$FIFO_QUEUE"
```

Tail the FIFO consumer's logs:

```
aws logs tail "/aws/lambda/$FIFO_FN" --since 2m --follow
```

You should see all 5 `order-A` messages in send order, all 5 `order-B` messages in send order — but the two groups may interleave.

## Step 4: Test deduplication

The FIFO queue was created with **`ContentBasedDeduplication=true`**. Send the **same** message body twice within 5 minutes — only the first will be delivered.

**PowerShell:**
```powershell
aws sqs send-message --queue-url $FIFO_QUEUE --message-body "duplicate-test" --message-group-id "test"
aws sqs send-message --queue-url $FIFO_QUEUE --message-body "duplicate-test" --message-group-id "test"
```

**Bash:**
```bash
aws sqs send-message --queue-url "$FIFO_QUEUE" --message-body "duplicate-test" --message-group-id "test"
aws sqs send-message --queue-url "$FIFO_QUEUE" --message-body "duplicate-test" --message-group-id "test"
```

Tail the FIFO consumer's logs — you'll see **one** invocation with `duplicate-test`, not two.

## Step 5: Test visibility timeout

The consumer Lambda for Standard is configured to deliberately **fail** when the body starts with `fail-`. Each failure increments `ApproximateReceiveCount`. After 3 failures, the message moves to DLQ.

**PowerShell or Bash:**
```
aws sqs send-message --queue-url $STD_QUEUE --message-body "fail-poison-1"
```

Wait ~3 minutes (visibility timeout 30 s × 3 + buffer). Check the DLQ:

**PowerShell or Bash:**
```
aws sqs receive-message --queue-url $STD_DLQ --wait-time-seconds 5
```

You should see `fail-poison-1` in the DLQ. The source queue should be empty.

## Step 6: Compare — long polling vs short polling

**Short polling (default):**
```
aws sqs receive-message --queue-url $STD_QUEUE
```

Returns immediately. If no messages, returns empty. Each call = one billable request.

**Long polling (recommended):**
```
aws sqs receive-message --queue-url $STD_QUEUE --wait-time-seconds 20
```

Waits up to 20 s for a message. Returns the moment one arrives. **Same cost = 1 billable request, but eliminates the empty-receive loop in production code.**

## Step 7: Compare — change visibility timeout, observe duplicates

The consumer logs each invocation's `messageId`. Send a message, then artificially make the consumer slow:

**PowerShell or Bash:**
```
aws sqs send-message --queue-url $STD_QUEUE --message-body "slow-message"
```

Right now `VisibilityTimeout = 60s` and Lambda timeout = `10s`. The 6× rule (60 ≥ 6×10) holds — no duplicate processing.

Now break the rule. Update the function timeout to 30 s (visibility timeout becomes only 2× function timeout):

**PowerShell:**
```powershell
aws lambda update-function-configuration `
  --function-name $STD_FN `
  --timeout 30
```

**Bash:**
```bash
aws lambda update-function-configuration \
  --function-name "$STD_FN" \
  --timeout 30
```

Send another `fail-` message. Observe in CloudWatch logs that the same `messageId` may be processed multiple times before reaching DLQ. **This is the bug the 6× rule prevents.**

## Exam gotchas

- **At-least-once vs exactly-once:** Standard = at-least-once = idempotent consumers required. FIFO = exactly-once within 5 min, but you still need idempotency for cross-window dedup.
- **`maxReceiveCount` is on the source's `RedrivePolicy`,** never on the DLQ.
- **DLQ must match source type.** Standard with Standard, FIFO with FIFO. The exam will test this.
- **6× rule:** visibility timeout ≥ 6 × Lambda function timeout when using ESM. The exam may give you a scenario where visibility timeout is *less than* function timeout and ask why duplicates appear.
- **`ContentBasedDeduplication`** hashes the entire message body. To dedupe across slightly different bodies, set an explicit `MessageDeduplicationId`.
- **FIFO throughput is per `MessageGroupId`** in default mode. To get 3,000+ TPS, distribute across many `MessageGroupId` values OR enable high-throughput mode.
- **Standard queue throughput is unlimited.** No need to "request more" — it just scales.
- **SQS retention:** 4 days default, **14 days max**. The exam mixes this up with SNS (which has no retention) and Kinesis (1–365 days).
- **Encryption:** SSE-SQS (AWS-managed key, free) or SSE-KMS (your CMK). Always TLS in transit.
- **Long polling** never increases cost — same 1 request, just longer wait.

## Cleanup

**PowerShell:**
```powershell
.\cleanup.ps1
```

**Bash:**
```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before the next lab — Lab 5.2 starts fresh** with SNS topics and a different stack.
