# Lab 1.3 — Versions & Aliases

> 🟢 **Free tier** — Lambda invocations only.

**Goal:** Deploy a Lambda, publish numbered versions, point an alias at a version, and shift traffic between two versions using weighted alias routing (the foundation of canary deploys).

## Concepts

### What's a Lambda version?

When you publish a version, Lambda takes a **snapshot** of:
- Code
- Runtime
- Handler
- Memory, timeout, env vars
- Layers
- Most other configuration

That snapshot gets a sequential integer (1, 2, 3, …) and a unique ARN:
```
arn:aws:lambda:us-east-1:123456789012:function:my-fn:3
                                                    ^ version
```

Versions are **immutable**. Once published, they cannot be modified. The unversioned function (`$LATEST`) is the working copy you edit.

### What's an alias?

A pointer to a version. Aliases are mutable.

```
arn:aws:lambda:us-east-1:123456789012:function:my-fn:prod
                                                    ^ alias name
```

You can move an alias to a different version with one API call. Callers using the alias ARN are now hitting the new version.

### Why both?

- **Versions** give you immutable history and rollback.
- **Aliases** give callers a stable identifier that survives deploys.

Pattern: callers (API Gateway, EventBridge rules, other services) reference the alias ARN. You publish a new version, point the alias at it. Callers don't change — they just start hitting the new code.

### Weighted aliases (canary)

An alias can route a percentage of traffic to a second version:

```yaml
RoutingConfig:
  AdditionalVersionWeights:
    "2": 0.1   # 10% to version 2; remaining 90% to the alias's primary version
```

This is the foundation of:
- **Canary deployments** (CodeDeploy uses this for Lambda)
- **Blue/green** (shift 100% in one go)
- **Linear** (gradually increase weight)

You'll see all three when you configure CodeDeploy in Module 8. Same underlying mechanism.

### Permissions and aliases

A function policy (resource-based) attached to the alias ARN applies to *the alias only* — not to other aliases or `$LATEST`. This is how you give one consumer access to `prod` without giving them access to `$LATEST`.

## Steps

### 1. Deploy v1

This lab uses the SAM CLI directly (not `aws cloudformation deploy`) — Module 1 is where you build SAM CLI fluency before the rest of the course switches to plain CloudFormation.

**PowerShell or Bash:**

```
sam build
sam deploy --guided --stack-name dva-lab-01-03-versions-aliases
```

The template publishes the alias `live` initially pointing at version 1.

### 2. Invoke via the alias

**PowerShell:**

```powershell
$ALIAS_ARN = aws cloudformation describe-stacks --stack-name dva-lab-01-03-versions-aliases `
  --query "Stacks[0].Outputs[?OutputKey=='AliasArn'].OutputValue" --output text

aws lambda invoke --function-name $ALIAS_ARN `
  --payload '{}' --cli-binary-format raw-in-base64-out resp.json
Get-Content resp.json
```

**Bash:**

```bash
ALIAS_ARN=$(aws cloudformation describe-stacks --stack-name dva-lab-01-03-versions-aliases \
  --query 'Stacks[0].Outputs[?OutputKey==`AliasArn`].OutputValue' --output text)

aws lambda invoke --function-name "$ALIAS_ARN" \
  --payload '{}' --cli-binary-format raw-in-base64-out resp.json && cat resp.json
```

You'll see `"version": "1"`.

### 3. Modify code, deploy v2

Edit `src/app.py` — change the `MESSAGE` constant to `"hello from v2"`.

**PowerShell or Bash:**

```
sam build
sam deploy
```

Look at the function in the console → **Versions** tab. You should see version 1 *and* version 2.

But: the alias is still pointing at v1! Invoking the alias still returns "v1 message".

### 4. Move the alias

Manually point the `live` alias at v2:

**PowerShell or Bash:**

```
aws lambda update-alias --function-name dva-lab-01-03-versions --name live --function-version 2
```

Now invoke through the alias → "v2 message".

### 5. Set up weighted routing (canary)

Send 20% to v1 (the old version), 80% to v2:

**PowerShell or Bash:**

```
aws lambda update-alias --function-name dva-lab-01-03-versions --name live --function-version 2 --routing-config "AdditionalVersionWeights={1=0.2}"
```

> **Read the syntax carefully:** `AdditionalVersionWeights` is a map from version → weight. The function-version arg (`2`) is the *primary* version. The map weight (`0.2` for "1") is the percentage going to that *additional* version. So 20% to v1, 80% (the remainder) to v2.

Invoke 20 times and count:

**PowerShell:**

```powershell
1..20 | ForEach-Object {
  aws lambda invoke --function-name $ALIAS_ARN `
    --payload '{}' --cli-binary-format raw-in-base64-out resp.json | Out-Null
  (Get-Content resp.json | ConvertFrom-Json).version
} | Group-Object | Select-Object Count, Name
```

**Bash:**

```bash
for i in $(seq 1 20); do
  aws lambda invoke --function-name "$ALIAS_ARN" \
    --payload '{}' --cli-binary-format raw-in-base64-out \
    /tmp/resp.json > /dev/null
  cat /tmp/resp.json | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])'
done | sort | uniq -c
```

Roughly 4 hits to v1, 16 to v2.

### 6. Promote (shift 100% to v2)

**PowerShell or Bash:**

```
aws lambda update-alias --function-name dva-lab-01-03-versions --name live --function-version 2 --routing-config "AdditionalVersionWeights={}"
```

### 7. Roll back

If v2 was bad, this is the rollback:

**PowerShell or Bash:**

```
aws lambda update-alias --function-name dva-lab-01-03-versions --name live --function-version 1
```

One API call. This is why aliases matter.

## Exam gotchas

- **`$LATEST` is the working copy, not a version.** You can't point an alias at `$LATEST` for canary routing — both targets must be numbered versions.
- **Provisioned concurrency is set per version or per alias.** Setting it on `$LATEST` is not allowed (because `$LATEST` is mutable). Set it on the alias and it applies to whichever version the alias points to.
- **AWS CodeDeploy for Lambda only updates aliases, not functions.** It changes the alias's routing configuration over time (`Linear10PercentEvery1Minute`, `Canary10Percent5Minutes`, etc.).
- **Pre-traffic and post-traffic hooks** in CodeDeploy run as separate Lambda functions before/after the shift. We'll wire these up in Module 8.
- **You can't reduce weight to a version below 0 or above 1.** Weights must sum (with the implicit primary) to 1.0.
- **Resource-based policies on alias ARNs** scope permissions to that alias only. Adding `lambda:InvokeFunction` permission to `arn:...:fn:prod` does not let the caller invoke `arn:...:fn:dev`.

## Cleanup

**PowerShell:**

```powershell
.\cleanup.ps1
```

**Bash:**

```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before the next lab** — Lab 1.4 (Layers) starts fresh with a different Lambda + layer.
