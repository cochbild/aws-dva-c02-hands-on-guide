# Lab 2.8 — RDS MySQL

> 🟡 **Free tier (first 12 months)** — db.t3.micro single-AZ MySQL is in the 750-hour-per-month free tier for the first 12 months of your account. After that: ~$0.017/hour ≈ **$12/month if you leave it running**. Cleanup promptly.

> ⚠️ **Deploy time: ~6–10 minutes.** RDS provisioning is slow. Don't panic when CloudFormation looks stuck on "CREATE_IN_PROGRESS" for the DB instance.

## What you'll learn

- How to deploy an RDS MySQL instance via CloudFormation
- How to retrieve database credentials from Secrets Manager (the right way) instead of hardcoding them
- How an RDS instance lives inside a VPC and is reached only by resources in the same VPC's security group

## Exam blueprint reference

- **Domain 1, TS3 — Use data stores → Knowledge of:**
  - *"Relational and non-relational databases"*
  - *"Cloud storage options (for example, file, object, databases)"*
- **Domain 2, TS3 — Manage sensitive data → Skills in:**
  - *"Using secret management services to secure sensitive data"*

## Theory primer

### What RDS is (vs. Aurora, vs. self-managed)

RDS = AWS-managed relational database. AWS handles patching, automated backups, replication, failover. You give up shell access to the host in exchange.

| | RDS (MySQL/Postgres/etc.) | Aurora (Lab 2.9) | Self-managed on EC2 |
|---|---|---|---|
| Engines | MySQL, PostgreSQL, MariaDB, Oracle, SQL Server | MySQL-compatible, PostgreSQL-compatible | anything |
| Storage scaling | manual or storage auto-scaling | automatic up to 128 TB |  manual |
| Replicas | 5 read replicas max | 15 Aurora replicas with shared storage |  whatever you build |
| Failover | Multi-AZ (~60–120s) | Multi-AZ via read replica (~30s) |  whatever you build |
| Free tier | db.t3.micro 750hr/month | NONE | EC2 free tier |

### Key exam concepts for RDS

1. **DB Subnet Group** — required for any RDS instance. Must include subnets in **at least 2 Availability Zones** even for single-AZ deployments (so RDS can re-launch in the second AZ if needed). Created once per VPC.
2. **Parameter group** — engine config (slow query log, max connections, etc.). The default group is read-only; for changes, create a custom one.
3. **Option group** — engine plug-ins (Oracle Native Auditing, SQL Server SSAS, MySQL Memcached interface). Less common for MySQL.
4. **Automated backups** — daily snapshot during a backup window + transaction logs. Retention: 0–35 days. **Disabled = no point-in-time-recovery.** Default = 7 days for production templates, 1 day for free-tier templates.
5. **Multi-AZ vs read replicas** —
   - **Multi-AZ:** synchronous replica in another AZ. Failover only. Not readable. Default off.
   - **Read replica:** asynchronous replica. Up to 5. Readable. Can be promoted to a stand-alone DB. Cross-region possible.
6. **Encryption at rest** — must be enabled at creation; cannot retro-fit. Use KMS. Encrypted snapshots can be shared across accounts (Domain 2 TS2).

### Why the credentials live in Secrets Manager, not the template

Hardcoding `MasterUserPassword` in the template means it lands in:
- Git history
- CloudFormation drift detection (visible in console)
- Every developer's machine

Secrets Manager generates a random password, stores it encrypted, and the template references the secret ARN. Your application code retrieves the password at runtime by calling `secretsmanager:GetSecretValue` with its IAM role. The password never appears in plaintext outside the running process.

The exam tests this exact pattern.

## Architecture

```
                          (default VPC)
                          ┌──────────────────────────────────────────┐
                          │                                          │
   aws lambda invoke ────►│  Lambda (in 2 default subnets)           │
                          │  Role: read DBSecret + basic execution   │
                          │  Security group: dva-lab-02-08-lambda-sg │
                          │           │                              │
                          │           │ TCP 3306                     │
                          │           ▼                              │
                          │  RDS MySQL db.t3.micro                   │
                          │  Security group: dva-lab-02-08-db-sg     │
                          │  (allows inbound 3306 from lambda-sg)    │
                          │  Credentials: random pw in DBSecret      │
                          └──────────────────────────────────────────┘
```

## Prerequisites

- Module 2 lab-07 cleaned up (or skipped — they don't share resources).
- AWS CLI v2 with credentials in env vars (per `prerequisites/README.md`).
- Default VPC in your region. (Every account has one unless you've deleted it. If yours is gone, see "If you don't have a default VPC" below.)

### If you don't have a default VPC

Create one with:
```
aws ec2 create-default-vpc
```

Or pass a non-default VPC + subnets to the parameter overrides — the template accepts any VPC ID and subnet IDs.

## Step 1: Look up your default VPC + subnets

The template needs a VPC ID and at least 2 subnet IDs in different AZs. We grab them from the default VPC.

### PowerShell

```powershell
$DefaultVpc = aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text
$Subnets = (aws ec2 describe-subnets --filters Name=vpc-id,Values=$DefaultVpc Name=default-for-az,Values=true --query 'Subnets[*].SubnetId' --output text) -split '\s+' -join ','
Write-Host "VPC: $DefaultVpc"
Write-Host "Subnets: $Subnets"
```

### Bash

```bash
DEFAULT_VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
SUBNETS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$DEFAULT_VPC Name=default-for-az,Values=true --query 'Subnets[*].SubnetId' --output text | tr '[:space:]' ',' | sed 's/,$//')
echo "VPC: $DEFAULT_VPC"
echo "Subnets: $SUBNETS"
```

## Step 2: Install the Python MySQL driver into src/

Lambda needs `pymysql` packaged with the function code. We pre-install it into `src/` so `aws cloudformation package` will bundle it.

### PowerShell

```powershell
pip install -r src/requirements.txt -t src/ --upgrade
```

### Bash

```bash
pip install -r src/requirements.txt -t src/ --upgrade
```

(If `pip` complains about Python version, use `python -m pip` or `python3 -m pip`. Lambda runs Python 3.12.)

## Step 3: Package + deploy

We need an artifacts bucket (one per account, reused across all labs). Create it once if not yet:

### PowerShell

```powershell
$Account = aws sts get-caller-identity --query Account --output text
$ArtifactsBucket = "dva-lab-artifacts-$Account-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ArtifactsBucket" 2>$null
```

### Bash

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-$ACCOUNT-$AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true
```

Then package + deploy:

### PowerShell

```powershell
aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ArtifactsBucket `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-02-08-rds-mysql `
  --parameter-overrides VpcId=$DefaultVpc SubnetIds=$Subnets `
  --capabilities CAPABILITY_IAM
```

### Bash

```bash
aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-02-08-rds-mysql \
  --parameter-overrides VpcId=$DEFAULT_VPC SubnetIds=$SUBNETS \
  --capabilities CAPABILITY_IAM
```

This takes **6–10 minutes** because RDS is slow.

## Step 4: Test

Invoke the Lambda. It connects to RDS via Secrets Manager-retrieved credentials, runs a few queries, and returns the result.

### PowerShell

```powershell
$FnName = aws cloudformation describe-stacks --stack-name dva-lab-02-08-rds-mysql `
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text

aws lambda invoke --function-name $FnName --cli-binary-format raw-in-base64-out --payload '{}' out.json
Get-Content out.json
```

### Bash

```bash
FN_NAME=$(aws cloudformation describe-stacks --stack-name dva-lab-02-08-rds-mysql \
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text)

aws lambda invoke --function-name "$FN_NAME" --cli-binary-format raw-in-base64-out --payload '{}' out.json
cat out.json
```

You should see something like:
```json
{
  "ok": true,
  "mysql_version": "8.0.35",
  "current_time": "2026-04-29 14:32:01",
  "row_count": 0
}
```

## Step 5: Compare — what happens with no Multi-AZ?

This template is **single-AZ** to stay free-tier. Look at the RDS console for the instance:

- "Availability and durability" → `Single-AZ DB instance deployment`
- Failover behavior: AWS will auto-restart in another AZ if the AZ fails, but the database is **unavailable during that time** (5–10 min).

To make it Multi-AZ (synchronous standby + automatic failover), edit `template.yaml` and add `MultiAZ: true` to the `DBInstance`. Redeploy. Then look at the console again.

> 🔴 **Multi-AZ doubles the cost** — you're paying for two instances. Don't enable Multi-AZ on this lab unless you cleanup quickly.

## Step 6: Snapshot the database

Take a manual snapshot before deleting:

### PowerShell or Bash

```
aws rds create-db-snapshot --db-instance-identifier dva-lab-02-08-mysql --db-snapshot-identifier dva-lab-02-08-snap-1
```

Snapshots persist after the database is deleted. If you ever need to restore, use:
```
aws rds restore-db-instance-from-db-snapshot --db-snapshot-identifier dva-lab-02-08-snap-1 --db-instance-identifier <new-name>
```

**Manual snapshots cost a small amount per GB until deleted.** Run this to delete:
```
aws rds delete-db-snapshot --db-snapshot-identifier dva-lab-02-08-snap-1
```

## Exam gotchas

- **DB Subnet Groups need at least 2 subnets in different AZs**, even for single-AZ deployments. CloudFormation will fail with a `DBSubnetGroupDoesNotCoverEnoughAZs` if you only pass one.
- **Encryption at rest must be enabled at creation.** Snapshot the unencrypted DB → copy the snapshot with encryption → restore from encrypted snapshot is the workaround.
- **Default backup retention is 1 day** for newly created free-tier-style instances; the exam expects 7 days for production-style answers. The CFN property is `BackupRetentionPeriod`.
- **`db.t3.micro` is the free-tier instance.** `db.t2.micro` is older and not free-tier in newer accounts. Know both names exist.
- **You can't change a single-AZ instance to Multi-AZ via API for free** — it triggers a backup, so there's a brief outage. The exam may ask "is this synchronous or asynchronous?" Multi-AZ standby = synchronous; read replica = asynchronous.
- **Read replicas can be promoted to standalone databases** (decoupling them from the source). Used for blue/green DB upgrades.
- **RDS automated backups are stored in S3 (managed by AWS)** — you don't see the bucket. Manual snapshots can be exported to a bucket you own.

## Cleanup

> ⚠️ **Do this now if you're stopping for the day.** Past the 12-month free tier this is ~$12/month sitting idle.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

The cleanup script deletes the snapshot you took (if it's still around), then the CloudFormation stack. Stack deletion takes another 5–10 minutes because RDS is slow on both ends.

## What's next

> 🧹 **Run cleanup before Lab 2.9 (Aurora Serverless).** Lab 2.9 is a separate stack — keeping this one running just costs you money.

Continue: [Lab 2.9 — Aurora Serverless v2](../lab-09-aurora-serverless/README.md)
