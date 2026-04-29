# Lab 9.3 — Custom Metrics + Embedded Metric Format

> 🟢 **Free tier-friendly** — first 10 custom metrics + 5 GB log ingest are free, perpetual. PutMetricData costs $0.01 per 1000 calls beyond that. EMF metric extraction is **free**.

## What you'll learn

- Two ways to publish custom metrics: **`cloudwatch:PutMetricData`** (synchronous API call, costs per call) vs **EMF** (write JSON to stdout, CloudWatch extracts metrics asynchronously for free)
- Why EMF is the modern standard at scale
- **High-resolution** metrics — 1-second granularity vs the default 60-second
- Dimensions and how they shape your CloudWatch console UI

## Exam blueprint reference

- **D4 TS1 Skills in:** *"Implementing custom metrics (for example, CloudWatch embedded metric format [EMF])"*
- **D4 TS2 Knowledge of:** *"Application metrics (custom, embedded, built-in)"*
- **D4 TS2 Skills in:** *"Implementing code that emits custom metrics"*

## Theory primer

### PutMetricData vs EMF

```python
# Approach 1: PutMetricData — synchronous, ONE API call per data point batch
import boto3
cw = boto3.client("cloudwatch")
cw.put_metric_data(
    Namespace="MyApp",
    MetricData=[
        {"MetricName": "Latency", "Value": 123, "Unit": "Milliseconds",
         "Dimensions": [{"Name": "Service", "Value": "Checkout"}]}
    ],
)
# Pros: instant. Cons: $0.01 per 1000 calls. At 1M Lambda invokes/day = $10/day in API.
```

```python
# Approach 2: EMF — write structured JSON to stdout, CloudWatch parses
print(json.dumps({
    "_aws": {
        "Timestamp": int(time.time() * 1000),
        "CloudWatchMetrics": [{
            "Namespace": "MyApp",
            "Dimensions": [["Service"]],
            "Metrics": [{"Name": "Latency", "Unit": "Milliseconds"}]
        }]
    },
    "Service": "Checkout",
    "Latency": 123,
}))
# Pros: 0 API calls; metric extraction is free. Cons: log ingestion still costs ($0.50/GB after free tier).
# At 1M log lines/day = ~5 MB/day in JSON = pennies.
```

EMF wins at scale.

### EMF rules

- One JSON line per metric data point (or batch in a single line via the EMF schema's nesting)
- The `_aws.CloudWatchMetrics` envelope tells CloudWatch which top-level fields are metrics, which are dimensions, what their units are
- Dimensions appear as a 2D array (multiple "dimension sets" per metric) — each set creates a separate CloudWatch metric stream

### High-resolution metrics

By default, CloudWatch stores metrics at **60-second granularity**. High-resolution metrics use 1-second granularity:

```python
{"StorageResolution": 1}  # 1-second; default is 60
```

Storage tiers:
- 1-second resolution: stored 3 hours, then aggregated to 60-sec for 15 days, then 5-min for 63 days, then 1-hr for 15 months
- 60-second resolution: 15 days, then 5-min, then 1-hr

High-resolution costs more — only use when you need sub-minute alarming.

### Dimensions

A dimension is a name/value pair attached to a metric (`Service: Checkout`). Each unique combination of dimensions creates a separate metric stream. **Don't put unbounded values** in dimensions (user IDs, request IDs) — you'll create a metric explosion.

## Architecture

```
   aws lambda invoke ──► Lambda
                            │ generates 100 work items
                            ├─ for each: time the work
                            ├─ Approach A: cw.put_metric_data(...)  → CloudWatch (sync)
                            └─ Approach B: print(EMF JSON)         → CloudWatch Logs → metric (async, free)
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
  --stack-name dva-lab-09-03-custom-metrics `
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
  --stack-name dva-lab-09-03-custom-metrics \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Invoke a few times

### PowerShell

```powershell
$Fn = aws cloudformation describe-stacks --stack-name dva-lab-09-03-custom-metrics --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text
1..10 | ForEach-Object {
  aws lambda invoke --function-name $Fn --cli-binary-format raw-in-base64-out --payload '{}' out.json | Out-Null
}
```

### Bash

```bash
FN=$(aws cloudformation describe-stacks --stack-name dva-lab-09-03-custom-metrics --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text)
for i in $(seq 1 10); do
  aws lambda invoke --function-name "$FN" --cli-binary-format raw-in-base64-out --payload '{}' out.json >/dev/null
done
```

## Step 3: Inspect the metrics

Wait ~60 seconds for both metrics to appear in CloudWatch.

```
# PutMetricData metric
aws cloudwatch list-metrics --namespace dva-lab-09-03/sync

# EMF metric — same namespace + same logical name, different namespace
aws cloudwatch list-metrics --namespace dva-lab-09-03/emf
```

Both should appear. Compare the time-to-appear: PutMetricData is ~5 seconds; EMF is ~60 seconds (because the metric is extracted from logs).

## Step 4: Compare — view in console

Open CloudWatch → Metrics → Custom namespaces. Find both `dva-lab-09-03/sync` and `dva-lab-09-03/emf`. Plot WorkLatency from each.

The shapes should be identical (same data); the latency-to-visibility differs.

## Exam gotchas

- **`PutMetricData` charges per call.** At 1M Lambda invokes per day each calling `put_metric_data` once = $10/day in API charges.
- **EMF extraction is FREE.** The cost is the log ingestion to write the JSON line.
- **EMF format is exact.** The `_aws` envelope must match the spec: `Timestamp`, `CloudWatchMetrics` with `Namespace`/`Dimensions`/`Metrics`. Get any of it wrong = log line is just text, no metric.
- **Dimensions are a 2D array.** `[["Service"], ["Service", "Region"]]` creates two metric streams per metric — one keyed by Service, another by Service+Region.
- **Metric resolution**: 60-sec (default, `StorageResolution: 60`) vs 1-sec (`StorageResolution: 1`). 1-sec costs more.
- **`PutMetricData` batch size**: up to 1000 metric data points per call. Same cost — batch when possible.
- **CloudWatch Embedded Metric Format Lambda Powertools** library auto-emits EMF correctly. Highly recommended in production.

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

> 🧹 **Run cleanup before Lab 9.4.**

Continue: [Lab 9.4 — X-Ray Tracing](../lab-04-xray-tracing/README.md)
