# AWS Certified Developer – Associate (DVA-C02): Hands-On Lab Guide

> **The promise of this repo:** work through every lab in order and you will have hands-on experience with **every service, setting, and exam-relevant nuance** in the official [AWS DVA-C02 Exam Guide](https://d1.awsstatic.com/training-and-certification/docs-dev-associate/AWS-Certified-Developer-Associate_Exam-Guide_C02.pdf). No other course required to sit the exam.

This is not a "watch a video" course. It is a **build-and-compare** course. Each lab deploys real AWS resources, then has you change a setting, observe the difference, and understand *why*. That is how settings stick — not by reading them.

## Who this is for

You are someone who:
- Has an AWS account you can deploy to (personal/sandbox — **never** a shared production account)
- Is comfortable on a command line in either **PowerShell** (Windows) or **Bash** (Linux/macOS/WSL)
- Has 1+ years of general developer experience in any language
- Wants the DVA-C02 cert, and is willing to type the commands rather than just read them

If you don't have those, start with [`prerequisites/README.md`](prerequisites/README.md) — it gets you set up.

## How this course works

**Sequence matters.** Modules are ordered so each one builds on the last. Lambda comes first because every later module uses it. The capstone in Module 10 ties everything together.

**Within a module, labs are also sequenced.** Each lab's README ends with a "What's next" banner that tells you whether the next lab **reuses** the resources you just deployed (don't tear down) or **starts fresh** (run `cleanup`).

**Every lab follows the same shape:**
- A **🟢/🟡/🔴 cost banner** at the top tells you if it's free-tier, pennies, or dollars-per-hour
- A theory primer connects the lab to the exam blueprint
- Step-by-step deploy + test instructions in **both PowerShell and Bash**
- A **comparative scenario** — change a setting, redeploy, see what differs
- An exam-gotcha section
- A `cleanup` script that removes 100% of what was created

## Module list

The course has 10 modules. Several modules cover **multiple AWS services** that the exam groups together — see the table.

| # | Module | Services covered | Exam domains |
|---|---|---|---|
| 1 | [Lambda Fundamentals](module-01-lambda-fundamentals/README.md) | Lambda, SAM, layers, VPC for Lambda | D1, D3 |
| 2 | [Databases & Caching](module-02-dynamodb-deep-dive/README.md) | DynamoDB, RDS, Aurora Serverless, ElastiCache, MemoryDB | D1, D4 |
| 3 | [S3 Patterns](module-03-s3-patterns/README.md) | S3, S3 Glacier, presigned URLs, encryption variants, Object Lambda | D1, D2 |
| 4 | [API Gateway, Cognito & Edge](module-04-api-gateway-cognito/README.md) | API Gateway (REST + HTTP), Cognito, CloudFront, Route 53, WAF | D1, D2, D4 |
| 5 | [Messaging & Events](module-05-messaging-events/README.md) | SQS, SNS, EventBridge, Kinesis, AppSync | D1, D4 |
| 6 | [Step Functions](module-06-step-functions/README.md) | Step Functions Standard + Express, ASL, integration patterns | D1 |
| 7 | [Secrets, Config & Encryption](module-07-secrets-config/README.md) | Secrets Manager, Parameter Store, AppConfig, KMS, ACM, ACM PCA | D2 |
| 8 | [CI/CD, Containers & Deployment](module-08-cicd-pipelines/README.md) | CodeCommit, CodeBuild, CodeDeploy, CodePipeline, CDK, ECS, ECR, Fargate, Beanstalk, Amplify, Copilot | D3 |
| 9 | [Observability](module-09-observability/README.md) | CloudWatch (Logs, Metrics, Alarms, EMF, Logs Insights), X-Ray, CloudTrail | D4 |
| 10 | [Capstone](module-10-capstone/README.md) | Full serverless app combining everything | All |

## Exam blueprint mapping

The official exam has four domains:

| Domain | Weight | Where it's covered |
|---|---:|---|
| **Domain 1: Development with AWS Services** | 32% | Modules 1, 2, 3, 4, 5, 6, 10 |
| **Domain 2: Security** | 26% | Modules 4, 7, plus security callouts in every module |
| **Domain 3: Deployment** | 24% | Modules 1, 8, 10 |
| **Domain 4: Troubleshooting & Optimization** | 18% | Module 9, plus debugging + optimization sections in every module |

Every task statement and "knowledge of / skills in" bullet from the official guide is mapped to a specific lab. See each module's README for the breakdown.

## Conventions you must understand before starting

Read these now. They apply to every lab in the course. Full detail in [CONVENTIONS.md](CONVENTIONS.md).

### 1. Credentials live in environment variables

Configure once per shell session. **Never** commit these. Never run `aws configure` for these labs — env vars give the same effect and rotate cleanly.

**PowerShell** (per session):
```powershell
$env:AWS_ACCESS_KEY_ID     = "AKIA..."
$env:AWS_SECRET_ACCESS_KEY = "..."
$env:AWS_DEFAULT_REGION    = "us-east-1"
# Verify
aws sts get-caller-identity
```

**Bash** (per session):
```bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="us-east-1"
# Verify
aws sts get-caller-identity
```

Full setup with persistence options is in [prerequisites/README.md](prerequisites/README.md).

### 2. AWS CLI for everything

Every cloud interaction in every lab uses the `aws` CLI. The only exception is **Lab 1.1 (Hello SAM)** — that one lab uses the `sam` CLI because **SAM CLI itself is exam content**. Every other lab — including the rest of Module 1 — deploys via `aws cloudformation deploy` and tests via `aws lambda invoke`, `aws dynamodb get-item`, `aws s3api ...`, etc.

This builds the muscle memory the exam tests.

### 3. JSON payloads live in files

To dodge cross-shell quoting hell (PowerShell escapes JSON differently than Bash), every lab passes JSON via files:

```
aws lambda invoke --function-name dva-lab-XX --cli-input-json file://payload.json out.json
```

The same `payload.json` works in both shells.

### 4. Resource names are prefixed `dva-`

Every CloudFormation stack, S3 bucket, DynamoDB table, Lambda function, etc. starts with `dva-` so the master `cleanup-all` script can find and delete them all.

### 5. Cost discipline is non-negotiable

Every lab opens with one of three banners:

- 🟢 **Free tier** — fully free as long as you stay under AWS Free Tier limits. Run, study, walk away if needed.
- 🟡 **Pennies** — costs cents-per-hour or pennies-per-month if you forget cleanup. Won't ruin you, but run cleanup anyway.
- 🔴 **Costs real money** — accrues dollars-per-hour. Examples: NAT Gateway ($0.045/hr), Aurora Serverless v2 (~$0.06/ACU-hr min), MemoryDB (~$0.05/hr min), ALB (~$0.022/hr), Route 53 hosted zone ($0.50/month), provisioned concurrency. **Run `cleanup` immediately after the lab.** Each 🔴 lab states the exact cost before you deploy.

### 6. Inter-lab resource handoff

The end of every lab README tells you one of:

- 🔁 **Keep this stack** — the next lab reuses these resources. Don't run `cleanup`.
- 🧹 **Run cleanup before the next lab** — next lab starts fresh.

Follow it. If you cleanup when the next lab said keep, you'll just redo work. If you keep when the next lab said cleanup, you'll get name collisions.

### 7. Dual-shell command blocks

Every command block in every lab appears **twice**: once for PowerShell, once for Bash. Pick the one for your shell and copy-paste. They produce identical results.

### 8. Test data via `seed-data` scripts

When a lab needs sample data (e.g., to query a DynamoDB table), it ships with `scripts/seed-data.sh` and `scripts/seed-data.ps1`. Both wrap `aws` CLI calls and produce the same data set.

## Region

Default region throughout: `us-east-1`. Override by setting `AWS_DEFAULT_REGION`. Some labs (e.g., Cognito Hosted UI) work best in `us-east-1` due to feature availability — those will say so.

## Repo layout

```
.
├── README.md                  ← you are here
├── CONVENTIONS.md             ← deep-dive on the conventions above
├── LICENSE
├── SECURITY.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SUPPORT.md
├── cleanup-all.sh             ← Bash master cleanup
├── cleanup-all.ps1            ← PowerShell master cleanup
├── prerequisites/
│   └── README.md
├── module-01-lambda-fundamentals/
│   ├── README.md
│   ├── lab-01-hello-sam/
│   │   ├── README.md
│   │   ├── template.yaml
│   │   ├── src/
│   │   ├── scripts/
│   │   │   ├── seed-data.sh   ← (when applicable)
│   │   │   └── seed-data.ps1  ← (when applicable)
│   │   ├── cleanup.sh
│   │   └── cleanup.ps1
│   └── ...
└── ...
```

## Master cleanup

If you ever lose track of what's running:

**Bash:**
```bash
./cleanup-all.sh
```

**PowerShell:**
```powershell
.\cleanup-all.ps1
```

This finds every CloudFormation stack starting with `dva-lab-`, empties any S3 buckets they own, then deletes them. A safety net, not a replacement for per-lab `cleanup`.

## Cost expectations (overall)

If you do every lab in order, run each lab's `cleanup` immediately after, and don't leave anything running between sessions:

- **Within AWS Free Tier (first 12 months):** total cost should be under **$5** for the entire course.
- **After Free Tier expires:** total cost should be under **$25**, mostly from KMS keys ($1/key/month — Module 7) and Secrets Manager secrets ($0.40/secret/month). The 🔴 labs in Modules 2 (Aurora, MemoryDB), 4 (Route 53 zone, ALB), and 8 (Fargate, NAT Gateway) accrue real charges if left running, hence the cleanup discipline.

The `cleanup` scripts are **not optional**.

## License

[MIT](LICENSE) — fork it, extend it, use it as your study reference.

## Contributing

Bug reports and lab improvements welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).
