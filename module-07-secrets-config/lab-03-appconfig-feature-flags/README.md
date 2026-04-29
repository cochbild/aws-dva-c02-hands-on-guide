# Lab 7.3 — AppConfig Feature Flags

> 🟢 **Free tier-friendly** — AppConfig API has no free tier but per-call cost is fractions of a cent. Lambda invokes free tier covers polling.

## What you'll learn

- The AppConfig hierarchy: **Application → Environment → Configuration Profile → Deployment Strategy → Deployment**
- The **feature flags** profile type (vs free-form JSON / YAML)
- How **deployment strategies** (linear, exponential, all-at-once) gradually roll out config changes — like canary deployments but for configuration
- The **AWS AppConfig Agent Lambda Extension** pattern (in production) and how the Lambda polls AppConfig directly without it (in this lab, for simplicity)

## Exam blueprint reference

- **D2 TS3** — *"Secure configuration management"*, *"Using AppConfig"*
- **D3 TS1** — *"Ways to access application configuration data (AppConfig, Secrets Manager, Parameter Store)"*

## Theory primer

### The hierarchy

| Resource | Purpose |
|---|---|
| **Application** | Logical app — "checkout-service" |
| **Environment** | Stage — "dev", "prod" |
| **Configuration Profile** | The config artifact's metadata — type (free-form / feature flags), validation, source location |
| **Hosted Configuration Version** | A specific version of the config content stored in AppConfig itself (vs in S3 / Parameter Store / external) |
| **Deployment Strategy** | How fast to roll out: linear/exponential, deployment duration, bake time, growth factor |
| **Deployment** | A specific release: pair a profile-version with an environment using a strategy |

### Why use AppConfig over Parameter Store or Secrets Manager?

| | Parameter Store / Secrets Manager | AppConfig |
|---|---|---|
| Versioned | Yes (parameter versions / secret versions) | Yes (hosted configuration versions) |
| Roll-back | Manual (change parameter back) | Automatic on alarm trigger |
| Gradual rollout | None (all consumers see new value at once) | **Native** (linear, exponential, time-bounded) |
| Validators | None (size/type only) | JSON Schema, Lambda validators |
| Use case | Single config value, simple secrets | Complex config bundles, feature flags, gradual changes |

The exam may ask "you want to roll out a config change to 10% of fleet, then 50%, then 100%" — that's AppConfig.

### Feature flags profile type

A specialized profile shape:
```json
{
  "version": "1",
  "flags": {
    "checkout-v2": {
      "name": "checkout-v2",
      "_deprecation": { "status": "planned" },
      "attributes": { "rollout": { "type": "string" } }
    },
    "free-shipping": { "name": "free-shipping" }
  },
  "values": {
    "checkout-v2": { "enabled": true,  "rollout": "30%" },
    "free-shipping": { "enabled": false }
  }
}
```

Console gives you a UI for editing this. The schema enforces structure.

### Deployment strategies

Built-in strategies:
- **AppConfig.AllAtOnce** — 100% immediately, no bake time
- **AppConfig.Linear50PercentEvery30Seconds** — 50% at t=0, 100% at t=30s
- **AppConfig.Canary10Percent20Minutes** — 10% at t=0, then exponential to 100% over 20 min
- **AppConfig.Linear20PercentEvery6Minutes** — production-friendly

Custom strategies set growth type (linear/exponential), deployment duration, bake time, growth factor, final bake time. **Bake time** is the period after 100% where you keep the deployment "open" so you can roll back if alarms fire.

### Lambda extension vs direct API call

**Production**: deploy the AWS AppConfig Agent Lambda Extension as a layer. The extension runs an HTTP server inside the Lambda execution environment that caches the config. Your code calls `localhost:2772/applications/{app}/environments/{env}/configurations/{profile}` — sub-millisecond latency, no IAM call per invoke.

**This lab**: simpler — Lambda calls `appconfigdata:GetLatestConfiguration` directly. One API call per invoke (free-tier-friendly at lab volume).

## Architecture

```
   Reader Lambda           ─►  appconfigdata:GetLatestConfiguration
                                  │
                                  ▼
                                AppConfig
                                  Application: dva-lab-07-03
                                  Environment: dev
                                  Profile: feature-flags
                                  HostedVersion: v1 (initial)
                                  Deployment: AllAtOnce
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
  --stack-name dva-lab-07-03-appconfig `
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
  --stack-name dva-lab-07-03-appconfig \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Read the current flag value

### PowerShell

```powershell
$Fn = aws cloudformation describe-stacks --stack-name dva-lab-07-03-appconfig --query "Stacks[0].Outputs[?OutputKey=='ReaderFunctionName'].OutputValue" --output text
aws lambda invoke --function-name $Fn --cli-binary-format raw-in-base64-out --payload '{}' out.json
Get-Content out.json
```

### Bash

```bash
FN=$(aws cloudformation describe-stacks --stack-name dva-lab-07-03-appconfig --query "Stacks[0].Outputs[?OutputKey=='ReaderFunctionName'].OutputValue" --output text)
aws lambda invoke --function-name "$FN" --cli-binary-format raw-in-base64-out --payload '{}' out.json
cat out.json
```

You should see the initial flag values: `checkout_v2_enabled: false`, `free_shipping_enabled: false`.

## Step 3: Push a new configuration version

### PowerShell or Bash

```
APP=$(aws cloudformation describe-stacks --stack-name dva-lab-07-03-appconfig --query "Stacks[0].Outputs[?OutputKey=='ApplicationId'].OutputValue" --output text)
PROFILE=$(aws cloudformation describe-stacks --stack-name dva-lab-07-03-appconfig --query "Stacks[0].Outputs[?OutputKey=='ProfileId'].OutputValue" --output text)
ENV_ID=$(aws cloudformation describe-stacks --stack-name dva-lab-07-03-appconfig --query "Stacks[0].Outputs[?OutputKey=='EnvironmentId'].OutputValue" --output text)
STRATEGY=$(aws cloudformation describe-stacks --stack-name dva-lab-07-03-appconfig --query "Stacks[0].Outputs[?OutputKey=='StrategyId'].OutputValue" --output text)
```

Now create v2 with `checkout_v2_enabled: true` and start a deployment:

```bash
NEW_VERSION=$(aws appconfig create-hosted-configuration-version \
  --application-id "$APP" \
  --configuration-profile-id "$PROFILE" \
  --content-type 'application/json' \
  --content '{"checkout_v2_enabled":true,"free_shipping_enabled":false,"max_items":50}' \
  --query VersionNumber --output text)

aws appconfig start-deployment \
  --application-id "$APP" \
  --environment-id "$ENV_ID" \
  --deployment-strategy-id "$STRATEGY" \
  --configuration-profile-id "$PROFILE" \
  --configuration-version "$NEW_VERSION"
```

The strategy is `AllAtOnce` (built-in) so the rollout completes instantly.

## Step 4: Re-read

```
aws lambda invoke --function-name "$FN" --cli-binary-format raw-in-base64-out --payload '{}' out.json
cat out.json
```

Now `checkout_v2_enabled: true`. The Lambda's session token is cached for 24h by default — to force a fresh read, the handler can pass `RequiredMinimumPollIntervalInSeconds` to `start-configuration-session`. We use the default cache, so subsequent invokes return cached config until the session expires.

## Step 5: Compare — slow rollout strategy

In production, you'd use a longer strategy. To switch to `AppConfig.Canary10Percent20Minutes`, update the deployment-strategy reference in `template.yaml` and redeploy. Future deployments will roll out gradually.

## Exam gotchas

- **AppConfig vs Parameter Store**: AppConfig has gradual rollout + automatic rollback on alarm; Parameter Store has neither. Use AppConfig for "config changes that could break prod if rolled out badly."
- **AppConfig validators** can be JSON Schema (built-in) or a Lambda function. Validators run before deployment starts.
- **AppConfig + CloudWatch alarms**: link an alarm to the deployment. If the alarm fires during rollout or bake, AppConfig rolls back automatically.
- **Lambda extension cache** is the production answer for Lambda + AppConfig — sub-ms reads. Without the extension, you call the API every invoke.
- **Configuration source** can be: **Hosted (in AppConfig)**, S3 object, Parameter Store, Secrets Manager, CodeCommit, or SSM Document. Hosted is the most common for new work.
- **Free-form profile vs Feature flags profile**: free-form is "any JSON/YAML/text" with custom validators; feature flags is a structured shape AppConfig validates and the console UI understands.
- **Polling latency**: the extension polls every 45 seconds by default. Direct API: every invoke is a fresh API call but you cache via session.
- **Deployment number**: each deployment increments. You can list deployment history per environment.

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

> 🧹 **Run cleanup before Lab 7.4.** Lab 7.4 (KMS) is unrelated.

Continue: [Lab 7.4 — KMS envelope encryption](../lab-04-kms-envelope-encryption/README.md)
