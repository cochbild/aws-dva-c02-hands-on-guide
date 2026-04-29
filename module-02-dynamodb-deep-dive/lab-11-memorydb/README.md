# Lab 2.11 — MemoryDB for Redis

> 🔴 **NOT free tier.** MemoryDB has a minimum cluster of 1 node × `db.t4g.small`. Pricing: ~**$0.05/hour ≈ $36/month** while running, plus snapshot storage. **Run cleanup immediately after this lab.**

> ⚠️ **Deploy time: ~10–15 minutes.** MemoryDB is slow to provision.

## What you'll learn

- How MemoryDB differs from ElastiCache Redis: durable multi-AZ writes vs. async replication
- How TLS-in-transit and ACLs work in MemoryDB (both required, vs. opt-in for ElastiCache)
- When to choose MemoryDB over ElastiCache + RDS

## Exam blueprint reference

- **D1 TS3 — Knowledge of:**
  - *"Relational and non-relational databases"*
  - *"Database consistency models (strongly consistent, eventually consistent)"*
  - *"In-memory data stores"*

## Theory primer

### MemoryDB vs ElastiCache Redis (the only thing the exam will ask)

| | ElastiCache Redis | MemoryDB |
|---|---|---|
| Primary purpose | Cache (in front of a database) | **Primary database** |
| Replication | Async to read replicas | **Sync to multi-AZ transaction log** |
| Write durability | Lost on primary failure | **Durable** — committed before client ack |
| Strong reads | No | Yes (from primary) |
| Failover RTO | ~30s, may lose recent writes | ~30s, no data loss |
| API | Redis OSS | Redis OSS (compatible) |
| Cost | ~$12/mo (cache.t3.micro free tier 12mo) | ~$36/mo minimum (no free tier) |
| TLS | Optional | **Required** |
| ACL auth | Optional | **Required** |

If a question says "we want Redis API but the cache is the source of truth — no separate database" → **MemoryDB**. If it says "we have an RDS database and want a cache in front" → **ElastiCache Redis**.

### TLS + ACL primer (this is testable)

**TLS** encrypts traffic between client and Redis. Without it, anyone in the VPC could sniff. MemoryDB forces it on. Your client must use a Redis library that supports TLS (`redis-py` does via `ssl=True`).

**ACL** = Access Control List. A list of users, each with a password, allowed commands, and key patterns. Replaces the old single-shared-`AUTH`-token model. The default user (`default`) starts disabled in MemoryDB; you must explicitly enable it or create another user.

For this lab: we use the built-in `open-access` ACL (allows all access without auth) for simplicity. **Real production: never do this.** You create an ACL with named users, each with a Secrets-Manager-stored password.

## Architecture

```
                          (default VPC)
                          ┌─────────────────────────────────────────┐
   aws lambda invoke ────►│  Lambda (in 2 default subnets)          │
                          │  redis-py with ssl=True                 │
                          │            │ TLS 6379                   │
                          │            ▼                            │
                          │  MemoryDB cluster (db.t4g.small)        │
                          │  1 shard × 1 node, multi-AZ tx log      │
                          │  ACL: open-access (lab only)            │
                          └─────────────────────────────────────────┘
```

## Prerequisites

- Lab 2.10 (ElastiCache Redis) cleaned up.
- Default VPC available.

## Step 1: Look up VPC + subnets

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

## Step 2: Install redis-py into src/

### PowerShell or Bash

```
pip install -r src/requirements.txt -t src/ --upgrade
```

## Step 3: Deploy

### PowerShell

```powershell
$Account = aws sts get-caller-identity --query Account --output text
$ArtifactsBucket = "dva-lab-artifacts-$Account-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ArtifactsBucket" 2>$null

aws cloudformation package --template-file template.yaml --s3-bucket $ArtifactsBucket --output-template-file packaged.yaml
aws cloudformation deploy --template-file packaged.yaml --stack-name dva-lab-02-11-memorydb --parameter-overrides VpcId=$DefaultVpc SubnetIds=$Subnets --capabilities CAPABILITY_IAM
```

### Bash

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-$ACCOUNT-$AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

aws cloudformation package --template-file template.yaml --s3-bucket "$ARTIFACTS_BUCKET" --output-template-file packaged.yaml
aws cloudformation deploy --template-file packaged.yaml --stack-name dva-lab-02-11-memorydb --parameter-overrides VpcId=$DEFAULT_VPC SubnetIds=$SUBNETS --capabilities CAPABILITY_IAM
```

Wait ~10–15 min.

## Step 4: Test

### PowerShell

```powershell
$FnName = aws cloudformation describe-stacks --stack-name dva-lab-02-11-memorydb --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text
aws lambda invoke --function-name $FnName --cli-binary-format raw-in-base64-out --payload '{}' out.json
Get-Content out.json
```

### Bash

```bash
FN_NAME=$(aws cloudformation describe-stacks --stack-name dva-lab-02-11-memorydb --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text)
aws lambda invoke --function-name "$FN_NAME" --cli-binary-format raw-in-base64-out --payload '{}' out.json
cat out.json
```

The Lambda writes a counter, reads it back, then **forces a "kill primary" simulation** by issuing a CONFIG-level command. In a real Multi-AZ MemoryDB cluster, the failover would complete with no data loss. With our 1-node lab cluster, you can observe that the counter persists (durability) — even if you redeploy the cluster from a snapshot.

## Step 5: Compare — invoke 100 times, observe durability

```
for i in 1..100: invoke Lambda → counter increments durably
```

### PowerShell

```powershell
1..100 | ForEach-Object {
    aws lambda invoke --function-name $FnName --cli-binary-format raw-in-base64-out --payload '{}' out.json | Out-Null
}
aws lambda invoke --function-name $FnName --cli-binary-format raw-in-base64-out --payload '{}' out.json
Get-Content out.json
```

### Bash

```bash
for i in $(seq 1 100); do
  aws lambda invoke --function-name "$FN_NAME" --cli-binary-format raw-in-base64-out --payload '{}' out.json >/dev/null
done
aws lambda invoke --function-name "$FN_NAME" --cli-binary-format raw-in-base64-out --payload '{}' out.json
cat out.json
```

You should see `counter` ≈ 102 (started at 0, this lab does 1 increment per invoke + 2 from initial test).

In ElastiCache (Lab 2.10), if the primary failed mid-test, you'd lose the most recent writes. In MemoryDB, the counter is **persisted to the multi-AZ transaction log** before the client ack — survivable.

## Exam gotchas

- **MemoryDB ≠ ElastiCache.** Different services, different consoles, different APIs (control plane), but same Redis OSS API for clients.
- **MemoryDB requires TLS in transit and ACL auth.** No way to disable. ElastiCache makes both optional.
- **MemoryDB writes are durable, ElastiCache writes are not.** Question signal: "data loss is unacceptable" → MemoryDB. "ok to lose recent writes on failure" → ElastiCache.
- **MemoryDB cluster mode is required** (sharded, 1+ shards). ElastiCache supports both classic and cluster mode.
- **MemoryDB is more expensive.** Smallest deployment ~$36/month vs ElastiCache ~$12/month.
- **Both support Redis ACL (v6+) and Multi-AZ replication.** The durability difference is in the transaction log architecture, not the API.
- **MemoryDB snapshots** go to S3 (managed by AWS, not your bucket). Restore via CreateCluster.

## Cleanup

> 🔴 **Do this NOW.** ~$36/month while running.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

Cleanup takes ~10 min — MemoryDB is slow on both create and delete.

## What's next

> 🧹 **Module 2 complete!** All resources cleaned up.
>
> Continue: [Module 3 — S3 Patterns](../../module-03-s3-patterns/README.md)

You've now covered every database/cache service in the DVA-C02 exam scope: DynamoDB (NoSQL), RDS MySQL (relational), Aurora Serverless v2 (cloud-native relational), ElastiCache Redis (cache), MemoryDB (durable cache-as-database).
