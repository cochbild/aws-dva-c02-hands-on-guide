# Lab 2.2 — Query vs Scan

> 🟢 **Free tier** — DynamoDB on-demand + Lambda only.

**Goal:** Build a table with composite keys, see how Query targets a single partition efficiently, and watch Scan eat through the whole table. Learn the expression syntax that *every* DynamoDB exam question relies on.

## Concepts

### Query vs Scan in one sentence

**Query** = "give me items with this exact partition key (and optionally these sort key conditions)" — fast, cheap.

**Scan** = "read every item in the table and filter" — slow, expensive, and reads consume capacity even if filtered out.

### Why Query is fast

DynamoDB hashes the partition key to find one physical partition, then walks the sort key range within that partition. It only reads what matches. Capacity consumed is proportional to data returned (rounded up to 4 KB chunks).

### Why Scan is slow

Scan reads **every item in every partition** before filtering. Capacity consumed is proportional to *all* items scanned, not just items returned. A `FilterExpression` runs *after* the read — you pay for everything DynamoDB looked at.

### When Scan is acceptable

- Small tables (< 100 items, dev environments)
- One-time data migrations
- Reports that genuinely need every item
- When a GSI would be a better answer but you can't add one

For "find all users older than 30", **a GSI is almost always the right answer** — not Scan.

### Expression syntax (memorize this)

DynamoDB expressions are a small DSL with strict rules:

| Component | Purpose |
|---|---|
| `KeyConditionExpression` | Query only — must equal partition key + optional sort key condition |
| `FilterExpression` | Query or Scan — applied after read, doesn't reduce read cost |
| `ProjectionExpression` | Comma-separated list of attributes to return — reduces network bytes (NOT read cost) |
| `UpdateExpression` | `SET`, `REMOVE`, `ADD`, `DELETE` clauses |
| `ConditionExpression` | Pre-condition for write — fails the operation if false |
| `ExpressionAttributeNames` | Aliases for attribute names (use for reserved words) |
| `ExpressionAttributeValues` | Bind variables for values |

Example — "find this user's orders for date >= 2024-01-01":
```python
table.query(
    KeyConditionExpression="user_id = :uid AND order_date >= :start",
    ExpressionAttributeValues={
        ":uid": "u-001",
        ":start": "2024-01-01",
    },
    ProjectionExpression="#o, total",
    ExpressionAttributeNames={"#o": "order_id"},   # 'order_id' isn't reserved but #o shows the pattern
)
```

### Sort key conditions in `KeyConditionExpression`

Only these operators on the sort key:

| Op | Meaning |
|---|---|
| `=` | Equal |
| `<`, `<=`, `>`, `>=` | Comparison (lexical for strings, numeric for numbers) |
| `BETWEEN :a AND :b` | Range |
| `begins_with(sk, :prefix)` | String prefix match |

You **cannot** use `contains()`, `<>`, or `IN` on the sort key in a Query.

### `FilterExpression` operators

Way more flexible — `contains`, `attribute_exists`, `attribute_type`, `IN`, `<>`, etc. But remember: **filter happens after read**.

### Pagination

Both Query and Scan can return paginated results. If `LastEvaluatedKey` is present in the response, there's more data. Pass it as `ExclusiveStartKey` on the next call.

```python
response = table.query(...)
items = response["Items"]
while "LastEvaluatedKey" in response:
    response = table.query(..., ExclusiveStartKey=response["LastEvaluatedKey"])
    items.extend(response["Items"])
```

The high-level boto3 paginator does this for you.

### Result limits

- Single Query/Scan response: **max 1 MB**. After that, paginate.
- `Limit` parameter caps **items examined**, not items returned (with FilterExpression, you may get fewer).

### Parallel Scan

Split a Scan into N segments, run them concurrently:
```python
table.scan(Segment=0, TotalSegments=4)   # workers 0, 1, 2, 3
```

Faster wall-clock but **uses 4x the read capacity**. Don't do this on a production table during business hours.

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
  --stack-name dva-lab-02-02-query-vs-scan `
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
  --stack-name dva-lab-02-02-query-vs-scan \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

This creates an `orders` table:
- Partition key: `user_id` (S)
- Sort key: `order_date#order_id` (S)  ← composite sort key for uniqueness within a user

### 2. Seed the table

#### PowerShell

```powershell
$STACK = "dva-lab-02-02-query-vs-scan"
$SEED = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='SeedFunctionName'].OutputValue" --output text

aws lambda invoke --function-name $SEED --payload '{}' --cli-binary-format raw-in-base64-out r.json
```

#### Bash

```bash
STACK="dva-lab-02-02-query-vs-scan"
SEED=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`SeedFunctionName`].OutputValue' --output text)

aws lambda invoke --function-name "$SEED" \
  --payload '{}' --cli-binary-format raw-in-base64-out /tmp/r.json
```

This puts ~30 orders across 5 users with various dates.

### 3. Try Query

#### PowerShell

```powershell
$QUERY = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='QueryFunctionName'].OutputValue" --output text

# All orders for user u-001
aws lambda invoke --function-name $QUERY --payload '{"user_id": "u-001"}' --cli-binary-format raw-in-base64-out r.json
Get-Content r.json

# Orders for u-001 in 2024
aws lambda invoke --function-name $QUERY --payload '{"user_id": "u-001", "year": "2024"}' --cli-binary-format raw-in-base64-out r.json
Get-Content r.json
```

#### Bash

```bash
QUERY=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`QueryFunctionName`].OutputValue' --output text)

# All orders for user u-001
aws lambda invoke --function-name "$QUERY" \
  --payload '{"user_id": "u-001"}' \
  --cli-binary-format raw-in-base64-out /tmp/r.json && cat /tmp/r.json | jq

# Orders for u-001 in 2024
aws lambda invoke --function-name "$QUERY" \
  --payload '{"user_id": "u-001", "year": "2024"}' \
  --cli-binary-format raw-in-base64-out /tmp/r.json && cat /tmp/r.json | jq
```

Look at the `consumed_capacity` field in the response. Query is cheap.

### 4. Try Scan

#### PowerShell

```powershell
$SCAN = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='ScanFunctionName'].OutputValue" --output text

aws lambda invoke --function-name $SCAN --payload '{"min_total": 100}' --cli-binary-format raw-in-base64-out r.json
Get-Content r.json
```

#### Bash

```bash
SCAN=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`ScanFunctionName`].OutputValue' --output text)

aws lambda invoke --function-name "$SCAN" \
  --payload '{"min_total": 100}' \
  --cli-binary-format raw-in-base64-out /tmp/r.json && cat /tmp/r.json | jq
```

Notice `scanned_count` vs `returned_count`. You paid for all the scanned items, not just the returned ones.

### 5. (Optional) Stress the difference

Bulk-seed 1,000 items and compare. The Query stays O(matching items). The Scan grows O(table size).

## Exam gotchas

- **Query requires the partition key.** You cannot Query without specifying `=` on the partition key in `KeyConditionExpression`. To query "all orders" across users, you need a Scan or a **GSI** with a different PK.
- **Filter doesn't reduce capacity used.** `FilterExpression` is for reducing network bytes, not read cost. Get the keys/indexes right.
- **`ProjectionExpression` doesn't reduce read cost either** — DynamoDB still reads the full item. It only reduces what's sent over the network.
- **`ScanIndexForward=False`** in Query reverses the sort order (descending sort key). Default is ascending.
- **`Select="COUNT"`** returns just the count without items — but consumes the same capacity as if it returned them.
- **`ConsistentRead=True` is not allowed on GSIs.** Will throw `ValidationException`. Mentioned earlier; gets tested.
- **Strongly consistent reads** are 1 RCU per 4 KB. Eventually consistent reads (default) are 0.5 RCU per 4 KB.
- **Be careful with `BETWEEN` and date strings.** ISO 8601 strings sort lexically the same as chronologically. `BETWEEN '2024-01-01' AND '2024-12-31'` works. Other formats may not.
- **`begins_with` on sort key** is a common pattern for hierarchical data: orders by month (`sk = '2024-03#order-123'`), categories, etc.

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

> 🧹 **Run cleanup before the next lab** — Lab 2.3 (Indexes) deploys its own table.
