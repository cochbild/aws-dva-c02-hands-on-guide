# Lab 6.5 — Service Integration Patterns

> 🟢 **Free tier-friendly.**

## What you'll learn

- The **three service integration patterns** Step Functions tasks support: request/response (default), `.sync` (run a job), `.waitForTaskToken` (callback)
- The **task token** mechanism — pause a workflow indefinitely until an external party signals completion
- The classic use case for callbacks: **human approval** workflows

## Exam blueprint reference

- **D1 TS1** — *"Architectural patterns (event-driven, orchestration vs choreography)"*

## Theory primer

### Pattern 1: Request/Response (default)

```
Resource: arn:aws:states:::lambda:invoke
```

Step Functions calls the service synchronously, gets an immediate response. **Most tasks use this.**

### Pattern 2: Run a Job (`.sync`)

```
Resource: arn:aws:states:::glue:startJobRun.sync
Resource: arn:aws:states:::ecs:runTask.sync
Resource: arn:aws:states:::states:startExecution.sync
```

Step Functions calls the service, then **polls until the job finishes**. State doesn't move to `Succeeded` until the underlying job is done. Used for:
- Glue jobs (`startJobRun.sync`)
- ECS tasks (`runTask.sync`)
- EMR jobs
- Step Functions nested executions (`startExecution.sync`)

`.sync` is **only** supported on a specific list of services. The exam loves this — "you want to wait for an EMR job to finish before continuing — what pattern?" Answer: `.sync`.

### Pattern 3: Wait for Callback (`.waitForTaskToken`)

```
Resource: arn:aws:states:::sqs:sendMessage.waitForTaskToken
Resource: arn:aws:states:::sns:publish.waitForTaskToken
Resource: arn:aws:states:::lambda:invoke.waitForTaskToken
```

Step Functions:
1. Sends a message to the service WITH a **task token** embedded
2. **Pauses the state** for up to 1 year
3. Resumes when an external party calls `SendTaskSuccess(token, output)` or `SendTaskFailure(token, error)`

This is how you wire **human approval**, **async webhooks**, **third-party integrations**:
- Step Functions sends to SQS → external worker / human → calls SendTaskSuccess

If no callback within `TimeoutSeconds` (default 60), the state errors with `States.Timeout`.

### Token retrieval

In the SQS / SNS / Lambda payload, Step Functions injects the token. The receiver extracts it and uses it later:

```
SQS message body: { "taskToken": "AAAA...", "input": { ... } }
```

The external worker calls `aws stepfunctions send-task-success --task-token <token> --output '{...}'`.

## Architecture

```
   StartExecution           ─►  State machine
                                │
                                │  Step 1: Request/Response
                                │     Lambda preprocess (default pattern)
                                │
                                │  Step 2: Wait for Callback
                                │     SendMessage to SQS WITH task token
                                │     (state pauses)
                                │
                                │     ◄──── External worker (Lambda triggered by SQS):
                                │           parses token, calls SendTaskSuccess
                                │
                                │  Step 3: Request/Response
                                │     Lambda finalize
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
  --stack-name dva-lab-06-05-integration-patterns `
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
  --stack-name dva-lab-06-05-integration-patterns \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Run an execution

### PowerShell

```powershell
$Sm = aws cloudformation describe-stacks --stack-name dva-lab-06-05-integration-patterns --query "Stacks[0].Outputs[?OutputKey=='StateMachineArn'].OutputValue" --output text

$exec = aws stepfunctions start-execution --state-machine-arn $Sm --input '{"order_id":"ord-1"}' --query executionArn --output text

# The execution PAUSES at the SendMessage.waitForTaskToken state
# Watch it
Start-Sleep -Seconds 5
aws stepfunctions describe-execution --execution-arn $exec
```

### Bash

```bash
SM=$(aws cloudformation describe-stacks --stack-name dva-lab-06-05-integration-patterns --query "Stacks[0].Outputs[?OutputKey=='StateMachineArn'].OutputValue" --output text)

EXEC=$(aws stepfunctions start-execution --state-machine-arn "$SM" --input '{"order_id":"ord-1"}' --query executionArn --output text)

sleep 5
aws stepfunctions describe-execution --execution-arn "$EXEC"
```

You'll see `status: RUNNING`. The state machine is **paused** waiting on the callback.

## Step 3: Inspect the SQS message — observe the task token

The execution wrote a message to the lab's SQS queue. The Lambda subscriber **automatically** picks it up (template wires it). Check the Lambda logs:

```
aws logs tail /aws/lambda/dva-lab-06-05-callback-worker --since 5m
```

You'll see the worker received the task token, did its (simulated) work, and called SendTaskSuccess. After that:

```
aws stepfunctions describe-execution --execution-arn "$EXEC"
```

Shows `status: SUCCEEDED`. The whole workflow including the paused state took as long as the worker took to process.

## Step 4: Compare — manual callback

Want to send the callback yourself (simulate a human approval)? Disable the Lambda subscriber and grab the token manually from SQS:

```bash
QUEUE=$(aws cloudformation describe-stacks --stack-name dva-lab-06-05-integration-patterns --query "Stacks[0].Outputs[?OutputKey=='QueueUrl'].OutputValue" --output text)

# Receive without auto-deleting
MSG=$(aws sqs receive-message --queue-url "$QUEUE" --wait-time-seconds 5)
TOKEN=$(echo "$MSG" | jq -r '.Messages[0].Body | fromjson | .taskToken')
RECEIPT=$(echo "$MSG" | jq -r '.Messages[0].ReceiptHandle')

# Approve
aws stepfunctions send-task-success --task-token "$TOKEN" --task-output '{"approved":true}'

# Or reject
# aws stepfunctions send-task-failure --task-token "$TOKEN" --error "REJECTED" --cause "manual deny"

aws sqs delete-message --queue-url "$QUEUE" --receipt-handle "$RECEIPT"
```

## Step 5: Compare — what `.sync` looks like

The template's StateMachine doesn't include a `.sync` task because the canonical examples (Glue, ECS) are out of scope for the dev exam at this depth. The pattern is just:

```yaml
Type: Task
Resource: arn:aws:states:::glue:startJobRun.sync
Parameters: { JobName: "my-glue-job", Arguments: { ... } }
```

The state machine waits for the Glue job to complete, fail, or be stopped before transitioning.

## Exam gotchas

- **Three patterns: request/response, .sync, .waitForTaskToken.** Memorize the ARN suffix syntax.
- **`.sync` only works with select services** (Glue, ECS, EMR, Step Functions, SageMaker, EventBridge, AppFlow, etc.). Lambda is **request/response only** for sync semantics — the workflow waits for `lambda:invoke` to return, naturally.
- **`.waitForTaskToken`** can suspend a state for up to **1 year** (Standard) or duration of the workflow (Express).
- **Default callback timeout is 60 seconds** unless you set `TimeoutSeconds` higher. After timeout, the state fails with `States.Timeout`.
- **The token is in the message payload by convention.** Step Functions doesn't put it in headers or attributes — it's part of the body, formatted by your `Parameters` template.
- **`SendTaskHeartbeat`** lets a worker extend a long-running callback's deadline. Required when `HeartbeatSeconds` is set.
- **Task token leakage** is a security concern — anyone with the token can complete or fail the workflow. Treat tokens like secrets.
- **Activities** (a separate Step Functions concept) are different from `.waitForTaskToken`. Activities are for long-poll workers; tokens are passed in the activity-task GetActivityTask response. Same token mechanism, different invocation model.

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

> 🎉 **Module 6 complete!**
>
> You've covered every Step Functions concept on the DVA-C02 exam: ASL syntax, Standard vs Express, error handling, Parallel/Map states, and the three integration patterns.

Continue: [Module 7 — Secrets, Config & Encryption](../../module-07-secrets-config/README.md)
