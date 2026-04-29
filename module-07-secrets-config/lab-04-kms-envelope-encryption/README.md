# Lab 7.4 — KMS Envelope Encryption

> 🟡 **Pennies** — one customer-managed CMK at **$1/month** until scheduled deletion. Cleanup schedules the 7-day delete window (the minimum).

## What you'll learn

- The **envelope encryption** pattern — encrypt data with a fast symmetric data key, then encrypt the data key with KMS
- **`GenerateDataKey`** — the API that returns BOTH plaintext (use immediately, discard) and encrypted (store with ciphertext) versions of a fresh data key
- **Encryption Context** (additional authenticated data) — extra constraints on decrypt
- KMS key rotation (annual, automatic)

## Exam blueprint reference

- **D2 TS2 — Knowledge of:**
  - *"Encryption at rest and in transit"*
  - *"Differences between client-side encryption and server-side encryption"*
  - *"Differences between AWS managed and customer-managed AWS KMS keys"*
- **D2 TS2 — Skills in:**
  - *"Using encryption keys to encrypt or decrypt data"*
  - *"Enabling and disabling key rotation"*

## Theory primer

### Why envelope encryption

Calling KMS for every byte you want to encrypt is slow and expensive: KMS limits requests-per-second per key, and there's a per-request charge. For large data:

1. Call `GenerateDataKey(KeyId, KeySpec=AES_256)` **once**. KMS returns:
   - `Plaintext` — the actual 256-bit AES key (use to encrypt your data, then **discard from memory**)
   - `CiphertextBlob` — the same key encrypted under your CMK (store with the ciphertext)
2. Encrypt your data locally using `Plaintext`
3. Save: `CiphertextBlob` + your encrypted data
4. To decrypt: call `Decrypt(CiphertextBlob)` → KMS returns the plaintext data key → decrypt your data locally

KMS is involved twice — once to generate, once to decrypt. Throughput unbounded by KMS.

### Customer-managed vs AWS-managed keys

| | AWS-managed (`alias/aws/<service>`) | Customer-managed |
|---|---|---|
| Cost | Free | $1/month per key |
| Created by | AWS, automatically | You |
| Rotation | Annual, automatic | Optional (annual when enabled) |
| Key policy | Read-only (you can't change) | Yours to write |
| Cross-account | No (only within the account that owns it) | Yes (via key policy + IAM) |
| Used by | Most AWS services for default encryption | Your app code, advanced use cases |

### Key rotation

Customer-managed keys: opt-in. When enabled, KMS rotates the **underlying key material** annually. **The key ARN, key ID, key alias, and ciphertexts continue to work.** Old key material is retained so previously-encrypted data still decrypts. AWS-managed keys rotate annually automatically.

`EnableKeyRotation: true` in CFN. Once on, you can't disable rotation without disabling and scheduling deletion.

### Encryption Context

Extra authenticated data passed at encrypt + decrypt time. KMS uses it as part of the encryption integrity check; if you decrypt with different context, you get `InvalidCiphertextException`. Useful for:
- Tying a ciphertext to a specific tenant: `EncryptionContext: { tenant_id: "42" }`
- Audit trail: KMS CloudTrail logs the context, so you see which tenant decrypted what

### Key spec

- `SYMMETRIC_DEFAULT` (AES-256-GCM) — most common; envelope encryption use case
- `RSA_2048`, `RSA_3072`, `RSA_4096` — asymmetric; for sign/verify or encrypt/decrypt
- `ECC_NIST_P256`, etc. — asymmetric; sign/verify
- `HMAC_*` — HMAC keys for MAC operations

The lab uses `SYMMETRIC_DEFAULT` — the most common.

## Architecture

```
   ┌─ Lambda demo function ─────────────────────────────────────┐
   │                                                              │
   │   Step 1: kms.generate_data_key(KeyId=ALIAS, KeySpec=AES_256)│──► KMS CMK
   │           returns plaintext_key + encrypted_data_key         │
   │                                                              │
   │   Step 2: encrypt(plaintext, plaintext_key)  (locally)       │
   │                                                              │
   │   Step 3: store: encrypted_data_key + ciphertext              │
   │           (returned in Lambda response)                       │
   │                                                              │
   │   Step 4: kms.decrypt(encrypted_data_key)                     │──► KMS CMK
   │           → plaintext_key                                     │
   │                                                              │
   │   Step 5: decrypt(ciphertext, plaintext_key)  (locally)       │
   └────────────────────────────────────────────────────────────┘
```

## Step 1: Deploy

The handler uses the `cryptography` library for AES-GCM, which is **not** in the Lambda Python runtime. We need to bundle it into the deployment package as a Linux/x86_64 wheel — installing from Windows or macOS without `--platform manylinux2014_x86_64` ships incompatible binaries that crash at import time.

### PowerShell

```powershell
$ACCOUNT = aws sts get-caller-identity --query Account --output text
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$ACCOUNT-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null

# Bundle cryptography into src/ as Linux/x86_64 wheels
pip install -r src/requirements.txt -t src/ --platform manylinux2014_x86_64 --only-binary=:all:

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-07-04-kms-envelope `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Bash

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCOUNT}-${AWS_DEFAULT_REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

# Bundle cryptography into src/ as Linux/x86_64 wheels
pip install -r src/requirements.txt -t src/ --platform manylinux2014_x86_64 --only-binary=:all:

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-07-04-kms-envelope \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

> Alternative: `sam build --use-container` builds inside a Lambda-compatible Docker image and avoids the platform flag entirely. Requires Docker.

## Step 2: Encrypt + decrypt a sample message

### PowerShell

```powershell
$Fn = aws cloudformation describe-stacks --stack-name dva-lab-07-04-kms-envelope --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text
aws lambda invoke --function-name $Fn --cli-binary-format raw-in-base64-out --payload '{"plaintext":"the secret password is hunter2","tenant_id":"42"}' out.json
Get-Content out.json
```

### Bash

```bash
FN=$(aws cloudformation describe-stacks --stack-name dva-lab-07-04-kms-envelope --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text)
aws lambda invoke --function-name "$FN" --cli-binary-format raw-in-base64-out --payload '{"plaintext":"the secret password is hunter2","tenant_id":"42"}' out.json
cat out.json
```

The Lambda runs all 5 steps and returns:
- `encrypted_data_key` (base64) — the data key wrapped under the CMK
- `ciphertext` (base64) — your message encrypted with the data key
- `decrypted` — the round-tripped plaintext (proves it works)

## Step 3: Compare — encryption context mismatch

Modify the Lambda input to use a different tenant_id on decrypt:

```bash
# encrypt as tenant 42, decrypt as tenant 99 — should FAIL
aws lambda invoke --function-name "$FN" --cli-binary-format raw-in-base64-out \
  --payload '{"plaintext":"secret","tenant_id":"42","decrypt_as_tenant":"99"}' out.json
cat out.json
```

You'll see `InvalidCiphertextException`. **Different EncryptionContext means different identity for KMS** — the ciphertext is bound to the original context.

## Step 4: List the key's grants and policies

```
aws kms describe-key --key-id alias/dva-lab-07-04-cmk
aws kms list-grants --key-id alias/dva-lab-07-04-cmk
aws kms get-key-policy --key-id alias/dva-lab-07-04-cmk --policy-name default
```

You'll see the key policy grants the account `kms:*` and the Lambda's role specific KMS actions.

## Step 5: Compare — key rotation

```
aws kms get-key-rotation-status --key-id alias/dva-lab-07-04-cmk
```

The template enables rotation. Each annual rotation changes the underlying key material. Existing encrypted data continues to decrypt because KMS retains all rotated key versions.

## Exam gotchas

- **`GenerateDataKey` returns both plaintext + encrypted data key.** Use plaintext, discard plaintext from memory ASAP, store encrypted.
- **`GenerateDataKeyWithoutPlaintext`** returns only the encrypted version — use when you'll never need to encrypt with this key (e.g., key escrow scenario).
- **`Encrypt`/`Decrypt` directly without envelope** is fine for small data (< 4 KB). For larger, envelope.
- **KMS request limits** are per-key per-region (varies by op type, ~5500–30000 RPS). High-throughput apps need envelope encryption + bucket keys (S3) to stay under limits.
- **Symmetric vs asymmetric**: symmetric = same key for encrypt + decrypt (fast). Asymmetric = public/private (sign/verify, encrypt with public).
- **Encryption Context is logged in CloudTrail.** Use it for audit — answers "which tenant decrypted what".
- **Bucket Keys (S3)** reduce KMS calls by ~99% for SSE-KMS. Different from envelope but related concept.
- **Aliases**: human-readable ARN. `alias/<name>`. Use aliases in code; rotate the underlying key by re-aliasing.
- **Key state**: enabled, disabled, pending deletion (7–30 day window), pending replica deletion (multi-region keys).
- **Multi-region keys** replicate key material across regions. Same key ID, can decrypt cross-region without copy. Newer feature.
- **Cross-account access**: requires BOTH key policy (allow other account's principal) AND IAM policy in the calling account (allow the action on the key ARN).

## Cleanup

> ⚠️ **The CMK has a 7-day deletion window.** Cleanup schedules deletion; $1/month accrues until that window closes (or you cancel scheduled deletion).

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🔁 **Keep this stack — Lab 7.5 reuses this CMK** to demonstrate key policies, grants, and cross-account encryption.

Continue: [Lab 7.5 — KMS key policies and grants](../lab-05-kms-key-policies-and-grants/README.md)
