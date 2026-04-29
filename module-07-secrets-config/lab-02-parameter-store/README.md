# Lab 7.2 — Parameter Store

> 🟢 **Free tier** for Standard parameters. The single Advanced parameter in this lab costs **$0.05/month** while it exists. SecureString uses `alias/aws/ssm` (the AWS-managed key — free); you'll only see KMS charges if you switch to a CMK.

## What you'll learn

- The three parameter types: `String`, `StringList`, `SecureString` — and what each costs
- Standard tier vs Advanced tier (and why Advanced is rarely needed)
- Parameter hierarchies and `GetParametersByPath` for fetching whole config trees in one call
- Parameter versions and labels for safe rollback
- The Lambda Parameters and Secrets extension pattern

## Exam blueprint reference

- **Domain 2 / TS3** — *Manage sensitive data in application code*: env vars, secrets management, secure credential handling
- **Domain 3 / TS1** — *Prepare application artifacts to be deployed to AWS*: ways to access application configuration data (AppConfig, Secrets Manager, Parameter Store)

## Theory primer

### Three parameter types

| Type | What | Cost | Encrypted at rest? |
|---|---|---|---|
| `String` | Plain UTF-8 string | Free | No (account-level encryption only) |
| `StringList` | Comma-separated list | Free | No |
| `SecureString` | KMS-encrypted string | Free for the param itself; KMS charges may apply | Yes — needs KMS key |

`SecureString` defaults to the AWS-managed key `alias/aws/ssm` (free). You can specify a customer-managed CMK ($1/month) if you need a custom key policy or rotation.

### Two tiers

| Aspect | Standard | Advanced |
|---|---|---|
| **Cost** | Free | $0.05/parameter/month |
| **Max value size** | 4 KB | 8 KB |
| **Total params** | 10,000 per region | Unlimited |
| **Parameter policies** | No | Yes (expiration, expiration-notification, no-change-notification) |
| **Higher throughput tier** | No | Yes (1000+ TPS optional) |

The exam will ask you which tier supports parameter policies — **Advanced**.

### Hierarchies

Parameter names are paths:

```
/dva/lab-07/database/host
/dva/lab-07/database/port
/dva/lab-07/database/name
/dva/lab-07/feature-flags/checkout-v2
```

You can fetch every param under a path in one call:

```
aws ssm get-parameters-by-path --path /dva/lab-07/database --recursive
```

This is the canonical pattern for app config: store all your config as `/myapp/<env>/...` and fetch the whole tree at startup.

### Versions and labels

Every `PutParameter` creates a new numeric version. Old versions are kept (no extra charge). You can read a specific version: `name:version-num`.

You can apply named labels to versions (`live`, `last-known-good`, `canary-2`). Labels are a way to roll back quickly: re-label `last-known-good` to point at v3 instead of v4 and clients reading the labeled version flip atomically.

### Throughput

Standard tier has a soft limit of ~40 TPS shared across all parameters. Advanced tier supports a **higher throughput** opt-in (~1000 TPS) via the SSM service quotas console — costs the same.

For Lambda fleets reading the same params on every invoke, **cache them** instead of upping throughput:

- Module-level globals (cold-start refresh only)
- AWS Parameters and Secrets Lambda Extension (HTTP cache running in the execution environment, configurable TTL)

## Architecture

```
┌─────────────────────────────────────┐
│   Reader Lambda                     │
│                                     │
│   1) GetParametersByPath /dva/.../db│──► ┌────────────────────────────┐
│   2) GetParameter /dva/.../api-key  │    │ Parameter Store            │
│      (SecureString — auto-decrypts) │    │                            │
│   3) GetParameter /dva/.../version  │    │ /dva/lab-07/db/host    Std │
│      (Advanced — has expiry policy) │    │ /dva/lab-07/db/port    Std │
└─────────────────────────────────────┘    │ /dva/lab-07/db/name    Std │
                                           │ /dva/lab-07/api-key    SSt │
                                           │ /dva/lab-07/version    Adv │
                                           └────────────────────────────┘
```

## Prerequisites

- Lab 7.1 cleaned up (no shared resources).
- Artifacts S3 bucket exists. (Reuse the one created in Lab 7.1; if you skipped it, see the "Prerequisites" section in the [Lab 7.1 README](../lab-01-secrets-manager-basics/README.md#prerequisites).)

## Step 1: Deploy

**PowerShell:**
```powershell
aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-07-02-param-store `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

**Bash:**
```bash
aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-07-02-param-store \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

Capture the function name:

**PowerShell:**
```powershell
$STACK = "dva-lab-07-02-param-store"
$READER_FN = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='ReaderFunctionName'].OutputValue" --output text
```

**Bash:**
```bash
STACK="dva-lab-07-02-param-store"
READER_FN=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ReaderFunctionName'].OutputValue" --output text)
```

## Step 2: Read parameters from the CLI

### Standard `String` parameter

**PowerShell or Bash:**
```
aws ssm get-parameter --name /dva/lab-07/database/host
```

You'll see the value plus metadata (`Type: String`, `Version: 1`, `LastModifiedDate`, etc.).

### `StringList` parameter

**PowerShell or Bash:**
```
aws ssm get-parameter --name /dva/lab-07/database/replica-hosts
```

The `Value` field is a comma-separated string. You parse it client-side.

### `SecureString` parameter — **without** decryption

**PowerShell or Bash:**
```
aws ssm get-parameter --name /dva/lab-07/api-key
```

You'll see ciphertext in the `Value` field. By default, `get-parameter` does **not** decrypt SecureStrings — you must opt in.

### `SecureString` parameter — **with** decryption

**PowerShell or Bash:**
```
aws ssm get-parameter --name /dva/lab-07/api-key --with-decryption
```

Now you see the plaintext. This requires `kms:Decrypt` on the underlying key (`alias/aws/ssm` here — granted by the Lambda role and your CLI credentials).

### Fetch everything under a path

**PowerShell or Bash:**
```
aws ssm get-parameters-by-path --path /dva/lab-07/database --recursive
```

Returns all params under `/dva/lab-07/database/` in a single call. The pattern for "load all my app config at startup."

For SecureStrings under a path, add `--with-decryption`.

## Step 3: Invoke the Lambda

**PowerShell or Bash:**
```
aws lambda invoke --function-name $READER_FN --cli-input-json file://payloads/read.json out.json
type out.json     # PowerShell
cat  out.json     # Bash
```

Expected response:

```json
{
  "db_host": "db.example.local",
  "db_port": "5432",
  "db_name": "appdb",
  "replica_hosts": ["db-r1.example.local", "db-r2.example.local"],
  "api_key_length": 32,
  "version": "v1.4.0",
  "from_cache": false
}
```

Run it again — `from_cache: true` (module-level cache hit).

## Step 4: Compare — versions and labels

Update the database host parameter:

**PowerShell or Bash:**
```
aws ssm put-parameter --name /dva/lab-07/database/host --value "db-new.example.local" --type String --overwrite
```

Read it — `Version: 2` now:

**PowerShell or Bash:**
```
aws ssm get-parameter --name /dva/lab-07/database/host
```

Read v1 explicitly:

**PowerShell or Bash:**
```
aws ssm get-parameter --name /dva/lab-07/database/host:1
```

Label v1 as `last-known-good`:

**PowerShell or Bash:**
```
aws ssm label-parameter-version --name /dva/lab-07/database/host --parameter-version 1 --labels last-known-good
```

Read by label:

**PowerShell or Bash:**
```
aws ssm get-parameter --name /dva/lab-07/database/host:last-known-good
```

This is the rollback pattern: clients reading `name:last-known-good` always get whatever you've labeled, atomically.

## Step 5: Compare — Advanced tier parameter policies

The `version` parameter is Advanced tier with an **expiration policy** that deletes it 30 days after creation, plus an **expiration-notification** at 5 days remaining.

Inspect:

**PowerShell or Bash:**
```
aws ssm describe-parameters --filters "Key=Name,Values=/dva/lab-07/version"
```

You'll see `Tier: Advanced` and the `Policies` array. **Standard tier doesn't support policies** — try setting one on a Standard param to see the error:

**PowerShell:**
```powershell
aws ssm put-parameter `
  --name /dva/lab-07/database/name `
  --value "appdb" `
  --type String `
  --overwrite `
  --policies '[{"Type":"Expiration","Version":"1.0","Attributes":{"Timestamp":"2099-12-31T00:00:00.000Z"}}]'
```

**Bash:**
```bash
aws ssm put-parameter \
  --name /dva/lab-07/database/name \
  --value "appdb" \
  --type String \
  --overwrite \
  --policies '[{"Type":"Expiration","Version":"1.0","Attributes":{"Timestamp":"2099-12-31T00:00:00.000Z"}}]'
```

You'll see: **`InvalidParameterTier: Policies are only supported on parameters of the Advanced tier`**. Memorize that.

## Step 6: Compare — Parameter Store vs Secrets Manager

| Question | Parameter Store SecureString | Secrets Manager |
|---|---|---|
| Built-in rotation? | No | Yes (RDS/Aurora/DocumentDB/Redshift Lambdas, custom) |
| Cost for 1 secret/month | Free (Standard) | $0.40 |
| Cost for 1000 secrets/month | Free (Standard) — but might bump up tier | $400 |
| Versioning? | Numeric versions + labels | Stage labels (`AWSCURRENT`/`AWSPENDING`/`AWSPREVIOUS`) |
| Cross-region replication? | Manual | First-class feature |
| Resource policy / cross-account? | Yes (newer feature) | Yes |
| Hierarchical fetch? | Yes (`GetParametersByPath`) | No |

**Decision rule for the exam:** if the question mentions **automatic rotation** or **RDS/Aurora credentials**, the answer is Secrets Manager. Otherwise, Parameter Store is preferred (cheaper).

## Exam gotchas

- **`SecureString` + `--with-decryption`** — easy to forget. Lambdas must have `kms:Decrypt` on the underlying key (the AWS-managed key requires no extra setup; CMKs require explicit grants).
- **Parameter Store size limits**: Standard 4 KB, Advanced 8 KB. **A multi-line PEM cert won't fit Standard** — bump to Advanced or split across params.
- **Hierarchical naming**: a parameter at `/dva/lab-07` and a parameter under `/dva/lab-07/foo` cannot coexist — paths cannot be both a parameter and a directory.
- **Standard ↔ Advanced is one-way upgrade** (Advanced → Standard requires deleting and recreating).
- **`GetParameters` (plural)** can fetch up to 10 by name in a single call — better than 10 separate `GetParameter` calls.
- **`StringList` does NOT escape commas in values** — if your list contains a comma, you cannot use `StringList`. Use `String` with JSON.
- **Throttling at ~40 TPS**: cache aggressively.
- **EventBridge integration**: parameter changes emit events to EventBridge — useful for forcing Lambdas to refresh.

## Cleanup

**PowerShell:**
```powershell
.\cleanup.ps1
```

**Bash:**
```bash
./cleanup.sh
```

This deletes the stack and verifies the parameters are gone. The Advanced parameter stops accruing $0.05/month immediately.

## What's next

> 🧹 **Run cleanup before the next lab** — Lab 7.3 (AppConfig) starts fresh.

Continue to [Lab 7.3 — AppConfig feature flags](../lab-03-appconfig-feature-flags/README.md).
