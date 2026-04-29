# Lab 8.4 — CodeDeploy for EC2

> 🔴 **NOT free tier (after 12-month free tier).** One `t3.micro` EC2 instance: free for first 12 months (750 hr/month), **$0.0104/hour ≈ $7.50/month** thereafter. Plus a small EBS volume ($0.10/GB-month).
>
> **Cleanup the stack as soon as you finish.** This lab takes ~15 minutes end-to-end.

> ⚠️ **Deploy time: ~5 min.** EC2 launch + CodeDeploy agent install via UserData.

## What you'll learn

- The CodeDeploy **agent-based** model: agent on the EC2 instance pulls revision from S3 and executes `appspec.yml` hooks
- The 7 lifecycle event hooks: `ApplicationStop`, `BeforeInstall`, `AfterInstall`, `ApplicationStart`, `ValidateService` (+2 service-specific)
- **In-place** vs **blue/green** deployment for EC2 — what differs
- Deployment configurations: `OneAtATime`, `HalfAtATime`, `AllAtOnce`, custom

## Exam blueprint reference

- **D3 TS4** — *"Application deployment that uses AWS services and tools (CodeDeploy)"*, *"Deployment strategies (canary, blue/green, rolling)"*, *"Performing application rollbacks"*

## Theory primer

### In-place vs blue/green for EC2

| | **In-place** | **Blue/green** |
|---|---|---|
| Mechanism | Agent on existing instances pulls + replaces app | Provision a NEW instance fleet, deploy, swap traffic |
| Downtime | Per-instance during the deploy step (config-dependent) | None |
| Cost during deploy | Single fleet | **2x fleet** until cutover |
| Rollback | Roll back via re-deploy of previous revision | Just swap traffic back to original fleet |
| Use case | Steady-state, cost-sensitive | High-availability, complex apps |

### `appspec.yml` for EC2

```yaml
version: 0.0
os: linux
files:
  - source: /
    destination: /opt/myapp
hooks:
  ApplicationStop:    [{ location: scripts/stop.sh, timeout: 60 }]
  BeforeInstall:      [{ location: scripts/before-install.sh, timeout: 60 }]
  AfterInstall:       [{ location: scripts/after-install.sh, timeout: 60 }]
  ApplicationStart:   [{ location: scripts/start.sh, timeout: 60 }]
  ValidateService:    [{ location: scripts/validate.sh, timeout: 60 }]
```

Hooks run in order. Any non-zero exit fails the deployment for that instance.

### Deployment configurations (in-place)

- **OneAtATime** — sequential, slowest, safest
- **HalfAtATime** — 50% / 50%
- **AllAtOnce** — fastest, riskiest
- **Custom** — set `MinimumHealthyHosts` (count or percent)

### Lifecycle hooks order

For an in-place deployment to a single instance:
```
ApplicationStop → BeforeInstall → DownloadBundle (CodeDeploy internal) →
Install (internal) → AfterInstall → ApplicationStart → ValidateService
```

For blue/green: hooks run on the new fleet, then traffic shifts via ELB.

## Architecture

```
   CodeDeploy ──► reads appspec.yml + scripts from S3
                     │
                     ▼
                  EC2 instance with codedeploy-agent
                     │
                     ▼
                  Runs hook scripts in order
```

## Step 1: Deploy

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-08-04-codedeploy-ec2 --capabilities CAPABILITY_IAM
```

Wait ~5 min for the EC2 instance to launch and the CodeDeploy agent to install.

## Step 2: Push a deployment revision to S3

The lab includes a sample app + appspec. Bundle and push:

### PowerShell or Bash

```
BUCKET=$(aws cloudformation describe-stacks --stack-name dva-lab-08-04-codedeploy-ec2 --query "Stacks[0].Outputs[?OutputKey=='ArtifactsBucket'].OutputValue" --output text)
APP=$(aws cloudformation describe-stacks --stack-name dva-lab-08-04-codedeploy-ec2 --query "Stacks[0].Outputs[?OutputKey=='AppName'].OutputValue" --output text)
DG=$(aws cloudformation describe-stacks --stack-name dva-lab-08-04-codedeploy-ec2 --query "Stacks[0].Outputs[?OutputKey=='DeploymentGroup'].OutputValue" --output text)

# Bundle revision (the appspec + scripts in this folder)
cd revision
zip -r ../revision.zip .
cd ..
aws s3 cp revision.zip "s3://$BUCKET/revision.zip"

aws deploy create-deployment \
  --application-name "$APP" \
  --deployment-group-name "$DG" \
  --revision "revisionType=S3,s3Location={bucket=$BUCKET,key=revision.zip,bundleType=zip}"
```

## Step 3: Watch the deployment

```
aws deploy list-deployments --application-name "$APP" --deployment-group-name "$DG" --max-items 1
aws deploy get-deployment --deployment-id <id-from-above> --query "deploymentInfo.{Status:status,Hooks:lifecycleEvents}"
```

You'll see each hook progress: `Pending` → `Succeeded`.

## Step 4: Verify the app is running

The `start.sh` hook starts a tiny Python HTTP server on port 8080.

```
INSTANCE=$(aws cloudformation describe-stacks --stack-name dva-lab-08-04-codedeploy-ec2 --query "Stacks[0].Outputs[?OutputKey=='InstancePublicIp'].OutputValue" --output text)
curl "http://$INSTANCE:8080"
```

You should see `Hello from EC2`.

## Step 5: Compare — push v2 and re-deploy

Edit the message in `revision/scripts/start.sh`, re-zip, re-upload, create another deployment. Watch the hooks fire again. Same app, replaced in place.

## Exam gotchas

- **Agent must be running on every target instance.** Install via UserData / SSM / AMI bake.
- **EC2 instances need an instance profile** with `AmazonEC2RoleforAWSCodeDeploy` (managed) — they'll fail without it.
- **`appspec.yml` MUST be at the root of the bundle.** Not in a subdirectory.
- **Hook scripts must be executable** (`chmod +x`) — easy to miss when zipping from Windows.
- **`OneAtATime`** for production. `AllAtOnce` only for dev/test (one bad hook = whole fleet down).
- **Auto Scaling Group** integration: CodeDeploy can target an ASG. New instances launched during a deployment receive the latest revision automatically (`Standard` lifecycle hook).
- **CodeDeploy load-balancer integration**: deregister from ELB before stop, register after start. Set this in the deployment group config.
- **Revision retention**: S3 + GitHub revisions; retention is your responsibility (lifecycle on S3 bucket).

## Cleanup

> 🔴 **Do this NOW** — EC2 instance accrues charges past free tier.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before Lab 8.5 (CodeDeploy for ECS).**

Continue: [Lab 8.5 — CodeDeploy for ECS](../lab-05-codedeploy-ecs/README.md)
