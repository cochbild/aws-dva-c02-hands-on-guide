# Lab 2.9 — Aurora Serverless v2

> 🔴 **NOT free tier.** Aurora Serverless v2 charges per **ACU-hour** (Aurora Capacity Unit). Even with `MinCapacity: 0.5`, the running cost is roughly **$0.06 × 0.5 = $0.03/hour ≈ $22/month** if left running. Storage is extra (~$0.10/GB-month).
>
> **Run cleanup immediately after the lab.** Don't walk away from this one.

> ⚠️ **Deploy time: ~10 minutes.**

## What you'll learn

- What an ACU is and how Aurora Serverless v2 scales between min/max
- The cluster endpoint vs reader endpoint vs instance endpoint distinction
- How to use the **RDS Data API** to query a database from Lambda **without a TCP driver and without VPC config** — a major exam pattern

## Exam blueprint reference

- **D1 TS3** — *"Relational and non-relational databases"*, *"Database consistency models"*
- **D1 TS2** — *"Integrating Lambda functions with AWS services"*

## Theory primer

### Aurora vs RDS in one breath

Aurora is AWS's MySQL-compatible / PostgreSQL-compatible engine. It has its own storage layer (replicated 6 ways across 3 AZs) so failover is faster (~30s) and it can have up to 15 read replicas that share the same storage. RDS-flavored MySQL/Postgres uses a separate storage attachment per instance — replicas are async copies.

### Aurora capacity modes

1. **Aurora provisioned** — you pick instance classes (db.r6g.large etc.). You pay full hourly rate whether you use it or not. NOT covered here.
2. **Aurora Serverless v1** (legacy) — automatic scaling between configured min/max. **Pause to zero capacity when idle.** Can take 30s to resume. Limited engine versions. Don't use for new workloads.
3. **Aurora Serverless v2** (this lab) — automatic scaling in **0.5 ACU increments** with sub-second response. Can scale to **0 ACU** when idle (auto-pause) on supported engine versions. Uses the same engines as provisioned Aurora.

An **ACU** ≈ 2 GiB of RAM + corresponding CPU + networking. Pricing scales linearly with ACU.

### What the RDS Data API gets you

Normally to query MySQL from Lambda you:
1. Put the Lambda in the same VPC as the database
2. Bundle a TCP driver (`pymysql`, `mysql-connector-python`)
3. Manage connection pooling (warm / cold start)

The Data API replaces all of that with an HTTPS endpoint:

```
aws rds-data execute-statement \
  --resource-arn <cluster-arn> \
  --secret-arn <secret-arn> \
  --database <db-name> \
  --sql "SELECT VERSION()"
```

- No VPC config on Lambda needed — calls go over the public RDS Data API endpoint
- No driver — just `boto3.client('rds-data')`
- Connection pooling is handled by the Data API

Trade-offs: ~10–20% slower than a direct connection, **5-min request limit**, **64KB result size limit**, BatchExecuteStatement caps at 1000 rows. For most exam-shaped Lambdas it's fine.

**This is what the exam expects** when it shows a question like "you need to call Aurora from Lambda without managing connection pools — what do you use?" Answer: RDS Data API.

### Cluster endpoints

Aurora is a **cluster** (1 writer + 0–15 readers). It exposes three DNS endpoints:

- **Cluster endpoint** — always points to the current writer. Fails over automatically.
- **Reader endpoint** — load-balances across all replicas. If a replica fails, traffic redistributes.
- **Instance endpoint** — DNS for one specific instance. Bypasses the cluster's routing — usually a code smell.

This lab has 1 writer instance only (free up the deploy). Cluster endpoint = writer endpoint. Reader endpoint exists but has nothing behind it.

## Architecture

```
                                 (no VPC config needed for the Lambda)
   aws lambda invoke ────►  Lambda
                              │
                              │ rds-data:ExecuteStatement (HTTPS)
                              ▼
                         RDS Data API endpoint
                              │
                              ▼
                         Aurora Serverless v2 cluster
                         (1 writer instance, 0.5–1 ACU)
                         engine: aurora-mysql 8.0
                         credentials: Secrets Manager
```

## Prerequisites

- Lab 2.8 cleaned up (Aurora needs subnet group; we re-create one to keep stacks independent).
- AWS CLI v2 with env-var creds.

## Step 1: Look up VPC + subnets

Aurora still requires a DB Subnet Group (even though Lambda won't be in the VPC):

### PowerShell

```powershell
$DefaultVpc = aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text
$Subnets = (aws ec2 describe-subnets --filters Name=vpc-id,Values=$DefaultVpc Name=default-for-az,Values=true --query 'Subnets[*].SubnetId' --output text) -split '\s+' -join ','
```

### Bash

```bash
DEFAULT_VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
SUBNETS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$DEFAULT_VPC Name=default-for-az,Values=true --query 'Subnets[*].SubnetId' --output text | tr '[:space:]' ',' | sed 's/,$//')
```

## Step 2: Deploy

No `pip install` step needed — Lambda only uses boto3 (already in the runtime).

### PowerShell

```powershell
$Account = aws sts get-caller-identity --query Account --output text
$ArtifactsBucket = "dva-lab-artifacts-$Account-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ArtifactsBucket" 2>$null

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ArtifactsBucket `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-02-09-aurora-serverless `
  --parameter-overrides VpcId=$DefaultVpc SubnetIds=$Subnets `
  --capabilities CAPABILITY_IAM
```

### Bash

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-$ACCOUNT-$AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-02-09-aurora-serverless \
  --parameter-overrides VpcId=$DEFAULT_VPC SubnetIds=$SUBNETS \
  --capabilities CAPABILITY_IAM
```

Deploy takes ~10 min. The cluster comes up first (~6 min), then the writer instance (~4 min).

## Step 3: Test (Lambda → Data API → Aurora)

### PowerShell

```powershell
$FnName = aws cloudformation describe-stacks --stack-name dva-lab-02-09-aurora-serverless `
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text

aws lambda invoke --function-name $FnName --cli-binary-format raw-in-base64-out --payload '{}' out.json
Get-Content out.json
```

### Bash

```bash
FN_NAME=$(aws cloudformation describe-stacks --stack-name dva-lab-02-09-aurora-serverless \
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text)

aws lambda invoke --function-name "$FN_NAME" --cli-binary-format raw-in-base64-out --payload '{}' out.json
cat out.json
```

You should see Aurora's MySQL version and a sample query result.

## Step 4: Compare — call Data API directly from CLI

The exam loves this. Same query, called from your shell instead of from Lambda:

### PowerShell or Bash

```
CLUSTER_ARN=$(aws cloudformation describe-stacks --stack-name dva-lab-02-09-aurora-serverless --query "Stacks[0].Outputs[?OutputKey=='ClusterArn'].OutputValue" --output text)
SECRET_ARN=$(aws cloudformation describe-stacks --stack-name dva-lab-02-09-aurora-serverless --query "Stacks[0].Outputs[?OutputKey=='SecretArn'].OutputValue" --output text)

aws rds-data execute-statement --resource-arn "$CLUSTER_ARN" --secret-arn "$SECRET_ARN" --database mysql --sql "SELECT VERSION()"
```

(In PowerShell, replace `$VAR` references with `(...)` capture as needed — this works as one-liner in pwsh because the env vars persist.)

## Step 5: Compare — auto-pause behavior

This template sets `MinCapacity: 0.5`, so the cluster never pauses fully. To enable scale-to-zero auto-pause, edit `template.yaml`:

```yaml
ServerlessV2ScalingConfiguration:
  MinCapacity: 0      # was 0.5
  MaxCapacity: 1
```

Redeploy. Wait 5 minutes idle, then invoke. **First invoke after pause takes ~15 seconds** while the cluster wakes back up. Subsequent invokes are normal speed.

> 🔴 **Charging while paused:** even at 0 ACU, Aurora storage is still billed. ~$0.10/GB-month. Cleanup is the only way to stop costs.

## Exam gotchas

- **Aurora Serverless v2 vs v1** — v1 is legacy. New design questions assume v2. v1 paused to 0; v2 only paused to 0 in late-2024 versions.
- **Data API resource ARN format** — must use the full cluster ARN, not the cluster identifier or endpoint hostname. `arn:aws:rds:<region>:<account>:cluster:<id>`.
- **Data API in private subnets** — yes, Lambda calls reach the API endpoint over public AWS network. To force traffic over private network, use a VPC interface endpoint (`com.amazonaws.<region>.rds-data`).
- **Data API max statement runtime** — 5 minutes. Anything longer needs direct connection or batch chunking.
- **Aurora endpoints** — cluster (writer), reader (load-balanced replicas), and per-instance. The reader endpoint always exists even with no replicas; it just routes back to the writer in that case (NOT recommended in production).
- **Failover time** — ~30s for Aurora vs ~60–120s for RDS Multi-AZ. Aurora's shared storage layer makes the standby promotion much faster.
- **6-way replication** — Aurora storage is replicated to 6 copies across 3 AZs (2 per AZ). Survives loss of 2 copies (write) or 3 copies (read) without losing availability.

## Cleanup

> 🔴 **Do this NOW unless you're moving immediately to Step 5 of this lab.**

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

Cleanup takes ~10 min for Aurora to delete cluster + instance + snapshot.

## What's next

> 🧹 **Run cleanup before Lab 2.10 (ElastiCache Redis).** Lab 2.10 is a fresh stack and Aurora is too expensive to leave running.

Continue: [Lab 2.10 — ElastiCache Redis](../lab-10-elasticache-redis/README.md)
