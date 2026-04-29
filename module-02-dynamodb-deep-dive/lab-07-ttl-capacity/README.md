# Lab 2.7 — TTL, Capacity Modes & PITR

> 🟢 **Free tier** — DynamoDB on-demand and provisioned (small) both stay within the perpetual 25 GB / 25 RCU/WCU free tier. PITR adds ~20% storage cost — pennies for the small data here.

## What you'll learn

- How **TTL** auto-deletes items (and what its real-world latency actually is)
- The differences between **on-demand** and **provisioned** capacity modes — and the 24-hour switch limit
- How **auto-scaling**, **adaptive capacity**, and **burst capacity** keep provisioned tables from throttling
- How **Point-in-Time Recovery (PITR)** vs on-demand backups protect against operator error

## Exam blueprint reference

- **D1 TS3 — Knowledge of:** *"Database consistency models (for example, strongly consistent, eventually consistent)"*
- **D1 TS3 — Knowledge of:** *"Differences between query and scan operations"* (revisits Lab 2.2 throttling)
- **D1 TS3 — Knowledge of:** *"Differences between ephemeral and persistent data storage patterns"*
- **D1 TS3 — Skills in:** *"Managing data lifecycles"* (TTL is the canonical answer)
- **D4 TS3 — Knowledge of:** *"Concurrency"* (capacity modes and throttling)

## Theory primer

### TTL — Time To Live

DynamoDB can automatically delete items after a specified time. You enable TTL on the table, choose an attribute to read the timestamp from, and write items with that attribute set to a future Unix epoch.

```python
import time
table.put_item(Item={
    "session_id": "abc",
    "data": "...",
    "expires_at": int(time.time()) + 3600,   # 1 hour from now
})
```

**Critical exam points:**

- TTL is **eventually deleted** — usually within 48 hours of expiry. Don't rely on it for security or precise timing.
- TTL deletes count as **stream events** (`REMOVE`). The `userIdentity` field in the stream record is `{"type": "Service", "principalId": "dynamodb.amazonaws.com"}` — that's how you tell a TTL delete from a manual one.
- TTL deletes are **free** — they don't consume WCU.
- The TTL attribute must be a **Number** type, in **seconds since epoch**. Milliseconds doesn't work.
- Items with TTL in the past *but not yet deleted* are **still readable**. Don't depend on TTL for invisibility — filter in your queries if you need that guarantee.

### Capacity modes

| Mode | When to use |
|---|---|
| **On-demand** (`PAY_PER_REQUEST`) | Unpredictable traffic, dev/test, brand-new app, sub-100 reqs/sec sustained |
| **Provisioned** | Predictable load, sustained high traffic, cost optimization at scale |

You can switch — but **only once every 24 hours per table**. Tested.

#### On-demand pricing

- $1.25 per million writes (1 KB)
- $0.25 per million strongly-consistent reads (4 KB)
- $0.125 per million eventually-consistent reads
- 2x for transactional

No capacity to plan. Auto-scales to your traffic.

#### Provisioned + auto-scaling

Set min/max RCU and WCU and a target utilization (default 70%). DynamoDB calls **Application Auto Scaling** under the hood, which adjusts capacity over time.

**Reserved capacity** is a billing discount — commit to 1 or 3 years for ~50% off. Provisioned mode only.

#### Burst capacity

Provisioned tables can briefly burst above their provisioned capacity using "saved up" unused capacity (5 minutes worth). Beyond that → throttling.

#### Adaptive capacity

If one partition is hot and others are idle, DynamoDB automatically rebalances capacity within the table. Built-in, no config. Pre-2018 you designed around hot partitions yourself; now DynamoDB helps.

But: **adaptive capacity has limits.** It can shift capacity, not create it. If total provisioned capacity is too low for the hot partition, you still throttle.

### Throttling exceptions

| Exception | Cause |
|---|---|
| `ProvisionedThroughputExceededException` | Provisioned table over capacity |
| `ThrottlingException` | API request rate too high |
| `RequestLimitExceeded` | Account-level read/write rate limit |

The SDK retries these automatically with exponential backoff. Let the SDK do it.

### Backups

- **On-demand backups** — point-in-time snapshot, no performance impact, retained until you delete
- **Point-in-time recovery (PITR)** — continuous backup, restore to any second in the last **35 days**. Enable per-table; ~20% extra storage cost.

PITR is for accidental writes (operator error). On-demand backups are for compliance and long-term retention.

### DAX (briefly — don't deploy)

**DynamoDB Accelerator (DAX)** is a write-through, read-through cache that sits in front of DynamoDB and provides microsecond latency. It runs as a managed cluster (cache.t3.small minimum, ~$0.04/hr — **🔴 not free tier**, so we don't deploy it here). The exam tests:

- DAX is **inside the VPC** — you connect from VPC-resident clients only
- DAX caches **GetItem / Query / Scan** results — not Put/Update/Delete (those go through to DDB and invalidate cache)
- TTL on DAX cache: 5 minutes default
- DAX vs ElastiCache: DAX is DynamoDB-specific (no other backend); ElastiCache is general-purpose

### Global Tables

Multi-region, active-active. Reads/writes in any region, replicated to others. Conflict resolution: **last writer wins** (timestamps).

- Built on Streams (requires `NEW_AND_OLD_IMAGES`)
- Eventually consistent across regions; sub-second within continents, ~1-2 seconds globally
- Use cases: low-latency global apps, regional DR, data residency

## Architecture

```
┌─────────────────────────────────────────────┐
│  dva-lab-02-07-sessions                     │
│   PROVISIONED (5 RCU / 5 WCU)               │
│   ├─ TTL on `expires_at` (Number, seconds)  │
│   ├─ Auto-scaling target 70% utilization    │
│   │  RCU min 5, max 40                      │
│   │  WCU min 5, max 40                      │
│   └─ PITR enabled (35-day point-in-time)    │
└─────────────────────────────────────────────┘
```

## Prerequisites

> 🧹 If labs 2.1–2.6 are still deployed, run their cleanup scripts first (in reverse order) to avoid table-name collisions and to free up your account-level table count.

## Step 1: Deploy

### PowerShell

```powershell
aws cloudformation deploy `
  --template-file template.yaml `
  --stack-name dva-lab-02-07-ttl-capacity `
  --capabilities CAPABILITY_IAM
```

### Bash

```bash
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name dva-lab-02-07-ttl-capacity \
  --capabilities CAPABILITY_IAM
```

## Step 2: Test

### Capture the table name

#### PowerShell

```powershell
$TABLE = aws cloudformation describe-stacks `
  --stack-name dva-lab-02-07-ttl-capacity `
  --query "Stacks[0].Outputs[?OutputKey=='TableName'].OutputValue" `
  --output text
$TABLE
```

#### Bash

```bash
TABLE=$(aws cloudformation describe-stacks \
  --stack-name dva-lab-02-07-ttl-capacity \
  --query "Stacks[0].Outputs[?OutputKey=='TableName'].OutputValue" \
  --output text)
echo "$TABLE"
```

### Verify TTL is enabled

**PowerShell or Bash:**

```
aws dynamodb describe-time-to-live --table-name $TABLE
```

Expected:
```json
{
  "TimeToLiveDescription": {
    "TimeToLiveStatus": "ENABLED",
    "AttributeName": "expires_at"
  }
}
```

### Seed items with various TTLs

#### PowerShell

```powershell
.\scripts\seed-data.ps1
```

#### Bash

```bash
bash ./scripts/seed-data.sh
```

This inserts 5 items: one expired 1 hour ago, one expiring in 60 seconds, one in 1 hour, one in 1 day, one in 30 days.

### Read items — note expired items are still returned

**PowerShell or Bash:**

```
aws dynamodb scan --table-name $TABLE --query 'Items[].session_id.S'
```

You'll see all 5 items including the one whose `expires_at` is in the past — DynamoDB hasn't deleted it yet (TTL latency is up to 48 hours). **This is the gotcha**: don't rely on TTL for visibility. Filter in your query if you need expired items hidden.

### Verify PITR

**PowerShell or Bash:**

```
aws dynamodb describe-continuous-backups --table-name $TABLE
```

Expected:
```json
{
  "ContinuousBackupsDescription": {
    "ContinuousBackupsStatus": "ENABLED",
    "PointInTimeRecoveryDescription": {
      "PointInTimeRecoveryStatus": "ENABLED"
    }
  }
}
```

## Step 3: Compare — switch to on-demand

This demonstrates the **24-hour-once-per-table** switch limit. Try the switch:

**PowerShell or Bash:**

```
aws dynamodb update-table \
  --table-name $TABLE \
  --billing-mode PAY_PER_REQUEST
```

Wait for `UPDATING` → `ACTIVE`:

```
aws dynamodb describe-table --table-name $TABLE --query 'Table.{Status:TableStatus,Mode:BillingModeSummary.BillingMode}'
```

Now try to switch back:

```
aws dynamodb update-table \
  --table-name $TABLE \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

You'll get **`ValidationException: Last update to your billing mode happened too recently...`** — the 24-hour rule. Document this for the exam: **provisioned↔on-demand switch is throttled to once per 24 hours per table.**

### Compare — adaptive capacity in action

Provisioned mode + a hot partition: deliberately force one partition to be hit by all requests:

**Bash (skip in PowerShell to avoid loop friction):**
```bash
for i in $(seq 1 200); do
  aws dynamodb put-item --table-name $TABLE \
    --item "{\"session_id\":{\"S\":\"hot\"},\"data\":{\"S\":\"$i\"}}" \
    --return-consumed-capacity TOTAL 2>&1 | grep -E "CapacityUnits|throughput"
done
```

(All 200 writes target `session_id = "hot"`. Adaptive capacity will absorb most of this — but if you push hard enough, you'll see `ProvisionedThroughputExceededException`.)

## Exam gotchas

1. **TTL is up to 48 hours late.** Don't use it as a security mechanism. Use it as a cost mechanism + a "the data is no longer needed" signal.
2. **TTL attribute must be Number, in epoch seconds.** Milliseconds, ISO strings, or any other format = items are never deleted.
3. **TTL deletes count as REMOVE in streams.** Detect them via `userIdentity.principalId == dynamodb.amazonaws.com`.
4. **Capacity mode switch is throttled to once per 24 hours per table.**
5. **PITR adds ~20% to storage cost** and lets you restore to any second in the last 35 days. On-demand backups are forever; PITR is the rolling 35-day window.
6. **On-demand has no warm-up.** Goes from 0 to thousands of requests/sec instantly. Provisioned needs auto-scaling lead time (~minutes).
7. **Adaptive capacity is automatic and can't be disabled.** It mitigates moderate hot-partition issues. It's not a substitute for good key design.
8. **Global Tables require streams enabled with `NEW_AND_OLD_IMAGES`.** DynamoDB enforces this when you create a global table.
9. **DAX caches GetItem/Query/Scan only.** Writes pass through to DDB. DAX TTL is separate from item TTL.

## Cleanup

#### PowerShell

```powershell
.\cleanup.ps1
```

#### Bash

```bash
bash ./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before the next lab** — Lab 2.8 starts fresh with RDS MySQL.

Continue to [Lab 2.8 — RDS MySQL](../lab-08-rds-mysql/README.md).
