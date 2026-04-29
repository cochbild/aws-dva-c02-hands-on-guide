# Module 5 — Messaging & Events

The exam asks "which service for this messaging pattern?" repeatedly. This module gets you fluent in **SQS, SNS, EventBridge, Kinesis, and AppSync** — the five services AWS uses to move data between application components.

## What you'll build

| Lab | Title | Cost | Handoff |
|---|---|---|---|
| 5.1 | [SQS Standard vs FIFO](lab-01-sqs-standard-vs-fifo/README.md) | 🟢 Free tier | 🧹 Cleanup |
| 5.2 | [SNS Fanout & Filter Policies](lab-02-sns-fanout/README.md) | 🟢 Free tier | 🧹 Cleanup |
| 5.3 | [EventBridge Rules & Scheduler](lab-03-eventbridge-rules/README.md) | 🟢 Free tier | 🧹 Cleanup |
| 5.4 | [DLQ & Redrive](lab-04-dlq-and-redrive/README.md) | 🟢 Free tier | 🧹 Cleanup |
| 5.5 | [Kinesis Data Streams](lab-05-kinesis-data-streams/README.md) | 🟡 ~$0.36/day for 1 shard | 🧹 Cleanup |
| 5.6 | [Kinesis Firehose to S3](lab-06-kinesis-firehose/README.md) | 🟢 Free tier | 🧹 Cleanup |
| 5.7 | [AppSync GraphQL API](lab-07-appsync-graphql/README.md) | 🟢 Free tier | 🧹 Cleanup |

Every lab in this module is a fresh deploy — they don't share resources. Run cleanup between each.

## Decision tree (memorize this)

| Need | Use |
|---|---|
| Decouple producer from consumer; consumer pulls work | **SQS** |
| Strict ordering + dedup within a partition | **SQS FIFO** |
| Fan-out one message to many subscribers | **SNS** |
| Fan-out + AWS-service event ingestion + complex filtering | **EventBridge** |
| Time-ordered, replayable, multiple parallel consumers | **Kinesis Data Streams** |
| Fire-and-forget delivery of high-volume events to S3 / Redshift / OpenSearch | **Kinesis Firehose** |
| Real-time GraphQL API with subscriptions | **AppSync** |
| Cron-style scheduled invokes | **EventBridge Scheduler** |

## Service-by-service primer

### SQS — Simple Queue Service

Pull-based message queue. Consumer polls; messages are invisible during processing; consumer deletes on success or lets them reappear on failure.

**Standard vs FIFO:**

| | Standard | FIFO |
|---|---|---|
| Ordering | Best-effort | **Strict per `MessageGroupId`** |
| Delivery | At-least-once (dupes possible) | **Exactly-once** within 5-min dedup window |
| Throughput | Unlimited | 300 TPS / 3,000 with batching (default mode) |
| Name suffix | (anything) | **must end in `.fifo`** |
| Cost | Cheaper | More expensive |

**Universal SQS settings:**

- **Visibility timeout** — default 30 s, max 12 hr. Set to **≥ 6× your Lambda timeout** when using ESM.
- **Long polling** — `WaitTimeSeconds` 0–20 s. Always use 20 s unless you have a specific reason not to. Reduces empty receives = saves money.
- **Message retention** — default 4 days, range 1 minute – 14 days.
- **Max message size** — 256 KB. For larger payloads use **SQS Extended Client** (body in S3, message contains pointer).
- **DLQ** — set via `RedrivePolicy` with `maxReceiveCount`. After N failed receives, message moves to DLQ. **DLQ must be the same type as source** (Standard ↔ Standard, FIFO ↔ FIFO).
- **Delay** — queue-level (0–15 min) or per-message (`DelaySeconds`).

### SNS — Simple Notification Service

Push-based pub/sub. Publish once, fan out to many subscribers.

- **Subscriber types:** SQS, Lambda, HTTP/HTTPS, email, SMS, mobile push, Kinesis Firehose, EventBridge, Application Endpoint.
- **Filter policies** — JSON pattern, applied at the **subscription level** (not the topic). Each subscriber can have a different filter on the same topic.
- **Message size** — 256 KB. SNS Extended Client for larger.
- **Message retention** — **none**. SNS doesn't store. If a subscriber is unreachable, SNS retries with exponential backoff for ~hours, then drops. Use SNS → SQS to get persistence.
- **FIFO topics** — strict order; only **SQS FIFO** subscribers.
- **Encryption** — SSE at rest (KMS); always TLS in transit.
- **Cross-region/cross-account** — supported with appropriate topic policy.

### EventBridge

The "modern SNS" — bus + rules + richer routing + AWS-native event source ingestion.

- **Event buses** — `default` bus (auto-receives AWS service events), custom buses (your app), partner buses (SaaS).
- **Rules** — pattern-match events on the bus and route to **up to 5 targets per rule**.
- **Targets** — Lambda, SQS, SNS, Step Functions, Kinesis, ECS task, API destination (HTTP), and ~25 more.
- **Patterns** — far richer than SNS filter policies: `prefix`, `suffix`, `anything-but`, numeric ranges, `exists`, nested fields.
- **InputTransformer** — reshape the event before sending to a target.
- **Archive & replay** — keep events for 1–365 days, replay any range.
- **Schemas** — auto-discover or register; generate code bindings (TS/Python/Java).

**Event format (always this shape):**
```json
{
  "version": "0",
  "id": "...",
  "detail-type": "Order Created",
  "source": "com.mycompany.orders",
  "account": "123",
  "time": "2026-01-01T12:00:00Z",
  "region": "us-east-1",
  "resources": [],
  "detail": { /* your custom payload */ }
}
```

**EventBridge Scheduler** — one-time or recurring (cron/rate) schedules. Replaces "scheduled rules" on the default bus. Supports time zones, retry policies, per-schedule DLQs.

**EventBridge Pipes** — point-to-point integration: source → optional enrich Lambda → optional filter → target. Sources: SQS, Kinesis, DynamoDB Streams, MSK, MQ. Reduces glue code.

### Kinesis Data Streams

Ordered, replayable, sharded record stream. Multiple consumers can read independently.

| Concept | Default / range |
|---|---|
| **Shard** capacity | 1 MB/s OR 1,000 records/s **in**; 2 MB/s **out** (shared across consumers) |
| **Enhanced Fan-out** | Dedicated 2 MB/s **per consumer**, push-based via HTTP/2 |
| **Retention** | 24 hr (default), 1–365 days |
| **Capacity modes** | Provisioned (you set shard count) / On-demand (auto-scale, pay per GB) |
| **Lambda ESM** | Polls, batches by `BatchSize` / `MaximumBatchingWindowInSeconds` |
| **Parallelization factor** | 1–10 concurrent invocations per shard |
| **Bisect-on-error** | Splits failed batch in half to isolate poison messages |
| **On-failure destination** | SQS or SNS DLQ for the **batch metadata** (not the record itself) |

### Kinesis Firehose

Fire-and-forget delivery to **S3 / Redshift / OpenSearch / HTTP endpoints / Splunk**. Buffering by size or time. Optional Lambda transformation. Optional dynamic partitioning (S3 prefix from record fields). No consumer code to write.

| Kinesis Data Streams | Kinesis Firehose |
|---|---|
| Custom consumers | Managed sinks only |
| Replay (retention) | No replay |
| <1 s latency possible | ~60 s minimum buffering |
| Pay per shard-hour + PUT | Pay per GB ingested |

### AppSync

Managed GraphQL API. Resolvers attach directly to DynamoDB / Lambda / HTTP / RDS / OpenSearch — often **no Lambda glue needed**.

- **Auth modes:** API key (dev only), Cognito user pool, IAM, OIDC, Lambda authorizer
- **Real-time subscriptions** over WebSocket
- **Multiple data sources per schema** — one query can hit DDB + RDS + Lambda
- **Caching** — server-side, opt-in, per-resolver TTL

## Exam blueprint coverage

This module hits:

- **Domain 1 / TS1** — "Architectural patterns (event-driven, fanout, choreography, orchestration)"; "Fault-tolerant design patterns (retries with exponential backoff and jitter, dead-letter queues)"; "Differences between synchronous and asynchronous patterns"; "Writing code to use messaging services"; "Handling data streaming by using AWS services".
- **Domain 1 / TS2** — "Event source mapping"; "Event-driven architecture"; "Configuring Lambda functions… (triggers, destinations)"; "Handling the event lifecycle and errors by using code (Lambda Destinations, dead-letter queues)".
- **Domain 4 / TS3** — "Caching, Concurrency, Messaging services (SQS, SNS)"; "Using subscription filter policies to optimize messaging".

## Exam gotchas (cumulative)

- **Visibility timeout < Lambda timeout = duplicate processing.** AWS recommends 6×.
- **Long polling: always use it** (`WaitTimeSeconds = 20`).
- **SQS doesn't push.** Lambda ESM polls on your behalf.
- **FIFO throughput:** 300 TPS without batching, 3,000 with — **per `MessageGroupId`**.
- **SQS DLQ must be the same queue type** as the source.
- **`maxReceiveCount` is on the source's `RedrivePolicy`,** not the DLQ.
- **SNS doesn't persist messages.** No subscriber → message lost.
- **SNS subscription filter policies** are per-subscription, not per-topic.
- **SNS message size = 256 KB.** Same as SQS.
- **EventBridge default bus** receives AWS service events automatically. Custom buses don't.
- **EventBridge rules: 5 targets max** per rule. Need more? Add another rule.
- **EventBridge throughput:** 10,000 PutEvents/sec default (soft limit, raisable).
- **Kinesis shard out is 2 MB/s SHARED.** Five consumers on the same shard share that bandwidth — unless you use Enhanced Fan-out.
- **Kinesis vs SQS:** Kinesis = ordered + replayable; SQS = unordered + ephemeral.
- **Firehose vs Data Streams:** Firehose has minimum ~60 s buffering; Data Streams is sub-second.
- **AppSync API keys** expire after 365 days max — production uses Cognito or IAM.

## Start here

[Lab 5.1 — SQS Standard vs FIFO](lab-01-sqs-standard-vs-fifo/README.md)
