# Conventions

This is the contract every lab in this course follows. Skim it once before Lab 1.1, then come back when you need to look something up.

If something in a lab seems weird (a strange flag, a script with no explanation), it's probably explained here.

---

## 1. Shell support

Every lab supports **PowerShell** (Windows / pwsh on Mac/Linux) and **Bash** (Linux / macOS / WSL / Git Bash on Windows). Every command block appears twice — pick the one for your shell.

If a command is identical in both shells (e.g., a plain `aws ...` invocation with no quoting tricks), it appears once with a header **"PowerShell or Bash:"** to save space.

---

## 2. Credentials

Set credentials as environment variables at the start of every shell session. Do not run `aws configure`. Do not commit credentials. Do not put them in template files.

### PowerShell

```powershell
$env:AWS_ACCESS_KEY_ID     = "AKIA..."
$env:AWS_SECRET_ACCESS_KEY = "..."
$env:AWS_DEFAULT_REGION    = "us-east-1"
# Optional, only if using temporary creds (STS)
$env:AWS_SESSION_TOKEN     = "..."
```

To persist across sessions (Windows user-level env vars):

```powershell
[Environment]::SetEnvironmentVariable("AWS_ACCESS_KEY_ID",     "AKIA...", "User")
[Environment]::SetEnvironmentVariable("AWS_SECRET_ACCESS_KEY", "...",     "User")
[Environment]::SetEnvironmentVariable("AWS_DEFAULT_REGION",    "us-east-1","User")
# Open a new PowerShell to pick them up
```

### Bash

```bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="us-east-1"
# Optional, only if using temporary creds (STS)
export AWS_SESSION_TOKEN="..."
```

To persist across sessions, add the three `export` lines to `~/.bashrc` (Linux) or `~/.zshrc` (macOS).

### Verifying

Every lab assumes this works:

```
aws sts get-caller-identity
```

If that fails, fix credentials before continuing — no lab will work without it.

### Why env vars and not `aws configure`?

- **No file on disk.** Credentials in `~/.aws/credentials` survive shell exits, get committed by accident, get scraped by misconfigured tools.
- **Easy to rotate.** New session = new vars. Done.
- **Matches the exam.** AWS SDK credential provider chain checks env vars before the credentials file. The exam tests this order.

---

## 3. Region

Default: **`us-east-1`**. Set via `AWS_DEFAULT_REGION` env var.

A few labs note that Cognito Hosted UI features and a couple of Service Catalog quirks behave best in `us-east-1`. Anywhere else may work but isn't actively tested.

You can override per-command with `--region us-west-2` if you want to test cross-region behavior. Master cleanup only checks the default region — if you deploy elsewhere, set `AWS_DEFAULT_REGION` to that region before cleanup.

---

## 4. Naming

Every resource that can be named is prefixed `dva-`. Stack names follow the form:

```
dva-lab-<MM>-<NN>-<short-name>
```

Where `MM` = module number (zero-padded), `NN` = lab number, e.g., `dva-lab-01-03-versions-aliases`.

- **Lambda functions:** named in the template, prefixed with the stack name (CFN-managed naming).
- **S3 buckets:** name-collision-prone — labs append `${AWS::AccountId}-${AWS::Region}` to the prefix to make them globally unique.
- **DynamoDB tables, SQS queues, SNS topics, KMS aliases, Secrets, etc.:** prefixed `dva-lab-MM-NN-...`.

If you change the prefix, update `cleanup-all.sh` and `cleanup-all.ps1` to match.

---

## 5. Lab folder layout

```
module-XX-name/
└── lab-YY-name/
    ├── README.md           ← theory + steps + comparison + gotchas + what's next
    ├── template.yaml       ← CloudFormation / SAM template
    ├── src/                ← Lambda function code (when applicable)
    │   └── handler.py
    ├── payloads/           ← JSON event payloads for testing (when applicable)
    │   └── test-event.json
    ├── scripts/            ← seed-data and other helpers (when applicable)
    │   ├── seed-data.sh
    │   └── seed-data.ps1
    ├── cleanup.sh
    └── cleanup.ps1
```

Not every lab has every folder — only what it needs.

---

## 6. Lab README structure

Every lab README follows this skeleton:

```markdown
# Lab X.Y — <Lab Title>

> 🟢/🟡/🔴 **Cost banner** — Free-tier / Pennies / Costs real money
> (red banner shows estimated $/hour and a cleanup reminder)

## What you'll learn

3-bullet summary of the exam concept this lab cements.

## Exam blueprint reference

The DVA-C02 task statements / "knowledge of" / "skills in" bullets this lab maps to.

## Theory primer

The minimum theory you need to do the lab. Long enough to understand, short enough not to be a textbook.

## Architecture

Diagram (ASCII or mermaid) of what you'll deploy.

## Prerequisites

- Module/lab dependencies ("Lab X.Y stack must still be deployed" or "no prerequisites")
- Tooling beyond what's in `prerequisites/` (rare)

## Step 1: Deploy

Dual-shell command blocks. Always uses `aws cloudformation deploy` (except Lab 1.1).

## Step 2: Test

Dual-shell command blocks. Uses `aws` CLI for invocation, query, observation.

## Step 3: Compare

The differentiator of this course. Change a parameter, redeploy, retest, see the difference. This is where settings stick.

## Exam gotchas

The 2-4 things the exam will try to trick you on for this concept.

## Cleanup

Dual-shell command blocks invoking `cleanup.sh` / `cleanup.ps1`.

## What's next

> 🔁 **Keep this stack** — Lab X.(Y+1) reuses it.
> OR
> 🧹 **Run cleanup before the next lab** — Lab X.(Y+1) starts fresh.
```

Some labs add extra sections (e.g., a "Pricing deep-dive" for 🔴 labs, a "Troubleshooting" appendix). The skeleton above is the minimum.

---

## 7. Deploys: `aws cloudformation deploy`

The default deploy command, used everywhere except a small number of intentional exceptions:

- **Module 1 labs 1.1, 1.3–1.7** use `sam deploy` directly so you build SAM CLI fluency on familiar Lambda services before the rest of the course switches to plain CloudFormation.
- **Lab 1.2 (event-sources)** uses `aws cloudformation deploy` (it has three sub-labs and the cfn pattern keeps them uniform).
- **Lab 8.7** uses `cdk deploy` because that lab's whole point is the CDK CLI itself.

Every other lab from Module 2 onward uses `aws cloudformation deploy`.

### PowerShell

```powershell
aws cloudformation deploy `
  --template-file template.yaml `
  --stack-name dva-lab-XX-YY-name `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND `
  --parameter-overrides Param1=value1 Param2=value2
```

### Bash

```bash
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name dva-lab-XX-YY-name \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides Param1=value1 Param2=value2
```

`CAPABILITY_AUTO_EXPAND` is required because templates use the `AWS::Serverless-2016-10-31` transform (SAM macro). `CAPABILITY_IAM` is required because templates create IAM roles.

### Templates with Lambda code

Lambda functions need their code packaged and uploaded to S3 before deploy. The pattern:

**PowerShell:**
```powershell
# One-time per account: create an artifacts bucket
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$((aws sts get-caller-identity --query Account --output text))-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null

# Per deploy: package then deploy
aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-XX-YY-name `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

**Bash:**
```bash
# One-time per account: create an artifacts bucket
ARTIFACTS_BUCKET="dva-lab-artifacts-$(aws sts get-caller-identity --query Account --output text)-${AWS_DEFAULT_REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

# Per deploy: package then deploy
aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-XX-YY-name \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

The artifacts bucket is created once and reused across all labs. Master cleanup leaves it alone unless you explicitly pass `--purge-artifacts`.

---

## 8. Reading stack outputs

Every lab's template exposes the resource ARNs/URLs you need via CloudFormation Outputs. Read them like this:

### PowerShell

```powershell
$STACK = "dva-lab-01-01-hello-sam"
$FN_NAME = aws cloudformation describe-stacks `
  --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" `
  --output text
$FN_NAME
```

### Bash

```bash
STACK="dva-lab-01-01-hello-sam"
FN_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" \
  --output text)
echo "$FN_NAME"
```

Labs build on this — once you have the output in a variable, the rest of the testing commands reference `$FN_NAME` (or `$env:FN_NAME` in PowerShell, but we'll use `$FN_NAME` directly since variables persist within a shell session).

---

## 9. JSON payloads via files

Inline JSON in shell commands is a pain (Bash needs `'...'`, PowerShell needs `'...'` plus escaped `"` inside, and the rules differ further when piping). The course avoids this entirely by storing payloads in `payloads/*.json` and passing them via `--cli-input-json file://...`:

```
aws lambda invoke `
  --function-name $FN_NAME `
  --cli-input-json file://payloads/test-event.json `
  out.json
```

This works identically in both shells. The `out.json` file gets the response.

If you ever need inline JSON: prefer Bash heredocs or PowerShell here-strings, not single-line.

---

## 10. Cost banners and free-tier discipline

Every lab opens with a banner. The criteria:

| Banner | Meaning | Examples |
|---|---|---|
| 🟢 **Free tier** | Fully covered by AWS Free Tier (most are perpetual; some are first-12-month) | Lambda, DynamoDB on-demand, SNS, SQS, EventBridge, CloudWatch logs, Step Functions Standard, S3 (small) |
| 🟡 **Pennies** | A few cents per hour, or pennies per month | KMS keys ($1/month each), Secrets Manager ($0.40/secret/month), small Aurora Serverless v2 stopped, NAT instance |
| 🔴 **Costs real money** | Dollars per hour or per month — TEAR DOWN PROMPTLY | NAT Gateway ($0.045/hr ≈ $32/month), Aurora Serverless v2 running ($0.06/ACU-hr min, ~$45/month), MemoryDB (min ~$36/month), ALB ($0.022/hr ≈ $16/month), Route 53 hosted zone ($0.50/month), provisioned concurrency, RDS Multi-AZ |

🔴 labs always include a pricing block right under the banner:

```
⚠️  This lab is NOT free-tier.
    Estimated cost: $0.045/hour while running (NAT Gateway).
    Tear down with `cleanup` script as soon as you finish testing.
```

### Free Tier service quick-reference

| Service | Free Tier | Notes |
|---|---|---|
| Lambda | 1M requests + 400K GB-seconds / month, perpetual | Easy to stay under |
| DynamoDB on-demand | 25 GB storage + 25 RCUs/WCUs / month, perpetual | Fine for labs |
| API Gateway | 1M requests / month, first 12 months | Watch out at month 13 |
| SQS / SNS | 1M requests / month, perpetual | Easy |
| EventBridge | First 14M custom events / month free for `default` event bus on first-12-months tier; perpetual for native AWS events | Labs use defaults |
| Step Functions Standard | 4K transitions / month, perpetual | Easy |
| Step Functions Express | NOT free tier — pay per ms | Used in 1 lab; tiny cost |
| S3 | 5 GB storage + 20K GETs + 2K PUTs / month, first 12 months | Always cleanup buckets |
| CloudWatch | 10 metrics + 5 GB logs / month, perpetual | Easy |
| X-Ray | First 100K traces / month, perpetual | Easy |
| KMS | 20K requests / month free; **$1/key/month always** | Multiple labs create keys |
| Secrets Manager | NO free tier — **$0.40/secret/month + API charges** | Cleanup is critical |
| RDS db.t3.micro | 750 hr / month single-AZ, first 12 months | Past 12mo = $0.017/hr |
| Aurora | NOT free tier | Use Aurora Serverless v2 with auto-pause when possible |
| ElastiCache cache.t3.micro | 750 hr / month, first 12 months | Past 12mo = $0.017/hr |
| MemoryDB | NOT free tier | Smallest = ~$0.05/hr |
| Cognito | 50K MAU free tier on Essentials, perpetual | Plenty for labs |
| CodeCommit | 5 active users / month, perpetual | **Closed to new accounts as of 2024-07-25** — see Lab 8.1 for the workaround |
| CodeBuild | 100 build minutes / month, perpetual | Easy |
| CodePipeline | First pipeline free, perpetual; $1/month per pipeline after | Stay at 1 |
| ECR | 500 MB private storage / month, first 12 months | Cleanup images |
| Fargate | NOT free tier | Pay per vCPU-second + memory-second |
| Route 53 | NOT free tier — $0.50/zone/month | Cleanup zones |
| CloudFront | 1 TB egress + 10M req / month, first 12 months | Easy |
| ALB / NLB | NOT free tier — ~$16/month | Cleanup promptly |
| NAT Gateway | NOT free tier — $0.045/hr + data | Cleanup, ALWAYS |

When a lab requires a 🔴 resource, it offers a **"low-cost alternative"** scenario when one exists (e.g., NAT Instance instead of NAT Gateway).

---

## 11. Cleanup contract

Every lab's `cleanup.sh` and `cleanup.ps1`:

1. **Empty any S3 buckets** owned by the stack (S3 buckets can't be deleted while non-empty).
2. **Disable any termination protection / deletion protection** on resources that have it (RDS, DynamoDB).
3. **Delete the CloudFormation stack** and wait for completion.
4. **Verify deletion** by checking the stack no longer exists, or report the failure.
5. **Print exactly what was deleted** so you have a paper trail.

If a lab creates a resource outside CloudFormation (e.g., a manual `aws s3 cp` upload that lives in a bucket the stack didn't create), the cleanup script handles that too. The contract: **after cleanup, no `dva-lab-XX-YY-*` resources should remain**.

The master `cleanup-all.sh` / `cleanup-all.ps1` at the repo root finds **all** `dva-lab-*` stacks and deletes them. Use it after a multi-lab session to be safe.

---

## 12. Cross-lab resource handoff

The "What's next" banner at the end of each lab tells you whether the next lab can reuse what's deployed. Two patterns:

### Pattern A: Linear handoff (most common)

Lab 2.1 creates a DynamoDB table and seeds it. Labs 2.2–2.5 query/scan/update the same table. Lab 2.5's cleanup deletes the table. Banner at end of 2.1: 🔁 **Keep this stack — Lab 2.2 reuses the table.**

### Pattern B: Fresh per lab

Lab 4.1 deploys a REST API. Lab 4.2 deploys an HTTP API to compare them — different feature set, different stack. Banner at end of 4.1: 🧹 **Run cleanup — Lab 4.2 starts fresh.**

The lab README of the **next** lab also restates this in its prerequisites section ("This lab assumes Lab 4.1 has been cleaned up; if not, run `../lab-01-rest-api/cleanup.sh` first").

---

## 13. Seed-data scripts

When a lab needs sample data — e.g., 100 items in a DynamoDB table to demonstrate query patterns — it ships with `scripts/seed-data.sh` and `scripts/seed-data.ps1`. Both produce identical data via `aws` CLI calls (no boto3, no Python).

Pattern:

**`scripts/seed-data.sh`:**
```bash
#!/usr/bin/env bash
set -euo pipefail
TABLE="dva-lab-02-01-products"
for i in $(seq 1 100); do
  aws dynamodb put-item \
    --table-name "$TABLE" \
    --item "{\"pk\":{\"S\":\"product-$i\"},\"price\":{\"N\":\"$((RANDOM % 1000)).99\"}}"
done
echo "Seeded 100 products into $TABLE"
```

**`scripts/seed-data.ps1`:**
```powershell
$TABLE = "dva-lab-02-01-products"
1..100 | ForEach-Object {
  $item = @{
    pk = @{ S = "product-$_" }
    price = @{ N = "$(Get-Random -Maximum 1000).99" }
  } | ConvertTo-Json -Compress
  aws dynamodb put-item --table-name $TABLE --item $item
}
Write-Host "Seeded 100 products into $TABLE"
```

When the seed script gets large or the JSON gets complex, the script writes the payload to a temp file and uses `--cli-input-json file://...` to avoid quoting issues.

---

## 14. Troubleshooting expectations

Every lab's "Step 2: Test" section assumes the deploy succeeded. If it didn't, the lab points you at:

```
aws cloudformation describe-stack-events --stack-name dva-lab-XX-YY-... --max-items 30
```

This is also exam content (Domain 4, Task Statement 1: "Troubleshooting deployment failures by using service output logs").

---

## 15. What's NOT in this course

By design:
- **Bedrock, SageMaker, etc.** — out of scope per the official guide.
- **Mobile (Amplify SDK for mobile, Pinpoint).** — Amplify hosting *is* covered briefly in Module 8.
- **VPC deep design (subnets, NACLs, peering).** — Out of DVA-C02 scope; SAA-C03 territory. Module 1 covers the minimum: Lambda inside a VPC, ENIs, the DNS tradeoff.
- **CloudFormation custom resources, macros beyond SAM.** — Mentioned in passing, not labbed.

If something on the official exam guide isn't in this course, file an issue.
