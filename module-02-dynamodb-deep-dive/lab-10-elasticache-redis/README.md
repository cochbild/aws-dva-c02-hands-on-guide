# Lab 2.10 — ElastiCache Redis

> 🟡 **Free tier (first 12 months)** — `cache.t3.micro` is in the 750-hr-per-month free tier for the first 12 months. After that: ~$0.017/hr ≈ **$12/month**. Cleanup promptly past 12 months.

> ⚠️ **Deploy time: ~5–8 minutes.**

## What you'll learn

- The four caching strategies the exam tests by name: **cache-aside**, **read-through**, **write-through**, **lazy loading**, plus **TTL** as the unifying eviction strategy
- ElastiCache Redis vs ElastiCache Memcached vs MemoryDB (cleared up in Lab 2.11)
- How a Lambda reaches a private cache cluster in the same VPC

## Exam blueprint reference

- **D1 TS3 — Knowledge of:**
  - *"Caching strategies (for example, write-through, read-through, lazy loading, TTL)"* ← this lab is the exam material
  - *"In-memory data stores"*
- **D4 TS3 — Knowledge of:**
  - *"Caching"*

## Theory primer

### The four caching strategies

| Strategy | When to read | When to write |
|---|---|---|
| **Cache-aside** | App: check cache → if miss, hit DB → write to cache → return | App: write DB → invalidate cache |
| **Read-through** | App: ask cache. Cache loads from DB on miss internally. | (App writes DB directly; cache invalidated on write) |
| **Write-through** | App: ask cache. (Read pattern unchanged) | App: write to **cache**, cache writes to DB synchronously |
| **Write-behind** (a.k.a. write-back) | (read unchanged) | App: write to cache, cache writes to DB **asynchronously**. Risky on cache failure. |

**Lazy loading** is just cache-aside described from the cache's perspective: data only enters cache when first requested.

**TTL** is the eviction policy applied on top of any of these: items expire after N seconds. Without a TTL, stale data sits in the cache until evicted by memory pressure.

### Redis vs Memcached (exam loves this)

| | Redis | Memcached |
|---|---|---|
| Data types | strings, lists, sets, sorted sets, hashes, streams, geospatial | strings only |
| Persistence | Optional (RDB snapshots, AOF) | None |
| Replication | Yes (read replicas, Multi-AZ) | No (multi-node only via app-level sharding) |
| Pub/sub | Yes | No |
| Transactions | MULTI/EXEC | No |
| Memory model | Single-threaded | Multi-threaded |
| Use case | Sessions, leaderboards, rate-limit counters, message queues | Simple cache, transient |

If the question says "we need replication" or "we need data structures more complex than strings" → Redis. If it says "simplest possible cache, no replication" → Memcached.

### ElastiCache Redis vs MemoryDB (Lab 2.11 covers MemoryDB)

- **ElastiCache Redis** — cache-first. Backups optional. If the primary fails, the replica takes over but **may have lost the last few seconds of writes** (async replication).
- **MemoryDB** — primary database. Writes are committed to a multi-AZ transaction log **before** the client acks. Durable. Replaces a relational DB for some workloads.

Same API. Different durability. Same client (`redis-py`).

## Architecture

```
                          (default VPC)
                          ┌────────────────────────────────────┐
   aws lambda invoke ────►│  Lambda (in 2 default subnets)     │
                          │  redis-py packaged in src/         │
                          │            │ TCP 6379              │
                          │            ▼                       │
                          │  ElastiCache Redis (cache.t3.micro)│
                          │  Single node, no AUTH (lab only)   │
                          └────────────────────────────────────┘
```

**Why no AUTH/TLS in this lab?** AUTH adds Secrets Manager + Redis ACL config; TLS adds cert handling. Both are real production concerns and on the exam, but each is a half-day rabbit hole. We cover both in Lab 2.11 (MemoryDB) where they're required.

## Prerequisites

- Lab 2.9 cleaned up (Aurora is too expensive to leave running).
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
aws cloudformation deploy --template-file packaged.yaml --stack-name dva-lab-02-10-elasticache-redis --parameter-overrides VpcId=$DefaultVpc SubnetIds=$Subnets --capabilities CAPABILITY_IAM
```

### Bash

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-$ACCOUNT-$AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

aws cloudformation package --template-file template.yaml --s3-bucket "$ARTIFACTS_BUCKET" --output-template-file packaged.yaml
aws cloudformation deploy --template-file packaged.yaml --stack-name dva-lab-02-10-elasticache-redis --parameter-overrides VpcId=$DEFAULT_VPC SubnetIds=$SUBNETS --capabilities CAPABILITY_IAM
```

## Step 4: Test

The Lambda demonstrates **all four caching strategies** in one run, with measurable timings.

### PowerShell

```powershell
$FnName = aws cloudformation describe-stacks --stack-name dva-lab-02-10-elasticache-redis --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text
aws lambda invoke --function-name $FnName --cli-binary-format raw-in-base64-out --payload '{}' out.json
Get-Content out.json
```

### Bash

```bash
FN_NAME=$(aws cloudformation describe-stacks --stack-name dva-lab-02-10-elasticache-redis --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text)
aws lambda invoke --function-name "$FN_NAME" --cli-binary-format raw-in-base64-out --payload '{}' out.json
cat out.json
```

The response shows the timing of each strategy. Cache miss + DB simulation = ~50 ms. Cache hit = ~1 ms.

## Step 5: Compare — TTL behavior

Invoke twice in quick succession. Both invocations show "cache hit" for the second, third, fourth requests.

Wait 60 seconds (the TTL the Lambda sets). Invoke again. The first call is a cache miss; subsequent calls are hits — until the next TTL expires. **TTL is the only thing standing between you and stale data forever.**

## Step 6: Compare — what changes with replication?

This template uses a **single-node** cluster. To make it Multi-AZ with a replica:

```yaml
NumCacheClusters: 2          # was 1, single-node
AutomaticFailoverEnabled: true
MultiAZEnabled: true
```

(Single-node uses `CacheCluster`; Multi-AZ uses `ReplicationGroup`. Different resource type — see Lab 2.11 template for the replication-group form.)

> 🔴 **Multi-AZ doubles cost** (2 nodes). Stay single-node for this lab.

## Exam gotchas

- **Single-node uses `AWS::ElastiCache::CacheCluster`. Multi-node Redis uses `AWS::ElastiCache::ReplicationGroup`.** Two different CFN types. Memcached only uses `CacheCluster`.
- **AUTH token** is the simplest auth (one shared password). Modern best practice is **Redis ACL** (per-user auth — supported on Redis 6+). MemoryDB requires ACL.
- **TLS in transit is opt-in** for ElastiCache (`TransitEncryptionEnabled: true`); required and on by default for MemoryDB.
- **Endpoint vs configuration endpoint** — single-node has one endpoint; cluster mode (sharding) has a configuration endpoint that the client uses to discover nodes.
- **ElastiCache lives in VPC.** Cannot be reached over the internet. Lambda must be in the same VPC (or use VPC interface endpoints, which don't help here because ElastiCache itself isn't a VPC endpoint service).
- **Cache-aside vs write-through pick:**
  - Cache-aside: cache only what's read. Data may be stale until TTL.
  - Write-through: cache always fresh on write. Pays for capacity for things you never read.
- **Lazy loading risk** — the first read after a write or expiry has full DB latency. Use TTL + write-through for hot keys.

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

> 🧹 **Run cleanup before Lab 2.11 (MemoryDB).** Different stack; MemoryDB is more expensive and has different config — they'd collide if both ran.

Continue: [Lab 2.11 — MemoryDB Redis](../lab-11-memorydb/README.md)
