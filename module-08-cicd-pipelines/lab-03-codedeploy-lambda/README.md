# Lab 8.3 — CodeDeploy for Lambda

> 🟢 **Free tier-friendly** — Lambda invokes are free. CodeDeploy charges $0 for Lambda deployments.

## What you'll learn

- How CodeDeploy **shifts traffic between Lambda alias versions** using canary, linear, or all-at-once configurations
- The built-in deployment configurations: **`Canary10Percent5Minutes`**, **`Linear10PercentEvery1Minute`**, etc.
- **Pre-traffic** and **post-traffic hooks** — separate Lambdas that validate the new version before/after the shift
- The connection between this lab and Lab 1.3 (versions + aliases): CodeDeploy **just updates the alias's RoutingConfig** behind the scenes

## Exam blueprint reference

- **D3 TS4** — *"Deployment strategies (canary, blue/green, rolling)"*, *"Performing application rollbacks by using existing deployment strategies"*
- **D3 TS2** — *"Lambda versions and aliases"*

## Theory primer

### CodeDeploy for Lambda — the actual mechanism

There's no magic. CodeDeploy for Lambda just calls `update-alias --routing-config` over time:

```
t=0: alias prod → 100% v1 (current)
t=0: deploy starts.   alias prod → 90% v1 + 10% v2  (canary)
t=5min: alias prod → 100% v2     (cutover)
t=5min: alias points at v2 only — rollback would re-update routing-config
```

Same mechanism you tried in Lab 1.3. CodeDeploy automates the timing.

### Built-in deployment configurations

| Name | Behavior |
|---|---|
| `CodeDeployDefault.LambdaCanary10Percent5Minutes` | 10% for 5 min, then 100% |
| `CodeDeployDefault.LambdaCanary10Percent10Minutes` | 10% for 10 min, then 100% |
| `CodeDeployDefault.LambdaCanary10Percent15Minutes` | … |
| `CodeDeployDefault.LambdaCanary10Percent30Minutes` | … |
| `CodeDeployDefault.LambdaLinear10PercentEvery1Minute` | +10% per minute over 10 min |
| `CodeDeployDefault.LambdaLinear10PercentEvery2Minutes` | +10% per 2 min |
| `CodeDeployDefault.LambdaLinear10PercentEvery3Minutes` | … |
| `CodeDeployDefault.LambdaLinear10PercentEvery10Minutes` | … |
| `CodeDeployDefault.LambdaAllAtOnce` | 100% immediately |

Custom configs let you set arbitrary canary % or linear step / duration.

### Pre-traffic and post-traffic hooks

A `BeforeAllowTraffic` hook is a **separate Lambda** that runs before any traffic is shifted. If it fails, the deployment aborts. Useful for: smoke tests, schema migrations, dependency checks.

A `AfterAllowTraffic` hook runs after the cutover at 100%. Used for: cleanup, post-deploy validation.

The hook Lambdas receive `DeploymentId` + `LifecycleEventHookExecutionId` — they call `codedeploy:PutLifecycleEventHookExecutionStatus` with `Succeeded` or `Failed`.

### `appspec.yml` for Lambda

```yaml
version: 0.0
Resources:
  - my-lambda:
      Type: AWS::Lambda::Function
      Properties:
        Name: my-lambda
        Alias: live
        CurrentVersion: "1"
        TargetVersion: "2"
Hooks:
  - BeforeAllowTraffic: pre-traffic-validator-lambda
  - AfterAllowTraffic: post-traffic-validator-lambda
```

CodeDeploy reads this and orchestrates.

## Architecture

```
   StartDeployment (TargetVersion=2)
                     │
                     ▼
   CodeDeploy        ──► alias `live` routing config
                          (10% v2 → wait 5min → 100% v2)
                          │
                          ├─ BeforeAllowTraffic hook  ──► PreCheck Lambda
                          │  (fail aborts deployment)
                          │
                          └─ AfterAllowTraffic hook   ──► PostCheck Lambda
                             (fail rolls back)
```

## Step 1: Deploy

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-08-03-codedeploy-lambda --capabilities CAPABILITY_IAM
```

The stack creates: 1 main Lambda (with version 1 + alias `live`), 2 hook Lambdas (pre + post), CodeDeploy app + deployment group.

## Step 2: Invoke through the alias — version 1

### PowerShell or Bash

```
ALIAS=$(aws cloudformation describe-stacks --stack-name dva-lab-08-03-codedeploy-lambda --query "Stacks[0].Outputs[?OutputKey=='AliasArn'].OutputValue" --output text)
aws lambda invoke --function-name "$ALIAS" --cli-binary-format raw-in-base64-out --payload '{}' out.json
cat out.json
```

You'll see "version 1 message".

## Step 3: Update the function code, publish v2, start a canary deployment

In a real CI/CD pipeline this is automated. For the lab we do it by hand.

```
FN=$(aws cloudformation describe-stacks --stack-name dva-lab-08-03-codedeploy-lambda --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text)
APP=$(aws cloudformation describe-stacks --stack-name dva-lab-08-03-codedeploy-lambda --query "Stacks[0].Outputs[?OutputKey=='AppName'].OutputValue" --output text)
DG=$(aws cloudformation describe-stacks --stack-name dva-lab-08-03-codedeploy-lambda --query "Stacks[0].Outputs[?OutputKey=='DeploymentGroup'].OutputValue" --output text)

# Update code (just edit the env var to simulate a new version)
aws lambda update-function-configuration --function-name "$FN" --environment "Variables={MESSAGE=hello v2}"

# Publish a new version
NEW_VER=$(aws lambda publish-version --function-name "$FN" --query Version --output text)
echo "Published version: $NEW_VER"

# Start the deployment via CodeDeploy
cat > /tmp/appspec.json <<EOF
{
  "version": 0.0,
  "Resources": [{
    "MyFn": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Name": "$FN",
        "Alias": "live",
        "CurrentVersion": "1",
        "TargetVersion": "$NEW_VER"
      }
    }
  }]
}
EOF

# Encode the appspec for CodeDeploy
APPSPEC=$(cat /tmp/appspec.json | tr -d '\n')

aws deploy create-deployment \
  --application-name "$APP" \
  --deployment-group-name "$DG" \
  --deployment-config-name CodeDeployDefault.LambdaCanary10Percent5Minutes \
  --revision "{\"revisionType\":\"AppSpecContent\",\"appSpecContent\":{\"content\":$(echo "$APPSPEC" | python -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}}"
```

> Watch the deployment in the AWS console: **CodeDeploy → Applications → <your app> → Deployments**. You'll see the timeline tick from 10% to 100%.

## Step 4: Sample traffic during canary

While the canary phase is running (5 min window), invoke 20 times and count which version answers:

```bash
for i in $(seq 1 20); do
  aws lambda invoke --function-name "$ALIAS" --cli-binary-format raw-in-base64-out --payload '{}' /tmp/r.json >/dev/null
  cat /tmp/r.json | python -c 'import json,sys; print(json.load(sys.stdin)["msg"])'
done | sort | uniq -c
```

You should see roughly 2 hits to v2 and 18 to v1 during the 10% canary window.

## Step 5: Compare — rollback

If a deployment fails (the hook reports `Failed`, or you manually stop), CodeDeploy reverts the alias's routing config to the pre-deploy state. **Zero traffic loss** — the alias just resumes pointing at v1.

## Exam gotchas

- **CodeDeploy for Lambda is alias routing-config automation.** Nothing more. Same as you'd do by hand.
- **Both versions must be numbered (not `$LATEST`).** `$LATEST` can't be in a routing config.
- **Pre-traffic hook timing**: runs BEFORE any traffic is shifted. Failure = deployment stops at 0% v2.
- **Post-traffic hook timing**: runs AFTER 100% cutover. Failure = full rollback (alias re-shifts).
- **Custom deployment config**: arbitrary canary %, arbitrary linear step / duration. Set min/max via console or API.
- **Hook IAM**: hook Lambdas need permission to call `codedeploy:PutLifecycleEventHookExecutionStatus`.
- **Deployment statuses**: Created → Queued → InProgress → Succeeded / Failed / Stopped / Ready.
- **Lambda + ECS** use traffic shifting. **Lambda + EC2** uses agent-based file copy. Different mechanisms, same CodeDeploy service.

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

> 🔁 **Keep this stack — Lab 8.4 reuses the lambda or you can cleanup before lab-04 fresh.** Either works since 8.4 deploys EC2.

Continue: [Lab 8.4 — CodeDeploy for EC2](../lab-04-codedeploy-ec2/README.md)
