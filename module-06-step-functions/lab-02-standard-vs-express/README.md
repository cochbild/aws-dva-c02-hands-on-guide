# Lab 6.2 — Standard vs Express

> 🟡 **Pennies** — Express charges per million state-machine requests + per-second duration. Standard charges per state transition. Lab volume is sub-cent.

## What you'll learn

- The two Step Functions execution models: **Standard** vs **Express**
- The **at-most-once** vs **at-least-once** semantics — and why this is one of the most-asked Step Functions exam questions
- How execution history works (or doesn't, for Express)
- Cost models for each

## Exam blueprint reference

- **D1 TS1** — *"Architectural patterns (orchestration vs choreography)"*

## Theory primer

### The Standard vs Express table — memorize this

| | **Standard** | **Express** |
|---|---|---|
| Per-state semantics | **Exactly once** (at-most-once execution per state) | **At-least once** (your code must be idempotent) |
| Max duration | **1 year** | **5 minutes** |
| History retention | **90 days**, full visual replay in console | **None** — only CloudWatch Logs (if enabled) |
| Pricing | **$0.025 per 1000 state transitions** | **$1 per million requests + per-second duration** charge |
| Use cases | Long-running orchestrations, human approvals, async workflows | High-volume, short workflows (IoT events, pipelines) |
| Sync invocation | No (async) | Yes (StartSyncExecution returns the result inline) |
| Async invocation | Yes (StartExecution) | Yes |
| Activity tasks (long-poll) | Yes | No |
| Step Functions Studio | Full visual + step-through | View definition only |

The exam loves: **"high-volume, short-running, idempotent workflow"** → Express. **"long-running, must run each step exactly once"** → Standard.

### About "at-most-once" vs "at-least-once"

**Standard:** Step Functions guarantees a state runs at-most-once per execution. If the workflow needs to retry, the state executes again. But within a single attempt, it's never duplicated.

**Express:** Step Functions may invoke a state's task multiple times for the same logical step. **Your code must tolerate this** — make your Lambda idempotent (e.g., dedup with DynamoDB conditional writes, see Lab 2.4).

### Sync vs async invocation (Express)

```
StartSyncExecution  → blocks until done, returns result (Express only)
StartExecution      → returns executionArn, you poll/listen  (Standard + Express)
```

The sync API makes Express feel like a Lambda — submit and get a result. But it's much more expressive than a single Lambda.

## Architecture

```
   StartExecution     ──► Standard state machine ──► Lambda DoWork
   (or sync, Express)     (or Express)                (same code for both)
                              │
                              │ logs to:
                              ▼
                          CloudWatch Logs
```

Both state machines have **identical** ASL definitions. The only difference is `StateMachineType: STANDARD` vs `EXPRESS`.

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
  --stack-name dva-lab-06-02-standard-vs-express `
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
  --stack-name dva-lab-06-02-standard-vs-express \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Run the Standard machine

### PowerShell

```powershell
$Std = aws cloudformation describe-stacks --stack-name dva-lab-06-02-standard-vs-express --query "Stacks[0].Outputs[?OutputKey=='StandardArn'].OutputValue" --output text

$exec = aws stepfunctions start-execution --state-machine-arn $Std --input '{"order_id":"ord-1","amount":100}' --output text --query executionArn
Start-Sleep -Seconds 3
aws stepfunctions describe-execution --execution-arn $exec
```

### Bash

```bash
STD=$(aws cloudformation describe-stacks --stack-name dva-lab-06-02-standard-vs-express --query "Stacks[0].Outputs[?OutputKey=='StandardArn'].OutputValue" --output text)

EXEC=$(aws stepfunctions start-execution --state-machine-arn "$STD" --input '{"order_id":"ord-1","amount":100}' --query executionArn --output text)
sleep 3
aws stepfunctions describe-execution --execution-arn "$EXEC"
```

You'll see `status: SUCCEEDED` and the result. Now look at the visual:
```
echo "Open the console: Step Functions → State machines → dva-lab-06-02-standard → Executions"
```

The console shows a graph of the run, color-coded by state outcome.

## Step 3: Run the Express machine — synchronously

```
EXP=$(aws cloudformation describe-stacks --stack-name dva-lab-06-02-standard-vs-express --query "Stacks[0].Outputs[?OutputKey=='ExpressArn'].OutputValue" --output text)

aws stepfunctions start-sync-execution --state-machine-arn "$EXP" --input '{"order_id":"ord-2","amount":50}'
```

The CLI **blocks** until the workflow finishes and returns the full result inline. Express only.

## Step 4: Inspect Express logs

Express has no console history. The only observability is CloudWatch Logs.

```
aws logs tail /aws/vendedlogs/states/dva-lab-06-02-express --since 5m
```

You'll see ExecutionStarted / TaskStarted / TaskSucceeded / ExecutionSucceeded events.

## Step 5: Compare — try start-sync-execution on Standard

```
aws stepfunctions start-sync-execution --state-machine-arn "$STD" --input '{}'
```

You'll get `StateMachineTypeNotSupported`. Sync API is **Express only**.

## Step 6: Pricing math

For 1 million workflow runs, each with 5 transitions:

- **Standard:** 5M transitions × $0.025/1000 = **$125**
- **Express:** 1M requests × $1.00/M + (estimate 100ms × 1M = 100k seconds) × $0.0000001/sec ≈ **$1 + tiny duration cost**

→ Express is dramatically cheaper for short, high-volume workflows. Standard is dramatically cheaper for long, low-volume workflows (because Express's duration charge ramps up fast).

## Exam gotchas

- **Standard = at-most-once. Express = at-least-once.** The single most-asked Step Functions distinction.
- **Express max duration: 5 minutes.** Standard: 1 year.
- **Express has NO history.** If you need to debug a past execution, you need CloudWatch Logs ingestion **enabled at deploy time**. Without it, no observability.
- **`StartSyncExecution` is Express only.**
- **Activity workers (long-poll workers)** are Standard only. Express doesn't support task tokens or activities.
- **Pricing**: Standard pays per-transition. Express pays per-request + per-millisecond duration. Cross-over depends on workflow duration vs transition count.
- **Both support all integration patterns** — request/response, .sync, .waitForTaskToken (covered in Lab 6.5). EXCEPT: Express + .waitForTaskToken is supported only in **asynchronous** Express, not sync.

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

> 🧹 **Run cleanup before Lab 6.3.** Different machines.

Continue: [Lab 6.3 — Error handling](../lab-03-error-handling/README.md)
