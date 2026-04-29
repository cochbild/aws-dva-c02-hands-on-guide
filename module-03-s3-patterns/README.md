# Module 3 — S3 Patterns

S3 is the most-used service on AWS, but the **developer** exam tests it differently than the architect exams. Less about storage-class architecture, more about how application code interacts with S3: presigned URLs, multipart upload from clients, encryption variants, and event-driven processing.

## Exam blueprint coverage

This module covers these bullets from the official [DVA-C02 Exam Guide](https://d1.awsstatic.com/training-and-certification/docs-dev-associate/AWS-Certified-Developer-Associate_Exam-Guide_C02.pdf):

**Domain 1 (Development) — Task Statement 3 (Use data stores):**
- "Cloud storage options (for example, file, object, databases)"
- "Amazon S3 tiers and lifecycle management"
- "Differences between ephemeral and persistent data storage patterns"
- "Serializing and deserializing data to provide persistence to a data store"
- "Managing data lifecycles"

**Domain 2 (Security) — Task Statement 2 (Encryption):**
- "Encryption at rest and in transit"
- "Differences between client-side encryption and server-side encryption"
- "Differences between AWS managed and customer-managed AWS Key Management Service (AWS KMS) keys"
- "Using encryption keys to encrypt or decrypt data"
- "Using encryption across account boundaries"

**Domain 3 (Deployment) — Task Statement 1 (Artifacts):**
- "Lambda deployment packaging" (S3 is the artifact store)

**Domain 4 (Optimization) — Task Statement 3:**
- "Caching" (S3 Bucket Keys, request patterns)

## Lab list

Labs are linear and several share a single bucket — read each "What's next" banner.

| # | Lab | Cost | Reuses prior lab? |
|---|---|---|---|
| 3.1 | [Bucket basics](lab-01-bucket-basics/README.md) | 🟢 Free tier | — |
| 3.2 | [Presigned URLs](lab-02-presigned-urls/README.md) | 🟢 Free tier | 🔁 reuses 3.1 bucket |
| 3.3 | [Multipart upload](lab-03-multipart-upload/README.md) | 🟢 Free tier | 🔁 reuses 3.1 bucket |
| 3.4 | [Encryption variants](lab-04-encryption-variants/README.md) | 🟡 Pennies (KMS keys) | 🔁 reuses 3.1 bucket |
| 3.5 | [Versioning & lifecycle](lab-05-versioning-lifecycle/README.md) | 🟡 Pennies (small storage) | 🧹 fresh bucket |
| 3.6 | [Event notifications](lab-06-event-notifications/README.md) | 🟢 Free tier | 🧹 fresh bucket |
| 3.7 | [S3 Object Lambda](lab-07-object-lambda/README.md) | 🟢 Free tier | 🧹 fresh bucket |

## Theory primer (read once, reference forever)

### Durability, availability, consistency

- **Durability:** **11 nines** (99.999999999%) for all storage classes.
- **Availability:** varies by class — Standard 99.99%, Standard-IA 99.9%, One Zone-IA 99.5% (single AZ — AZ failure = data unavailable, not lost), Glacier Instant Retrieval 99.9%.
- **Consistency:** **strong read-after-write since December 2020**, for all operations including overwrite PUTs and DELETEs. Pre-2020 S3 was eventually consistent for overwrite/delete — that's still in old exam dumps; the current exam reflects the new behavior.
- **PUT atomicity:** an overwrite PUT is atomic. Concurrent readers see either the old object completely or the new one completely, never a mix.

### Object operations the SDK exposes

| API | Purpose |
|---|---|
| `PutObject` | Upload (full file, up to 5 GB) |
| `GetObject` | Download |
| `HeadObject` | Get metadata only (no body) |
| `DeleteObject` | Delete (or create delete marker if versioning) |
| `CopyObject` | Server-side copy (cross-bucket, cross-region) |
| `ListObjectsV2` | List with pagination (always use V2) |
| `CreateMultipartUpload` / `UploadPart` / `CompleteMultipartUpload` | Multipart |
| `GeneratePresignedUrl` (SDK helper, no API call) | Make a time-limited URL |
| `SelectObjectContent` | S3 Select — query CSV/JSON/Parquet with SQL |

### Storage classes (developer exam emphasis)

| Class | Durability | Min storage | Retrieval | Use when |
|---|---|---|---|---|
| **Standard** | 11 9s | 0 days | ms | Default; frequent access |
| **Intelligent-Tiering** | 11 9s | 0 days | ms (auto) | Access pattern unknown |
| **Standard-IA** | 11 9s | 30 days | ms | Infrequent but quick |
| **One Zone-IA** | 11 9s (single AZ) | 30 days | ms | Recreatable infrequent data |
| **Glacier Instant Retrieval** | 11 9s | 90 days | ms | Archived, rarely accessed, but quick on the rare access |
| **Glacier Flexible Retrieval** | 11 9s | 90 days | min/hr | Archived, async retrieval OK |
| **Glacier Deep Archive** | 11 9s | 180 days | hours | Archived, almost never accessed |

**Glacier retrieval modes (Flexible / Deep Archive):**
- **Expedited** (Flexible only): **1–5 minutes**, $$$
- **Standard:** 3–5 hours (Flexible) / 12 hours (Deep Archive)
- **Bulk:** 5–12 hours (Flexible) / 48 hours (Deep Archive)

### Request types and pricing

You pay for: storage GB-month, requests (per 1,000 GETs/PUTs/etc.), data transfer **out** (in is free), retrieval (Glacier).

- PUT/COPY/POST/LIST: charged per 1,000 requests
- GET/SELECT: charged per 1,000 requests (cheaper)
- Lifecycle transitions: charged per 1,000 transitions

**Bucket Keys (KMS):** caches the data key at bucket level. Reduces SSE-KMS overhead by up to 99% on KMS API calls. **Free to enable, immediate cost win.**

### Multipart (memorize for the exam)

- **Min part size: 5 MB** (except the last part)
- **Max part size: 5 GB**
- **Max parts: 10,000**
- **Max object: 5 TB**
- **Required for files > 5 GB**, recommended for > 100 MB
- Parts upload in parallel — that's the speed win
- Incomplete multiparts cost money — **always lifecycle-rule them to abort after N days**

### Presigned URLs

A signed URL gives a third party temporary permission to **GET** or **PUT** an object without AWS credentials.

- Generated **client-side** by the SDK (no API call to AWS to issue)
- Valid up to **7 days** when signed by IAM user long-term credentials (sigv4)
- **Shorter cap if signed with STS temporary credentials** — cannot exceed the session lifetime
- The URL inherits the **signer's permissions** — if the signer can write, the URL can write
- Method-specific: a presigned `PUT` URL can't be used for `GET`
- **Cannot be revoked.** Keep `ExpiresIn` short for sensitive uploads.

### Encryption options (memorize the four)

| Type | Key managed by | KMS calls per object op | Use when |
|---|---|---|---|
| **SSE-S3** (AES-256) | AWS, hidden | 0 | Default; simplest. **Default for all new buckets since 2023.** |
| **SSE-KMS** | AWS KMS (AWS-managed or customer-managed CMK) | 1 per Put/Get unless Bucket Keys on | Need an audit trail (CloudTrail logs every decrypt) |
| **DSSE-KMS** | AWS KMS | 2 per op (double layer) | Top-secret / regulated workloads |
| **SSE-C** | **Customer** sends key on each request | 0 | Customer key, no KMS |
| **CSE** (Client-Side) | Customer (encrypts before upload) | varies | Data must be encrypted before leaving client |

### Versioning

- Enabled per-bucket. Once enabled, can be **Suspended** but **never disabled** — versions remain accessible.
- Each version has a unique `VersionId`.
- `DeleteObject` without a `VersionId` creates a **delete marker**; data still there, hidden from default GET.
- True deletion: `DeleteObject` with `--version-id`.
- **MFA Delete** requires MFA for permanent deletes; can only be configured by the **bucket owner using root credentials** via `aws s3api put-bucket-versioning`.

### S3 Object Lock (governance/compliance)

- **Governance mode** — users with the `s3:BypassGovernanceRetention` permission can override.
- **Compliance mode** — even root cannot delete or modify until retention expires.
- WORM (write-once-read-many) compliance scenarios.
- Requires a **versioning-enabled bucket** at creation time.

### S3 Events (and their consumers)

Trigger types:
- `s3:ObjectCreated:*` (Put, Post, Copy, CompleteMultipartUpload)
- `s3:ObjectRemoved:*` (Delete, DeleteMarkerCreated)
- `s3:ObjectRestore:*` (Glacier restore lifecycle)
- `s3:Replication:*`
- `s3:LifecycleTransition`

Targets:
- **Lambda** — direct, push, async
- **SQS queue** — buffered async processing
- **SNS topic** — fanout
- **EventBridge** — richer routing, schemas, multiple downstream targets, content-based filters

**Filter limit on direct notifications:** **one prefix and one suffix per rule**. Need wildcards in the middle? Use EventBridge.

### S3 Object Lambda

A "**virtual GET**" — when a client `GET`s an object via an Object Lambda Access Point, your Lambda function intercepts the request, fetches the actual S3 object, transforms it, and returns the transformed response. The original object is unchanged.

Use cases: redact PII on read, watermark images per-user, convert formats on the fly, A/B serving.

## Resource handoff strategy for this module

```
lab-01 ─→ creates "demo bucket" (versioning OFF)
   │
   ├─ lab-02 ─→ presigned URLs against the demo bucket
   ├─ lab-03 ─→ multipart upload to the demo bucket
   ├─ lab-04 ─→ adds encryption variants (extends demo bucket)  ← cleanup all of 3.1-3.4 here
   │
   ├─ lab-05 ─→ NEW versioned bucket (versioning behavior)        ← cleanup
   ├─ lab-06 ─→ NEW bucket + Lambda/SQS/SNS/EventBridge consumers ← cleanup
   └─ lab-07 ─→ NEW bucket + Object Lambda access point           ← cleanup
```

After Lab 3.7 you should have **zero** S3 resources from this module remaining. Run `../../cleanup-all.sh` (or `.ps1`) to verify.

## Begin

Start with [Lab 3.1 — Bucket basics](lab-01-bucket-basics/README.md).
