# Module 1: Lambda Fundamentals

Lambda is the single highest-yield topic on the DVA-C02 exam. This module gets you hands-on with every Lambda concept the exam tests, from the basics up to provisioned concurrency tuning and Hyperplane ENIs.

## Why this module first

Every other module uses Lambda. Get fluent here and the rest of the labs feel natural.

## Concepts covered

| Lab | Concept | Exam relevance |
|---|---|---|
| 1.1 | Hello SAM | Foundational — how SAM transforms templates |
| 1.2 | Event sources | **Heavy** — push vs poll, ESM, batching, error handling |
| 1.3 | Versions & aliases | **Heavy** — needed for canary deploys (Module 8) |
| 1.4 | Layers | Medium — packaging, sharing deps |
| 1.5 | Concurrency | **Heavy** — reserved vs provisioned, throttling, scaling |
| 1.6 | Destinations & DLQ | **Heavy** — failure handling, async invokes |
| 1.7 | VPC Lambda | Medium — Hyperplane ENI, no cold-start penalty |

## Theory primer (read before the labs)

### Lambda lifecycle

When a Lambda is invoked, AWS goes through three phases:

1. **Init phase** (cold start only)
   - Download code (or pull container image)
   - Start the runtime
   - Run init code outside your handler
   - Bootstrap any extensions
2. **Invoke phase**
   - Run your handler
   - Return response
3. **Shutdown phase** (when execution environment is reclaimed)
   - Runtime gets ~500 ms warning via Lambda Extensions API

**Critical exam point:** code outside the handler runs *once* per execution environment, not per invoke. This is why DB connections and SDK clients should be created at module level, not inside the handler.

```python
# GOOD: SDK client reused across invocations of the same warm container
import boto3
ddb = boto3.resource('dynamodb')
table = ddb.Table('my-table')

def handler(event, context):
    return table.get_item(Key={'pk': event['id']})

# BAD: new client every invoke
def handler(event, context):
    ddb = boto3.resource('dynamodb')   # wasteful
    return ddb.Table('my-table').get_item(...)
```

### Configuration limits to memorize

| Setting | Default | Max |
|---|---|---|
| Memory | 128 MB | 10,240 MB (10 GB) |
| Timeout | 3 s | 900 s (15 min) |
| `/tmp` storage | 512 MB | 10,240 MB (configurable) |
| Env vars total | — | 4 KB |
| Deployment package (zipped, direct upload) | — | 50 MB |
| Deployment package (zipped, via S3) | — | 250 MB |
| Deployment package (unzipped) | — | 250 MB |
| Container image | — | 10 GB |
| Layers per function | — | 5 |
| Total function size with layers | — | 250 MB unzipped |
| Concurrent executions (account default) | 1,000 | request limit increase |

### CPU is tied to memory

You don't configure CPU separately. CPU scales linearly with memory. At ~1,769 MB you get one full vCPU. This is why **AWS Lambda Power Tuning** matters — sometimes more memory is *cheaper* because the function finishes much faster.

### The execution environment is reused

The container that ran your last invoke is probably going to run your next invoke. State in `/tmp` and global variables persists. Don't rely on this for correctness, but do use it for caching.

## Get started

Begin with [Lab 1.1: Hello SAM](lab-01-hello-sam/README.md).
