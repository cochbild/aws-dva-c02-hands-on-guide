# Lab 4.4 — Throttling & Usage Plans

> 🟢 **Free tier** — extends the Lab 4.2/4.3 stack.

## What you'll learn

- The **four-tier** API Gateway throttling hierarchy: account → stage → method → usage plan
- The difference between **rate limit** (steady-state RPS) and **burst limit** (token-bucket size)
- How to attach an **API key** to an API and tier consumers via **usage plans**
- How API keys differ from authentication

## Exam blueprint reference

- Domain 1, Task Statement 1: API design (loosely coupled, fault-tolerant)
- Domain 4, Task Statement 3: *"Caching"*, *"Concurrency"*, *"Profiling application performance"*

## Theory primer

### The throttling hierarchy

A request is rejected with **429 Too Many Requests** if **any** of these is exceeded:

```
1. Account-level    (10,000 RPS / 5,000 burst per region — soft limit, raise via support)
2. Stage-level      (set per stage)
3. Method-level     (set per method, overrides stage)
4. Usage plan-level (per API key, set in the usage plan)
```

Most-restrictive wins. If your stage allows 100 RPS but your usage plan allows 10, the caller hits 10.

### Rate vs burst (token bucket)

| Term | Meaning |
|---|---|
| **Rate limit** | Sustained requests per second after the bucket drains |
| **Burst limit** | Max bucket size — how big a spike you can absorb |

If burst=10, rate=2: caller can send 10 in one burst, then 2/second from then on. After idle, bucket refills at the rate up to burst max.

### API keys are NOT authentication

- **Purpose:** identify the calling **application** (not the user) for **tracking and quota**
- **Where:** sent in the `x-api-key` header
- **How:** attached to a **usage plan**, which is attached to one or more **stages**
- **Caveat:** Anyone with the key can use it. For real auth, use IAM, Cognito, or a Lambda authorizer.

The exam loves this gotcha. "Should we use API keys to authenticate users?" — **no**.

### Usage plans

A **usage plan** binds together:
- An **API key** (one or many)
- A **stage** (or several)
- **Throttle** settings (rate + burst)
- **Quota** settings (max requests per day/week/month)

Quota is enforced separately from throttle: you can have rate=100/sec **and** quota=10,000/month — both apply.

## Prerequisites

- Lab 4.3 stack `dva-lab-04-02-stages` is **still deployed**.

## Step 1: Update the stack with a usage plan + API key

This template adds:
- An **API key** (`dva-lab-04-04-key`)
- A **usage plan** with rate=2 RPS, burst=5, quota=100/day, attached to the **dev** stage
- Sets **`ApiKeyRequired: true`** on the `/orders` POST method
- Sets **method-level throttling** at 5 RPS / burst 10 on `/hello` GET (just to demonstrate)

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
  --stack-name dva-lab-04-02-stages `
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
  --stack-name dva-lab-04-02-stages \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Test without an API key

### PowerShell

```powershell
$DEV = aws cloudformation describe-stacks --stack-name dva-lab-04-02-stages --query "Stacks[0].Outputs[?OutputKey=='DevUrl'].OutputValue" --output text

# Should fail — no x-api-key header
curl.exe -i -X POST "$DEV/orders" `
  -H "Content-Type: application/json" `
  --data "@..\lab-03-request-validation-and-transformation\payloads\valid-order.json"
```

### Bash

```bash
DEV=$(aws cloudformation describe-stacks --stack-name dva-lab-04-02-stages --query "Stacks[0].Outputs[?OutputKey=='DevUrl'].OutputValue" --output text)

curl -i -X POST "$DEV/orders" \
  -H "Content-Type: application/json" \
  --data "@../lab-03-request-validation-and-transformation/payloads/valid-order.json"
```

Expect HTTP 403 `{"message":"Forbidden"}`. The API rejects the request before validation because `x-api-key` is missing.

## Step 3: Get the API key and retry

### PowerShell

```powershell
$KEY_ID = aws cloudformation describe-stacks --stack-name dva-lab-04-02-stages --query "Stacks[0].Outputs[?OutputKey=='ApiKeyId'].OutputValue" --output text
$API_KEY = aws apigateway get-api-key --api-key $KEY_ID --include-value --query "value" --output text

curl.exe -i -X POST "$DEV/orders" `
  -H "Content-Type: application/json" `
  -H "x-api-key: $API_KEY" `
  --data "@..\lab-03-request-validation-and-transformation\payloads\valid-order.json"
```

### Bash

```bash
KEY_ID=$(aws cloudformation describe-stacks --stack-name dva-lab-04-02-stages --query "Stacks[0].Outputs[?OutputKey=='ApiKeyId'].OutputValue" --output text)
API_KEY=$(aws apigateway get-api-key --api-key "$KEY_ID" --include-value --query "value" --output text)

curl -i -X POST "$DEV/orders" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  --data "@../lab-03-request-validation-and-transformation/payloads/valid-order.json"
```

Expect HTTP 201 — call succeeded.

## Step 4: Hit the rate limit

The usage plan caps at 2 RPS / burst 5. Let's blow past it.

### PowerShell

```powershell
1..20 | ForEach-Object {
  Write-Host "Request $_"
  curl.exe -s -o $null -w "%{http_code}`n" -X POST "$DEV/orders" `
    -H "Content-Type: application/json" `
    -H "x-api-key: $API_KEY" `
    --data "@..\lab-03-request-validation-and-transformation\payloads\valid-order.json"
}
```

### Bash

```bash
for i in $(seq 1 20); do
  echo -n "Request $i: "
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$DEV/orders" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    --data "@../lab-03-request-validation-and-transformation/payloads/valid-order.json"
done
```

Expect to see the first ~5 succeed (201), then 429s appearing as the token bucket drains.

## Step 5: Compare — method-level throttling

The `/hello` GET has its own method-level throttle (5 RPS / 10 burst), independent of the usage plan. Try hammering it:

```bash
for i in $(seq 1 20); do
  echo -n "Request $i: "
  curl -s -o /dev/null -w "%{http_code}\n" "$DEV/hello"
done
```

You'll see 429s appearing around request 10–11 — burst exhausted.

## Step 6: Inspect quota usage

The usage plan also enforces a **daily quota** (100 requests/day in this lab). Check current usage:

```
aws apigateway get-usage \
  --usage-plan-id $(aws cloudformation describe-stacks --stack-name dva-lab-04-02-stages --query "Stacks[0].Outputs[?OutputKey=='UsagePlanId'].OutputValue" --output text) \
  --start-date $(date +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d)
```

You'll see how many requests this key has consumed today against its 100-quota.

## Exam gotchas

- **API keys are NOT auth.** Combine with IAM / Cognito / Lambda authorizer for real security.
- **Most-restrictive throttle wins.** Don't be fooled by the "we have 10,000 RPS at the account level" — the method or usage plan can clamp it lower.
- **API keys + usage plans = REST only.** HTTP API has no equivalent feature; you'd use AWS WAF rate rules instead.
- **`x-api-key` header name is fixed.** You can't customize it without a Lambda authorizer.
- **Quota period: DAY, WEEK, or MONTH.** Resets at the start of each period.
- **Returning the API key value** requires `--include-value` on `get-api-key`. By default the value is hidden.
- **Throttle returns 429 with `Retry-After` header** — clients should back off (the same pattern is in Domain 4 fault-tolerance: retries with exponential backoff).

## Cleanup

🧹 **Run cleanup before Lab 4.5.** Lab 4.5 starts a fresh Cognito User Pool stack — keeping this one around is just clutter.

### PowerShell
```powershell
.\cleanup.ps1
```

### Bash
```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before Lab 4.5.** The next lab introduces Cognito User Pools and JWT authorization — fresh stack.
