# Lab 7.1 — Secrets Manager basics & rotation

> 🟡 **Pennies** — Secrets Manager has **no free tier**. The secret you create costs **$0.40/month** prorated, plus $0.05 per 10K API calls. Cleanup empties the cost as soon as you finish; nothing accrues after deletion.

## What you'll learn

- How to create, retrieve, and update a secret with versioning
- The four stage labels (`AWSCURRENT`, `AWSPENDING`, `AWSPREVIOUS`, custom) and how rotation moves them
- How to wire a custom rotation Lambda — the same pattern AWS-managed RDS rotation Lambdas use
- Why caching matters when reading secrets from a high-traffic Lambda

## Exam blueprint reference

- **Domain 2 / TS3** — *Manage sensitive data in application code*: secrets management, secure credential handling, environment variables vs Secrets Manager
- **Domain 4 / TS3** — *Optimize applications by using AWS services and features*: caching strategies (avoid hammering Secrets Manager on every invoke)

## Theory primer

A **secret** in Secrets Manager is a versioned blob (text or binary, max 64 KB). You don't access "the value" — you access "the value with a particular **stage label**".

The exam tests these stage labels relentlessly:

| Stage | Meaning |
|---|---|
| `AWSCURRENT` | The active value. `GetSecretValue` with no `VersionStage` returns this. |
| `AWSPENDING` | A new value being created during rotation. Not yet promoted. |
| `AWSPREVIOUS` | The value that was current before the most recent rotation. |
| Custom labels | You can attach your own (`canary`, `rolled-back`, etc.) |

Rotation is a four-step state machine the rotation Lambda implements:

1. `createSecret` — generate a new value, store as `AWSPENDING`
2. `setSecret` — apply the new value to whatever owns it (e.g., change RDS master password)
3. `testSecret` — verify the new value works (e.g., connect to RDS with it)
4. `finishSecret` — move `AWSPENDING` label to the new version, demoting old `AWSCURRENT` to `AWSPREVIOUS`

### Caching

`GetSecretValue` is an API call ($0.05 per 10K). A Lambda invoked 1,000 times per second hammering Secrets Manager:

- Costs $432/month in Secrets Manager API alone
- Hits the **GetSecretValue rate limit** (10K/sec per region)

Solution: **cache the secret in module-level state** of the Lambda (refreshes only on cold start) or use the **AWS Parameters and Secrets Lambda Extension** (built-in HTTP cache running in the execution environment).

This lab uses module-level caching to make the pattern visible in code.

## Architecture

```
┌─────────────────────┐
│   Reader Lambda     │
│  (caches in module  │──► GetSecretValue ──► ┌────────────────────┐
│   global on cold    │                       │  Secrets Manager   │
│   start only)       │                       │  dva-lab-07-01-app │
└─────────────────────┘                       │   AWSCURRENT v1    │
                                              │   AWSPENDING (none)│
┌─────────────────────┐                       │   AWSPREVIOUS (none)│
│   Rotation Lambda   │──► RotateSecret  ───► │                    │
│  (4-step state      │                       └────────────────────┘
│   machine)          │
└─────────────────────┘
```

The secret holds a small JSON blob: `{"username":"appuser","password":"<random>"}`. The rotation Lambda generates a new password each time it runs.

## Prerequisites

- All Module 7 labs assume you've completed [`prerequisites/README.md`](../../prerequisites/README.md) and have AWS credentials in env vars.
- No prior lab dependencies.
- One artifacts S3 bucket for `aws cloudformation package`. If you don't have one yet, create it once:

**PowerShell:**
```powershell
$ACCT = aws sts get-caller-identity --query Account --output text
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$ACCT-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null
```

**Bash:**
```bash
ACCT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCT}-${AWS_DEFAULT_REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true
```

## Step 1: Deploy

**PowerShell:**
```powershell
aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-07-01-secrets-mgr `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

**Bash:**
```bash
aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-07-01-secrets-mgr \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

Once that returns `Successfully created/updated stack`, capture the outputs you'll use repeatedly:

**PowerShell:**
```powershell
$STACK = "dva-lab-07-01-secrets-mgr"
$SECRET_ARN = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='SecretArn'].OutputValue" --output text
$READER_FN = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='ReaderFunctionName'].OutputValue" --output text
$ROTATE_FN = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='RotationFunctionName'].OutputValue" --output text
"Secret:   $SECRET_ARN"
"Reader:   $READER_FN"
"Rotation: $ROTATE_FN"
```

**Bash:**
```bash
STACK="dva-lab-07-01-secrets-mgr"
SECRET_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='SecretArn'].OutputValue" --output text)
READER_FN=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ReaderFunctionName'].OutputValue" --output text)
ROTATE_FN=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='RotationFunctionName'].OutputValue" --output text)
echo "Secret:   $SECRET_ARN"
echo "Reader:   $READER_FN"
echo "Rotation: $ROTATE_FN"
```

## Step 2: Test — read the secret directly via CLI

**PowerShell or Bash:**
```
aws secretsmanager get-secret-value --secret-id $SECRET_ARN
```

You'll see the `SecretString` field with the JSON `{"username":"appuser","password":"..."}`. Note `VersionStages` lists `AWSCURRENT`.

To get only the parsed password:

**PowerShell:**
```powershell
$secret = aws secretsmanager get-secret-value --secret-id $SECRET_ARN --query SecretString --output text | ConvertFrom-Json
$secret.password
```

**Bash:**
```bash
aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" --query SecretString --output text | python -c "import sys,json; print(json.load(sys.stdin)['password'])"
```

## Step 3: Test — invoke the reader Lambda

The reader returns the (cached) password length and a hash, never the password itself — that's the production-safe pattern.

**PowerShell or Bash:**
```
aws lambda invoke --function-name $READER_FN --cli-input-json file://payloads/read.json out.json
type out.json     # PowerShell
cat  out.json     # Bash
```

You should see `{"password_length":24,"password_hash":"<sha256>","cached":false}`. The first call after deploy is a cold start, so `cached:false`. Run it again immediately:

**PowerShell or Bash:**
```
aws lambda invoke --function-name $READER_FN --cli-input-json file://payloads/read.json out.json
type out.json     # PowerShell
cat  out.json     # Bash
```

`cached:true`. The Lambda execution environment was reused; the secret value is held in module-level state. **No new Secrets Manager API call was made.** This is what you must do in production.

## Step 4: Trigger rotation

Manually trigger a rotation. AWS will invoke the rotation Lambda four times — once per state-machine step.

**PowerShell or Bash:**
```
aws secretsmanager rotate-secret --secret-id $SECRET_ARN
```

Wait ~30 seconds, then look at the secret's metadata:

**PowerShell or Bash:**
```
aws secretsmanager describe-secret --secret-id $SECRET_ARN
```

You'll see two version IDs in `VersionIdsToStages`:

```json
"VersionIdsToStages": {
  "<old-uuid>": ["AWSPREVIOUS"],
  "<new-uuid>": ["AWSCURRENT"]
}
```

The old version is still readable for emergency rollback:

**PowerShell or Bash:**
```
aws secretsmanager get-secret-value --secret-id $SECRET_ARN --version-stage AWSPREVIOUS
```

Now read the new current value — note the password is different:

**PowerShell or Bash:**
```
aws secretsmanager get-secret-value --secret-id $SECRET_ARN --version-stage AWSCURRENT
```

## Step 5: Inspect rotation logs

The rotation Lambda's CloudWatch logs show the four step labels:

**PowerShell or Bash:**
```
aws logs tail /aws/lambda/$ROTATE_FN --since 5m
```

You'll see the four steps logged: `createSecret`, `setSecret`, `testSecret`, `finishSecret`. This is the same state machine the AWS-managed RDS rotation Lambda runs.

## Step 6: Compare — what happens during rotation

Re-invoke the reader Lambda twice in quick succession **immediately after** rotating again. The cached value in the warm Lambda is now stale (it's the old password):

**PowerShell or Bash:**
```
aws secretsmanager rotate-secret --secret-id $SECRET_ARN
# wait 30s for rotation to finish
aws lambda invoke --function-name $READER_FN --cli-input-json file://payloads/read.json out1.json
type out1.json     # PowerShell  (cat on Bash)
```

If the Lambda execution environment was warm, it'll show the **old hash** because the cache wasn't invalidated. This is the "stale secret" problem in production — your Lambda has the old password until cold-started or until the cache TTL expires.

Possible mitigations:

1. **Clear the cache** when SDK calls fail with auth errors (lazy refresh)
2. Use the **AWS Parameters and Secrets Lambda Extension** with a configurable TTL
3. Listen on **EventBridge** for `Rotation Succeeded` events and force a refresh

## Exam gotchas

- **`AWSPENDING` exists only during rotation.** Step 1 (`createSecret`) attaches it to a new version; step 4 (`finishSecret`) moves the `AWSCURRENT` label to that version, leaving `AWSPENDING` un-attached (until next rotation).
- **`AWSPREVIOUS` is the *most recently rotated-out* version.** Older versions (3+ rotations ago) still exist but have no stage label and can't be retrieved.
- **Rotation Lambdas for RDS-style secrets must be in the same VPC** as the database. The AWS-managed templates handle this; custom rotation Lambdas must specify VPC config.
- **`get-secret-value` rate limit is 10K/sec/region**, not per-secret. A misbehaving fleet can throttle every consumer.
- **Lambda env vars vs Secrets Manager**: env vars are visible to anyone with `lambda:GetFunctionConfiguration`. Secrets Manager values require explicit `secretsmanager:GetSecretValue`. **Don't put DB passwords in env vars.**
- **`SecretString` vs `SecretBinary`**: only one is set, never both. Most secrets use `SecretString` with JSON inside.
- **Cross-region replication** is per-secret — turn on with `replicate-secret-to-regions`. Replicas have their own ARNs but share the same value.

## Cleanup

**PowerShell:**
```powershell
.\cleanup.ps1
```

**Bash:**
```bash
./cleanup.sh
```

This forcibly deletes the secret with a 7-day recovery window disabled (use `--force-delete-without-recovery` — only do this in labs, never in production), then deletes the stack.

> **In production** you'd `delete-secret` with a recovery window of 7–30 days so you can restore if you regret it. The lab uses `--force-delete-without-recovery` to keep the cost banner accurate.

## What's next

> 🧹 **Run cleanup before the next lab** — Lab 7.2 (Parameter Store) starts fresh with no shared resources.

Continue to [Lab 7.2 — Parameter Store](../lab-02-parameter-store/README.md).
