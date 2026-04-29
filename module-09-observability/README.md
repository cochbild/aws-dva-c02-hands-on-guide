# Module 9 — Observability

**Domain coverage:** Domain 4 — Troubleshooting & Optimization (18% of exam).

The exam treats observability as the **three pillars**: **logs**, **metrics**, **traces**. Plus an audit layer (**CloudTrail**) that's frequently confused with logs but is its own thing. This module labs each in turn.

---

## Why this module matters

Domain 4 questions are pattern-recognition: a developer is told "we're seeing X" — your job is to pick the right service. That requires knowing what each service is *for*, not just that it exists.

This module pins each service to a concrete failure mode you can troubleshoot with it.

---

## Module exam mapping

| Service / concept | DVA-C02 Task statement | Lab |
|---|---|---|
| CloudWatch Logs (groups, streams, retention, metric filters, subscriptions) | D4-TS1: logging systems; troubleshoot via service output logs | 9.1 |
| CloudWatch Logs Insights query language | D4-TS1: "Languages for log queries (e.g., CloudWatch Logs Insights)" | 9.2 |
| Custom metrics (PutMetricData) + EMF | D4-TS1/TS2: "Implementing custom metrics (e.g., EMF)" | 9.3 |
| X-Ray (segments, subsegments, annotations vs metadata, service map) | D4-TS1/TS2: distributed tracing, X-Ray service maps, annotations | 9.4 |
| CloudWatch Alarms (static, anomaly, composite, missing-data behavior) | D4-TS2: notification alerts for specific actions | 9.5 |
| CloudTrail (management vs data events, Insights, integrity validation) | D4-TS1: logging and monitoring systems; D2 audit | 9.6 |

---

## Lab list

| # | Lab | Cost | Reuses prior? |
|---|---|---|---|
| 9.1 | [CloudWatch Logs basics](lab-01-cloudwatch-logs-basics/README.md) | 🟢 | — |
| 9.2 | [CloudWatch Logs Insights queries](lab-02-logs-insights-queries/README.md) | 🟢 | 🔁 reuses 9.1 |
| 9.3 | [Custom metrics & EMF](lab-03-custom-metrics-and-emf/README.md) | 🟢 | 🧹 fresh |
| 9.4 | [X-Ray tracing](lab-04-xray-tracing/README.md) | 🟢 | 🧹 fresh |
| 9.5 | [Alarms](lab-05-alarms/README.md) | 🟢 | 🧹 fresh |
| 9.6 | [CloudTrail](lab-06-cloudtrail/README.md) | 🟡 | 🧹 fresh |

Total runtime: ~3 hours. Every lab is free-tier-eligible. **Lab 9.6 turns on data events** which cost ~$0.10 per 100K events delivered — pennies for the lab, but cleanup matters.

---

## Theory primer (read before Lab 9.1)

### The three pillars + audit

| Pillar | What it answers | AWS service |
|---|---|---|
| **Logs** | "What did the application say?" | CloudWatch Logs |
| **Metrics** | "How is the system performing? Trends over time?" | CloudWatch Metrics |
| **Traces** | "Where does this individual request go and what's slow?" | X-Ray |
| **Audit** | "Who did what to my AWS account?" | CloudTrail |

The exam tests this categorization directly. If a question asks "you need to find which IAM user deleted a DynamoDB table last week" — **CloudTrail**, not CloudWatch.

### Lambda's free observability

Just by being a Lambda function, you get:

- A log group at `/aws/lambda/<function-name>` (created on first invoke if it doesn't exist)
- Default metrics: `Invocations`, `Duration`, `Errors`, `Throttles`, `ConcurrentExecutions`, `IteratorAge` (for stream sources), `ProvisionedConcurrencyUtilization`, `DeadLetterErrors`
- Optional X-Ray tracing by setting `Tracing: Active`

Everything else (custom metrics, alarms, dashboards, log retention) you opt into.

### The retention trap

Default Lambda log retention = **never expire**. That's the #1 way labs leak money long-term. We set `RetentionInDays: 7` on every log group in this module — **memorize this for the exam.**

### EMF vs PutMetricData

Two ways to emit a custom metric from Lambda:

| Method | Cost | Latency | When to use |
|---|---|---|---|
| `PutMetricData` API | ~$0.01 per 1000 calls + per-metric storage | Synchronous network call | Non-Lambda compute (EC2/ECS) |
| **Embedded Metric Format (EMF)** | **Free** (extracted from logs you're already paying for) | None — async extraction | **Lambda — always prefer this** |

EMF is a structured JSON line you `print()` from your function. The Lambda runtime ships it to CloudWatch Logs (which you're paying for anyway), and CloudWatch reads it and creates metrics from the embedded `_aws.CloudWatchMetrics` envelope.

### Annotations vs metadata in X-Ray

| | Indexed (filterable) | Size limit | Use for |
|---|---|---|---|
| **Annotation** | ✅ yes | 50 per trace, simple key/value | `user_id`, `tenant`, `cart_id` — anything you'd `WHERE` on |
| **Metadata** | ❌ no | Up to 64 KB per segment, any structure | Full request/response bodies, debug context |

The exam loves to ask which to use for what.

### CloudWatch alarm states

`OK` / `ALARM` / `INSUFFICIENT_DATA` — three states, period. There is no `CRITICAL` or `WARNING` — that's other vendors. Composite alarms combine the alarm states of multiple alarms via AND/OR.

### CloudTrail vs CloudWatch Logs

| | CloudTrail | CloudWatch Logs |
|---|---|---|
| What | Records API calls in your account | Records application output (stdout, agent ships) |
| Audience | Security / audit / compliance | App developers / SREs |
| Default | On for management events (90-day history in event history, free) | Off — your app must opt in |
| Cost | First copy of management events free; data events extra; Insights extra | Storage + ingestion |

---

## Common gotchas this module pins

1. **Log retention defaults to forever.** Always `RetentionInDays`.
2. **Returning a 500 from your handler does NOT increment Lambda's `Errors` metric.** Only an unhandled exception or timeout does.
3. **`Throttles` ≠ `Errors`.** Two separate metrics; alarms must target the right one.
4. **EMF extraction is free.** `PutMetricData` is not. In Lambda, always EMF.
5. **High-resolution metrics cost more.** Storage tier descends: 1-sec for 3 hours → 60-sec for 15 days → 5-min for 63 days → 1-hour for 15 months.
6. **X-Ray default sampling: 1 req/sec + 5% of remainder.** Per service, not per trace.
7. **X-Ray annotations are indexed (50 max). Metadata is not (any size).** Filter expressions in the X-Ray console only see annotations.
8. **Composite alarms only combine other alarms.** They can't reference raw metrics.
9. **CloudTrail data events are OFF by default.** S3 object-level access and Lambda invokes only show up if you turn data events on.
10. **CloudTrail multi-region trail** delivers events from all regions to one S3 bucket. Single-region trail only captures one region's API calls.

---

## Module prerequisites

- Modules 1, 5 deployed and torn down — concepts from those modules are referenced.
- Free-tier-friendly account in `us-east-1`.

---

## Continue

Start with [Lab 9.1 — CloudWatch Logs basics](lab-01-cloudwatch-logs-basics/README.md).
