# Lab 2.3 — LSI vs GSI

> 🟢 **Free tier** — DynamoDB on-demand + Lambda only.

**Goal:** Build a table with both an LSI and a GSI. Query through each. Internalize the differences that matter on the exam — when to choose which.

## Concepts

This is the most-tested DynamoDB topic on the exam after partition key design. Read this carefully.

### What's an index?

An alternate "view" of the table that lets you query by attributes other than the table's own primary key. Internally it's a copy of the data with a different sort.

### LSI — Local Secondary Index

- **Same partition key** as the base table
- **Different sort key**
- Created **only at table-creation time** — you cannot add an LSI to an existing table
- Maximum **5 LSIs per table**
- **Strongly consistent reads** are supported
- **Shares the throughput** of the base table (no separate capacity to provision)
- Items in the LSI are limited to **10 GB per partition key value** (the "item collection size limit") — across the table + all LSIs combined
- LSIs **cannot project** all attributes if you want sparse storage; you choose `KEYS_ONLY`, `INCLUDE`, or `ALL`

### GSI — Global Secondary Index

- **Different partition key** (and optionally a different sort key)
- Created at **any time**, can be **deleted** at any time
- Maximum **20 GSIs per table** (was 5; raised in 2018)
- **Eventually consistent reads only** — never strongly consistent
- **Has its own throughput** — separate RCUs/WCUs from the base table
- **No partition size limit** — uses its own partitions
- Same projection options: `KEYS_ONLY`, `INCLUDE`, `ALL`

### When to choose which

| Need | Choose |
|---|---|
| Same PK, different sort key | LSI |
| Different PK | GSI (LSI can't do this) |
| Strongly consistent reads on the index | LSI (GSI can't do this) |
| Adding an index after table exists | GSI (LSI requires recreating table) |
| > 10 GB per partition key | GSI |
| Independent throughput control | GSI |
| Many indexes (> 5) | GSI |

**Exam shortcut:** if the question says "the application requires strongly consistent reads on this query", the answer is LSI. If "the index needs to be added after the table is in production", the answer is GSI.

### Projections

Both LSI and GSI let you choose what attributes to copy into the index:

| Projection | Stored in index | Cost | Use case |
|---|---|---|---|
| `KEYS_ONLY` | Just keys (table + index) | Cheapest | Get back to base table for full data |
| `INCLUDE` | Keys + named attributes | Mid | Cover most queries directly |
| `ALL` | Everything | Most | Avoid base-table fetch entirely |

If a query needs an attribute not in the projection, DynamoDB does an extra fetch to the base table — costly. Plan projections carefully.

### Costs to remember

- **Writes to the base table replicate to the index.** Updating an attribute that's part of an index counts as a write to *both*. Each indexed write costs additional WCU.
- **GSI throttling is independent.** A GSI with low WCU can throttle while the base table is fine. Watch `WriteThrottleEvents` on the GSI dimension.
- **Eventually consistent reads on a GSI** can lag the base table by a second or two. Don't write-then-read on a GSI expecting fresh data.

### Sparse indexes (a powerful pattern)

If an item doesn't have the GSI's partition key attribute, **it's not in the index at all**. This lets you build a "find me only the items with this state" index that's tiny:

```python
# Add this attribute only to items that are "pending"
table.update_item(
    Key={"id": "x"},
    UpdateExpression="SET #s = :s, gsi_pk = :gsi",
    ...
)
# When the item moves to "shipped", REMOVE the gsi_pk
# It vanishes from the GSI automatically.
```

Sparse indexes show up on the exam disguised as "find all incomplete tasks" or "find pending orders" type questions.

## Steps

### 1. Deploy

The template uses `CodeUri: src/`, so we `package` (upload code to S3) before `deploy`.

#### PowerShell

```powershell
$ACCOUNT = aws sts get-caller-identity --query Account --output text
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$ACCOUNT-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-02-03-indexes `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

#### Bash

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCOUNT}-${AWS_DEFAULT_REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-02-03-indexes \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

This creates:
- Base table `tasks` — PK: `user_id`, SK: `task_id`
- **LSI `LSI_DueDate`** — same PK (`user_id`), SK: `due_date`
- **GSI `GSI_Status`** — PK: `status`, SK: `due_date`

### 2. Seed

#### PowerShell

```powershell
$STACK = "dva-lab-02-03-indexes"
$SEED = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='SeedFunctionName'].OutputValue" --output text

aws lambda invoke --function-name $SEED --payload '{}' --cli-binary-format raw-in-base64-out r.json
```

#### Bash

```bash
STACK="dva-lab-02-03-indexes"
SEED=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`SeedFunctionName`].OutputValue' --output text)

aws lambda invoke --function-name "$SEED" \
  --payload '{}' --cli-binary-format raw-in-base64-out /tmp/r.json
```

### 3. Query the LSI

#### PowerShell

```powershell
$QUERY = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='QueryFunctionName'].OutputValue" --output text

# Find user u-001's tasks sorted by due_date (the LSI's sort)
aws lambda invoke --function-name $QUERY --payload '{"index": "LSI_DueDate", "user_id": "u-001"}' --cli-binary-format raw-in-base64-out r.json
Get-Content r.json

# Same but only tasks due before 2025-06-01
aws lambda invoke --function-name $QUERY --payload '{"index": "LSI_DueDate", "user_id": "u-001", "due_before": "2025-06-01"}' --cli-binary-format raw-in-base64-out r.json
Get-Content r.json
```

#### Bash

```bash
QUERY=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`QueryFunctionName`].OutputValue' --output text)

# Find user u-001's tasks sorted by due_date (the LSI's sort)
aws lambda invoke --function-name "$QUERY" \
  --payload '{"index": "LSI_DueDate", "user_id": "u-001"}' \
  --cli-binary-format raw-in-base64-out /tmp/r.json && cat /tmp/r.json | jq

# Same but only tasks due before 2025-06-01
aws lambda invoke --function-name "$QUERY" \
  --payload '{"index": "LSI_DueDate", "user_id": "u-001", "due_before": "2025-06-01"}' \
  --cli-binary-format raw-in-base64-out /tmp/r.json && cat /tmp/r.json | jq
```

### 4. Query the GSI

#### PowerShell

```powershell
# Find ALL pending tasks across all users (impossible without a GSI — would need a Scan)
aws lambda invoke --function-name $QUERY --payload '{"index": "GSI_Status", "status": "pending"}' --cli-binary-format raw-in-base64-out r.json
Get-Content r.json
```

#### Bash

```bash
# Find ALL pending tasks across all users (impossible without a GSI — would need a Scan)
aws lambda invoke --function-name "$QUERY" \
  --payload '{"index": "GSI_Status", "status": "pending"}' \
  --cli-binary-format raw-in-base64-out /tmp/r.json && cat /tmp/r.json | jq
```

This is the killer feature of GSIs — you've changed the partition key. Across-user queries are now efficient.

### 5. See the consistency difference

#### PowerShell

```powershell
# Strongly consistent on LSI — works
aws lambda invoke --function-name $QUERY --payload '{"index": "LSI_DueDate", "user_id": "u-001", "consistent": true}' --cli-binary-format raw-in-base64-out r.json
Get-Content r.json

# Strongly consistent on GSI — ValidationException
aws lambda invoke --function-name $QUERY --payload '{"index": "GSI_Status", "status": "pending", "consistent": true}' --cli-binary-format raw-in-base64-out r.json
Get-Content r.json
```

#### Bash

```bash
# Strongly consistent on LSI — works
aws lambda invoke --function-name "$QUERY" \
  --payload '{"index": "LSI_DueDate", "user_id": "u-001", "consistent": true}' \
  --cli-binary-format raw-in-base64-out /tmp/r.json && cat /tmp/r.json | jq

# Strongly consistent on GSI — ValidationException
aws lambda invoke --function-name "$QUERY" \
  --payload '{"index": "GSI_Status", "status": "pending", "consistent": true}' \
  --cli-binary-format raw-in-base64-out /tmp/r.json && cat /tmp/r.json | jq
```

The second one fails with `ValidationException`. This is exam material.

## Exam gotchas

- **LSI must be created at table creation time.** No retrofitting. CloudFormation will recreate the table if you add one.
- **Maximum 5 LSIs and 20 GSIs per table.**
- **GSIs only support eventual consistency.** Period. Repeatedly tested.
- **GSI has its own RCU/WCU.** A poorly-provisioned GSI throttles independently of the base table.
- **GSI updates are async.** Items appear in the GSI shortly after writes. If a GSI write fails (e.g., throttling), the GSI gets out of sync until DynamoDB retries.
- **`item collection size`** = base table item + all LSI projections of items with the same partition key value. **10 GB max for a partition key value when LSI is present.** Without LSI, no such limit. Common exam scenario: "the application is hitting `ItemCollectionSizeLimitExceeded`" → drop the LSI or rewrite the partition key.
- **You can `Query` an index, but not `GetItem`.** Indexes don't have item-level uniqueness in the same way; you must use Query (or Scan).
- **Projections can't be changed after creation.** To change projection on a GSI, delete and recreate it.
- **Sparse GSI:** if an item doesn't have the GSI's partition key attribute, it's not in the GSI. Used for "find items needing attention" patterns.
- **Index attribute changes count as 2 writes.** Updating `status` on a base-table item where `status` is part of `GSI_Status` PK counts toward both base table WCU *and* GSI WCU.

## Cleanup

**PowerShell:**
```powershell
.\cleanup.ps1
```

**Bash:**
```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before the next lab** — Lab 2.4 (Conditional writes) deploys its own table.
