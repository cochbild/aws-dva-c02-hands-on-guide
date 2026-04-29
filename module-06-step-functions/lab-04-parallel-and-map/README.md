# Lab 6.4 — Parallel & Map states

> 🟢 **Free tier-friendly** — under 4000 transitions/month.

## What you'll learn

- The **`Parallel`** state: run N branches at once, wait for all
- The **inline `Map`** state: iterate over an array with bounded concurrency
- **`Distributed Map`** (the newer flavor): handles huge S3 datasets, can run 10000 child executions
- `MaxConcurrency`, `ItemSelector`, `ItemProcessor`, `ResultSelector`

## Exam blueprint reference

- **D1 TS1** — *"Architectural patterns (orchestration, fanout)"*

## Theory primer

### Parallel — fan-out, fan-in

```yaml
Parallel:
  Branches:
    - StartAt: ValidateAddress
      States:
        ValidateAddress: { ... End: true }
    - StartAt: ChargeCard
      States:
        ChargeCard: { ... End: true }
  ResultSelector: { ... }
  Catch: ...
  Retry: ...
```

All branches start at the same time. The Parallel state outputs **an array** with one entry per branch, in declaration order. Wait until all complete before moving on. If any branch fails (and isn't retried/caught locally), the whole Parallel state fails.

### Map — iterate over an array

```yaml
Map:
  ItemsPath: "$.orders"           # array to iterate
  MaxConcurrency: 10              # at most 10 in flight at once
  ItemSelector:                   # NEW (was Parameters); reshape per-item
    "order.$": "$$.Map.Item.Value"
    "tenantId.$": "$.tenantId"
  ItemProcessor:
    ProcessorConfig:
      Mode: INLINE                # or DISTRIBUTED for big datasets
    StartAt: ProcessOne
    States:
      ProcessOne: { ... End: true }
```

The Map runs the same sub-workflow once per array element. **Inline mode**: bounded by 40 concurrent iterations. **Distributed mode**: up to 10,000 child executions, fed from S3 / CSV / JSON, used for big-data orchestration.

### Distributed Map specifics (newer feature, ~exam-relevant)

- Input source: an S3 manifest, an S3 bucket prefix, or a CSV file
- Each item runs as a **child workflow execution** (not just a state)
- Results land in an S3 result bucket
- `ToleratedFailurePercentage` lets a fraction fail without aborting the whole Map

### `$$.Map.Item` — the per-iteration context

Inside the Map's `ItemSelector` or branch states, `$$.Map.Item.Value` is the current array element. `$$.Map.Item.Index` is its 0-based index. The double `$$` is the **context object** (state metadata), distinct from `$` (the regular state input).

## Architecture

```
   StartExecution                    ─► Parallel
   {orders: [...]}                       │
                                         ├── Branch 1: ValidateAddress
                                         └── Branch 2: ChargeCard
                                         (wait for both)
                                         │
                                         ▼
                                       Map (inline, MaxConcurrency: 5)
                                         iterates over orders array
                                         each iteration: ProcessOrder Lambda
                                         │
                                         ▼
                                       Succeed
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
  --stack-name dva-lab-06-04-parallel-and-map `
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
  --stack-name dva-lab-06-04-parallel-and-map \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Run with the seed input

The `payloads/input.json` has 8 orders. Map will process them with concurrency 5 — 5 in flight at once, then 3 more.

### PowerShell

```powershell
$Sm = aws cloudformation describe-stacks --stack-name dva-lab-06-04-parallel-and-map --query "Stacks[0].Outputs[?OutputKey=='StateMachineArn'].OutputValue" --output text

$Input = Get-Content -Raw payloads/input.json
$exec = aws stepfunctions start-execution --state-machine-arn $Sm --input $Input --query executionArn --output text

Start-Sleep -Seconds 8
aws stepfunctions describe-execution --execution-arn $exec
```

### Bash

```bash
SM=$(aws cloudformation describe-stacks --stack-name dva-lab-06-04-parallel-and-map --query "Stacks[0].Outputs[?OutputKey=='StateMachineArn'].OutputValue" --output text)

EXEC=$(aws stepfunctions start-execution --state-machine-arn "$SM" --input "$(cat payloads/input.json)" --query executionArn --output text)
sleep 8
aws stepfunctions describe-execution --execution-arn "$EXEC"
```

The output's `output` field has:
1. The 2-element array from Parallel (validate result + charge result)
2. The 8-element array from Map (one processed-order entry each)

## Step 3: Open the visual

In the AWS console → Step Functions → state machine → executions → latest. The graph shows Parallel branches expanded, Map iterations as small circles. Click any iteration to see its input/output.

## Step 4: Compare — inline vs distributed Map

Inline Map is bounded at 40 concurrent iterations. To process 100,000 items, switch `Mode: DISTRIBUTED` and feed from S3 (out of scope for this lab — adds complexity for a learning point that's better seen in docs).

The exam may show a question like "process 1,000,000 records" → answer is Distributed Map. "process 50 records" → inline Map is fine.

## Exam gotchas

- **Parallel branches must each have their OWN error handlers** — Retry/Catch defined on the Parallel state catches branch failures, but adding Retry/Catch INSIDE each branch's states is more granular.
- **Parallel output is an ARRAY** in declaration order. Use `ResultSelector` to flatten.
- **Map output is an array of per-iteration outputs.** Empty input array = empty output array, NOT a failure.
- **`ItemsPath` defaults to `$`** — if the input itself is the array.
- **`ItemSelector`** is the modern name (was `Parameters` in inline Map). Distributed Map has always used `ItemSelector`.
- **Inline Map: 40 max concurrency.** Distributed Map: up to 10000.
- **Distributed Map**: each iteration runs as a **child execution** (so it has its own execution ARN, history, etc.). Bills as if each were its own.
- **`$$.Map.Item.Index` and `$$.Map.Item.Value`** are the context fields per iteration. Cite them; the exam tests this.
- **Parallel + Map can nest.** Parallel branches can contain Maps; Map iterators can contain Parallels.

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

> 🧹 **Run cleanup before Lab 6.5.**

Continue: [Lab 6.5 — Integration patterns (.sync, .waitForTaskToken)](../lab-05-integration-patterns/README.md)
