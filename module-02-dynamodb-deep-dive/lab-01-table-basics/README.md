# Lab 2.1 — Table Basics & High-Cardinality Keys

> 🟢 **Free tier** — DynamoDB on-demand: 25 GB storage + 25 RCUs/WCUs per month, perpetual. Streams: first 2.5M reads per month free.

## What you'll learn

- Designing a DynamoDB table with a **composite primary key** (partition key + sort key) using **high-cardinality** values to avoid hot partitions
- Performing every CRUD operation from a Lambda using the boto3 Resource API, including the `attribute_not_exists` guard for create-only semantics
- Single-table design — packing multiple entity types into one table using key overloading (foundational pattern used in labs 2.2–2.6, each of which deploys its own stack)

## Exam blueprint reference

DVA-C02 Domain 1, Task Statement 3:

- **Knowledge of:** "High-cardinality partition keys for balanced partition access", "Amazon DynamoDB keys and indexing", "CRUD operations", "Database consistency models"
- **Skills in:** "Serializing and deserializing data to provide persistence", "Using, managing, and maintaining data stores"

## Theory primer

### Why high-cardinality partition keys matter

DynamoDB hashes the partition key to pick a physical partition. If many items share the same PK value, they all land on the same partition. If many *requests* hit the same PK, you get a **hot partition** — and you're throttled even if the table-level capacity isn't exhausted.

| Bad PK | Why |
|---|---|
| `country` | A few values; "USA" gets all the traffic |
| `status` | Few enum values; one is dominant |
| `created_date` (date only) | Today is hot, yesterday is cold |

| Good PK | Why |
|---|---|
| `user_id` (UUID) | Millions of users, all unique |
| `order_id` | Same |
| `device_id` + sort by timestamp | Spreads writes across devices |

### Single-table design — what we're building

This module uses one shared table to demonstrate the production-grade single-table-design pattern. Item types are packed into a generic `(pk, sk)` key schema:

| Entity type | `pk` | `sk` | Example attributes |
|---|---|---|---|
| User profile | `USER#<uuid>` | `PROFILE` | `email`, `name`, `created_at` |
| User's order | `USER#<uuid>` | `ORDER#<order_id>` | `total`, `status`, `order_date` |
| Product | `PRODUCT#<sku>` | `META` | `name`, `price`, `category` |

The same `pk` (`USER#<uuid>`) groups a user's profile and orders on the same partition — a single Query returns them together.

The table also has:
- **GSI1** — generic secondary index on `(gsi1pk, gsi1sk)` used in Lab 2.3 for inverted access patterns (e.g., "all orders by status")
- **Streams** — `NEW_AND_OLD_IMAGES` stream view used in Lab 2.6

Streams cost nothing if you never consume them; the GSI carries 1 WCU per write to a projected attribute.

### Attribute types (the wire format)

DynamoDB stores data with explicit type tags:

| Type | Code | Wire format |
|---|---|---|
| String | `S` | `{"S": "hello"}` |
| Number | `N` | `{"N": "42"}` (numbers are strings on the wire) |
| Binary | `B` | `{"B": "<base64>"}` |
| Boolean | `BOOL` | `{"BOOL": true}` |
| Null | `NULL` | `{"NULL": true}` |
| List | `L` | `{"L": [...]}` |
| Map | `M` | `{"M": {...}}` |
| String/Number/Binary Set | `SS`/`NS`/`BS` | `{"SS": ["a","b"]}` |

The boto3 **Resource API** (`boto3.resource('dynamodb')`) hides this — pass native Python types, it converts. The **Client API** (`boto3.client('dynamodb')`) exposes the wire format. Both are exam-relevant.

### CRUD operations

| Operation | API | Notes |
|---|---|---|
| Create | `PutItem` | **Upsert by default** — overwrites existing |
| Read one | `GetItem` | By primary key only |
| Update | `UpdateItem` | Atomic, partial — also upserts unless guarded |
| Delete | `DeleteItem` | Idempotent — no error if item missing |
| Read many | `Query` (Lab 2.2) / `Scan` (Lab 2.2) | |
| Batch | `BatchGetItem` (100/16MB), `BatchWriteItem` (25 items) | |
| Transactional | `TransactWriteItems` / `TransactGetItems` | 2× cost — Lab 2.5 |

To prevent `PutItem` from overwriting:

```python
table.put_item(
    Item={"pk": "USER#abc", "sk": "PROFILE", ...},
    ConditionExpression="attribute_not_exists(pk)"
)
```

This pattern is the basis of optimistic locking (Lab 2.4).

## Architecture

```
                  ┌───────────────────────────────────────────────┐
                  │  DynamoDB table: dva-lab-02-shared            │
                  │  ─ pk (S, HASH) + sk (S, RANGE)               │
                  │  ─ GSI1: gsi1pk (HASH) + gsi1sk (RANGE)       │
                  │  ─ Streams: NEW_AND_OLD_IMAGES                │
                  └───────────────────────────────────────────────┘
                                       ▲
                  invoke               │  CRUD
                  ──────────►   ┌──────────────┐
                                │ Lambda       │
                                │ dva-lab-02-  │
                                │ 01-crud      │
                                └──────────────┘
```

## Prerequisites

- Foundation setup complete — see [`prerequisites/README.md`](../../prerequisites/README.md)
- Credentials set in env vars; `aws sts get-caller-identity` works

## Step 1: Create the artifacts bucket (one-time per account)

The `aws cloudformation package` command needs an S3 bucket to upload Lambda code. Create one for the whole course (reused by every later lab):

### PowerShell
```powershell
$ACCOUNT = aws sts get-caller-identity --query Account --output text
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$ACCOUNT-$env:AWS_DEFAULT_REGION"
aws s3api create-bucket --bucket $ARTIFACTS_BUCKET --region $env:AWS_DEFAULT_REGION 2>$null
echo "Artifacts bucket: $ARTIFACTS_BUCKET"
```

### Bash
```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCOUNT}-${AWS_DEFAULT_REGION}"
aws s3api create-bucket --bucket "$ARTIFACTS_BUCKET" --region "$AWS_DEFAULT_REGION" 2>/dev/null || true
echo "Artifacts bucket: $ARTIFACTS_BUCKET"
```

> **Why `s3api create-bucket` instead of `s3 mb`?** Same effect; `s3api` returns a clearer error if the bucket already exists in someone else's account.

## Step 2: Package and deploy

### PowerShell
```powershell
aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-02-01-table-basics `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Bash
```bash
aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-02-01-table-basics \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

Wait for `Successfully created/updated stack`.

## Step 3: Read stack outputs into shell vars

### PowerShell
```powershell
$STACK = "dva-lab-02-01-table-basics"
$TABLE_NAME = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='TableName'].OutputValue" --output text
$FN_NAME = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text
echo "Table:    $TABLE_NAME"
echo "Function: $FN_NAME"
```

### Bash
```bash
STACK="dva-lab-02-01-table-basics"
TABLE_NAME=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='TableName'].OutputValue" --output text)
FN_NAME=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text)
echo "Table:    $TABLE_NAME"
echo "Function: $FN_NAME"
```

## Step 4: Seed the table (~50 mixed items)

The seed script puts user profiles + orders + products via the BatchWriteItem API.

### PowerShell
```powershell
.\scripts\seed-data.ps1
```

### Bash
```bash
bash ./scripts/seed-data.sh
```

Verify the count:

**PowerShell or Bash:**
```
aws dynamodb scan --table-name $TABLE_NAME --select COUNT --query Count
```

You should see ~50.

## Step 5: Try every CRUD operation

The Lambda accepts an `op` field plus operation-specific keys. Test events live in `payloads/`.

### Create a user
**PowerShell or Bash:**
```
aws lambda invoke --function-name $FN_NAME `
  --cli-input-json file://payloads/create-user.json `
  out.json
type out.json
```
*(Bash: replace backticks with `\` and `type` with `cat`.)*

### Read it back
```
aws lambda invoke --function-name $FN_NAME `
  --cli-input-json file://payloads/get-user.json `
  out.json
```

### Update with atomic increment
```
aws lambda invoke --function-name $FN_NAME `
  --cli-input-json file://payloads/increment-login-count.json `
  out.json
```

### Try to create the same user again — should fail with ConditionalCheckFailedException
```
aws lambda invoke --function-name $FN_NAME `
  --cli-input-json file://payloads/create-user.json `
  out.json
```

The response will contain `error_code: ConditionalCheckFailedException` because the handler uses `attribute_not_exists(pk)` on PutItem.

### Delete (idempotent — try twice)
```
aws lambda invoke --function-name $FN_NAME `
  --cli-input-json file://payloads/delete-user.json `
  out.json
```

Run it again — same `deleted: false, reason: "no item with that key"` because the handler queries with `ReturnValues=ALL_OLD` and reports.

## Step 6: Compare — strongly consistent vs eventually consistent

Edit `payloads/get-user.json` and look at the field:

```json
"strong_consistency": false
```

Run a get, note the latency. Change to `true`, run again. Strongly consistent reads cost **2× the RCUs** of eventually consistent reads. With on-demand billing the difference shows up on the bill, not the latency, but the RCU consumption metric on the table proves it.

In CloudWatch → Metrics → DynamoDB, look at `ConsumedReadCapacityUnits` per operation type.

## Exam gotchas

- **`PutItem` is upsert by default.** Use `ConditionExpression="attribute_not_exists(pk)"` for create-only.
- **`UpdateItem` also upserts** unless guarded with `attribute_exists(pk)`.
- **`DeleteItem` is idempotent.** Add `ConditionExpression="attribute_exists(pk)"` if you need to know whether it actually existed.
- **Item size limit: 400 KB.** Including all attributes and their names. For larger payloads, store the blob in S3 and put the S3 key in DynamoDB.
- **Reserved words.** `Name`, `Status`, `Type`, `Size`, etc. are reserved. Alias with `ExpressionAttributeNames` (`#n` → `Name`).
- **Decimals.** Boto3 Resource API returns `decimal.Decimal` for numbers, not `float`. Don't `json.dumps` directly — use a custom encoder (the handler shows the pattern).
- **Strongly consistent reads cost 2×** the RCUs of eventually consistent. GSIs **cannot** do strongly consistent reads.
- **Boto3 Resource API drops `None` values** by default. To store nulls, use the Client API or set `ddb.meta.client.transform_pii=False` (rare).

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

> 🧹 **Run cleanup before the next lab** — Lab 2.2 (Query vs Scan) deploys its own table to keep examples self-contained.
> Move on to [Lab 2.2 — Query vs Scan](../lab-02-query-vs-scan/README.md).
