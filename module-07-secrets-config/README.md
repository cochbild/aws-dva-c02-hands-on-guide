# Module 7 — Secrets, Config & Encryption

This module covers everything in **Domain 2** that isn't authentication. By the end of it you will know — without thinking — which service to use for each kind of configuration data, and how KMS envelope encryption actually works.

The exam tests this domain heavily (26%), and most candidates lose points here on:

- Secrets Manager vs Parameter Store decisions
- KMS envelope encryption (`GenerateDataKey` vs `Encrypt`)
- AWS-managed vs customer-managed keys (cost, rotation, policy)
- AppConfig vs Parameter Store (when does config change at runtime?)

## Exam blueprint mapping

| Lab | DVA-C02 task statement |
|---|---|
| 7.1 Secrets Manager basics & rotation | D2 TS3 (secrets management, secure credential handling) |
| 7.2 Parameter Store | D2 TS3 (env vars, secrets management), D3 TS1 (config data access) |
| 7.3 AppConfig feature flags | D2 TS3 (secure config), D3 TS4 (runtime config / staging vars) |
| 7.4 KMS envelope encryption | D2 TS2 (encryption, customer-managed keys, key rotation) |
| 7.5 KMS key policies & grants | D2 TS2 (cross-account encryption, key protection) |
| 7.6 ACM & ACM PCA | D2 TS2 (certificate management, ACM PCA) |

## The decision tree

| Need | Use | Why |
|---|---|---|
| Database credentials with auto-rotation | **Secrets Manager** | Built-in rotation Lambdas for RDS, Aurora, DocumentDB, Redshift |
| API keys, third-party credentials | Secrets Manager (rotating) **or** Parameter Store SecureString (static) | Pick by rotation need + budget |
| Config values (non-secret) | **Parameter Store Standard** | Free, hierarchies, GetParametersByPath |
| Hierarchical config (`/myapp/prod/db_host`) | Parameter Store | Path-based lookups |
| Runtime feature flags + gradual rollout | **AppConfig** | Validation + canary deploy + auto-rollback |
| Encryption keys for app data | **KMS CMK** | Envelope encryption pattern |
| Public TLS certs for AWS resources | **ACM** | Free, auto-renews, can't export |
| Private CA / exportable certs | **ACM PCA** | $400/month — only for orgs that need it |

## Lab sequence

| # | Lab | Cost | Handoff |
|---|---|---|---|
| 7.1 | [Secrets Manager basics & rotation](lab-01-secrets-manager-basics/README.md) | 🟡 ~$0.40 for the secret while it exists | 🧹 Cleanup before 7.2 |
| 7.2 | [Parameter Store](lab-02-parameter-store/README.md) | 🟢 Free (Standard tier) + 1 Advanced param | 🧹 Cleanup before 7.3 |
| 7.3 | [AppConfig feature flags](lab-03-appconfig-feature-flags/README.md) | 🟢 Free | 🧹 Cleanup before 7.4 |
| 7.4 | [KMS envelope encryption](lab-04-kms-envelope-encryption/README.md) | 🟡 $1/month per CMK | 🔁 Keep — Lab 7.5 reuses the key |
| 7.5 | [KMS key policies & grants](lab-05-kms-key-policies-and-grants/README.md) | 🟡 Same CMK from 7.4 | 🧹 Cleanup (schedules key deletion in 7 days) |
| 7.6 | [ACM & ACM PCA](lab-06-acm-and-acm-pca/README.md) | 🟡 Free for AWS-issued public certs / imported certs (PCA NOT deployed) | 🧹 Cleanup |

> **About KMS deletion:** KMS keys can't be deleted instantly. The minimum waiting period is **7 days** (max 30). The cleanup script schedules deletion at the 7-day minimum, but **you keep paying $1/month while it's pending** — that's why the keys cost a buck even after cleanup. To cancel: `aws kms cancel-key-deletion --key-id <id>`.

## Theory primer

### Secrets Manager vs Parameter Store

Both store strings. Differences that the exam will quiz you on:

| Aspect | Secrets Manager | Parameter Store |
|---|---|---|
| **Rotation** | Built-in via Lambda (RDS/Aurora/DocumentDB/Redshift templates included) | None |
| **Cost** | $0.40/secret/month + $0.05/10K API calls | Standard tier free; Advanced $0.05/param/month |
| **Max value size** | 64 KB | Standard 4 KB; Advanced 8 KB |
| **Versioning** | Yes (with stage labels: AWSCURRENT, AWSPREVIOUS, AWSPENDING) | Yes (numeric versions, named labels) |
| **Cross-region replication** | First-class feature | Manual (script it yourself) |
| **Encryption at rest** | Always KMS-encrypted (default key or CMK) | SecureString uses KMS; String/StringList not encrypted |
| **Lambda extension** | Yes (Parameters and Secrets Lambda Extension) | Same extension supports both |

### Stage labels (Secrets Manager)

When a secret rotates, four stages exist:

```
                       ┌──────────────┐
   ┌─────────┐         │              │         ┌──────────┐
   │AWSCURRENT├────────►│  AWSPENDING  ├─promote►│AWSCURRENT│  (the new secret)
   └─────────┘         │  (new value, │         └──────────┘
   (the old secret)    │   being      │              │
        │              │   tested)    │              │ promotes
        │ becomes      └──────────────┘              │ old to
        ▼                                            ▼
   ┌──────────────┐                            ┌──────────────┐
   │AWSPREVIOUS   │                            │AWSPREVIOUS   │
   └──────────────┘                            └──────────────┘
```

The rotation Lambda is responsible for the four-step rotation:

1. **createSecret** — generate the new value, store as `AWSPENDING`
2. **setSecret** — apply the new value to the credential's owner (e.g., change the DB password)
3. **testSecret** — verify the new value works (e.g., connect to the DB)
4. **finishSecret** — promote `AWSPENDING` to `AWSCURRENT`

### KMS at a glance

Three key types you must distinguish:

| Type | Who manages | Visible in your account? | Cost | Key policy |
|---|---|---|---|---|
| **AWS-owned** | AWS, hidden | No | Free | Hidden from you |
| **AWS-managed** (`aws/<service>`) | AWS | Yes | Free | Cannot modify |
| **Customer-managed (CMK)** | You | Yes | **$1/month + API calls** | You write it |

The exam tests **customer-managed** key behavior heavily because it's the only one you control.

### KMS envelope encryption — the pattern

KMS doesn't encrypt your data directly (4 KB max per `Encrypt` call). Instead, you use **envelope encryption**:

```
                    ┌──────────────────┐
                    │    Your CMK      │
                    │   (in KMS)       │
                    └─────────┬────────┘
                              │ GenerateDataKey
                              ▼
       ┌────────────────┬────────────────────┐
       │ plaintext key  │ encrypted key      │
       │  (256-bit)     │ (CMK-encrypted)    │
       └─────┬──────────┴──────────┬─────────┘
             │ encrypt your data   │
             │   locally           │  store with
             ▼                     │  the ciphertext
       ┌─────────────┐             ▼
       │ ciphertext  │ ─── store ──┐
       │             │  encrypted  │
       │             │  data key   │
       └─────────────┘  alongside  │
                                   ▼
                              S3 / DDB / file
   (plaintext key is wiped from memory immediately after use)
```

To decrypt: send the encrypted data key back to KMS via `Decrypt`, get the plaintext data key back, decrypt your data locally.

### Key rotation

| Key type | Rotation behavior |
|---|---|
| AWS-managed | Annual, automatic, mandatory |
| Customer-managed (symmetric) | Annual, **opt-in** — `EnableKeyRotation` |
| Customer-managed (asymmetric) | **Cannot auto-rotate** — manually rotate by creating a new key + updating alias |

Rotated keys keep all old key material — old ciphertexts still decrypt. The rotation creates a new "key version" attached to the same key ID.

### Key policy vs IAM policy vs grants

| Mechanism | When to use | Authoritative? |
|---|---|---|
| **Key policy** (resource-based, attached to the key) | Always. The key policy MUST grant access — IAM alone is insufficient. | Yes — gates everything |
| **IAM policy** | Standard identity-based permissions. Only works if the key policy includes `"Principal": {"AWS": "arn:aws:iam::<acct>:root"}` | Only if key policy delegates to IAM |
| **Grants** | Temporary, programmatic permission delegation (e.g., a service that needs decrypt for a few minutes) | Yes — but auditable and revocable |

The default key policy created with a CMK includes the root delegate clause, so IAM works out of the box. Custom key policies often forget this — and IAM stops working without it.

### Cross-account KMS

Two-step:

1. **Owner account**: key policy lists the **other account** as a principal.
2. **User account**: IAM policy grants `kms:Decrypt` (etc.) on the key's ARN.

Both must be in place. Either alone is insufficient.

## Common gotchas tested

- **`GenerateDataKey` returns BOTH plaintext + encrypted data key.** Use `GenerateDataKeyWithoutPlaintext` when you only need the encrypted version (e.g., generating a key now, encrypting later).
- **`SecureString` Parameter Store needs `kms:Decrypt`** on whatever key it's using — usually `alias/aws/ssm` for free tier, or your CMK.
- **Lambda env vars are KMS-encrypted at rest** but **visible in the console** to anyone with `lambda:GetFunctionConfiguration`. Never put live secrets there.
- **AppConfig deployment strategies**: `AllAtOnce`, `Linear20PercentEvery6Minutes`, `Linear50PercentEvery30Seconds`, `Canary10Percent20Minutes`, `Canary10Percent5Minutes` — plus custom. **Auto-rollback on alarm**.
- **Aliases** are pointers — `alias/my-key` can be re-pointed to a new key for emergency rotation without changing client code.

Continue to [Lab 7.1 — Secrets Manager basics & rotation](lab-01-secrets-manager-basics/README.md).
