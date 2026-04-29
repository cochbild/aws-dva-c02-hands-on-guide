# Lab 9.4 — X-Ray Tracing

> 🟢 **Free tier-friendly** — first 100,000 traces / month free, perpetual. $5 per million traces beyond that.

## What you'll learn

- The X-Ray **segment / subsegment** hierarchy and the **service map** view
- How to enable Active tracing on Lambda + API Gateway
- The `aws-xray-sdk` Python library: `patch_all`, `capture_aws_client`, `xray_recorder.in_segment`/`in_subsegment`
- **Annotations vs metadata** — annotations are indexable (filterable in queries); metadata is just data attached to the trace

## Exam blueprint reference

- **D4 TS1 Knowledge of:** *"Service maps in AWS X-Ray"*
- **D4 TS2 Skills in:** *"Adding annotations for tracing services"*, *"Implementing tracing by using AWS services and tools"*

## Theory primer

### Trace, segment, subsegment

- **Trace** — a request that flows through your system. Has a unique `Trace ID`.
- **Segment** — work done by a single service (one Lambda invocation = one segment).
- **Subsegment** — finer breakdown within a segment: a downstream call (DDB query, HTTP request), a piece of internal work.

Each X-Ray trace is a tree of segments + subsegments with timing.

### Active tracing

For X-Ray to record a service's segment automatically, enable **Active tracing**:

- Lambda: `TracingConfig: { Mode: Active }` in CFN. Lambda runs with the X-Ray daemon and emits a segment per invoke.
- API Gateway: `MethodSettings: TracingEnabled: true`. API GW emits its own segment that becomes the parent of the Lambda segment.

Without Active tracing on a parent, your Lambda's trace doesn't connect to the upstream — appears as a standalone trace.

### Annotations vs metadata

```python
from aws_xray_sdk.core import xray_recorder

xray_recorder.put_annotation("user_tier", "gold")     # indexed; can filter via expression
xray_recorder.put_metadata("user_data", {...})        # NOT indexed; just attached
```

X-Ray query: `annotation.user_tier = "gold"` — works. `metadata.user_data.x = "y"` — does NOT.

### `patch_all()` — auto-instrumentation

```python
from aws_xray_sdk.core import patch_all
patch_all()  # auto-instrument boto3, requests, sqlalchemy, urllib, etc.
```

Every boto3 call now creates a subsegment with the service name + operation. Same for HTTP requests.

### Sampling

X-Ray samples 1 req/s + 5% beyond by default. Configurable via sampling rules. **Don't sample 100%** in production — costs add up.

## Architecture

```
   curl ──► API Gateway (Active tracing)  ──segment 1──► trace
                  │
                  ▼
            Lambda (Active tracing)        ──segment 2──► same trace
              │       │
              │       ├── subsegment: DDB GetItem (auto via patch_all)
              │       └── subsegment: custom "process_order" via in_subsegment
              │
              ▼
            DynamoDB
```

The service map shows all three boxes connected by lines.

## Step 1: Deploy

Lambda needs the `aws-xray-sdk` packaged into `src/`. We bundle the deps, then package + deploy.

### PowerShell

```powershell
$ACCOUNT = aws sts get-caller-identity --query Account --output text
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$ACCOUNT-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null

pip install -r src/requirements.txt -t src/

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-09-04-xray `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Bash

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCOUNT}-${AWS_DEFAULT_REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

pip install -r src/requirements.txt -t src/

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-09-04-xray \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Generate some traffic

```
URL=$(aws cloudformation describe-stacks --stack-name dva-lab-09-04-xray --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)
for i in $(seq 1 30); do
  curl -s "$URL/order?tier=$([ $((i % 3)) = 0 ] && echo gold || echo silver)" > /dev/null
  sleep 0.2
done
```

(In PowerShell: `1..30 | ForEach-Object { curl.exe -s "$URL/order?tier=$(if ($_ % 3 -eq 0) { 'gold' } else { 'silver' })" | Out-Null; Start-Sleep -Milliseconds 200 }`)

## Step 3: View the service map

Open AWS console → X-Ray → Service map. You should see API Gateway → Lambda → DynamoDB connected. Click any node to filter to that service's traces.

## Step 4: Filter by annotation

In X-Ray traces console, set filter expression:
```
annotation.user_tier = "gold"
```

Only the 1-in-3 invocations are returned. Compare with metadata — there's no equivalent `metadata.X = "Y"` filter expression because metadata isn't indexed.

## Step 5: Drill into a trace

Click any trace. You'll see the timeline:
- Top bar: full trace duration
- Below: API GW segment → Lambda segment → subsegments

Subsegments include:
- `## process_order` (custom, via `in_subsegment`)
- `DynamoDB GetItem` (auto, via patch_all)

## Exam gotchas

- **Active tracing on the parent service is required** for traces to chain. API GW Active tracing → Lambda Active tracing → ... or no chain.
- **`patch_all` auto-instruments boto3 + HTTP**; explicit `capture_aws_client(client)` for individual clients.
- **Annotations ≤ 50 per segment.** They're indexed; cardinality is your friend (filter on user tier, plan tier, region) but don't index user IDs.
- **Metadata is unbounded** but not indexed — use for context that's useful in a single trace but you'll never search across.
- **X-Ray daemon** runs alongside Lambda automatically when Active tracing is on. For ECS / EC2 you must install the daemon yourself.
- **Sampling rules** are per-account, configurable in console. Default = 1 req/sec + 5% additional. Higher rates for critical services, near-zero for high-volume noisy ones.
- **Trace context propagation**: HTTP header `X-Amzn-Trace-Id`. SDKs propagate automatically; manual HTTP clients must forward it.

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

> 🧹 **Run cleanup before Lab 9.5.**

Continue: [Lab 9.5 — CloudWatch Alarms](../lab-05-alarms/README.md)
