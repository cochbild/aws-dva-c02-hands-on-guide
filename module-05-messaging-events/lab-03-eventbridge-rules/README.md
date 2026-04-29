# Lab 5.3 — EventBridge Rules

> 🟢 **Free tier** — EventBridge native AWS events are perpetually free; custom events get 14M/month free for the default event bus on first-12-months tier (and pricing is $1 per million otherwise — pennies at lab volume).

## What you'll learn

- The difference between the **default event bus**, **custom event buses**, and **partner event buses**
- **Event pattern matching** — every operator (`prefix`, `suffix`, `anything-but`, `numeric`, `exists`, `cidr`)
- **Input transformer** — reshape an event before delivery to a target
- **EventBridge Scheduler** vs the legacy `schedule` rule type
- Why EventBridge replaces a lot of "Lambda invokes Lambda" plumbing

## Exam blueprint reference

- **D1 TS1** — *"Architectural patterns (event-driven, choreography, fanout)"*
- **D1 TS2** — *"Implementing Lambda triggers and event sources"*

## Theory primer

### Three kinds of event buses

| Type | Source of events |
|---|---|
| **Default event bus** | Every AWS account has one. AWS service events go here automatically (S3, EC2, Step Functions, etc.). |
| **Custom event buses** | You create them. Your applications `PutEvents` to them. |
| **Partner event buses** | SaaS partner integrations (Auth0, Datadog, Zendesk, etc.) create these. The partner sends events; your account routes them. |

Each event has a `source` (e.g., `aws.s3`, `myapp.orders`), a `detail-type`, and a `detail` payload.

### Event pattern matching

A rule has an event pattern. If an event matches, the rule fires; targets receive the event.

```json
{
  "source": ["myapp.orders"],
  "detail-type": ["Order Placed"],
  "detail": {
    "amount": [{ "numeric": [">", 100] }],
    "region": [{ "prefix": "us-" }],
    "tier": [{ "anything-but": "test" }],
    "promoCode": [{ "exists": false }]
  }
}
```

**Operators:**
- Equality: `["string1", "string2"]`
- `prefix`, `suffix`
- `anything-but`: list to exclude
- `numeric`: `[">", "<", ">=", "<=", "=", "!="]` with numeric value
- `exists`: true (field must be present) or false (field must be absent)
- `cidr`: IP or CIDR match

### Targets

Up to **5 targets per rule.** Targets can be:
- Lambda
- SQS queue
- SNS topic
- Step Functions state machine
- Kinesis Data Stream / Firehose
- ECS task
- EventBridge bus (cross-account / cross-region routing)
- API destinations (HTTP webhook out)
- Many AWS service-specific actions (Run Command, Glue job, ...)

Each target can have its own input transformer, dead-letter queue, retry policy.

### Input transformer

The rule receives the matched event. The transformer reshapes it before sending to the target — useful for invoking generic Lambdas that don't want EventBridge's wrapper.

```yaml
InputTransformer:
  InputPathsMap:
    "amount": "$.detail.amount"
    "region": "$.detail.region"
  InputTemplate: |
    {
      "msg": "order over <amount> in <region>",
      "is_big": true
    }
```

### Schedule rules

Two ways to schedule:
1. **Scheduled rule** (legacy): rule with `ScheduleExpression: rate(5 minutes)` or `cron(0 12 * * ? *)`. Lives on the default bus only.
2. **EventBridge Scheduler** (newer, recommended): standalone schedule resource — supports custom event buses, time zones, flexible time windows, and per-schedule IAM roles.

The exam may use either name. EventBridge Scheduler is the modern answer.

## Architecture

```
                    ┌─────────────────────────────────────────────┐
   PutEvents      ─►│  Custom event bus: dva-lab-05-03-bus        │
   {source: ...,   │                                              │
    detail: ...}   │  Rule 1: amount > 100 + region us-* → Lambda│
                    │  Rule 2: detail-type "Order Refunded" → SQS │
                    └────────────────────────────┬────────────────┘
                                                  ├─► Lambda (with input transformer)
                                                  └─► SQS queue
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
  --stack-name dva-lab-05-03-eventbridge `
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
  --stack-name dva-lab-05-03-eventbridge \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Send matching event

### PowerShell

```powershell
$Bus = aws cloudformation describe-stacks --stack-name dva-lab-05-03-eventbridge --query "Stacks[0].Outputs[?OutputKey=='BusName'].OutputValue" --output text

aws events put-events --entries `
  "Source=myapp.orders,DetailType=Order Placed,EventBusName=$Bus,Detail=`"{\`"amount\`":250,\`"region\`":\`"us-east-1\`"}`""
```

### Bash

```bash
BUS=$(aws cloudformation describe-stacks --stack-name dva-lab-05-03-eventbridge --query "Stacks[0].Outputs[?OutputKey=='BusName'].OutputValue" --output text)

aws events put-events --entries '[{
  "Source": "myapp.orders",
  "DetailType": "Order Placed",
  "EventBusName": "'"$BUS"'",
  "Detail": "{\"amount\":250,\"region\":\"us-east-1\"}"
}]'
```

You'll see `FailedEntryCount: 0` — EventBridge accepted the event.

## Step 3: Verify the Lambda fired

```
aws logs tail /aws/lambda/dva-lab-05-03-target --since 2m
```

You should see the Lambda's log of the **transformed** input (the small reshape from the InputTransformer), NOT the full event envelope.

## Step 4: Send a non-matching event

```
aws events put-events --entries '[{
  "Source": "myapp.orders",
  "DetailType": "Order Placed",
  "EventBusName": "'"$BUS"'",
  "Detail": "{\"amount\":50,\"region\":\"us-east-1\"}"
}]'
```

PutEvents still returns success (the bus accepted it), but **no rule matches** so no target fires. Verify by tailing logs again — no new entries.

## Step 5: Send a refund event (different rule)

```
QUEUE=$(aws cloudformation describe-stacks --stack-name dva-lab-05-03-eventbridge --query "Stacks[0].Outputs[?OutputKey=='QueueUrl'].OutputValue" --output text)

aws events put-events --entries '[{
  "Source": "myapp.orders",
  "DetailType": "Order Refunded",
  "EventBusName": "'"$BUS"'",
  "Detail": "{\"orderId\":\"order-42\"}"
}]'

aws sqs receive-message --queue-url "$QUEUE" --max-number-of-messages 5 --wait-time-seconds 2
```

## Step 6: Inspect EventBridge metrics

```
aws cloudwatch get-metric-statistics \
  --namespace AWS/Events \
  --metric-name MatchedEvents \
  --dimensions Name=EventBusName,Value=$BUS \
  --start-time $(date -u -d '15 minutes ago' '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -u -v-15M '+%Y-%m-%dT%H:%M:%S') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%S') \
  --period 60 \
  --statistics Sum
```

## Exam gotchas

- **Default event bus is per-account-per-region.** AWS service events flow there automatically. Custom busses are isolated — you have to PutEvents into them yourself.
- **Source + detail-type are the two top-level fields rules typically match on.** Pattern operators (numeric, prefix, etc.) work on `detail.*` fields.
- **Up to 5 targets per rule.** For more, fanout via EventBridge → SNS or two rules with the same pattern.
- **Targets get retried on failure** for 24 hours by default. Configure a **dead-letter queue per target** to capture undeliverable events.
- **EventBridge Archive + Replay** lets you replay historical events into a bus. Useful for replaying after a bug fix.
- **Schema Registry** auto-discovers event shapes — generates language SDKs for safer producer/consumer code.
- **Cross-account / cross-region routing:** the target is another EventBridge bus in another account/region. Permission via resource policy on the destination bus.
- **EventBridge Scheduler vs schedule rule:** Scheduler supports custom buses, timezones, one-time schedules, and is the modern answer. Schedule rules are simpler but limited to default bus.
- **EventBridge Pipes:** simpler 1-to-1 source-to-target with optional filtering / enrichment / transformation. Out of DVA-C02 deep scope but mentioned.

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

> 🧹 **Run cleanup before Lab 5.4.** Lab 5.4 creates a fresh DLQ + redrive demo.

Continue: [Lab 5.4 — DLQ & Redrive](../lab-04-dlq-and-redrive/README.md)
