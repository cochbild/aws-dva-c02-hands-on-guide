# Lab 4.3 — Request Validation & Mapping Templates

> 🟢 **Free tier** — extends the Lab 4.2 stack.

## What you'll learn

- How API Gateway **validates request bodies, query strings, headers** before they reach your backend
- How **mapping templates (VTL)** transform requests into a different shape for the backend
- The difference between **method request, integration request, integration response, method response** — the four-stage pipeline
- How to **override status codes** in mapping templates

## Exam blueprint reference

- Domain 1, Task Statement 1: *"Creating, extending, and maintaining APIs (for example, response/request transformations, enforcing validation rules, overriding status codes)"*

## Theory primer

### The four stages

```
client → [Method Request] → [Integration Request] → BACKEND → [Integration Response] → [Method Response] → client
```

| Stage | What you control here |
|---|---|
| **Method Request** | Auth, query/path/header parameters expected, request body model + validator |
| **Integration Request** | URL/ARN of backend, mapping templates that transform incoming → backend shape |
| **Integration Response** | Mapping templates that transform backend → client shape; pattern matching to set status code |
| **Method Response** | Status codes the API can return; response headers it can set |

For **`AWS_PROXY`** (Lambda proxy) integrations: Method Request and Integration Request collapse — Lambda gets the raw event. **Mapping templates and request validation only apply to non-proxy integrations.**

### Validation modes (Method Request → Request Validator)

| Validator setting | What it checks |
|---|---|
| `Validate body` | Request body matches a JSON Schema model |
| `Validate query string parameters and headers` | Required params present, types correct |
| `Validate body, query string parameters, and headers` | Both |
| `NONE` | Pass everything through (default) |

### VTL crash course (just enough)

Velocity Template Language. Used in mapping templates. Key context objects:

- `$input.body` — raw request body string
- `$input.json('$')` — entire request body as JSON
- `$input.json('$.foo')` — JSON Path
- `$input.params('name')` — query / path / header parameter
- `$input.params().path.foo` — path-only
- `$input.params().querystring.foo` — query-only
- `$input.params().header.foo` — header-only
- `$context.requestId` — request ID
- `$context.identity.sourceIp` — caller IP
- `$context.authorizer.claims.sub` — Cognito user sub (when authorized)
- `$util.escapeJavaScript()` — JSON-string escape
- `$util.parseJson()` — string → JSON

## Prerequisites

- Lab 4.2 stack `dva-lab-04-02-stages` is **still deployed**. We'll update it in place.

## Step 1: Update the stack with validation + a non-proxy integration

The template here adds:
- A **JSON Schema model** for `POST /orders` requiring `customerId` (string) and `quantity` (integer ≥ 1)
- A **request validator** attached to that method
- A **non-proxy AWS integration** with a request mapping template that flattens the body
- An **integration response** that overrides 200 → 201 on success and 400 on validation failure

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

> Note: same stack name as Lab 4.2. CloudFormation diff-applies the changes.

## Step 2: Test validation

### Valid request

**PowerShell:**
```powershell
$DEV = aws cloudformation describe-stacks --stack-name dva-lab-04-02-stages --query "Stacks[0].Outputs[?OutputKey=='DevUrl'].OutputValue" --output text

curl.exe -i -X POST "$DEV/orders" `
  -H "Content-Type: application/json" `
  --data "@payloads/valid-order.json"
```

**Bash:**
```bash
DEV=$(aws cloudformation describe-stacks --stack-name dva-lab-04-02-stages --query "Stacks[0].Outputs[?OutputKey=='DevUrl'].OutputValue" --output text)

curl -i -X POST "$DEV/orders" \
  -H "Content-Type: application/json" \
  --data "@payloads/valid-order.json"
```

Expect HTTP 201 (status overridden by integration response). Body shows the **transformed** payload as built by the request mapping template.

### Invalid request — missing required field

**PowerShell or Bash:**
```
curl -i -X POST "$DEV/orders" \
  -H "Content-Type: application/json" \
  --data "@payloads/invalid-order-missing-customerId.json"
```

Expect **HTTP 400** with `{"message": "Invalid request body"}` — the validator rejected it before it ever hit the backend.

### Invalid request — wrong type

```
curl -i -X POST "$DEV/orders" \
  -H "Content-Type: application/json" \
  --data "@payloads/invalid-order-wrong-type.json"
```

Expect **HTTP 400** again. `quantity` was a string, not an integer.

## Step 3: Compare — what the mapping template produces

The mapping template flattens this incoming body:

```json
{ "customerId": "C123", "quantity": 5, "metadata": { "source": "web" } }
```

…into this Lambda input shape (visible in the response since Lambda echoes its event):

```json
{
  "customer_id": "C123",
  "qty": 5,
  "source": "web",
  "request_id": "<ctx requestId>",
  "caller_ip": "<ctx ip>"
}
```

Look at `template.yaml`'s `RequestTemplates: application/json: |` block — that's the VTL doing the transformation. The exam will show you a snippet like that and ask what the backend receives.

## Step 4: Status code override on errors

Force a backend error path: send `quantity: 9999` (the Lambda is coded to fail above 1000).

```
curl -i -X POST "$DEV/orders" \
  -H "Content-Type: application/json" \
  --data "@payloads/order-too-large.json"
```

Expect **HTTP 422** (set by an integration response with `selectionPattern: ".*ORDER_TOO_LARGE.*"`). Look at `template.yaml`: the integration response with that selection pattern matches Lambda errors whose message contains `ORDER_TOO_LARGE`, and rewrites the status code accordingly.

## Exam gotchas

- **Validation requires a model and a validator** — the model defines schema, the validator defines what to check (body / params / both).
- **Mapping templates are only for non-proxy integrations.** `AWS_PROXY` skips them entirely. The exam will give you a snippet — if it uses `$input.json` or `$input.params`, it's non-proxy.
- **`$input.params('name')` searches query → path → header in that order.** Be precise — use `$input.params().querystring.name` if you want only query.
- **`selectionPattern` matches the Lambda error message**, not the HTTP status. It's a regex against the `errorMessage` field of the Lambda failure response.
- **Default Method Response is HTTP 200.** If you want any other status code possible, declare it in Method Response or you'll get the famous "Execution failed due to configuration error" 500.
- **Models are JSON Schema draft-04.** API Gateway only supports the older draft.
- **Validation errors return generic `{"message": "Invalid request body"}`** — you can customize via Gateway Responses (a separate feature).

## Cleanup

🔁 **Keep this stack — Lab 4.4 reuses it** to add throttling and usage plans.

If you must clean up:

### PowerShell
```powershell
.\cleanup.ps1
```

### Bash
```bash
./cleanup.sh
```

## What's next

> 🔁 **Keep this stack.** Lab 4.4 layers throttling and usage plans + API keys on top of the same REST API.
