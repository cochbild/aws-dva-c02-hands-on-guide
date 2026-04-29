# Lab 4.2 — Stages & Stage Variables

> 🟢 **Free tier** — Lambda + REST API. 1M requests/month free for 12 months.

## What you'll learn

- How a single API can have **multiple stages** (`dev`, `prod`) with independent settings
- How **stage variables** point a stage at a specific Lambda alias (or env value)
- How API Gateway's **canary deployment** routes a percentage of requests to a new version

## Exam blueprint reference

- Domain 1, Task Statement 1: API design
- Domain 3, Task Statement 2: *"Testing applications by using development endpoints (for example, configuring stages in Amazon API Gateway)"*
- Domain 3, Task Statement 3: API Gateway stages, IaC templates
- Domain 3, Task Statement 4: *"Using existing runtime configurations to create dynamic deployments (for example, using staging variables from API Gateway in Lambda functions)"*

## Theory primer

A **stage** is a named, independently-deployed snapshot of an API. Each stage has:
- Its own URL (`https://abc.execute-api.us-east-1.amazonaws.com/<stageName>`)
- Its own throttling, caching, logging, X-Ray, custom domain mapping
- Its own **stage variables** (key=value pairs)

**Stage variables** are usable in:
1. **Lambda integration ARN:** `...:function:my-fn:${stageVariables.lambdaAlias}/invocations` — different alias per stage
2. **HTTP integration URL:** target a different backend per stage
3. **Lambda event:** the value is passed as `event.stageVariables.lambdaAlias`

This is how a **single Lambda function** can have a `dev` alias pointing at version `$LATEST` and a `prod` alias pointing at version `7`, fronted by the **same** API but **different stages** that route to the right alias.

**Canary deployment** (REST API only): you push a new deployment to an existing stage, but say "send 10% to the canary, 90% to the previous version." Stage settings (throttling, vars) for the canary can override the base. Promote the canary by either accepting it or roll back.

## Architecture

```
                     ┌──────────────────────┐
                     │  REST API            │
                     │   /hello             │
                     └──────────────────────┘
                       │             │
            stage=dev  │             │  stage=prod
            stageVar:  │             │  stageVar:
            alias=dev  │             │  alias=prod
                       ▼             ▼
                  ┌──────────┐  ┌──────────┐
                  │ Lambda   │  │ Lambda   │
                  │ alias    │  │ alias    │
                  │ "dev" → $LATEST  "prod" → v1
                  └──────────┘  └──────────┘
```

## Prerequisites

- Lab 4.1 cleaned up (it used the same stack name? no — different name, but the artifacts bucket is reused).

## Step 1: Deploy

The template publishes Lambda **version 1** and creates two aliases (`dev` and `prod`), then a REST API with two stages, each carrying a stage variable that picks an alias.

### PowerShell

```powershell
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$ACCOUNT_ID-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-04-02-stages `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Bash

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCOUNT_ID}-${AWS_DEFAULT_REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-04-02-stages \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Hit each stage

### PowerShell

```powershell
$STACK = "dva-lab-04-02-stages"
$DEV  = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='DevUrl'].OutputValue"  --output text
$PROD = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='ProdUrl'].OutputValue" --output text

curl.exe "$DEV/hello"
curl.exe "$PROD/hello"
```

### Bash

```bash
STACK="dva-lab-04-02-stages"
DEV=$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='DevUrl'].OutputValue"  --output text)
PROD=$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='ProdUrl'].OutputValue" --output text)

curl "$DEV/hello"; echo
curl "$PROD/hello"; echo
```

You should see two different responses: `"alias": "dev"` from the dev URL, `"alias": "prod"` from the prod URL — same Lambda function, **different alias**, picked by the stage variable.

## Step 3: Compare — change one alias, both stages affected?

The `dev` alias initially points at `$LATEST`. Change the function code, redeploy, and **without redeploying the API** call the dev URL:

### PowerShell

```powershell
# Edit src/handler.py — change "version": "v1" to "version": "v1-modified"
# Re-package and re-deploy:
aws cloudformation package --template-file template.yaml --s3-bucket $ARTIFACTS_BUCKET --output-template-file packaged.yaml
aws cloudformation deploy --template-file packaged.yaml --stack-name dva-lab-04-02-stages --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND

# dev sees the new code (alias dev = $LATEST):
curl.exe "$DEV/hello"
# prod still sees v1 (alias prod is pinned):
curl.exe "$PROD/hello"
```

### Bash

```bash
# (edit src/handler.py, then…)
aws cloudformation package --template-file template.yaml --s3-bucket "$ARTIFACTS_BUCKET" --output-template-file packaged.yaml
aws cloudformation deploy --template-file packaged.yaml --stack-name dva-lab-04-02-stages --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND

curl "$DEV/hello"; echo   # new code
curl "$PROD/hello"; echo  # still v1
```

This is **the** stage-variable + alias pattern. Promote dev → prod by repointing the prod alias at the new published version (we'll do this in Module 8 with CodeDeploy canaries).

## Step 4: Inspect stage settings via CLI

```bash
aws apigateway get-stages --rest-api-id $(aws cloudformation describe-stacks --stack-name dva-lab-04-02-stages --query "Stacks[0].Outputs[?OutputKey=='RestApiId'].OutputValue" --output text)
```

Look for `variables` on each stage — stage vars live there. Look for `methodSettings` — per-stage throttling / caching / logging.

## Exam gotchas

- **Stage variables are REST API only.** HTTP API has stages but no variables.
- **Stage variable in Lambda integration ARN** is the canonical "dev/prod alias swap" pattern. Recognize it on sight: `...:function:fn-name:${stageVariables.alias}/invocations`.
- **A single deployment can be promoted to multiple stages** — `CreateDeployment` makes a snapshot, `UpdateStage` points stages at it.
- **Canary settings** override base stage settings only for the percentage routed to the canary. Logging and metrics are emitted separately.
- **Stage variables also reach the Lambda** — `event.stageVariables` is populated even for `AWS_PROXY` integrations.

## Cleanup

🔁 **Keep this stack — Lab 4.3 reuses it** to add request validation and mapping templates.

If you must clean up:

### PowerShell
```powershell
.\cleanup.ps1
```

### Bash
```bash
./cleanup.sh
```

## What's next

> 🔁 **Keep this stack.** Lab 4.3 (Validation & Transformation) extends this same REST API with request body validators and VTL mapping templates.
