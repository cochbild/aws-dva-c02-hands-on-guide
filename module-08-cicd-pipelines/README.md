# Module 8: CI/CD, Containers & Deployment

This module covers everything in **Domain 3: Deployment (24% of the exam)**. By the end you'll have built every CI/CD primitive AWS provides, hands-on, and will know which deployment strategy fits which scenario.

## Why this module matters

Domain 3 questions almost always come down to **picking the right tool for a deployment scenario**. The exam tests:

- Which CodePipeline action type to use (Source vs Build vs Test vs Deploy vs Approval vs Invoke)
- What goes in `buildspec.yml` vs `appspec.yml` (a frequent distractor pair)
- CodeDeploy traffic-shifting strategies — **Canary** vs **Linear** vs **All-at-once**, and what each one actually does
- CodeDeploy compute platform differences: Lambda (alias-based traffic shift), EC2/On-Premises (in-place vs blue/green), ECS (blue/green only)
- Beanstalk deployment policies — **All-at-once / Rolling / Rolling with additional batch / Immutable / Blue/Green**
- ECS task role vs execution role (very commonly confused; expect at least one question on this)
- ECR features: scan-on-push, image tag mutability, lifecycle policies
- CDK basics — `synth`, `deploy`, `diff`, `bootstrap`
- SAM vs CDK vs CloudFormation as IaC choices

## Concepts covered, by lab

| Lab | Service / concept | Cost | Reuse next? |
|---|---|---|---|
| 8.1 | CodeCommit (Git on AWS) — repo, IAM, HTTPS git creds vs SSH vs grc | 🟢 Free | 🔁 Reused 8.2–8.6 |
| 8.2 | CodeBuild — buildspec phases, artifacts, env vars, reports | 🟢 Free | 🔁 Reused 8.3–8.6 |
| 8.3 | CodeDeploy for **Lambda** — canary, linear, all-at-once + traffic hooks | 🟢 Free | 🔁 Reused 8.4 (concept only) |
| 8.4 | CodeDeploy for **EC2** — in-place vs blue/green | 🔴 ~$0.012/hr (t3.micro) | 🧹 Cleanup |
| 8.5 | CodeDeploy for **ECS** — blue/green target group swap | 🔴 ~$0.06/hr (Fargate + ALB) | 🧹 Cleanup |
| 8.6 | CodePipeline — source → build → approval → deploy | 🟡 $1/mo if past 1-pipeline tier | 🧹 Cleanup |
| 8.7 | CDK introduction — synth/deploy/diff/bootstrap; same stack as SAM, side-by-side | 🟢 Free | 🧹 Cleanup |
| 8.8 | ECS / ECR / Fargate — image push, task def, service, ALB, autoscaling | 🔴 ~$0.06/hr | 🧹 Cleanup |
| 8.9 | Beanstalk + Amplify — environments, .ebextensions, deploy policies, hosting | 🔴 ~$0.012/hr (Beanstalk EC2) | 🧹 Cleanup |

## Exam blueprint mapping

This module covers **all four task statements** of Domain 3:

| Task statement | Where covered |
|---|---|
| TS1: Prepare application artifacts | 8.1, 8.2, 8.7, 8.8 |
| TS2: Test in dev environments | 8.2 (local sam build), 8.7 (cdk diff) |
| TS3: Automate deployment testing | 8.2 (CodeBuild reports), 8.6 (test stage) |
| TS4: Deploy with AWS CI/CD services | 8.3, 8.4, 8.5, 8.6, 8.9 |

Plus key Domain 1 / 4 cross-cutting:
- **D1.TS2 Lambda packaging** — 8.2, 8.3, 8.7
- **D4.TS1 troubleshooting deployments** — every lab has a "if deploy fails" troubleshooting block

## Order matters

Labs 8.1 → 8.6 form a chain: each one builds on the CodeCommit repo and CodeBuild project from earlier labs. **Do them in order**, and follow the 🔁 banners — don't run cleanup until 8.6 says to.

Labs 8.7, 8.8, 8.9 are independent — you can do them in any order after 8.6 is cleaned up.

## Common exam gotcha framework: which deployment service for what?

Memorize this table cold. It's the answer to ~3 exam questions on average:

| Compute target | Service | Strategies available |
|---|---|---|
| **Lambda** | CodeDeploy | Canary, Linear, All-at-once (alias-based traffic shift) |
| **EC2 / On-Prem** | CodeDeploy | In-place, Blue/Green |
| **ECS (Fargate or EC2)** | CodeDeploy | Blue/Green only |
| **Elastic Beanstalk** | Beanstalk itself (NOT CodeDeploy) | All-at-once, Rolling, Rolling-with-additional-batch, Immutable, Blue/Green-via-swap |
| **CloudFormation stack updates** | CloudFormation | Change sets + stack policies |
| **API Gateway** | API GW canary deploy or stage variables | Canary on stage |

If a question mentions "Beanstalk" and "CodeDeploy" together — that combination doesn't exist. Trap.

## What's next

Start with **[Lab 8.1: CodeCommit](lab-01-codecommit/README.md)**.
