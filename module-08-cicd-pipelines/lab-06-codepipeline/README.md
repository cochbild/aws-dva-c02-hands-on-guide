# Lab 8.6 — CodePipeline

> 🟡 **Pennies** — first **V1 pipeline is free** for the first 30 days, then $1/month per active V1 pipeline. V2 pipelines have execution-based pricing. Lab volume is well under that.

## What you'll learn

- Pipeline structure: **Stages → Actions** with categories `Source`, `Build`, `Test`, `Deploy`, `Approval`, `Invoke`
- **Manual approval actions** that block the pipeline until a human approves via SNS notification
- **Pipeline triggers**: source change, schedule, or manual `start-pipeline-execution`
- The artifact-flow model — actions emit named outputs that downstream actions consume

## Exam blueprint reference

- **D3 TS4** — *"Manual and automated approvals in AWS CodePipeline"*, *"CI/CD workflows that use AWS services"*, *"Application deployment that uses AWS services and tools"*

## Theory primer

### Pipeline structure

```
Source stage  ──► Build stage  ──► Manual Approval  ──► Deploy stage
  │              │                  │                     │
  S3            CodeBuild           SNS notify        CloudFormation
  CodeCommit                        block until        ECS
  GitHub                            approved          Lambda
                                                       …
```

A **stage** runs sequentially; **actions** within a stage can run in **parallel** unless they depend on each other.

### Action categories

| Category | Examples |
|---|---|
| **Source** | CodeCommit, S3, ECR, GitHub via Connections, BitBucket |
| **Build** | CodeBuild, Jenkins |
| **Test** | CodeBuild (with a different buildspec), third-party |
| **Deploy** | CodeDeploy, CloudFormation, ECS, Beanstalk, AppConfig, S3, OpsWorks |
| **Approval** | Manual approval (no provider — human action via API/console) |
| **Invoke** | Lambda |

### Artifact flow

Each action declares input artifacts (named) and produces output artifacts. CodePipeline stores them in an S3 bucket (mandatory artifact store) between stages. The names propagate so a later action can grab `BuildOutput` etc.

### Manual approval

When the pipeline reaches an approval action, it pauses. Sends a notification to an SNS topic with the approval token + URL. A human visits the console (or calls `put-approval-result`) with `Approved` or `Rejected`. Approve → pipeline continues. Reject → pipeline stops.

### V1 vs V2 pipelines

- **V1** (the original) — every push to source triggers a full pipeline run. Bills per-active-pipeline-month.
- **V2** (newer, 2023) — adds **trigger conditions** (e.g., only on tag push, only on certain file paths), **variables**, **rollbacks**. Bills per-execution + per-action-runtime.

V2 is the modern answer for new pipelines.

## Architecture

```
   CodeCommit  ──► CodePipeline V1
   (lab repo)         │
                      ├─ Source stage:  CodeCommit-Source action
                      ├─ Build stage:   CodeBuild-Build action
                      ├─ Approval:      Manual-Approve (SNS topic)
                      └─ Deploy stage:  CloudFormation-Deploy action
                                          │
                                          ▼
                                       Stack: dva-lab-08-06-deployed
```

## Step 1: Deploy

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-08-06-codepipeline --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

The stack creates: a CodeCommit repo (seeded), CodeBuild project, SNS topic, CodePipeline pipeline, deployment-target IAM role.

## Step 2: Push a commit

The repo starts seeded with a `buildspec.yml` and a placeholder `template-to-deploy.yaml`. Clone, edit, push.

```
REPO_URL=$(aws cloudformation describe-stacks --stack-name dva-lab-08-06-codepipeline --query "Stacks[0].Outputs[?OutputKey=='RepoUrl'].OutputValue" --output text)
git clone "$REPO_URL"
cd dva-lab-08-06-repo
# Edit something
git commit -am "trigger pipeline"
git push
```

The pipeline auto-starts.

## Step 3: Watch the pipeline progress

```
PIPELINE=$(aws cloudformation describe-stacks --stack-name dva-lab-08-06-codepipeline --query "Stacks[0].Outputs[?OutputKey=='PipelineName'].OutputValue" --output text)
aws codepipeline get-pipeline-state --name "$PIPELINE"
```

Watch the stages flip from `InProgress` → `Succeeded`. At the manual approval, it'll pause.

## Step 4: Approve manually

```
# Find the pending approval
aws codepipeline get-pipeline-state --name "$PIPELINE" --query "stageStates[?stageName=='Approve'].actionStates[].latestExecution.token" --output text
# (use the token below)

aws codepipeline put-approval-result \
  --pipeline-name "$PIPELINE" \
  --stage-name Approve \
  --action-name Approve \
  --result summary="approved by lab",status=Approved \
  --token "<token-from-above>"
```

The deploy stage runs.

## Exam gotchas

- **Pipeline artifact store** is a single S3 bucket per pipeline. Mandatory. Often shared across pipelines but with KMS encryption configured.
- **Cross-region actions** are supported — CodePipeline replicates artifacts to the target region's bucket.
- **Source stage = first stage**. Always. Can have multiple source actions in the same stage.
- **Manual approval token** is a one-time-use UUID. After approve/reject, the token is invalid.
- **CloudFormation deploy action** has multiple modes: `CREATE_UPDATE`, `CREATE_REPLACE_CHANGE_SET`, `EXECUTE_CHANGE_SET`, `DELETE_ONLY`, `REPLACE_ON_FAILURE`. Use `CREATE_REPLACE_CHANGE_SET` + `EXECUTE_CHANGE_SET` for safer prod deploys.
- **Pipeline doesn't auto-pause on failure** — the stage that failed stops, but a retry can resume from there.
- **EventBridge integration**: pipeline state changes emit events. Build dashboards, slack notifications, etc.

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

> 🧹 **Run cleanup before Lab 8.7.**

Continue: [Lab 8.7 — CDK Introduction](../lab-07-cdk-introduction/README.md)
