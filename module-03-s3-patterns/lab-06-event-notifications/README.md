# Lab 3.6 — S3 Event Notifications

> 🟢 **Free tier** — Lambda invokes, SQS messages, SNS messages, and EventBridge events are all in their respective free tiers at this volume.

## What you'll learn

- The four destinations S3 can notify directly (Lambda, SQS, SNS, EventBridge) and when to choose each
- How prefix/suffix filters control which events fire
- The difference between **direct event notifications** (the original API) and **EventBridge** routing for S3 events

## Exam blueprint reference

- **D1 TS1** — *"Architectural patterns (event-driven, fanout)"*
- **D1 TS2** — *"Implementing Lambda triggers and event sources"*

## Theory primer

### S3 → Lambda / SQS / SNS (the original API)

`PutBucketNotificationConfiguration` lets a bucket fan out per **event type** (e.g., `s3:ObjectCreated:*`, `s3:ObjectRemoved:*`) to:
- Lambda (sync invoke)
- SQS queue
- SNS topic

You can have **multiple notification configs per bucket** but they cannot have overlapping prefix/suffix filters for the same event type — S3 will refuse the deploy.

### S3 → EventBridge (the newer way)

Enable on the bucket: `EventBridgeConfiguration: {EventBridgeEnabled: true}`. Now every S3 event is published to the **default EventBridge bus** with detail-type `Object Created`, `Object Deleted`, etc. From there you write EventBridge rules with rich filtering (prefix/suffix, content-based, regex, etc.) to fan out to Lambda, SQS, SNS, Step Functions, API destinations, partner integrations.

### When to pick which

| Need | Use |
|---|---|
| Single Lambda processes upload | Direct → Lambda |
| Multiple subscribers, may grow over time | EventBridge (or SNS for legacy) |
| Buffer + retry uploads for slow consumer | Direct → SQS |
| Fan out to ≥ 1 subscribers + email + Slack | SNS or EventBridge |
| Filter on `objectSize > 5 MB` | EventBridge (rich filtering) |
| Cross-account / cross-region routing | EventBridge |

### Filter rules (prefix / suffix)

```yaml
Filter:
  S3Key:
    Rules:
      - Name: prefix
        Value: uploads/
      - Name: suffix
        Value: .csv
```

This matches `uploads/foo.csv` but not `archive/foo.csv` or `uploads/foo.txt`.

## Architecture

```
                                    Direct → Lambda (prefix: uploads/)
                                  ╱
                                 ╱      Direct → SQS (prefix: archive/)
   PutObject ──► dva-lab-03-06 ─┼──► (queue → Lambda consumer)
                                 ╲
                                  ╲     Direct → SNS (suffix: .pdf)
                                   ╲    (subscribed: another Lambda)
                                    ╲
                                     ╲  EventBridge enabled →
                                        rule → Lambda (any object created)
```

## Step 1: Deploy

### PowerShell or Bash

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-03-06-event-notifications --capabilities CAPABILITY_IAM
```

## Step 2: Trigger each path

### PowerShell

```powershell
$Bucket = aws cloudformation describe-stacks --stack-name dva-lab-03-06-event-notifications --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text

# Direct → Lambda (prefix uploads/)
echo "to lambda" | Out-File -FilePath /tmp-up.txt -Encoding ascii
aws s3 cp /tmp-up.txt "s3://$Bucket/uploads/file1.txt"

# Direct → SQS (prefix archive/)
echo "to sqs" | Out-File -FilePath /tmp-ar.txt -Encoding ascii
aws s3 cp /tmp-ar.txt "s3://$Bucket/archive/file1.txt"

# Direct → SNS (suffix .pdf)
echo "fake pdf" | Out-File -FilePath /tmp-pd.txt -Encoding ascii
aws s3 cp /tmp-pd.txt "s3://$Bucket/random/doc.pdf"

# EventBridge — fires on ALL the above (no filter)
```

### Bash

```bash
BUCKET=$(aws cloudformation describe-stacks --stack-name dva-lab-03-06-event-notifications --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)

echo "to lambda" > /tmp/up.txt && aws s3 cp /tmp/up.txt "s3://$BUCKET/uploads/file1.txt"
echo "to sqs"    > /tmp/ar.txt && aws s3 cp /tmp/ar.txt "s3://$BUCKET/archive/file1.txt"
echo "fake pdf"  > /tmp/pd.txt && aws s3 cp /tmp/pd.txt "s3://$BUCKET/random/doc.pdf"
```

## Step 3: Inspect each destination

### Lambda invocations

```
aws logs tail /aws/lambda/dva-lab-03-06-uploads-handler --since 5m
aws logs tail /aws/lambda/dva-lab-03-06-eventbridge-handler --since 5m
```

### SQS messages

```
QUEUE_URL=$(aws cloudformation describe-stacks --stack-name dva-lab-03-06-event-notifications --query "Stacks[0].Outputs[?OutputKey=='QueueUrl'].OutputValue" --output text)
aws sqs receive-message --queue-url "$QUEUE_URL" --max-number-of-messages 10
```

### SNS subscriptions

The SNS topic in this lab has the SQS queue subscribed too (as a backup destination). EventBridge fan-out also covers it.

## Step 4: Compare — direct vs EventBridge

Take a look at what's logged by `dva-lab-03-06-uploads-handler` (direct) vs `dva-lab-03-06-eventbridge-handler` (EventBridge):

- **Direct event** payload schema: classic `{"Records":[{"eventSource":"aws:s3", ...}]}`
- **EventBridge event** schema: `{"version":"0", "source":"aws.s3", "detail-type":"Object Created", "detail": {...}}`

The exam tests the **shape** of these payloads. EventBridge events are flatter and typed; direct S3 events have the `Records` wrapper.

## Exam gotchas

- **Direct notifications can't have overlapping filters for the same event type.** A bucket with two `s3:ObjectCreated:*` rules both with prefix `uploads/` will fail to deploy.
- **EventBridge has rich filtering.** Use it when you need prefix + suffix + size + tag filtering on the same rule.
- **SQS queue must have a queue policy allowing `s3.amazonaws.com` to `sqs:SendMessage`.** Same for SNS topic policies. CloudFormation typically writes these for you when you wire up the notification.
- **Lambda must have `lambda:InvokeFunction` permission for `s3.amazonaws.com`** with `SourceArn` matching the bucket ARN.
- **EventBridge events do NOT include the object body.** They include the bucket name + key + version-id. The consumer fetches the body via GetObject.
- **Direct events are best-effort delivery.** No SLA. EventBridge has built-in retries.
- **`s3:ObjectCreated:Put` vs `s3:ObjectCreated:*`:** the wildcard catches Put + Post + Copy + CompleteMultipartUpload. The specific event misses 3 of 4 paths. Read questions carefully.

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

> 🧹 **Run cleanup before Lab 3.7.** Lab 3.7 (Object Lambda) is a separate stack with different resources.

Continue: [Lab 3.7 — S3 Object Lambda](../lab-07-object-lambda/README.md)
