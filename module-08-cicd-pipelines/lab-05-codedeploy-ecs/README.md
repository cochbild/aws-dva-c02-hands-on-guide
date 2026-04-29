# Lab 8.5 — CodeDeploy for ECS (Blue/Green)

> 🔴 **NOT free tier.** Fargate task running ~$0.04/hour per vCPU + ~$0.005/hour per GB memory. ALB ~$0.022/hour. **Total ≈ $0.07/hour ≈ $50/month if left running.** Cleanup IMMEDIATELY after testing.

> ⚠️ **Deploy time: ~10 min.** ECS cluster + task definition + Fargate service + 2 target groups + ALB.

## What you'll learn

- ECS **blue/green** deployment via CodeDeploy: standby task set, traffic shift via ALB listener
- The **two target groups + two listeners** pattern that makes blue/green possible on ECS
- How CodeDeploy + ECS differs from CodeDeploy + Lambda

## Exam blueprint reference

- **D3 TS4** — *"Deployment strategies (canary, blue/green, rolling)"*, *"Application deployment that uses AWS services and tools"*

## Theory primer

### ECS blue/green mechanism

CodeDeploy doesn't restart your service — it creates a **second task set** alongside the original (the "green" set) running the new task definition. Then it shifts ALB traffic from the blue target group to the green target group. After bake, the blue set is terminated.

### Required pieces

1. **2 target groups** (blue + green) — same protocol, port, target type
2. **ALB listener with a default action** that points at one target group
3. **(Optional) test listener** on a different port — lets you smoke-test the green set before traffic shifts
4. **ECS service** with `DeploymentController.Type: CODE_DEPLOY` (NOT the default `ECS` controller)
5. **CodeDeploy app + deployment group** with:
   - `LoadBalancerInfo.TargetGroupPairInfoList` — names the two target groups
   - `ProductionTrafficRoute` (the listener that serves prod traffic)
   - `TestTrafficRoute` (optional, for smoke test)

### `appspec.yml` for ECS (very different from EC2)

```yaml
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: arn:aws:ecs:...:task-definition/my-app:5
        LoadBalancerInfo:
          ContainerName: web
          ContainerPort: 80
        PlatformVersion: LATEST
Hooks:
  - BeforeInstall:        smoke-test-lambda
  - AfterInstall:         lambda
  - AfterAllowTestTraffic: lambda
  - BeforeAllowTraffic:   lambda
  - AfterAllowTraffic:    lambda
```

ECS hooks are different from EC2/Lambda — there are **5 lifecycle events** (Before/AfterInstall, AfterAllowTestTraffic, Before/AfterAllowTraffic).

### Deployment configurations

- `CodeDeployDefault.ECSCanary10Percent5Minutes` etc.
- `CodeDeployDefault.ECSLinear10PercentEvery1Minute` etc.
- `CodeDeployDefault.ECSAllAtOnce`

Same naming pattern as Lambda configs.

## Architecture

```
   ALB listener :80      ──► Target group BLUE  (current task set, 1 task)
                              │
   ALB listener :8080    ──► Target group GREEN (deployment task set, 1 task) ← test traffic
                              │
   CodeDeploy creates green   │
   waits for hooks            │
   shifts listener :80 →      │ (production traffic flips here)
   terminates blue
```

## Step 1: Deploy

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-08-05-codedeploy-ecs --capabilities CAPABILITY_IAM
```

Wait ~10 min. The stack creates the cluster, ALB, both target groups, both listeners, an ECS service in CODE_DEPLOY mode, and a CodeDeploy app + deployment group.

## Step 2: Visit the app

```
URL=$(aws cloudformation describe-stacks --stack-name dva-lab-08-05-codedeploy-ecs --query "Stacks[0].Outputs[?OutputKey=='AlbUrl'].OutputValue" --output text)
curl "$URL"
```

You'll see a page from nginx (the placeholder image). The current task set is "blue".

## Step 3: Compare — what would a blue/green deployment look like

The full deployment requires pushing a new task definition + appspec.yml to S3 and starting a CodeDeploy deployment. That's effort and cost. Conceptually:

```
1. Build new image, push to ECR
2. Register new task definition
3. Generate appspec.yml referencing the new task definition
4. aws deploy create-deployment with deploymentConfigName=CodeDeployDefault.ECSCanary10Percent5Minutes
5. Watch the green task set spin up
6. ALB :80 listener flips from blue target group to green
7. Blue task set terminates
```

The lab keeps you at the deployed state so you can inspect the architecture without actually running deployments.

## Exam gotchas

- **ECS only supports blue/green via CodeDeploy.** ECS's native `DeploymentController.Type: ECS` is rolling-update only. For canary or blue/green you MUST use `CODE_DEPLOY` controller.
- **Two target groups REQUIRED.** Same protocol/port/target-type, different names. The deployment group references both.
- **Test listener (different port) is optional but recommended** — runs hooks against the green set before customers see it.
- **ECS hooks differ from EC2/Lambda hooks**: five lifecycle events instead of three or seven.
- **Task definition revision** changes per deployment. Each deployment is a new task definition number.
- **Auto-scaling on the service** continues to work during deployment — both blue and green sets scale independently.
- **Pricing during deployment**: 2x running tasks until cutover. Account for it.

## Cleanup

> 🔴 **Do this NOW.** Fargate + ALB charges add up fast.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before Lab 8.6 (CodePipeline).**

Continue: [Lab 8.6 — CodePipeline](../lab-06-codepipeline/README.md)
