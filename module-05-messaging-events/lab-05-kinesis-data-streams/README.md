# Lab 5.5 — Kinesis Data Streams

> 🟡 **Costs pennies per hour while running** — provisioned mode is $0.015/hr per shard ≈ **$11/month if left running**. The lab uses 1 shard, so cleanup promptly. (On-demand mode is $0.04/hr per stream — even more important to cleanup.)

> ⚠️ **Deploy time: ~2 min.**

## What you'll learn

- The shard model: 1 MB/s or 1000 records/s **in** + 2 MB/s **out** per shard, shared across consumers
- **Lambda ESM** consuming Kinesis: BatchSize, BatchWindow, ParallelizationFactor, BisectBatchOnFunctionError, MaximumRetryAttempts, MaximumRecordAgeInSeconds, OnFailure destination
- **Enhanced fan-out**: dedicated 2 MB/s output per consumer (vs shared)
- Provisioned vs on-demand mode

## Exam blueprint reference

- **D1 TS1** — *"Handling data streaming by using AWS services"*
- **D1 TS2** — *"Implementing Lambda triggers and event sources"*

## Theory primer

### Shard math

Each shard supports:
- **1 MB/s OR 1000 records/s ingress** (whichever you hit first)
- **2 MB/s egress** shared across all consumers (without enhanced fan-out)

Throughput exceeded → `ProvisionedThroughputExceededException`. Producer should retry with backoff.

To scale: split a shard (more shards = more capacity, costs more $$$/hr).

On-demand mode: AWS scales shards automatically. Higher per-byte cost, no shard management.

### Lambda ESM tunables (tested by name)

| Setting | Effect |
|---|---|
| `BatchSize` | Up to 10000. How many records per invoke. |
| `MaximumBatchingWindowInSeconds` | 0–300. Wait at most this long to fill a batch. |
| `ParallelizationFactor` | 1–10. **Multiplies invocations per shard** while preserving order within a partition key. |
| `BisectBatchOnFunctionError` | If true, on failure, split batch in half and retry — isolates poison records. |
| `MaximumRetryAttempts` | 0–10000 (default infinite). Retries before sending to OnFailure destination. |
| `MaximumRecordAgeInSeconds` | 60–604800. Discard records older than this. |
| `OnFailure` (destination) | SQS queue or SNS topic to receive metadata about failed batches. |

### Enhanced fan-out

Without it: all consumers share 2 MB/s egress per shard. With it: each registered consumer gets its **own** 2 MB/s. Costs extra ($0.015/hr per consumer per shard). Use when you have multiple consumers that each need full throughput.

### Ordering semantics

**Within a partition key**, records are strictly ordered. Across partition keys (i.e., across shards), order is not guaranteed. Choose partition keys so all related records (e.g., all events for a customer) share one key — they'll process in order.

## Architecture

```
   PutRecord(s)  ──► Kinesis Data Stream (1 shard)
                       │
                       │ Lambda ESM (BatchSize=100, BatchWindow=5s,
                       │             ParallelizationFactor=2)
                       ▼
                    Lambda consumer
                       │ on failure: bisect-on-error retries,
                       │ then OnFailure destination
                       ▼
                    SQS DLQ (failed batch metadata, NOT records)
```

## Step 1: Deploy

The template uses `CodeUri: src/`, so we need to `package` (upload code to S3) before `deploy`.

### PowerShell

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
  --stack-name dva-lab-05-05-kinesis `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Bash

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
  --stack-name dva-lab-05-05-kinesis \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Send records

### PowerShell

```powershell
$Stream = aws cloudformation describe-stacks --stack-name dva-lab-05-05-kinesis --query "Stacks[0].Outputs[?OutputKey=='StreamName'].OutputValue" --output text

.\scripts\seed.ps1 -StreamName $Stream -Count 50
```

### Bash

```bash
STREAM=$(aws cloudformation describe-stacks --stack-name dva-lab-05-05-kinesis --query "Stacks[0].Outputs[?OutputKey=='StreamName'].OutputValue" --output text)

./scripts/seed.sh "$STREAM" 50
```

## Step 3: Watch the consumer

```
aws logs tail /aws/lambda/dva-lab-05-05-consumer --since 5m --follow
```

You'll see batches arrive grouped by partition key. Note records with same key always appear in the same batch (ordering preserved).

## Step 4: Compare — record-format details

The Lambda log line shows:
- `kinesisSchemaVersion`, `partitionKey`, `sequenceNumber`
- `data` is **base64-encoded**
- `approximateArrivalTimestamp`

Decode payload:
```python
import base64
b = record["kinesis"]["data"]
payload = base64.b64decode(b).decode()
```

## Step 5: Compare — provisioned vs on-demand

The default is `StreamMode: ON_DEMAND`. To switch to provisioned, edit `template.yaml`:
```yaml
StreamMode: PROVISIONED
ShardCount: 1
```
Redeploy. **On-demand auto-scales but costs more per byte; provisioned is cheaper at sustained load but you size yourself.** The exam uses these terms.

## Exam gotchas

- **Throughput per shard:** 1 MB/s OR 1000 rec/s in; 2 MB/s out shared.
- **`ProvisionedThroughputExceededException`** = retry with backoff.
- **Resharding** (split or merge) operations take effect immediately for ingress, but consumers continue reading old shards until the records age out.
- **Retention:** default 24 hours. Configurable up to 365 days. Charged per GB-month after 24 hours.
- **`PutRecord` vs `PutRecords`:** `PutRecords` batches up to 500 records per call, up to 5 MB. Each record can be sent to a different shard.
- **Aggregation (KPL)**: Kinesis Producer Library packs many app-level records into one Kinesis record to maximize throughput. The KCL/Lambda ESM auto-deaggregates.
- **Enhanced fan-out** is registered per consumer (RegisterStreamConsumer). Costs extra. Provides dedicated 2 MB/s.
- **Lambda ESM behavior on failure:**
  - Default: retry until success or maximum retries / age.
  - With BisectBatchOnFunctionError: split batch in half on failure to isolate the poison record.
  - With OnFailure destination: batch metadata (NOT the records themselves) goes to SQS/SNS for inspection.
- **Iterator types** (for KCL clients, not Lambda ESM): TRIM_HORIZON (oldest available), LATEST (only new), AT_TIMESTAMP, AT_SEQUENCE_NUMBER.
- **Encryption:** SSE with KMS, applied at rest. In-transit is HTTPS by default.

## Cleanup

> ⚠️ **Do this NOW.** Provisioned shards / on-demand stream both charge per hour while idle.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before Lab 5.6 (Kinesis Firehose).**

Continue: [Lab 5.6 — Kinesis Firehose](../lab-06-kinesis-firehose/README.md)
