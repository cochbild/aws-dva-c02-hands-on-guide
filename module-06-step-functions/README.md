# Module 6 — Step Functions

Step Functions show up on the DVA-C02 as the answer to **"how do I orchestrate a multi-step workflow?"** This module gets you hands-on with every state type, error-handling primitive, integration pattern, and the Standard-vs-Express trade-off you need to recognize on the exam.

> **Exam blueprint coverage:** Domain 1 — Task Statement 1 (architectural patterns: orchestration, choreography, fanout; sync vs async; retries with exponential backoff and jitter; dead-letter queues). Touches Domain 4 indirectly (CloudWatch Logs for Express workflows, troubleshooting executions).

## Why orchestration matters for the exam

The DVA-C02 contrasts **orchestration** with **choreography**:

- **Orchestration** — a central coordinator (Step Functions) decides what runs next. Easier to reason about, easier to debug, single source of workflow truth.
- **Choreography** — services react to each other's events (EventBridge / SNS / SQS chains). Looser coupling, harder to trace.

When you see a question with words like "approval workflow," "multi-step processing with branching," "long-running batch with retries," **think Step Functions**. When you see "fan-out events to many subscribers" — that's SNS choreography (Module 5).

## Lab list

Do these in order. None of the labs share resources — each is self-contained and ends with a `cleanup`. That keeps state machines isolated so you can compare each lab's settings cleanly.

| Lab | Title | Cost | Key concept |
|---|---|---|---|
| 6.1 | [ASL Basics](lab-01-asl-basics/README.md) | 🟢 | State types, JSONPath, Input/Result/Output paths |
| 6.2 | [Standard vs Express](lab-02-standard-vs-express/README.md) | 🟡 | Same workflow, two flavors — observe the differences |
| 6.3 | [Error Handling](lab-03-error-handling/README.md) | 🟢 | Retry (with jitter), Catch, ResultPath in Catch |
| 6.4 | [Parallel and Map](lab-04-parallel-and-map/README.md) | 🟢 | Parallel branches; Inline vs Distributed Map |
| 6.5 | [Integration Patterns](lab-05-integration-patterns/README.md) | 🟢 | Request/Response, `.sync`, `.waitForTaskToken` |

After Lab 6.5 you will have:
- Authored ASL by hand (no SDK / CDK abstractions hiding it)
- Seen `Retry` and `Catch` interact under real failures
- Compared an Inline Map (max 40) with a Distributed Map (10K+)
- Triggered a paused workflow with `SendTaskSuccess` from outside

## Theory primer

### State types — full list

| Type | Purpose | Terminal? |
|---|---|---|
| **Pass** | Pass data through, optionally transform via `Parameters` / `Result` | No |
| **Task** | Run a unit of work — a Lambda, an SDK call, an SQS send, an ECS run | No |
| **Choice** | Branch based on input via `Variable` / `BooleanEquals` / `NumericGreaterThan` etc. | No |
| **Wait** | Pause for `Seconds` / `SecondsPath` / `Timestamp` / `TimestampPath` | No |
| **Parallel** | Fork into N branches, all run concurrently, output is an array of N results | No |
| **Map** | Iterate over an array, run the same sub-workflow per item | No |
| **Succeed** | End execution successfully (no further states) | Yes |
| **Fail** | End execution as failed; you set `Error` and `Cause` | Yes |

### JSONPath — the mini-language inside ASL

ASL uses JSONPath (the `$` syntax) everywhere. You'll meet:

- `$` — the entire current state input
- `$.field` — drill into a property
- `$.items[0]` — array index
- `$.user.name` — nested access

Four fields control how data flows through a state:

| Field | What it does | Default |
|---|---|---|
| **InputPath** | Select a slice of the state input to actually use | `$` (whole input) |
| **Parameters** | Build the call payload using JSONPath references — `"name.$": "$.user.name"` | none |
| **ResultPath** | Where to attach the task's result in the state output. `null` = discard, `$` = replace whole input, `$.foo` = stash under `foo` | `$` |
| **OutputPath** | Select a slice of the resulting state output to pass to the next state | `$` |

You'll meet these in Lab 6.1.

### Standard vs Express (one-page summary)

|  | Standard | Express |
|---|---|---|
| Max execution duration | **1 year** | **5 minutes** |
| Execution model | At-most-once per state | At-least-once per state — your code must be idempotent |
| Pricing | $0.025 per **1,000 state transitions** | Per request + per GB-second of duration; far cheaper at high volume |
| Visual execution history | Yes, in console, **90 days** | No — you read CloudWatch Logs |
| Use cases | Long-running, human-in-the-loop, audit-required, anything > 5 min | High-volume short workflows: streaming ingest, IoT, sync API processing |

Rule of thumb on the exam: **Standard for orchestration, Express for high-volume processing pipelines**.

### Error handling primitives

Every Task, Parallel, and Map state can declare `Retry` and `Catch`:

- `Retry` runs first. If still failing after `MaxAttempts`, control falls through to `Catch`.
- `Catch` routes to a different state on persistent failure.

Built-in error names you must recognize on the exam:

| Name | When |
|---|---|
| `States.ALL` | Any error — usually used as a wildcard fallback in `Catch` |
| `States.Timeout` | Task didn't complete within `TimeoutSeconds` |
| `States.TaskFailed` | The underlying task threw an error (Lambda exception, ECS task non-zero exit) |
| `States.Permissions` | IAM denied — task role can't perform the action |
| `States.HeartbeatTimeout` | Long-running task missed its `HeartbeatSeconds` deadline |
| `States.Runtime` | Internal Step Functions error |
| Custom | Lambda exceptions surface as the exception class name (`ValueError`, `KeyError`, etc.) |

### Integration patterns

A `Resource` ARN suffix selects the integration pattern:

| Suffix | Pattern | Wait behaviour |
|---|---|---|
| (none) — `arn:aws:states:::lambda:invoke` | **Request/Response** | Synchronous from SF's view; returns when the underlying API responds |
| `.sync` — `arn:aws:states:::ecs:runTask.sync` | **Run a Job** | SF waits for the underlying *job* (not just the API call) to complete |
| `.waitForTaskToken` — `arn:aws:states:::lambda:invoke.waitForTaskToken` | **Callback** | SF pauses; resumes when something calls `SendTaskSuccess`/`SendTaskFailure` |

`.sync` works only with a fixed list of services (ECS, Glue, EMR, Step Functions itself, SageMaker, Batch, EKS, Athena). `.waitForTaskToken` works with anything.

### SDK service integrations

You can call **any AWS service** from a Task without writing a Lambda:

```
Resource: arn:aws:states:::aws-sdk:dynamodb:putItem
```

Pattern: `arn:aws:states:::aws-sdk:<service>:<operation>` (camelCase operation name). ~200 services supported. Lab 6.5 uses this for the Wait-for-Callback example.

## Cross-module connections

- Module 5 (SQS / SNS / EventBridge) gives you the choreography alternative — keep both patterns in your head.
- Module 9 (Observability) revisits Step Functions executions in CloudWatch Logs Insights and X-Ray.
- Module 10 (Capstone) uses a Standard state machine to orchestrate the multi-step request flow.

## Cleanup discipline

Every lab here is 🟢 free-tier *except* Lab 6.2, which is 🟡 because the Express variant is billed per-request (still pennies for the lab traffic, but it's not free-tier). Each lab ships its own `cleanup.sh` / `cleanup.ps1` — run them as you go.

After all labs:

```
# PowerShell
..\..\cleanup-all.ps1

# Bash
../../cleanup-all.sh
```

## Next

Start with [Lab 6.1 — ASL Basics](lab-01-asl-basics/README.md).
