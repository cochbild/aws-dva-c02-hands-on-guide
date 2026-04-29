# Lab 5.6 — Kinesis Data Firehose

> 🟢 **Free tier-friendly** — Firehose has no idle hourly cost (pay per data ingested: $0.029/GB). Lab volume is fractions of a cent. S3 storage is well within free tier.

## What you'll learn

- Firehose vs Data Streams: **fire-and-forget delivery** to S3 / Redshift / OpenSearch (Firehose) vs custom-consumer streams (Data Streams)
- **Buffering hints** — Firehose batches records before writing
- **Lambda transformation** — optional middleware that reshapes / filters / enriches records before delivery
- **Dynamic partitioning** — write S3 keys based on record content (e.g., `events/year=2026/month=04/`)

## Exam blueprint reference

- **D1 TS1** — *"Handling data streaming by using AWS services"*

## Theory primer

### Firehose vs Data Streams

| | **Firehose** | **Data Streams** |
|---|---|---|
| Consumers | AWS-managed (S3, Redshift, OpenSearch, Splunk, HTTP endpoints) | You write them (Lambda ESM, KCL apps) |
| Storage in stream | None (it's just a pipe) | 24h–365d retention |
| Replay | No (data is already gone) | Yes (TRIM_HORIZON consumer) |
| Idle cost | $0 | Hourly per shard / on-demand stream |
| Latency to delivery | 60s minimum buffer | Real-time |

If the question says "buffer 5 min then write to S3" → Firehose. If the question says "retain for 7 days, multiple consumers replay" → Data Streams.

### Buffering hints

Firehose batches before writing. Two hints:
- **Size**: 1 MB – 128 MB. Default 5 MB.
- **Interval**: 60 s – 900 s. Default 300 s.

Write happens when **either** is hit.

### Lambda transformation

Firehose can call a Lambda to transform records before delivery. Lambda gets a batch (3 MB or 6 MB max — varies). Returns records with `result` set to:
- `Ok` (deliver this record)
- `Dropped` (silently discard)
- `ProcessingFailed` (retry)

### Dynamic partitioning

Inspect each record's body and route it to a different S3 key based on JSONPath / inline metadata. Write to `events/customer_id=42/year=2026/`. Production: lets Athena partition-prune your queries dramatically.

## Architecture

```
   PutRecordBatch  ──► Firehose delivery stream
                         │  buffer 1 MB OR 60s
                         │  optional Lambda transform
                         ▼
                       S3 bucket: dva-lab-05-06-firehose-…
                         /year=YYYY/month=MM/day=DD/
```

## Step 1: Deploy

### PowerShell or Bash

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-05-06-firehose --capabilities CAPABILITY_IAM
```

## Step 2: Send records

### PowerShell or Bash

```
DELIVERY_STREAM=$(aws cloudformation describe-stacks --stack-name dva-lab-05-06-firehose --query "Stacks[0].Outputs[?OutputKey=='DeliveryStreamName'].OutputValue" --output text)
BUCKET=$(aws cloudformation describe-stacks --stack-name dva-lab-05-06-firehose --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
```

### PowerShell

```powershell
.\scripts\seed.ps1 -DeliveryStream $DeliveryStream -Count 200
```

### Bash

```bash
./scripts/seed.sh "$DELIVERY_STREAM" 200
```

## Step 3: Wait for the buffer to flush

Firehose's minimum buffer interval is **60 seconds**. Wait that long, then list S3:

```
sleep 90
aws s3 ls "s3://$BUCKET/" --recursive
```

You'll see one or more `.gz` (or unzipped) files at S3 paths like `2026/04/29/12/…`.

## Step 4: Inspect a delivered file

```
aws s3 cp "s3://$BUCKET/<file-path>" - | head -5
```

The file is one record per line (NDJSON). Each line is the original payload Firehose received (or the transformed version if you have a transform Lambda).

## Step 5: Compare — what changes if buffer is hit by size

The template's buffer is 1 MB / 60s. Send a burst of records that exceeds 1 MB total:

```bash
./scripts/seed.sh "$DELIVERY_STREAM" 5000
```

The flush should fire on size (almost immediately), well before 60s.

## Exam gotchas

- **Firehose has no shards.** Auto-scales. No `ProvisionedThroughputExceeded`. Pay per GB.
- **Minimum buffer interval is 60 seconds.** Cannot deliver faster than that. If you need sub-second latency, use Data Streams.
- **Firehose writes one file per buffer flush per delivery destination.** Many small flushes = many small files = expensive S3 + Athena downstream. Tune buffers.
- **Compression**: GZIP, ZIP, Snappy, Hadoop-Snappy. Reduces S3 cost. Athena can read GZIP and Snappy natively.
- **File format conversion**: Firehose can convert JSON → Parquet or ORC on the fly using a Glue table for the schema. Big win for analytics.
- **Transformations** are Lambda-based. Lambda receives a batch (3 MB max default, 6 MB max). Return same records with `result` set.
- **Backup S3**: if delivery to a non-S3 destination fails, Firehose can write the failed records to a backup S3 bucket.
- **Server-side encryption** at rest with KMS for the Firehose itself + at the destination (e.g., S3 SSE-KMS).
- **Direct PUT vs Kinesis Stream as source**: Firehose can read FROM a Kinesis Data Stream as its source. Common pattern: producers write to Data Stream (replay capability), Firehose archives to S3.
- **No replay.** Once Firehose delivers, the data is gone from the pipe. To retain raw events for replay, use Data Streams as source.

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

> 🧹 **Run cleanup before Lab 5.7 (AppSync).**

Continue: [Lab 5.7 — AppSync GraphQL](../lab-07-appsync-graphql/README.md)
