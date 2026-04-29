# Lab 1.6 — Destinations & DLQ

> 🟢 **Free tier** — Lambda + SQS only.

**Goal:** Wire up both Lambda Destinations and a DLQ on the same async function. See exactly what each receives, and understand which to use when.

## Concepts

### The async invoke flow

When a function is invoked async (S3, SNS, EventBridge, async `Invoke` API):

```
Event → Lambda internal queue → Function invocation
                                      |
                               (success or fail)
                                      |
                  ┌───────────────────┴───────────────────┐
                  | success                              | fail (after all retries)
                  v                                       v
          OnSuccess Destination                  OnFailure Destination
                                                          |
                                                          v
                                                       OR DLQ
                                                       (if no destination)
```

**Async retry policy:** 2 retries by default (configurable to 0–2), with exponential delay (1 min, then 2 min). After all retries fail, the event goes to the configured destination/DLQ.

### Destinations vs DLQ

Both handle async failures, but they're different mechanisms with different capabilities.

| Feature | Destinations | DLQ |
|---|---|---|
| Routes successes? | **Yes** (`OnSuccess`) | No (failures only) |
| Routes failures? | Yes (`OnFailure`) | Yes |
| Targets | SQS, SNS, EventBridge, Lambda | SQS, SNS |
| Payload | Full execution context (request, response, error) | The original event only |
| Configurable per alias/version? | Yes | Yes |
| Recommended for new code? | **Yes** | Legacy |

**Exam shortcut:** if a question mentions sending the *response* somewhere (e.g., "forward successful results to an SNS topic"), the answer is **OnSuccess Destination**. DLQs cannot do this.

If the question asks about getting full debug context (input + error + stack), **OnFailure Destination** beats DLQ.

If the question is "old-school dead letter handling" or only mentions SNS/SQS as the failure target, DLQ is the simplest correct answer.

### Stream sources are different

For Kinesis and DynamoDB Streams ESM, `OnFailure` is configured on the ESM itself (we did this in Lab 1.2B). It only sends *metadata* about failed batches — not the records themselves. You query the stream for the records using the failed shard iterator info.

For SQS sources, you don't configure a destination on the function — you configure a DLQ on the *queue* (we did that in Lab 1.2A).

## Steps

### 1. Deploy

**PowerShell or Bash:**

```
sam build
sam deploy --guided --stack-name dva-lab-01-06-destinations-dlq
```

### 2. Trigger a success → see it land at OnSuccess

**PowerShell:**

```powershell
$STACK = "dva-lab-01-06-destinations-dlq"
$FN = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text
$SUCCESS_QUEUE = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='SuccessQueueUrl'].OutputValue" --output text

aws lambda invoke --function-name $FN `
  --invocation-type Event `
  --payload '{"action": "succeed"}' `
  --cli-binary-format raw-in-base64-out r.json

Start-Sleep -Seconds 5

aws sqs receive-message --queue-url $SUCCESS_QUEUE --max-number-of-messages 10 --message-attribute-names All
```

**Bash:**

```bash
STACK="dva-lab-01-06-destinations-dlq"
FN=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`FunctionName`].OutputValue' --output text)
SUCCESS_QUEUE=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`SuccessQueueUrl`].OutputValue' --output text)

aws lambda invoke --function-name "$FN" \
  --invocation-type Event \
  --payload '{"action": "succeed"}' \
  --cli-binary-format raw-in-base64-out /tmp/r.json

sleep 5

aws sqs receive-message --queue-url "$SUCCESS_QUEUE" --max-number-of-messages 10 \
  --message-attribute-names All
```

The queue contains a JSON message with the **full request and response** payload from the function — that's the destinations payload format.

### 3. Trigger a failure → see retries → land at OnFailure

**PowerShell:**

```powershell
$FAIL_QUEUE = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='FailureQueueUrl'].OutputValue" --output text

aws lambda invoke --function-name $FN `
  --invocation-type Event `
  --payload '{"action": "fail"}' `
  --cli-binary-format raw-in-base64-out r.json

# Watch the function logs — you'll see 3 invocations (1 + 2 retries) over ~3 min
sam logs -n FailingFunction --stack-name $STACK --tail
```

**Bash:**

```bash
FAIL_QUEUE=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`FailureQueueUrl`].OutputValue' --output text)

aws lambda invoke --function-name "$FN" \
  --invocation-type Event \
  --payload '{"action": "fail"}' \
  --cli-binary-format raw-in-base64-out /tmp/r.json

# Watch the function logs — you'll see 3 invocations (1 + 2 retries) over ~3 min
sam logs -n FailingFunction --stack-name "$STACK" --tail
```

After ~3 minutes, the failed event should land in `FailureQueue`:

**PowerShell or Bash:**

```
aws sqs receive-message --queue-url <FAIL_QUEUE_URL> --max-number-of-messages 10
```

The OnFailure payload includes:
- The original request
- The error type and message
- The stack trace
- Number of retry attempts

### 4. Compare DLQ behavior

The same template also has a DLQ configured. The DLQ would receive only the original event, with no error context. (We don't trigger this separately because Destinations supersedes DLQ when both are configured.)

Order of precedence: **if both are configured, Destinations win for OnFailure. The DLQ is unused.** But you can configure DLQ-only and skip Destinations — they're independent features.

## Exam gotchas

- **Async retries default to 2.** Override with `MaximumRetryAttempts: 0` if your business logic requires "fire and forget — don't retry".
- **`MaximumEventAgeInSeconds`:** events older than this are discarded before invoke. Default 6 hours, max 6 hours, min 60 seconds. Useful when stale events are worse than no events.
- **Destinations need IAM permission to write to the target.** SAM auto-adds these for SQS/SNS/EventBridge/Lambda; raw CloudFormation requires you to add them explicitly.
- **For sync invokes, retries are the caller's responsibility.** Lambda doesn't retry on the caller's behalf.
- **The "Success Destination" gives you the result of the function.** This is a powerful pattern for fan-out: function returns a value, that value is published to SNS/EventBridge for downstream consumers, all without the function having to know about them.
- **DLQ choice between SQS and SNS:** SQS is durable, can be processed at consumer's pace. SNS fans out to multiple subscribers immediately. SQS is more common for DLQs because you usually want to inspect failures, not auto-reprocess them.

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

> 🧹 **Run cleanup before the next lab** — Lab 1.7 (VPC Lambda) starts fresh and creates VPC resources.
