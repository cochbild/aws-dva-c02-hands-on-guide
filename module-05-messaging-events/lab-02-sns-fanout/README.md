# Lab 5.2 — SNS Fanout

> 🟢 **Free tier** — SNS first 1M publishes/month free, perpetual. SQS first 1M requests/month free, perpetual.

## What you'll learn

- The fanout pattern: one publish → many subscribers
- **Subscription filter policies** — server-side filtering by message attributes (a frequent exam target)
- The differences between **standard topic + standard queue**, **FIFO topic + FIFO queue**, and SNS-with-Raw-Message-Delivery
- Why an SQS queue subscribed to SNS needs a **queue policy**, not just an SNS subscription

## Exam blueprint reference

- **D1 TS1** — *"Architectural patterns (event-driven, fanout)"*, *"sync vs async"*
- **D4 TS3** — *"Messaging services (SQS, SNS)"*, *"Using subscription filter policies to optimize messaging"*

## Theory primer

### Topic types

| | **Standard topic** | **FIFO topic** |
|---|---|---|
| Ordering | best-effort | strict per `MessageGroupId` |
| Throughput | unlimited | 300 publishes/sec/group, 3000/sec/topic with batching |
| Subscribers | SQS, Lambda, email, SMS, HTTP/S, Kinesis Firehose, mobile push | **SQS FIFO only** |
| Deduplication | no | yes (5-min window via `MessageDeduplicationId` or content-based) |
| Pricing | $0.50 / million publishes | $0.30 / million publishes + $0.017/GB |

The exam loves the **"FIFO topics can only fan out to FIFO queues"** rule.

### Filter policies

Subscriptions can specify a filter policy — a JSON document the message's **attributes** must satisfy or the message is **dropped before delivery** (saves Lambda invokes / SQS receives).

```json
{
  "event_type": ["order_placed", "order_shipped"],
  "amount": [{"numeric": [">", 100]}],
  "region": [{"prefix": "us-"}]
}
```

Operators: equality (list), `prefix`, `anything-but`, `numeric`, `exists`, `suffix`, `cidr`. Filter is evaluated against **MessageAttributes** by default; can also be evaluated against the **MessageBody** if `FilterPolicyScope: MessageBody` is set.

### Raw Message Delivery

Without it, SNS wraps your payload in an envelope (`Type`, `MessageId`, `Subject`, `Message`, `Timestamp`, ...). Subscribers parse it. With Raw Message Delivery enabled (per subscription, SQS/HTTPS only), the subscriber receives **just your payload**. Recommended for SQS subscribers — simpler downstream code.

### Topic policies vs subscription policies

- **Topic policy:** who can `sns:Publish` to the topic.
- **Queue policy:** who can `sqs:SendMessage` to the queue. **For an SNS → SQS subscription, the queue policy must allow `sns.amazonaws.com` to send.** CloudFormation doesn't write this for you automatically — must be in the template.

## Architecture

```
                                   ┌──── SQS standard queue ────┐
                                   │   (orders-queue)            │
                                   │   filter: amount > 50       │
                                   │                              │
   PublishMessage ──► SNS topic ───┼──► Lambda subscriber         │
   {amount: ..,    ┐ (orders-topic)│   (no filter — gets all)    │
    type: ..,      │                │                              │
    region: us-..} │                └──► email (manual subscribe — │
                   │                     skipped in this lab)      │
                   │
                   └─► (FIFO version with FIFO topic + FIFO queue
                       optionally deployed via parameter)
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
  --stack-name dva-lab-05-02-sns-fanout `
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
  --stack-name dva-lab-05-02-sns-fanout \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Publish messages and observe fanout

### PowerShell

```powershell
$Topic = aws cloudformation describe-stacks --stack-name dva-lab-05-02-sns-fanout --query "Stacks[0].Outputs[?OutputKey=='TopicArn'].OutputValue" --output text
$Queue = aws cloudformation describe-stacks --stack-name dva-lab-05-02-sns-fanout --query "Stacks[0].Outputs[?OutputKey=='QueueUrl'].OutputValue" --output text

# Message that PASSES the filter (amount > 50)
aws sns publish --topic-arn $Topic --message "big order" `
  --message-attributes "amount={DataType=Number,StringValue=200},region={DataType=String,StringValue=us-east-1}"

# Message that FAILS the filter (amount = 5)
aws sns publish --topic-arn $Topic --message "small order" `
  --message-attributes "amount={DataType=Number,StringValue=5},region={DataType=String,StringValue=us-east-1}"

# Both messages reach the Lambda (no filter), but only the big one reaches the SQS queue
aws sqs receive-message --queue-url $Queue --max-number-of-messages 10 --wait-time-seconds 2
```

### Bash

```bash
TOPIC=$(aws cloudformation describe-stacks --stack-name dva-lab-05-02-sns-fanout --query "Stacks[0].Outputs[?OutputKey=='TopicArn'].OutputValue" --output text)
QUEUE=$(aws cloudformation describe-stacks --stack-name dva-lab-05-02-sns-fanout --query "Stacks[0].Outputs[?OutputKey=='QueueUrl'].OutputValue" --output text)

# Pass filter
aws sns publish --topic-arn "$TOPIC" --message "big order" \
  --message-attributes 'amount={DataType=Number,StringValue=200},region={DataType=String,StringValue=us-east-1}'

# Fail filter
aws sns publish --topic-arn "$TOPIC" --message "small order" \
  --message-attributes 'amount={DataType=Number,StringValue=5},region={DataType=String,StringValue=us-east-1}'

aws sqs receive-message --queue-url "$QUEUE" --max-number-of-messages 10 --wait-time-seconds 2
```

You should see exactly **one** message in the queue ("big order"). The Lambda gets both, viewable via:

```
aws logs tail /aws/lambda/dva-lab-05-02-subscriber --since 5m
```

## Step 3: Compare — Raw Message Delivery

The SQS subscription has `RawMessageDelivery: true`. Look at the message body — it's **just** "big order", not wrapped in an SNS envelope. Without raw delivery the body would be:

```json
{
  "Type": "Notification",
  "MessageId": "...",
  "TopicArn": "...",
  "Message": "big order",
  "Timestamp": "...",
  "MessageAttributes": {"amount": {"Type":"Number","Value":"200"}, "region":{"Type":"String","Value":"us-east-1"}}
}
```

Switch raw delivery off in the template and redeploy to see the wrapper.

## Step 4: Inspect the queue policy

```
aws sqs get-queue-attributes --queue-url $QUEUE --attribute-names Policy --output json
```

The `Policy` value allows `sns.amazonaws.com` to `sqs:SendMessage` with a `aws:SourceArn` condition pinning to the topic ARN. **Without that, SNS would silently fail to deliver.** The most common SNS→SQS bug.

## Step 5: Compare — FIFO topic and queue

The template includes optional FIFO resources guarded by a parameter `EnableFifo` (default `false` to save you from cleaning up extras). Re-deploy with `EnableFifo=true` to see them. FIFO publish:

```
aws sns publish --topic-arn $FIFO_TOPIC --message "ordered-1" \
  --message-group-id "customer-42" --message-deduplication-id "$(uuidgen)"
```

`MessageGroupId` is the strict-ordering boundary. Two messages with the same group ID arrive in order; messages in different groups can interleave. `MessageDeduplicationId` prevents the same message being processed twice in a 5-min window.

## Exam gotchas

- **FIFO topic → FIFO queue ONLY.** A FIFO topic cannot fanout to standard queues, Lambda, email, etc.
- **Filter policies are evaluated against MessageAttributes by default.** To filter on payload contents, set `FilterPolicyScope: MessageBody`.
- **Filter operators:** equality, prefix, anything-but, numeric, exists, suffix, cidr.
- **Raw Message Delivery** strips the envelope — recommend it for SQS subscribers.
- **Queue policy is mandatory for SNS → SQS** delivery.
- **Lambda subscriber runs async** — SNS doesn't wait for return. Errors don't propagate to the publisher; configure SNS dead-letter queue for the SUBSCRIPTION (per-subscription) to capture undeliverable messages.
- **SNS message size: 256 KB.** For larger, use **SNS Extended Library** (stores body in S3, sends pointer).
- **Encryption:** SSE at rest with KMS. **SNS does NOT support SSE-C** — only AWS-managed or customer-managed KMS keys.
- **Cross-region delivery** is supported (subscriber can be in different region than topic).
- **Cross-account delivery** is supported, but the topic policy must allow it AND the subscriber's policy must allow.

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

> 🧹 **Run cleanup before Lab 5.3 (EventBridge).** Different stack, fresh resources.

Continue: [Lab 5.3 — EventBridge rules](../lab-03-eventbridge-rules/README.md)
