# Lab 9.1 — CloudWatch Logs basics

> 🟢 **Free tier** — within CloudWatch Logs free tier (5 GB ingest, 5 GB storage, 5 GB scanned by Insights per month). The lab generates ~50 KB.

## What you'll learn

- How log groups, log streams, and retention policies relate
- How **metric filters** turn log patterns into CloudWatch metrics
- How **subscription filters** stream logs in real time to Lambda or Kinesis

## Exam blueprint reference

- **Domain 4 / TS1 — Knowledge of:** "Logging and monitoring systems"
- **Domain 4 / TS1 — Skills in:** "Querying logs to find relevant data" (sets up Lab 9.2), "Reviewing application health by using dashboards and insights"

---

## Theory primer

### Group → Stream → Event

```
LogGroup  /aws/lambda/dva-lab-09-01-emitter
├── Stream  2026/04/28/[$LATEST]a1b2c3...     ← one execution environment
│   ├── Event  REPORT RequestId: ... Duration: 152.3 ms
│   └── Event  {"level":"INFO","msg":"item processed"}
└── Stream  2026/04/28/[$LATEST]d4e5f6...     ← different execution environment
    └── ...
```

A **log group** is a logical bucket; you set retention and access on the group. A **log stream** is a chronological sequence of events from one source (one Lambda execution environment, one EC2 instance, etc.). An **event** is a single line.

### Retention is "Never expire" by default

Without an explicit `RetentionInDays`, logs accumulate forever — and you pay for storage forever. Always set retention. Valid values: `1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 2192, 2557, 2922, 3288, 3653` (days).

### Metric filters

A **metric filter** scans new log events for a pattern and emits a CloudWatch metric when it matches. Two cost models:

- **Filter pattern matches a value** (e.g., extract response time): emits a metric *value*.
- **Filter pattern just matches presence** (e.g., the word `ERROR`): emits a metric *count* (1 per match).

Metric filters apply only to **new** events from the moment the filter was created — they don't backfill.

### Subscription filters

A **subscription filter** ships a real-time stream of log events to a destination as they arrive. Destinations:

- **Lambda** — invokes a function with a batch of events (gzipped, base64-encoded in `awslogs.data`)
- **Kinesis Data Streams** — high-volume buffering
- **Kinesis Data Firehose** — for delivery to S3, OpenSearch, Redshift, partner endpoints

A log group can have **two** subscription filters max.

---

## Architecture

```
                                                    ┌──────────────────┐
                                                    │ Metric filter:   │
                                                    │ count "ERROR" →  │
                                                    │ ErrorCount metric│
                                                    └─────────▲────────┘
   ┌──────────────┐         ┌──────────────────────┐         │
   │ Lambda:      │ writes  │ /aws/lambda/         │         │
   │ Emitter      │────────▶│ dva-lab-09-01-emitter│─────────┤
   │ (Python 3.12)│         │ (RetentionInDays: 7) │         │
   └──────────────┘         └──────────────────────┘         │
                                       │                     ▼
                                       │            ┌─────────────────┐
                                       └───────────▶│ Subscription    │
                                          filter    │ filter:         │
                                          "ERROR"   │ → forwarder λ   │
                                                    └─────────────────┘
```

---

## Prerequisites

- Module 1 cleaned up (so the Lambda artifacts bucket pattern is established).
- The artifacts bucket from CONVENTIONS.md §7 created.

---

## Step 1: Create the artifacts bucket (one-time)

If you have not yet created the artifacts bucket described in CONVENTIONS.md §7, do it now. It will be reused throughout this module.

### PowerShell

```powershell
$ACCOUNT = aws sts get-caller-identity --query Account --output text
$REGION  = if ($env:AWS_DEFAULT_REGION) { $env:AWS_DEFAULT_REGION } else { 'us-east-1' }
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$ACCOUNT-$REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null
Write-Host "Artifacts bucket: $ARTIFACTS_BUCKET"
```

### Bash

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCOUNT}-${REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true
echo "Artifacts bucket: $ARTIFACTS_BUCKET"
```

---

## Step 2: Deploy

### PowerShell

```powershell
aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-09-01-logs-basics `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Bash

```bash
aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-09-01-logs-basics \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

You'll see two functions deployed:
- `dva-lab-09-01-emitter` — emits a mix of INFO and ERROR log lines on each invoke.
- `dva-lab-09-01-forwarder` — receives a batch of error events from a subscription filter and prints them.

---

## Step 3: Read stack outputs

### PowerShell

```powershell
$STACK = "dva-lab-09-01-logs-basics"
$EMITTER = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='EmitterFunctionName'].OutputValue" --output text
$FORWARDER = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='ForwarderFunctionName'].OutputValue" --output text
$EMITTER_LG = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='EmitterLogGroup'].OutputValue" --output text
Write-Host "Emitter:   $EMITTER"
Write-Host "Forwarder: $FORWARDER"
Write-Host "Log group: $EMITTER_LG"
```

### Bash

```bash
STACK="dva-lab-09-01-logs-basics"
EMITTER=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='EmitterFunctionName'].OutputValue" --output text)
FORWARDER=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ForwarderFunctionName'].OutputValue" --output text)
EMITTER_LG=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='EmitterLogGroup'].OutputValue" --output text)
echo "Emitter:   $EMITTER"
echo "Forwarder: $FORWARDER"
echo "Log group: $EMITTER_LG"
```

---

## Step 4: Generate log volume

The seed script invokes the emitter 100 times. Each invoke writes 5 log lines, of which roughly 1 in 5 is an ERROR.

### PowerShell

```powershell
.\scripts\generate-logs.ps1
```

### Bash

```bash
chmod +x scripts/generate-logs.sh
./scripts/generate-logs.sh
```

Wait ~30 seconds after the script finishes — log delivery to CloudWatch is near-real-time but not instant.

---

## Step 5: Inspect log groups, streams, and retention

### List the log group

**PowerShell or Bash:**
```
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/dva-lab-09-01
```

Note `retentionInDays: 7` — that's because the template set it. **Without** the template setting, you'd see no `retentionInDays` field at all (which means "never expire").

### List the streams

**PowerShell or Bash:**
```
aws logs describe-log-streams \
  --log-group-name $EMITTER_LG \
  --order-by LastEventTime \
  --descending \
  --max-items 5
```

There's typically one stream per execution environment. If Lambda kept all 100 invokes warm in one container, you'll see one stream. If it scaled out, multiple streams.

### Read a few events

**PowerShell:**
```powershell
$STREAM = aws logs describe-log-streams `
  --log-group-name $EMITTER_LG `
  --order-by LastEventTime --descending --max-items 1 `
  --query "logStreams[0].logStreamName" --output text
aws logs get-log-events `
  --log-group-name $EMITTER_LG `
  --log-stream-name $STREAM `
  --limit 10
```

**Bash:**
```bash
STREAM=$(aws logs describe-log-streams \
  --log-group-name "$EMITTER_LG" \
  --order-by LastEventTime --descending --max-items 1 \
  --query "logStreams[0].logStreamName" --output text)
aws logs get-log-events \
  --log-group-name "$EMITTER_LG" \
  --log-stream-name "$STREAM" \
  --limit 10
```

You'll see lines like:
```
{"level":"INFO","msg":"processed item id=42"}
{"level":"ERROR","msg":"failed to process id=99: timeout"}
```

---

## Step 6: Verify the metric filter

The template installs a metric filter that counts every log line containing `"ERROR"` and emits it as the `ErrorCount` metric in the `dva/lab-09-01` namespace.

**PowerShell or Bash:**
```
aws logs describe-metric-filters --log-group-name $EMITTER_LG
```

Now query the metric:

**PowerShell:**
```powershell
$END = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
$START = [DateTimeOffset]::UtcNow.AddMinutes(-15).ToString("yyyy-MM-ddTHH:mm:ssZ")
aws cloudwatch get-metric-statistics `
  --namespace dva/lab-09-01 `
  --metric-name ErrorCount `
  --start-time $START --end-time $END `
  --period 60 --statistics Sum
```

**Bash:**
```bash
END=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START=$(date -u -d "-15 minutes" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-15M +"%Y-%m-%dT%H:%M:%SZ")
aws cloudwatch get-metric-statistics \
  --namespace dva/lab-09-01 \
  --metric-name ErrorCount \
  --start-time "$START" --end-time "$END" \
  --period 60 --statistics Sum
```

Sum should be roughly 20 (1 in 5 of your 100 invocations × 1 ERROR line each ≈ 20).

---

## Step 7: Verify the subscription filter

The template also installs a subscription filter that ships any event matching `"ERROR"` to the `dva-lab-09-01-forwarder` Lambda.

Check the forwarder's logs:

**PowerShell or Bash:**
```
aws logs tail /aws/lambda/dva-lab-09-01-forwarder --since 5m
```

You should see entries like:
```
RECEIVED 4 error events from /aws/lambda/dva-lab-09-01-emitter
  - 2026-04-28T... [ERROR] failed to process id=99: timeout
```

If you don't see any output yet, run `scripts/generate-logs` again — the subscription filter only ships **new** events from the moment it was created.

---

## Step 8 (Compare): retention drift

Disable retention by setting it to none (the API doesn't actually support unsetting retention except by deleting the policy):

**PowerShell or Bash:**
```
aws logs delete-retention-policy --log-group-name $EMITTER_LG
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/dva-lab-09-01
```

Note: the `retentionInDays` field is now **absent**. That's the default state — and the trap. Re-set it before cleanup:

**PowerShell or Bash:**
```
aws logs put-retention-policy --log-group-name $EMITTER_LG --retention-in-days 7
```

This is the comparison the exam tests: a log group **with no retention policy** keeps logs **forever**, costing money indefinitely.

---

## Exam gotchas

1. **Default log retention = never expire.** Always set `RetentionInDays` in CloudFormation. It's the #1 long-term cost leak.
2. **Metric filters don't backfill.** They only score events that arrive *after* the filter is created.
3. **A log group can have at most 2 subscription filters.** If you already have 2 and try to add a third, you get an error.
4. **The Lambda subscription destination receives events as a base64-encoded gzip blob** in the event payload's `awslogs.data` field. You must decode + decompress to read them — the lab's `forwarder` shows the pattern.
5. **CloudWatch Logs ingestion is not free.** $0.50/GB ingested (after the 5 GB free tier). Forgotten labs at high volume can rack up $$.

---

## Cleanup

> 🔁 **Keep this stack** — Lab 9.2 (Logs Insights queries) reads the logs you just generated. Move directly to it.

If you do choose to clean up, here's how. Otherwise skip to Lab 9.2.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
chmod +x cleanup.sh
./cleanup.sh
```

---

## What's next

> 🔁 **Keep this stack** — Lab 9.2 queries the logs you just generated with CloudWatch Logs Insights.
