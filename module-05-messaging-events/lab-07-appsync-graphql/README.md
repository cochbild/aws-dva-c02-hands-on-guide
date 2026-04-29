# Lab 5.7 — AppSync GraphQL

> 🟢 **Free tier-friendly** — AppSync first 250K queries + 250K data modifications + 250K real-time updates per month free for 12 months. Pricing after: $4 per million queries.

## What you'll learn

- The GraphQL API model and how AppSync hosts it as a managed service
- **Direct DynamoDB resolvers** — no Lambda glue needed for simple CRUD
- The four AppSync auth modes: **API key**, **IAM**, **Cognito User Pool**, **OIDC**
- When to choose AppSync over API Gateway

## Exam blueprint reference

- **D1 TS1** — *"API design"*, *"Architectural patterns (event-driven, microservices)"*
- **D2 TS1** — *"Bearer tokens"*, *"Cognito user pools"*

## Theory primer

### AppSync vs API Gateway

| | **AppSync** | **API Gateway** |
|---|---|---|
| API style | GraphQL (and Pub/Sub via subscriptions) | REST or HTTP |
| Native real-time | Yes (WebSocket subscriptions) | No (use API GW WebSocket APIs separately) |
| Direct service integrations | DynamoDB, RDS Data API, OpenSearch, Lambda, HTTP, EventBridge | Lambda, AWS service via VTL, HTTP |
| Caching | Built-in, per-resolver | Caching tier (REST only, paid) |
| Auth modes | API key, IAM, Cognito UP, OIDC, Lambda | IAM, Cognito UP/auth, Lambda authorizer, JWT (HTTP only) |

If the question says **"GraphQL"** or **"real-time subscriptions"** → AppSync.

### Resolvers

A resolver is a snippet of mapping code (VTL or JavaScript) that runs for a query/mutation/subscription field. It transforms the GraphQL request into an action against a data source, then transforms the result back.

For DynamoDB: AppSync has built-in PutItem, GetItem, Query, Scan, DeleteItem, UpdateItem operation templates. **Zero Lambda code needed for basic CRUD.**

### Auth modes

A single API can have **multiple** auth modes (one default + additional). Each field can require a specific mode.

- **API key** — for prototypes, public APIs, or read-only mobile apps. Configurable expiry (max 365 days). NOT identification.
- **IAM** — SigV4-signed requests. For internal services or apps using Cognito Identity Pool credentials.
- **Cognito User Pool** — JWT validation, just like API Gateway.
- **OIDC** — any OpenID Connect provider (Google, Auth0, etc.).
- **Lambda** — custom authorization logic.

### Subscriptions

GraphQL `subscription` fields → real-time push to subscribed clients via WebSocket. Trigger when a paired mutation runs. Only your authenticated subscribers get the push (auth on subscriptions is enforced).

## Architecture

```
   GraphQL query / mutation ──► AppSync API (API key auth)
                                  │
                                  │ direct DynamoDB resolver (no Lambda)
                                  ▼
                                DynamoDB table: dva-lab-05-07-products
                                  pk = id (S)
```

## Step 1: Deploy

### PowerShell or Bash

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-05-07-appsync --capabilities CAPABILITY_IAM
```

## Step 2: Run a mutation (create item)

### PowerShell

```powershell
$ApiUrl = aws cloudformation describe-stacks --stack-name dva-lab-05-07-appsync --query "Stacks[0].Outputs[?OutputKey=='GraphQLUrl'].OutputValue" --output text
$ApiKey = aws cloudformation describe-stacks --stack-name dva-lab-05-07-appsync --query "Stacks[0].Outputs[?OutputKey=='ApiKey'].OutputValue" --output text

$mutation = @'
{"query":"mutation { createProduct(input: { id: \"p1\", name: \"Widget\", price: 9.99 }) { id name price } }"}
'@

curl.exe -i -H "Content-Type: application/graphql" -H "x-api-key: $ApiKey" --data $mutation $ApiUrl
```

### Bash

```bash
API_URL=$(aws cloudformation describe-stacks --stack-name dva-lab-05-07-appsync --query "Stacks[0].Outputs[?OutputKey=='GraphQLUrl'].OutputValue" --output text)
API_KEY=$(aws cloudformation describe-stacks --stack-name dva-lab-05-07-appsync --query "Stacks[0].Outputs[?OutputKey=='ApiKey'].OutputValue" --output text)

curl -i -H "Content-Type: application/graphql" -H "x-api-key: $API_KEY" \
  --data '{"query":"mutation { createProduct(input: { id: \"p1\", name: \"Widget\", price: 9.99 }) { id name price } }"}' \
  "$API_URL"
```

You should get the created product back in the response.

## Step 3: Run a query

```bash
curl -i -H "Content-Type: application/graphql" -H "x-api-key: $API_KEY" \
  --data '{"query":"{ getProduct(id: \"p1\") { id name price } }"}' \
  "$API_URL"
```

## Step 4: Run another mutation + list

```bash
curl -s -H "x-api-key: $API_KEY" --data '{"query":"mutation { createProduct(input: { id: \"p2\", name: \"Gizmo\", price: 19.99 }) { id } }"}' "$API_URL"

curl -s -H "x-api-key: $API_KEY" --data '{"query":"{ listProducts { items { id name price } } }"}' "$API_URL"
```

You should see both products in the list.

## Step 5: Compare — what would Cognito auth look like

To switch this API to Cognito User Pool auth, edit `template.yaml`:

```yaml
AuthenticationType: AMAZON_COGNITO_USER_POOLS
UserPoolConfig:
  AwsRegion: !Ref AWS::Region
  UserPoolId: !ImportValue dva-lab-04-05-user-pool-id   # if Lab 4.5 still deployed
  DefaultAction: ALLOW
```

Redeploy. Now the request needs an `Authorization: <id-token>` header (not `x-api-key`). Cognito validates the JWT exactly the way API Gateway does.

## Exam gotchas

- **GraphQL vs REST:** GraphQL = client picks the fields per request. REST = server picks per endpoint. AppSync hosts GraphQL.
- **Subscriptions** require a paired mutation that triggers them. WebSocket-based, automatic.
- **Direct resolvers (no Lambda)** for DynamoDB / RDS Data API / OpenSearch / Lambda / HTTP / EventBridge / None (local).
- **Pipeline resolvers** chain multiple data sources for one field — useful for cross-data-source aggregation in a single GraphQL request.
- **Caching** is per-resolver, with cache key from arguments + identity. Speeds up read-heavy GraphQL workloads.
- **Multi-auth**: one API can require API key for some fields, Cognito for others, IAM for others. Use `@aws_api_key`, `@aws_cognito_user_pools` directives in the schema.
- **Logging** can be set to NONE / ERROR / ALL — ALL logs full request + response (large CloudWatch volume).
- **Field-level metrics** are emitted per resolver — costly at scale but invaluable for debugging.
- **Throttling** is on the API itself (max requests per second), not per-field. Configure in API settings.

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

> 🎉 **Module 5 complete!** You've covered every messaging + event service in the DVA-C02 scope: SQS (standard + FIFO), SNS (fanout + filter policies), EventBridge (rules + buses + scheduler), DLQ + redrive, Kinesis Data Streams, Kinesis Firehose, and AppSync GraphQL.

Continue: [Module 6 — Step Functions](../../module-06-step-functions/README.md)
