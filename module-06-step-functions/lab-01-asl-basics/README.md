# Lab 6.1 — ASL Basics

> 🟢 **Free tier** — Standard state machine: 4,000 transitions/month free, perpetual. Each execution here uses ~6 transitions. The Lambda runs in <1s.

## What you'll learn

- Author **Amazon States Language (ASL)** by hand: `Pass`, `Task`, `Choice`, `Wait`, `Succeed`, `Fail`.
- Use **JSONPath** (`$.field`) to read state input.
- Control data flow through `InputPath` → `Parameters` → `ResultSelector` → `ResultPath` → `OutputPath`.

## Exam blueprint reference

Maps to **Domain 1 / Task Statement 1**:
- *Architectural patterns (orchestration vs choreography)*
- *Synchronous and asynchronous service interactions*
- *Differences between stateful and stateless concepts* (state machines are stateful)

And **Skills in**:
- *Writing code that interacts with AWS services by using APIs and AWS SDKs* (here, the Step Functions ASL invokes the Lambda integration directly — no SDK call by you).

## Theory primer

A Step Functions execution starts with an **input JSON object**. Each state receives that object, transforms it, and passes a (possibly different) object to the next state.

Four fields control the transformation, in this order:

```
state input
   │
   ▼ InputPath  — pick a slice (default $)
   ▼ Parameters — build a NEW object referencing slice via "$.path" (Tasks only)
   ▼ ↳ underlying API/Lambda runs, returns a result
   ▼ ResultSelector — reshape that result (Tasks only)
   ▼ ResultPath  — where to merge the result back into the state input (default $)
   ▼ OutputPath  — final filter on what the next state sees (default $)
   │
   ▼
state output
```

Memorise the order. The exam asks "where does the Lambda's return value end up?" — the answer is `ResultPath`.

### `Pass` state

A Pass is a no-op transformer. Use it to:
- Inject a constant via `Result`.
- Rebuild the payload via `Parameters` + JSONPath references.

### `Task` state

Calls something. The `Resource` ARN selects what:
- `arn:aws:states:::lambda:invoke` — invoke a Lambda
- `arn:aws:states:::aws-sdk:s3:putObject` — call any AWS SDK action directly
- `arn:aws:states:::sqs:sendMessage` — pre-built SQS integration

### `Choice` state

Branches. Each `Choices[]` entry has a `Variable` (a JSONPath) and a comparator (`BooleanEquals`, `NumericGreaterThanEquals`, `StringEquals`, etc.) plus a `Next` target. Falls through to `Default`.

### `Wait` state

Pauses for `Seconds` (constant), `SecondsPath` (read from input), `Timestamp`, or `TimestampPath`. **Counts as a transition but no compute charge while waiting** — Standard SF was made for things like "wait 10 days for the trial to end."

### `Succeed` / `Fail`

Terminal. `Fail` lets you set `Error` and `Cause` strings — these surface in the execution history and CloudWatch Logs.

## Architecture

```
       Tag Input (Pass)
            │ adds {receivedAt, stage:tagged}
            ▼
       Validate (Task → Lambda)
            │ ResultPath=$.validation
            ▼
       Amount Branch (Choice)
       ├─ ok=false ─────────► Reject (Fail)
       ├─ amountUsd ≥ 100 ──► Wait For Settlement (Wait 3s)
       │                       ▼
       │                       Approve (Pass)
       │                       ▼
       │                       Done (Succeed)
       └─ otherwise ────────► Auto Approve (Pass)
                              ▼
                              Done (Succeed)
```

## Prerequisites

None. This lab does not depend on any other lab.

## Step 1 — Deploy

This lab uses Lambda code, so we package + deploy via S3.

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
  --stack-name dva-lab-06-01-asl-basics `
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
  --stack-name dva-lab-06-01-asl-basics \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

Read the state-machine ARN into a variable for the rest of the lab:

### PowerShell

```powershell
$SM_ARN = aws cloudformation describe-stacks `
  --stack-name dva-lab-06-01-asl-basics `
  --query "Stacks[0].Outputs[?OutputKey=='StateMachineArn'].OutputValue" `
  --output text
$SM_ARN
```

### Bash

```bash
SM_ARN=$(aws cloudformation describe-stacks \
  --stack-name dva-lab-06-01-asl-basics \
  --query "Stacks[0].Outputs[?OutputKey=='StateMachineArn'].OutputValue" \
  --output text)
echo "$SM_ARN"
```

## Step 2 — Test

### Run the small-order path (auto-approve)

#### PowerShell or Bash

```
aws stepfunctions start-execution `
  --state-machine-arn $SM_ARN `
  --name run-small-$(Get-Random) `
  --cli-input-json file://payloads/small-order.json
```

(Bash equivalent — same idea, swap `$(Get-Random)` for `$RANDOM`):

```bash
aws stepfunctions start-execution \
  --state-machine-arn "$SM_ARN" \
  --name "run-small-$RANDOM" \
  --cli-input-json file://payloads/small-order.json
```

The CLI returns an `executionArn`. Capture it and inspect the result:

#### PowerShell

```powershell
$EXEC_ARN = aws stepfunctions list-executions `
  --state-machine-arn $SM_ARN `
  --max-items 1 `
  --query "executions[0].executionArn" `
  --output text

aws stepfunctions describe-execution `
  --execution-arn $EXEC_ARN `
  --query "{status:status, input:input, output:output}"
```

#### Bash

```bash
EXEC_ARN=$(aws stepfunctions list-executions \
  --state-machine-arn "$SM_ARN" \
  --max-items 1 \
  --query "executions[0].executionArn" \
  --output text)

aws stepfunctions describe-execution \
  --execution-arn "$EXEC_ARN" \
  --query "{status:status, input:input, output:output}"
```

You'll see status `SUCCEEDED` and an output that includes the original order, the `validation` block (added by `ResultPath`), and `outcome.decision = "auto-approved"`.

> Notice: the *input* the state machine received is preserved alongside the *result* of each Task. That's the `ResultPath` working — `$.validation` was appended without overwriting `$`.

### Run the large-order path (settlement → approve)

```bash
aws stepfunctions start-execution \
  --state-machine-arn "$SM_ARN" \
  --name "run-large-$RANDOM" \
  --cli-input-json file://payloads/large-order.json
```

Wait ~5 seconds, then `describe-execution` again. This run takes longer because the `Wait For Settlement` state pauses for 3 seconds. Output: `outcome.decision = "approved-after-settlement"`.

### Run the bad-order path (Fail terminal)

```bash
aws stepfunctions start-execution \
  --state-machine-arn "$SM_ARN" \
  --name "run-bad-$RANDOM" \
  --cli-input-json file://payloads/bad-order.json
```

Status `FAILED`, `error: ValidationFailed`, `cause: Validate Lambda returned ok=false.` These come from the `Fail` state's literal fields.

### Inspect the visual history (free)

The console is the easiest way to *see* the state transitions:

```
Open AWS Console → Step Functions → State machines → dva-lab-06-01-asl-basics
→ click an execution → Graph view
```

Each transition is a line item. Standard SF retains this history for 90 days.

### Read the CloudWatch logs (also free, also useful)

```bash
aws logs tail /aws/vendedlogs/states/dva-lab-06-01-asl-basics --since 5m
```

Same data, queryable. Logs Insights becomes important when you switch to Express in Lab 6.2.

## Step 3 — Compare

### Compare A: drop `ResultSelector`

Open `template.yaml` and remove the `ResultSelector` block from the `Validate` task. Redeploy and rerun the small-order payload.

#### PowerShell or Bash — same redeploy commands as Step 1.

In the new run, look at the output. You'll see `validation.Payload.ok` instead of `validation.ok`. Why? Without `ResultSelector`, ResultPath stashes the **whole** Lambda invoke response — which includes the `Payload`, `StatusCode`, and `ExecutedVersion`. `ResultSelector` is the cleaner way to keep only the bits you care about.

The `Choice` state's first comparator (`$.validation.ok`) now silently fails to match (the path doesn't exist) and the choice falls through to the `NumericGreaterThanEquals` test. Watch the execution graph — the bad payload no longer fails clean.

Put `ResultSelector` back when you're done.

### Compare B: change `ResultPath` to `null`

Set `"ResultPath": null` in the `Validate` task. Redeploy, rerun small-order. The validation result is **discarded** and `$.validation` doesn't exist. The Choice's `BooleanEquals false` matcher finds nothing — execution falls through to the second matcher and *succeeds* even on bad input. **Lesson:** `ResultPath: null` is "I don't care about the output" — useful for fire-and-forget tasks like sending an SNS notification.

Restore `"ResultPath": "$.validation"`.

### Compare C: switch the `Choice` order

Move the `BooleanEquals` choice **below** the `NumericGreaterThanEquals` choice. Redeploy, rerun bad-order. Result: it goes through `Approve` because `amountUsd` (which is `0.0` from the validate Lambda's failure path) is *not* ≥ 100, so it falls through to the next matcher, which *also* fails to match `false`, so it hits `Default: Auto Approve`. **Lesson:** Choice rules are evaluated **top-to-bottom**, first match wins. Order matters.

Restore the original order before moving on.

## Exam gotchas

1. **`InputPath` filters BEFORE `Parameters` builds the call payload.** If you set `InputPath: $.order` and then write `"FunctionName.$": "$.functions.validator"`, that `$.functions.validator` is looked up in the *post-InputPath* slice — which probably doesn't have a `functions` key any more. Distractor traps love this.
2. **`ResultPath: $` (or omitted) replaces the whole input with the task result.** That's why the lab uses `$.validation` — to keep the original input intact.
3. **`Choice` has no `Default`? An execution that matches no rule fails with `States.NoChoiceMatched`.** Always include `Default` unless that's literally what you want.
4. **`Pass` with `Result`** lets you inject a constant — but `Pass` cannot run code. If you find yourself wanting `Pass` to do logic, you actually want a `Task` calling a tiny Lambda or an AWS SDK integration.
5. **`Succeed` and `Fail` are terminal.** They have no `Next`. The exam likes to put a `Next` field on a `Fail` state in a distractor — that's invalid ASL.
6. **JSONPath in ASL is a subset of full JSONPath.** Filter expressions (`$..book[?(@.price < 10)]`) and script expressions are not supported. The exam may show fancy JSONPath in distractors.

## Cleanup

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

The cleanup script deletes the CloudFormation stack. The artifacts bucket from Step 1 is shared across labs — leave it alone.

## What's next

> 🧹 **Run cleanup before the next lab — Lab 6.2 starts fresh.**

[Lab 6.2 — Standard vs Express](../lab-02-standard-vs-express/README.md) deploys the same workflow as **both** Standard and Express variants and has you compare cost, history, and behaviour.
