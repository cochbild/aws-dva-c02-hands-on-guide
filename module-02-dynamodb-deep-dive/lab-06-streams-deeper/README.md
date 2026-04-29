# Lab 2.6 — Streams Patterns

> 🟢 **Free tier** — DynamoDB on-demand + Lambda. DynamoDB Streams charges per read but stays in the free tier for this lab's tiny volume.

**Goal:** Beyond Lab 1.2B's basics, build the most common Streams patterns: change data capture (CDC) to a downstream system, audit trail to S3, and aggregation/materialized views.

## Concepts (recap + extension)

### What's in a stream record?

```json
{
  "eventID": "...",
  "eventName": "INSERT" | "MODIFY" | "REMOVE",
  "eventVersion": "1.1",
  "eventSource": "aws:dynamodb",
  "awsRegion": "us-east-1",
  "dynamodb": {
    "ApproximateCreationDateTime": 1706000000,
    "Keys": {"pk": {"S": "..."}},
    "NewImage": { ...full new item... },   // depends on StreamViewType
    "OldImage": { ...full old item... },   // depends on StreamViewType
    "SequenceNumber": "4421584000000000017450439091",
    "SizeBytes": 41,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  }
}
```

### `StreamViewType` options (memorize)

| Type | What's captured |
|---|---|
| `KEYS_ONLY` | Only the primary key |
| `NEW_IMAGE` | Item after the change |
| `OLD_IMAGE` | Item before the change |
| `NEW_AND_OLD_IMAGES` | Both — most useful |

You set this **at table creation** and can change it but the stream gets a new ARN — consumers must reconnect.

### Retention

- **24 hours, fixed.** Cannot be changed.
- If your consumer is offline for 24+ hours, you lose records. Plan for this.

For longer retention, see **Kinesis Data Streams as a DynamoDB destination** (separate feature, longer retention up to 365 days).

### Common patterns

#### 1. CDC to a search index

DynamoDB → Stream → Lambda → OpenSearch / ElasticSearch. Keep a search-friendly view of the data in sync with the source-of-truth table.

#### 2. Audit trail to S3

Every change goes to S3 as a JSON file (or appended via Firehose). Compliance and debugging.

#### 3. Materialized aggregates

`orders` table → Stream → Lambda → updates `daily_totals` table. Keeps a precomputed roll-up.

#### 4. Cross-region replication (legacy)

Before Global Tables, people used Streams for cross-region replication. **Now use Global Tables** — they're built on Streams under the hood but managed for you.

#### 5. Email/notification on important changes

Stream → filter for "status changed to canceled" → send email via SES.

### Filters on stream ESM (newer feature)

You can filter at the ESM level so the Lambda only fires for matching events:

```yaml
FilterCriteria:
  Filters:
    - Pattern: '{"eventName": ["INSERT"]}'
    - Pattern: '{"dynamodb": {"NewImage": {"status": {"S": ["urgent"]}}}}'
```

This saves invoke costs — DynamoDB only invokes Lambda for matching events.

### Parallelization factor

For Kinesis and DynamoDB Streams ESM, you can split each shard into up to 10 parallel "subshards" via `ParallelizationFactor`. This increases per-shard concurrency. Default is 1.

```yaml
DdbStreamEvent:
  Type: DynamoDB
  Properties:
    Stream: !GetAtt Table.StreamArn
    ParallelizationFactor: 5   # up to 10
```

Trade-off: more concurrency → less ordering guarantee within a partition key.

### Order guarantees

DynamoDB Streams preserve order **within a partition key**. So `pk=user-1` events arrive in order, but events for `user-1` and `user-2` may be interleaved unpredictably across shards. Don't rely on global ordering.

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
  --stack-name dva-lab-02-06-streams-deeper `
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
  --stack-name dva-lab-02-06-streams-deeper \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

This builds:
- A `posts` table with `NEW_AND_OLD_IMAGES` stream
- An audit Lambda that captures every change and writes it to an `audit_log` table

### 2. Make some changes

#### PowerShell

```powershell
$STACK = "dva-lab-02-06-streams-deeper"
$TABLE = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='PostsTableName'].OutputValue" --output text

# Insert
aws dynamodb put-item --table-name $TABLE `
  --item '{\"post_id\":{\"S\":\"p-001\"},\"title\":{\"S\":\"Hello\"},\"status\":{\"S\":\"draft\"}}'

# Modify
aws dynamodb update-item --table-name $TABLE `
  --key '{\"post_id\":{\"S\":\"p-001\"}}' `
  --update-expression "SET #s = :s" `
  --expression-attribute-names '{\"#s\":\"status\"}' `
  --expression-attribute-values '{\":s\":{\"S\":\"published\"}}'

# Delete
aws dynamodb delete-item --table-name $TABLE --key '{\"post_id\":{\"S\":\"p-001\"}}'
```

#### Bash

```bash
STACK="dva-lab-02-06-streams-deeper"
TABLE=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`PostsTableName`].OutputValue' --output text)

# Insert
aws dynamodb put-item --table-name "$TABLE" \
  --item '{"post_id":{"S":"p-001"},"title":{"S":"Hello"},"status":{"S":"draft"}}'

# Modify
aws dynamodb update-item --table-name "$TABLE" \
  --key '{"post_id":{"S":"p-001"}}' \
  --update-expression "SET #s = :s" \
  --expression-attribute-names '{"#s":"status"}' \
  --expression-attribute-values '{":s":{"S":"published"}}'

# Delete
aws dynamodb delete-item --table-name "$TABLE" \
  --key '{"post_id":{"S":"p-001"}}'
```

### 3. Verify the audit log

#### PowerShell

```powershell
$AUDIT = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='AuditTableName'].OutputValue" --output text
aws dynamodb scan --table-name $AUDIT --query 'Items'
```

#### Bash

```bash
AUDIT=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`AuditTableName`].OutputValue' --output text)

aws dynamodb scan --table-name "$AUDIT" --query 'Items'
```

You should see 3 audit records — INSERT, MODIFY (with both old and new status), and REMOVE.

## Exam gotchas

- **Streams retention is 24 hours, fixed.** This catches people. For longer retention or replay, integrate with Kinesis or replicate elsewhere.
- **Each shard supports a limited read rate.** Max 2 reads/sec per shard for ESM. If your downstream is slow, use parallelization factor or filtering.
- **Streams are not free for cross-region.** They run in the source region. Cross-region requires Global Tables (preferred) or your own Lambda → SQS → cross-region consumer pattern.
- **No partial batch failures default to the entire batch retrying.** Use `ReportBatchItemFailures` (Lab 1.2B).
- **`KEYS_ONLY` is cheap** but useless if you need the actual values. Most patterns want `NEW_AND_OLD_IMAGES`.
- **DynamoDB transactions create one stream record per item changed**, not one record per transaction. The records carry the same approximate timestamp but are separate.
- **Filter criteria** can drastically reduce Lambda invocation costs by only firing for matching events.
- **Global Tables use Streams under the hood**, but you don't see the stream — AWS manages the replication. The stream still exists for *your* consumers.

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

> 🧹 **Run cleanup before the next lab** — Lab 2.7 (TTL & capacity) deploys its own table.
