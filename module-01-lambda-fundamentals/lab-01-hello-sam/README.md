# Lab 1.1 — Hello SAM

> 🟢 **Free tier** — Lambda invokes are inside the perpetual 1M req / 400K GB-sec free tier; CloudWatch Logs (5GB perpetual) cover the small log volume.

## What you'll learn

- What AWS SAM is and how the SAM transform turns shorthand into raw CloudFormation
- The SAM CLI commands that show up on the exam (`build`, `deploy`, `local invoke`, `logs`, `sync`, `delete`)
- Lambda's three lifecycle phases (init / invoke / shutdown) and what happens in each

> **Why this lab uses `sam` CLI.** Every other lab in the course deploys with `aws cloudformation deploy`. This one lab is different because **the SAM CLI itself is exam content** — the exam tests `sam build`, `sam deploy`, `sam local invoke`, `sam sync`, etc. Use this lab to get fluent. Once you finish, `sam` disappears from the rest of the course.

## Exam blueprint reference

- **Domain 1, TS2 — Develop code for AWS Lambda → Skills in:**
  - Configuring Lambda functions by defining environment variables and parameters (memory, runtime, handler, timeout, …)
  - Writing Lambda functions
- **Domain 3, TS1 — Prepare application artifacts to be deployed to AWS → Skills in:**
  - Implementing and deploying infrastructure as code (IaC) templates (AWS SAM templates, AWS CloudFormation templates)
- **Domain 3, TS2 — Test applications in development environments → Skills in:**
  - Testing applications by using development endpoints
  - Deploying application stack updates to existing environments

## Theory primer

### What SAM is

SAM (Serverless Application Model) is a **CloudFormation transform**. Putting `Transform: AWS::Serverless-2016-10-31` at the top of a template tells CloudFormation to expand SAM-flavored resources (`AWS::Serverless::Function`, `AWS::Serverless::Api`, `AWS::Serverless::Table`) into raw CloudFormation (`AWS::Lambda::Function`, `AWS::IAM::Role`, `AWS::Logs::LogGroup`, …) before the stack is created.

A SAM template **is** a valid CloudFormation template. That's why `aws cloudformation deploy --template-file template.yaml` works on a SAM template (provided you pass `CAPABILITY_AUTO_EXPAND` so the transform can run).

### What SAM creates for one function

When you deploy this lab, SAM expands `AWS::Serverless::Function` into:

1. `AWS::Lambda::Function` — the function
2. `AWS::IAM::Role` — execution role with `AWSLambdaBasicExecutionRole` (writes to CloudWatch Logs)
3. `AWS::Logs::LogGroup` — created explicitly so we control retention (without this, Lambda makes one on first invoke with **no** retention = forever-cost)

Without SAM, you'd write all three manually. SAM is mostly syntactic sugar.

### Lambda lifecycle (memorize this)

1. **Init** (cold start only)
   - Download code / pull container image
   - Start the runtime
   - Run module-level code (everything outside your handler)
2. **Invoke**
   - Run handler
   - Return response
3. **Shutdown** (when the env is reclaimed)
   - Runtime gets ~500ms warning via Lambda Extensions API

The exam loves this: code outside the handler runs **once per execution environment**, not per invoke. That's why SDK clients and DB connections live at module level.

### SAM CLI command reference

| Command | What it does |
|---|---|
| `sam init` | Scaffold a new project from a template |
| `sam build` | Install dependencies + stage artifacts in `.aws-sam/build/` |
| `sam deploy` | Package artifacts to S3 and deploy via CloudFormation |
| `sam local invoke` | Run a Lambda in a Docker container |
| `sam local start-api` | Run API Gateway locally |
| `sam logs` | Tail CloudWatch Logs for a deployed function |
| `sam sync` | Fast iteration: skip CloudFormation when only code changes (dev only) |
| `sam delete` | Tear down the stack |

## Architecture

```
                       ┌────────────────────────┐
   aws lambda invoke   │  HelloFunction         │   stdout/logs
   ─────────────────►  │  (Python 3.12, 256MB)  │  ────────────►  CloudWatch Logs
                       │  GREETING=hello (env)  │                 /aws/lambda/dva-lab-01-01-hello
                       └────────────────────────┘
                                    │
                                    ▼
                            X-Ray service map
                            (Tracing: Active)
```

## Prerequisites

- [`prerequisites/`](../../prerequisites/README.md) tooling done — including SAM CLI
- AWS credentials in env vars (`aws sts get-caller-identity` succeeds)

## Step 1: Inspect the template

Open `template.yaml`. Three things to notice:

```yaml
Transform: AWS::Serverless-2016-10-31    # this is what makes it a SAM template

Globals:
  Function:
    Runtime: python3.12
    Timeout: 10
    MemorySize: 256
    Tracing: Active                       # turns on X-Ray (Module 9)
```

`Globals:` lets you set defaults for all functions in the template. Override per-function as needed.

The template explicitly creates a `LogGroup` with `RetentionInDays: 7` rather than relying on Lambda's auto-creation (which has no retention).

## Step 2: Build

**PowerShell or Bash:**
```
sam build
```

Look at what was created:

```
ls .aws-sam/build/HelloFunction/
```

This is the **deployment package**. SAM copied your code and installed `requirements.txt` deps into this directory, ready to be zipped and uploaded.

## Step 3: Test locally (optional, requires Docker)

**PowerShell or Bash:**
```
sam local invoke HelloFunction --event payloads/sample.json
```

Output should look like:
```json
{"statusCode": 200, "body": "{\"message\": \"hello, Claude\", ...}"}
```

If Docker isn't available, skip this — the next step deploys to the cloud and tests there.

## Step 4: Deploy

**First time:**

**PowerShell or Bash:**
```
sam deploy --guided
```

Answer the prompts:

| Prompt | Answer |
|---|---|
| Stack Name | `dva-lab-01-01-hello-sam` |
| AWS Region | (whatever your `AWS_DEFAULT_REGION` is) |
| Confirm changes before deploy | `y` |
| Allow SAM CLI IAM role creation | `y` |
| Disable rollback | `n` |
| Save arguments to configuration file | `y` |
| SAM configuration file | `samconfig.toml` (default) |
| SAM configuration environment | `default` |

Subsequent deploys (the saved config remembers everything):

**PowerShell or Bash:**
```
sam deploy
```

## Step 5: Read the stack outputs

### PowerShell

```powershell
$STACK   = "dva-lab-01-01-hello-sam"
$FN_NAME = aws cloudformation describe-stacks `
  --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" `
  --output text
$FN_NAME
```

### Bash

```bash
STACK="dva-lab-01-01-hello-sam"
FN_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" \
  --output text)
echo "$FN_NAME"
```

## Step 6: Invoke from the CLI

This is where you start using `aws lambda invoke` (every later lab uses this).

### PowerShell

```powershell
aws lambda invoke `
  --function-name $FN_NAME `
  --cli-binary-format raw-in-base64-out `
  --payload file://payloads/sample.json `
  response.json

Get-Content response.json
```

### Bash

```bash
aws lambda invoke \
  --function-name "$FN_NAME" \
  --cli-binary-format raw-in-base64-out \
  --payload file://payloads/sample.json \
  response.json

cat response.json
```

> **Why `--cli-binary-format raw-in-base64-out`?** AWS CLI v2 defaults to base64-decoding the payload. This flag passes raw JSON straight through. Common exam gotcha — without it you get an `InvalidRequestContentException`.

## Step 7: Tail the logs

**PowerShell or Bash:**
```
sam logs -n HelloFunction --stack-name dva-lab-01-01-hello-sam --tail
```

Invoke the function a few more times in another terminal. You'll see, per invoke:

- `START RequestId: ...`
- Your `logger.info(...)` lines (structured JSON)
- `END RequestId: ...`
- `REPORT RequestId: ... Duration: ... Billed Duration: ... Memory Size: ... Max Memory Used: ... [Init Duration: ...]`

`Init Duration` only appears on the first invoke after a cold start. **Memorize what's in REPORT** — the exam loves it.

## Step 3: Compare — change a setting and observe

**Goal:** see how memory affects performance and bill.

1. In `template.yaml`, change `MemorySize: 256` to `MemorySize: 1024`.
2. Redeploy: `sam deploy --no-confirm-changeset`
3. Invoke 3-4 times, then check the logs.

You'll see:
- `Memory Size: 1024 MB` in REPORT
- `Duration` likely *decreased* (Lambda gives proportionally more CPU at higher memory — at ~1769 MB you get one full vCPU)
- `Billed Duration` — billing rounds up to the nearest 1ms (used to be 100ms; that's a stale exam fact, ignore)
- Cost per invoke — at higher memory, often roughly the same OR cheaper because the function finishes sooner. This is what the **AWS Lambda Power Tuning** tool is built around.

Reset to `256` for the rest of the labs.

## Exam gotchas

- **The handler signature is `handler(event, context)`.** The `context` object exposes `function_name`, `aws_request_id`, `invoked_function_arn`, `log_group_name`, `log_stream_name`, `get_remaining_time_in_millis()`, `memory_limit_in_mb`. Know `get_remaining_time_in_millis()` — it's how you check timeout headroom mid-invoke.
- **Code outside the handler runs once per execution environment.** SDK clients, DB connections, config loading should live there. Inside the handler = wasted cold start time on every invoke.
- **`print()` writes to CloudWatch Logs**, but use `logging` for structured output. The exam expects you to know about `LoggingConfig.LogFormat: JSON`, `ApplicationLogLevel`, `SystemLogLevel`.
- **Without an explicit `LogGroup`, retention is "Never expire."** That accumulates cost forever. Always create the log group with retention in IaC.
- **`AWS::Serverless::Function` auto-creates the IAM role.** It's named `<StackName>-<FunctionLogicalId>Role-<random>`. You can override with `Role:`.
- **CAPABILITY flags on deploy:** `CAPABILITY_IAM` (because the template creates an IAM role) **plus** `CAPABILITY_AUTO_EXPAND` (because the SAM transform is a macro). Forget either and the deploy fails with a `RequiresCapabilities` error.
- **`sam deploy` ≈ `sam package` + `aws cloudformation deploy`.** Knowing the underlying steps unlocks debugging.

## Cleanup

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

These wrap `sam delete` to tear down the stack. Verify with:

**PowerShell or Bash:**
```
aws cloudformation describe-stacks --stack-name dva-lab-01-01-hello-sam
```

Should return `Stack with id ... does not exist`.

## What's next

> 🧹 **Run cleanup before the next lab** — Lab 1.2 (event sources) deploys multiple new stacks and starts fresh.
