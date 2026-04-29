# Lab 6.3 — Error Handling

> 🟢 **Free tier-friendly** — under the 4000 transitions/month free tier for Standard.

## What you'll learn

- The **`Retry`** block: `ErrorEquals`, `IntervalSeconds`, `MaxAttempts`, `BackoffRate`, `JitterStrategy`, `MaxDelaySeconds`
- The **`Catch`** block: redirects on caught errors with **`ResultPath`** preserving original input
- The **built-in error names** the exam expects you to know: `States.ALL`, `States.TaskFailed`, `States.Timeout`, `States.Permissions`, `States.Runtime`, `States.DataLimitExceeded`
- Why **retries fire BEFORE catches** — and what that means for fall-through error handling

## Exam blueprint reference

- **D1 TS1** — *"Fault-tolerant design patterns (retries with exponential backoff and jitter, dead-letter queues)"*

## Theory primer

### The three categories of errors

1. **Service-side errors** — the Task's underlying service (Lambda, DynamoDB, etc.) returned an error. Step Functions wraps them in `States.TaskFailed`.
2. **Step Functions errors** — `States.Timeout`, `States.Permissions`, `States.Runtime`, `States.DataLimitExceeded`.
3. **Custom errors** — your Lambda raises `Exception("MyCustomError: ...")` — Step Functions extracts the prefix as the error name.

### Retry — the standard exponential-backoff-with-jitter pattern

```yaml
Retry:
  - ErrorEquals: [ "RetryableError", "Lambda.ServiceException" ]
    IntervalSeconds: 2
    MaxAttempts: 3
    BackoffRate: 2.0
    JitterStrategy: FULL          # NEWER: adds random jitter between 0 and current delay
    MaxDelaySeconds: 30           # caps the exponential growth
```

Backoff math (with `BackoffRate: 2`, `IntervalSeconds: 2`):
- attempt 1: 2 sec wait
- attempt 2: 4 sec wait
- attempt 3: 8 sec wait
- attempt 4: 16 sec wait

`JitterStrategy: FULL` randomizes each delay 0..N to avoid thundering-herd retries. Defaults to NONE — recommended to set FULL.

`MaxDelaySeconds` caps the wait — useful when MaxAttempts is high.

### Catch — fall-through to a recovery state

```yaml
Catch:
  - ErrorEquals: [ "States.ALL" ]    # match anything
    ResultPath: "$.error"             # preserve original input AND add error details
    Next: HandleFailure
```

Without `ResultPath`, the state's output **replaces** the original input — you lose the data that was being processed. With `ResultPath: "$.error"`, the error info is added under `$.error` and the rest of the input is preserved.

### Retry first, then Catch

When a state errors:
1. **Retry blocks evaluate first** — if any retry matches, retry happens
2. **Only after all retries are exhausted** does Catch evaluate
3. If neither matches, the execution fails

### `States.ALL` is the catchall

Always put a `States.ALL` Catch as the last entry — it's your safety net.

## Architecture

```
   StartExecution        ──► State machine
   {fail_pattern: "..."}     │
                              ├─ Task: WorkLambda
                              │       │ raises FlakyError, FatalError, or success
                              │       │
                              │       ├─ Retry: FlakyError × 3 (with jitter)
                              │       │
                              │       └─ Catch: States.ALL → HandleFailure
                              │
                              ├─ HandleFailure (Pass): logs the error
                              │
                              └─ Succeed
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
  --stack-name dva-lab-06-03-error-handling `
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
  --stack-name dva-lab-06-03-error-handling \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Run with each failure pattern

The Lambda's behavior is controlled by the `fail_pattern` input field:
- `"none"` → returns success
- `"flaky-once"` → fails twice with FlakyError, then succeeds (retries should rescue)
- `"flaky-forever"` → always fails with FlakyError (retries exhaust, Catch fires)
- `"fatal"` → fails with FatalError on first attempt (Catch fires immediately, no retries)

### PowerShell

```powershell
$Sm = aws cloudformation describe-stacks --stack-name dva-lab-06-03-error-handling --query "Stacks[0].Outputs[?OutputKey=='StateMachineArn'].OutputValue" --output text

# Success
aws stepfunctions start-execution --state-machine-arn $Sm --input '{"fail_pattern":"none"}'

# Flaky — retries rescue
aws stepfunctions start-execution --state-machine-arn $Sm --input '{"fail_pattern":"flaky-once"}'

# Flaky forever — retries exhaust, Catch fires
aws stepfunctions start-execution --state-machine-arn $Sm --input '{"fail_pattern":"flaky-forever"}'

# Fatal — Catch fires immediately
aws stepfunctions start-execution --state-machine-arn $Sm --input '{"fail_pattern":"fatal"}'
```

### Bash

```bash
SM=$(aws cloudformation describe-stacks --stack-name dva-lab-06-03-error-handling --query "Stacks[0].Outputs[?OutputKey=='StateMachineArn'].OutputValue" --output text)

aws stepfunctions start-execution --state-machine-arn "$SM" --input '{"fail_pattern":"none"}'
aws stepfunctions start-execution --state-machine-arn "$SM" --input '{"fail_pattern":"flaky-once"}'
aws stepfunctions start-execution --state-machine-arn "$SM" --input '{"fail_pattern":"flaky-forever"}'
aws stepfunctions start-execution --state-machine-arn "$SM" --input '{"fail_pattern":"fatal"}'
```

## Step 3: Inspect the executions

```
aws stepfunctions list-executions --state-machine-arn "$SM" --max-items 10
```

For each, look at execution history:
```
aws stepfunctions get-execution-history --execution-arn <executionArn> --max-results 30
```

You'll see:
- `flaky-once`: 2 retry attempts logged, then success
- `flaky-forever`: 3 retry attempts logged, then transition to HandleFailure
- `fatal`: no retry events, immediate transition to HandleFailure

The HandleFailure state's output preserves the original input under `$.input` and the error info under `$.error`.

## Step 4: Compare — what `JitterStrategy: NONE` looks like

Edit the template's Retry block, set `JitterStrategy: NONE`, redeploy. Run `flaky-forever` and observe the EVENT timestamps in the execution history — they'll be exactly 2s, 4s, 8s apart (no randomization). With `FULL`, those gaps are random in [0, 2s] / [0, 4s] / [0, 8s].

In production with many parallel executions, NONE jitter causes the **thundering-herd retry** problem — all clients retry at the same instant, hitting the downstream service in synchronized waves.

## Exam gotchas

- **Retry runs BEFORE Catch.** If both could match, the retry fires until exhausted.
- **`ErrorEquals: ["States.ALL"]` matches everything.** Always have one as a safety net Catch.
- **Custom error names**: raise `Exception("MyCustomError: details")` in Lambda. Step Functions extracts `MyCustomError` as the error name. **Don't put spaces** in the prefix.
- **`ResultPath` in Catch**: where to put the error details. `null` discards the original input. `$.error` preserves input + adds error.
- **Retries are not free.** Each retry attempt counts as a transition. High `MaxAttempts` = high cost.
- **Built-in errors:** `States.ALL`, `States.TaskFailed`, `States.Timeout`, `States.Permissions`, `States.Runtime`, `States.DataLimitExceeded`. Memorize these.
- **Lambda-specific service errors**: `Lambda.ServiceException`, `Lambda.AWSLambdaException`, `Lambda.SdkClientException`, `Lambda.TooManyRequestsException`. The exam may show `Lambda.ServiceException` and ask you to add a Retry for it (especially with `IntervalSeconds: 1, MaxAttempts: 6, BackoffRate: 2`).
- **Timeout vs Heartbeat**: a state has `TimeoutSeconds` (must complete within) and `HeartbeatSeconds` (must send heartbeat at least this often). Heartbeats are activity-task or Lambda-context-managed. Different from `Wait` state.

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

> 🧹 **Run cleanup before Lab 6.4.** Different state machine.

Continue: [Lab 6.4 — Parallel & Map states](../lab-04-parallel-and-map/README.md)
