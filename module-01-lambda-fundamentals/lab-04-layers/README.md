# Lab 1.4 — Layers

> 🟢 **Free tier** — Lambda invocations only. (External `https://httpbin.org` call from the layer demo costs nothing on AWS's side.)

**Goal:** Build a Lambda layer containing a shared dependency (`requests`), publish it, and consume it from two different Lambda functions.

## Concepts

### What is a layer?

A `.zip` archive that Lambda extracts to `/opt` in the execution environment. Up to **5 layers** per function. Combined with the function's own code, total unzipped size cannot exceed **250 MB**.

Layers are versioned independently of functions. When you reference a layer from a function, you reference an exact ARN with version:
```
arn:aws:lambda:us-east-1:123456789012:layer:my-layer:3
                                                    ^ version
```

You **cannot point at a layer alias** — only a numbered version.

### Why use layers?

- **Share dependencies** across many functions (one source of truth)
- **Smaller deployment packages** for the function itself
- **Faster deploys** when only function code changes (the layer doesn't re-upload)
- **Vendor SDKs** (e.g., AWS Lambda Powertools, ClamAV)

**Common misconception:** layers do NOT speed up cold starts. They might even slow them down slightly because of the extraction step. They speed up *deploys*, not invokes.

### Layer file structure (per runtime)

The path inside the zip matters. For Python:
```
python/
  ├── requests/
  ├── certifi/
  └── ...
```

That folder gets unzipped to `/opt/python/`, which Python automatically adds to `sys.path`.

For Node.js:
```
nodejs/
  └── node_modules/
       └── lodash/
```

Unzipped to `/opt/nodejs/node_modules/`, which Node.js auto-includes.

For binaries (any runtime):
```
bin/
  └── my-cli-tool
```

`/opt/bin` is in `$PATH`.

### Compatibility

A layer declares one or more compatible runtimes (`python3.12`, `python3.11`, etc.). A function can only use a layer if there's runtime overlap. SAM enforces this at deploy time.

### Layer permissions

Layers can be:
- **Private** to one account (default)
- **Shared** with another account (via `AddLayerVersionPermission`)
- **Public** (shared with `*`)

To consume someone else's layer, your function's account must have `lambda:GetLayerVersion` granted by the layer owner.

## Steps

### 1. Inspect the layer source

The layer code lives at `layer/python/`. We pre-staged a `requirements.txt`. SAM will pip-install these into the layer's build directory.

```yaml
# in template.yaml
SharedLayer:
  Type: AWS::Serverless::LayerVersion
  Properties:
    ContentUri: layer/
    CompatibleRuntimes:
      - python3.12
  Metadata:
    BuildMethod: python3.12   # tells SAM to pip-install from requirements.txt
```

### 2. Build & deploy

**PowerShell or Bash:**

```
sam build
sam deploy --guided --stack-name dva-lab-01-04-layers
```

Watch the build output. SAM creates `.aws-sam/build/SharedLayer/python/` and pip-installs into it. The layer zip then has the layout `python/requests/...`.

### 3. Test both consumers

**PowerShell:**

```powershell
$STACK = "dva-lab-01-04-layers"
$FN_A = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='FunctionAName'].OutputValue" --output text
$FN_B = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='FunctionBName'].OutputValue" --output text

aws lambda invoke --function-name $FN_A --payload '{}' --cli-binary-format raw-in-base64-out a.json | Out-Null
Get-Content a.json
aws lambda invoke --function-name $FN_B --payload '{}' --cli-binary-format raw-in-base64-out b.json | Out-Null
Get-Content b.json
```

**Bash:**

```bash
STACK="dva-lab-01-04-layers"
FN_A=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`FunctionAName`].OutputValue' --output text)
FN_B=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`FunctionBName`].OutputValue' --output text)

aws lambda invoke --function-name "$FN_A" --payload '{}' \
  --cli-binary-format raw-in-base64-out /tmp/a.json && cat /tmp/a.json
aws lambda invoke --function-name "$FN_B" --payload '{}' \
  --cli-binary-format raw-in-base64-out /tmp/b.json && cat /tmp/b.json
```

Both functions import `requests` (which is *not* in the runtime by default — only `boto3` is) and successfully make an HTTP call.

### 4. Inspect the layer in the console

Lambda → Layers → see your `dva-shared-layer`. Notice:
- Version 1 (auto-published)
- Compatible runtimes
- Functions consuming it

If you bumped the layer (e.g., added a new dep), it would publish version 2. Functions still pinned to v1 keep using v1.

## Exam gotchas

- **5 layers max per function.** Total unzipped size with layers cannot exceed 250 MB.
- **Layers are merged in order.** If two layers contain the same file, **later layers override earlier ones**. Order matters.
- **Container image functions cannot use layers.** Bake your deps into the image.
- **You can't use a layer alias.** Only specific version ARNs.
- **Layer regions:** layers are regional. To use the same layer in multiple regions, publish it in each.
- **Cold start impact:** layers don't slow cold start meaningfully (they're pre-cached at the worker), but a 250 MB unzipped function will be slower than a 5 MB one. Keep layers small.
- **Lambda Insights, AWS Distro for OpenTelemetry, AWS Lambda Powertools** — these all ship as layers AWS publishes. You consume by ARN.

## Cleanup

**PowerShell:**

```powershell
.\cleanup.ps1
```

**Bash:**

```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before the next lab** — Lab 1.5 (Concurrency) starts fresh.
