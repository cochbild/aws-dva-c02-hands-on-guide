# Lab 4.1 — REST API vs HTTP API

> 🟢 **Free tier** — 1M API GW requests/month for the first 12 months. Lambda free forever. This lab makes ~10 requests.

## What you'll learn

- The exact feature delta between **REST API** and **HTTP API** — the table you must memorize for the exam
- How to deploy the **same** Lambda backend behind **both** API types and observe the difference
- The "choose-when" decision: which API type fits which scenario

## Exam blueprint reference

- Domain 1, Task Statement 1: *"Creating, extending, and maintaining APIs"* — API design, response/request transformations
- Domain 1, Task Statement 2: *"Integrating Lambda functions with AWS services"*
- Domain 4, Task Statement 3: *"Caching content"*

## Theory primer

REST API was launched 2015 — feature-complete, more expensive (~$3.50/M), supports VTL mapping templates, request validation, API keys + usage plans, WAF, resource policies, X-Ray, response caching.

HTTP API was launched 2019 — leaner, ~70% cheaper (~$1.00/M), JWT authorizer built-in, lower latency, **no** mapping templates, **no** API keys, **no** WAF (use CloudFront in front), **no** X-Ray, **no** caching.

Both support: Lambda proxy integrations, IAM auth, Lambda authorizers, Cognito JWT auth, custom domains, CORS.

**Default rule:** new APIs → HTTP. Need REST features → REST. The exam asks "which API type" by listing required features in the scenario.

## Architecture

```
                   ┌────────────────┐
                   │  REST API      │  /hello  ──┐
                   │  $3.50 per M   │            │
client ──┐         └────────────────┘            ├──▶ Lambda (single function)
         │                                       │
         │         ┌────────────────┐            │
         └────────▶│  HTTP API      │  /hello  ──┘
                   │  $1.00 per M   │
                   └────────────────┘
```

Same Lambda, two front doors. You'll hit both and compare logs, latency, and the response shape.

## Prerequisites

No prior lab required. Make sure `aws sts get-caller-identity` succeeds.

## Step 1: Inspect the template

Open `template.yaml`. Key sections:

- `HelloFunction` — single Lambda, returns `{"statusCode":200,"body":"hello from <api type>"}`
- `RestApi` — `AWS::Serverless::Api` (REST flavor)
- `HttpApi` — `AWS::Serverless::HttpApi` (HTTP flavor)
- Both wire `GET /hello` to the same Lambda via proxy integration

## Step 2: Deploy

### PowerShell

```powershell
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$ACCOUNT_ID-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-04-01-rest-vs-http `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Bash

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCOUNT_ID}-${AWS_DEFAULT_REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-04-01-rest-vs-http \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

Deploy takes ~90 seconds.

## Step 3: Test both endpoints

### PowerShell

```powershell
$STACK = "dva-lab-04-01-rest-vs-http"
$REST_URL = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='RestApiUrl'].OutputValue" --output text
$HTTP_URL = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" --output text

Write-Host "REST URL: $REST_URL"
Write-Host "HTTP URL: $HTTP_URL"

curl.exe "$REST_URL/hello"
Write-Host ""
curl.exe "$HTTP_URL/hello"
```

### Bash

```bash
STACK="dva-lab-04-01-rest-vs-http"
REST_URL=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='RestApiUrl'].OutputValue" --output text)
HTTP_URL=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" --output text)

echo "REST URL: $REST_URL"
echo "HTTP URL: $HTTP_URL"

curl "$REST_URL/hello"; echo
curl "$HTTP_URL/hello"; echo
```

Both return `hello from <type>`. Note the slight latency difference — HTTP API is consistently faster on cold path.

## Step 4: Compare — feature deltas you can poke at

### A. Try a non-existent route

```bash
curl "$REST_URL/does-not-exist"
# REST API: {"message":"Missing Authentication Token"}  ← weird default
curl "$HTTP_URL/does-not-exist"
# HTTP API: {"message":"Not Found"}                       ← cleaner default
```

The "Missing Authentication Token" on REST is a famous gotcha — it doesn't mean auth is broken, it means the route doesn't exist.

### B. Check the auto-deployed stage names

REST API auto-creates a stage with the name in `StageName:` (we used `prod`).
HTTP API auto-deploys to a `$default` stage when you set `AutoDeploy: true`.

```bash
aws apigateway get-stages --rest-api-id <id>
aws apigatewayv2 get-stages --api-id <id>
```

### C. Try to attach WAF

```bash
# REST: works (regional)
aws wafv2 list-resources-for-web-acl ... --resource-type API_GATEWAY
# HTTP: not supported. You'd front HTTP API with CloudFront and attach WAF there.
```

### D. Compare request/response logs

Both APIs log to CloudWatch only when you opt in. The template enables access logging on REST, but the format is different:

```bash
aws logs describe-log-streams --log-group-name "/aws/apigateway/dva-lab-04-01-rest"
aws logs describe-log-streams --log-group-name "/aws/apigateway/dva-lab-04-01-http"
```

REST stores **execution logs** + **access logs** (separate). HTTP only does access logs.

## Step 5: Look at the inbound event shape

The Lambda echoes the inbound event so you can see what each API type sends. Hit each endpoint and pipe the response into `jq` (optional) or just look at the raw output:

```bash
curl "$REST_URL/hello?name=alice&debug=true"
curl "$HTTP_URL/hello?name=alice&debug=true"
```

Differences you'll spot:
- REST sends `"version": "1.0"` event format
- HTTP defaults to `"version": "2.0"` — `requestContext.http.method` instead of `httpMethod`, `rawPath` instead of `resource`/`path`
- HTTP combines query strings into `rawQueryString` (REST splits into `queryStringParameters`)

The exam can ask "what version is the API GW v2 / HTTP API event format?" — answer: 2.0.

## Exam gotchas

- **API keys + usage plans = REST only.** If a question mentions "throttle per consumer" or "API keys for partners," answer is REST API.
- **Mapping templates / request validation = REST only.** Scenarios using `$input.json('$')` or "validate request body against a model" → REST.
- **JWT authorizer (built-in) = HTTP only.** "Built-in OIDC token validation" → HTTP API.
- **WAF on API Gateway = REST regional only.** HTTP API needs CloudFront in front.
- **REST API event version 1.0 vs HTTP API event version 2.0.** Different field shapes — Lambda code that works for one may break for the other.
- **The "Missing Authentication Token" 403** is REST API's response to an unmatched route, not a real auth error.
- **Stage variables = REST only.** HTTP API has stages but no per-stage variables.

## Cleanup

🧹 **Run cleanup before Lab 4.2** — Lab 4.2 deploys a different REST API design with stages.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before Lab 4.2.** Lab 4.2 builds a fresh REST API with multiple stages and stage variables.
