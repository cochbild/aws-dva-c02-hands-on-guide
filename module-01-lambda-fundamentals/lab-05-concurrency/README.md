# Lab 1.5 — Concurrency

> 🟡 **Pennies** — Provisioned concurrency burns money while it's provisioned (~$0.05 for the duration of this lab). **Run cleanup as soon as you finish.**

**Goal:** See reserved and provisioned concurrency in action. Trigger throttling on purpose. Compare cold-start latency with and without provisioned concurrency.

## Concepts

### Concurrency = simultaneous executions

If you have 100 invocations running at the same instant, your concurrency is 100. AWS measures this constantly.

**Account default: 1,000 concurrent executions per region.** This is a soft limit you can raise via Service Quotas.

### Reserved concurrency

A **cap and a guarantee**. Setting reserved concurrency to N on a function:
- **Limits** that function to no more than N concurrent executions
- **Reserves** N executions from the account pool — those executions are *only* available to this function

Use cases:
- **Protect downstream systems:** cap a function that writes to a small RDS instance so you don't exhaust connections
- **Protect other functions:** prevent one function from monopolizing your account's concurrency
- **Throttle on purpose:** function returns 429 to clients when over capacity

> **Critical:** setting reserved concurrency to **0** disables the function entirely. All invokes are throttled. Sometimes used as an "off switch" during incidents.

### Provisioned concurrency

**Pre-warmed execution environments.** You pay to keep N environments initialized and ready, eliminating cold starts.

Use cases:
- Latency-sensitive APIs (init time would otherwise add 1–5 sec)
- Predictable traffic peaks (set up provisioned concurrency before the spike)
- Functions with heavy init code (large dependencies, JIT-compiled languages)

Costs money even when no invocations happen. You're paying for the warm containers.

### Scaling rules

Lambda scales by adding execution environments. The scale-up rate depends on the source:

- **Synchronous (API Gateway, ALB, sync invoke):** burst up to a region-specific initial concurrency (1,000 in most regions), then **+500/min** thereafter
- **Async (S3, SNS, EventBridge):** internal queue absorbs bursts; Lambda processes as fast as it can scale
- **SQS poll-based:** starts with 5 concurrent batches, **+60 per minute** up to 1,000 (or your reserved limit)
- **Kinesis/DynamoDB Streams:** one concurrent execution per shard (with **parallelization factor** up to 10)

### Throttling

When concurrency hits the limit, Lambda throttles. Behavior depends on invocation type:

- **Sync:** caller gets `429 TooManyRequestsException`. Calling client must retry.
- **Async:** event goes back to Lambda's internal queue and is retried with backoff for up to 6 hours. After that, it's discarded (or sent to DLQ/destination).
- **Stream-based (Kinesis/DDB):** records pile up; consumer falls behind.
- **SQS poll-based:** messages stay in the queue; visibility timeout protects them.

## Steps

### 1. Deploy

**PowerShell or Bash:**

```
sam build
sam deploy --guided --stack-name dva-lab-01-05-concurrency
```

The template creates:
- `SlowFunction` — Lambda that sleeps 3 seconds (simulates slow downstream)
- `ReservedFunction` — same code, with reserved concurrency = 2
- `ProvisionedFunction` — same code, with provisioned concurrency = 2 on alias `live`

### 2. Trigger throttling

Hit `ReservedFunction` with 5 parallel invokes:

**PowerShell:**

```powershell
$STACK = "dva-lab-01-05-concurrency"
$FN = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='ReservedFunctionName'].OutputValue" --output text

1..5 | ForEach-Object -Parallel {
  aws lambda invoke --function-name $using:FN `
    --payload '{}' --cli-binary-format raw-in-base64-out "r$_.json" `
    --invocation-type RequestResponse 2>&1 | Select-String "Status|Error"
} -ThrottleLimit 5
```

**Bash:**

```bash
STACK="dva-lab-01-05-concurrency"
FN=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`ReservedFunctionName`].OutputValue' --output text)

for i in $(seq 1 5); do
  (aws lambda invoke --function-name "$FN" \
    --payload '{}' --cli-binary-format raw-in-base64-out /tmp/r$i.json \
    --invocation-type RequestResponse 2>&1 | grep -E "Status|Error") &
done
wait
```

You'll see two succeed and three throw `TooManyRequestsException`. Reserved concurrency is doing its job.

### 3. Watch CloudWatch metrics

**PowerShell:**

```powershell
$START = (Get-Date).AddMinutes(-5).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$END = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
aws cloudwatch get-metric-statistics `
  --namespace AWS/Lambda --metric-name Throttles `
  --dimensions Name=FunctionName,Value=$FN `
  --start-time $START --end-time $END `
  --period 60 --statistics Sum
```

**Bash:**

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Throttles \
  --dimensions Name=FunctionName,Value="$FN" \
  --start-time "$(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 60 --statistics Sum
```

`Throttles` count > 0. Also check the `ConcurrentExecutions` metric.

### 4. Compare cold start vs provisioned

The `ProvisionedFunction` has provisioned concurrency = 2. Invoke it cold (well, it's never cold — that's the point):

**PowerShell:**

```powershell
$ALIAS = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='ProvisionedAliasArn'].OutputValue" --output text
Measure-Command { aws lambda invoke --function-name $ALIAS --payload '{}' --cli-binary-format raw-in-base64-out p.json | Out-Null }
```

**Bash:**

```bash
ALIAS=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`ProvisionedAliasArn`].OutputValue' --output text)

time aws lambda invoke --function-name "$ALIAS" \
  --payload '{}' --cli-binary-format raw-in-base64-out /tmp/p.json
```

Compare with `SlowFunction` first invoke (will have init duration in the REPORT line):

**PowerShell:**

```powershell
$SLOW = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='SlowFunctionName'].OutputValue" --output text
Measure-Command { aws lambda invoke --function-name $SLOW --payload '{}' --cli-binary-format raw-in-base64-out s.json | Out-Null }
sam logs -n SlowFunction --stack-name $STACK | Select-String -Pattern "init duration" -CaseSensitive:$false
```

**Bash:**

```bash
SLOW=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`SlowFunctionName`].OutputValue' --output text)

time aws lambda invoke --function-name "$SLOW" \
  --payload '{}' --cli-binary-format raw-in-base64-out /tmp/s.json

sam logs -n SlowFunction --stack-name "$STACK" | grep -i "init duration"
```

### 5. (Optional) Stress-test scaling

Hit `SlowFunction` with 50 concurrent invokes:

**PowerShell:**

```powershell
1..50 | ForEach-Object -Parallel {
  aws lambda invoke --function-name $using:SLOW `
    --payload '{}' --cli-binary-format raw-in-base64-out "x$_.json" `
    --invocation-type Event | Out-Null
} -ThrottleLimit 50
```

**Bash:**

```bash
for i in $(seq 1 50); do
  aws lambda invoke --function-name "$SLOW" \
    --payload '{}' --cli-binary-format raw-in-base64-out /tmp/x$i.json \
    --invocation-type Event > /dev/null &
done
wait
```

Check `ConcurrentExecutions` metric — it should peak around 50 (well below the 1,000 default).

## Exam gotchas

- **Reserved concurrency = 0 disables the function.** Some questions describe this as a "kill switch" pattern.
- **Provisioned concurrency must be set on a version or alias**, never on `$LATEST`.
- **Provisioned concurrency cannot exceed reserved concurrency** if both are set on the same function.
- **Account quota = 1,000 concurrent executions** unless you've requested an increase. This includes ALL functions in the region. Reserved concurrency carves chunks out of this pool.
- **Unreserved account concurrency is the rest** — what's left after subtracting all reservations. Lambda enforces a minimum of 100 unreserved (you cannot reserve away all your concurrency).
- **Cold start happens once per execution environment.** A warm environment serves many requests sequentially. Lambda creates new environments only when concurrency demand exceeds existing warm capacity.
- **Provisioned concurrency does NOT eliminate scaling beyond N.** If you provision 10 and get 50 concurrent requests, the first 10 use warm environments, the next 40 cold-start as normal.
- **Provisioned concurrency utilization metric** (`ProvisionedConcurrencyUtilization`) tells you whether you have enough — > 0.9 means you should provision more.
- **Application Auto Scaling can adjust provisioned concurrency** based on schedule or `ProvisionedConcurrencyUtilization` target tracking.
- **Lambda SnapStart** (Java/Python/.NET on supported regions) is a different mechanism: snapshots a warmed environment and restores from it. Lower cost than provisioned concurrency, but limited runtime support and one-time init cost on publish.

## Cleanup

**PowerShell:**

```powershell
.\cleanup.ps1
```

**Bash:**

```bash
./cleanup.sh
```

> **Run this!** Provisioned concurrency keeps charging you while it's provisioned.

## What's next

> 🧹 **Run cleanup before the next lab** — Lab 1.6 (Destinations & DLQ) starts fresh.
