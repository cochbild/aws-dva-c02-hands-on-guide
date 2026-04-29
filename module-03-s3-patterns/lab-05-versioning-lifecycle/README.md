# Lab 3.5 — Versioning & Lifecycle

> 🟡 **Pennies** — small storage cost ($0.023/GB-month for Standard, even less for Glacier classes). Cleanup deletes everything.

## What you'll learn

- How versioning preserves every object overwrite — and how delete-markers work
- The full storage-class transition path the exam tests: **Standard → IA → Glacier Instant → Glacier Flexible → Glacier Deep Archive → Expiration**
- How to cleanly delete a versioned bucket (the cleanup script handles this — it's harder than `aws s3 rm`)

## Exam blueprint reference

- **D1 TS3** — *"Amazon S3 tiers and lifecycle management"*, *"Managing data lifecycles"*

## Theory primer

### Versioning

Three states:
- **Disabled** (default for new buckets) — overwrites replace.
- **Enabled** — every overwrite creates a new version. `DELETE` adds a delete-marker (the "current" version becomes the marker; the old version is preserved). `DELETE` of a specific version-id permanently removes that version.
- **Suspended** — current version is kept; subsequent overwrites get version-id `null` (only one such version per key).

**You cannot un-version a bucket.** Once enabled, you can only suspend. Suspended buckets keep all existing versioned objects.

**MFA Delete:** if enabled, deleting any version requires an MFA code from the root user. Can only be enabled by the root user via CLI (not console). Rare but on the exam.

### Lifecycle rules

Apply per bucket (or per prefix / per tag). Each rule has:
- Filter (prefix, tag, both)
- Transitions (move to colder class after N days)
- Expiration (delete after N days)
- NoncurrentVersionTransitions / NoncurrentVersionExpiration (for versioned buckets)
- AbortIncompleteMultipartUpload (after N days, abort un-completed multipart uploads — clean hygiene)

### Transition timing rules (testable)

| From | Earliest transition | Reason |
|---|---|---|
| Standard | day 0 (any class) | no minimum |
| Standard-IA / One Zone-IA | day 30 | min 30-day storage charge applies |
| Glacier Instant | day 90 | min 90-day storage |
| Glacier Flexible | day 90 | min 90-day storage |
| Glacier Deep Archive | day 180 | min 180-day storage |

> **Common exam trap:** lifecycle wants to move to IA at day 1 — **not allowed** by S3 itself (storage class minimums). The lifecycle rule just won't fire until day 30.

### Retrieval times by class

| Class | Retrieval | Cost-on-retrieval |
|---|---|---|
| Standard | ms | $0 |
| IA | ms | $0.01/GB |
| Glacier Instant Retrieval | ms | $0.03/GB |
| Glacier Flexible — Expedited | 1–5 min | $0.03/GB + $10/1000 |
| Glacier Flexible — Standard | 3–5 hours | $0.01/GB |
| Glacier Flexible — Bulk | 5–12 hours | $0.0025/GB (cheapest) |
| Glacier Deep Archive — Standard | 12 hours | $0.02/GB |
| Glacier Deep Archive — Bulk | 48 hours | $0.0025/GB |

## Architecture

```
                          ┌───────────────────────────────────────────┐
   PutObject same key ───►│  dva-lab-03-05 bucket (versioning ON)     │
   (5 times)              │                                           │
                          │  Lifecycle:                               │
                          │    day 30  → STANDARD_IA                  │
                          │    day 60  → GLACIER_IR                   │
                          │    day 90  → GLACIER                      │
                          │    day 180 → DEEP_ARCHIVE                 │
                          │    day 365 → expire                       │
                          │    incomplete-multipart abort: day 7      │
                          └───────────────────────────────────────────┘
```

## Step 1: Deploy

### PowerShell or Bash

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-03-05-versioning-lifecycle --capabilities CAPABILITY_IAM
```

## Step 2: Demonstrate versioning

Upload the same key 5 times and observe versions accumulate.

### PowerShell

```powershell
$Bucket = aws cloudformation describe-stacks --stack-name dva-lab-03-05-versioning-lifecycle --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text
.\scripts\seed-data.ps1 -BucketName $Bucket
aws s3api list-object-versions --bucket $Bucket --prefix doc.txt --query "Versions[].{ID:VersionId,LastModified:LastModified,IsLatest:IsLatest}"
```

### Bash

```bash
BUCKET=$(aws cloudformation describe-stacks --stack-name dva-lab-03-05-versioning-lifecycle --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
./scripts/seed-data.sh "$BUCKET"
aws s3api list-object-versions --bucket "$BUCKET" --prefix doc.txt --query "Versions[].{ID:VersionId,LastModified:LastModified,IsLatest:IsLatest}"
```

You should see 5 versions, with `IsLatest:true` only on the most recent.

## Step 3: Demonstrate delete markers

Issue a normal DELETE (without version-id):

### PowerShell

```powershell
aws s3api delete-object --bucket $Bucket --key doc.txt
aws s3api list-object-versions --bucket $Bucket --prefix doc.txt
```

### Bash

```bash
aws s3api delete-object --bucket "$BUCKET" --key doc.txt
aws s3api list-object-versions --bucket "$BUCKET" --prefix doc.txt
```

You should see your 5 versions still there, **plus** a `DeleteMarkers` entry that's now `IsLatest:true`. The object appears "deleted" to GET-by-key, but the data is intact.

To restore: delete the delete-marker by version-id.

### PowerShell

```powershell
$MarkerId = aws s3api list-object-versions --bucket $Bucket --prefix doc.txt --query "DeleteMarkers[?IsLatest==``true``].VersionId | [0]" --output text
aws s3api delete-object --bucket $Bucket --key doc.txt --version-id $MarkerId
```

### Bash

```bash
MARKER_ID=$(aws s3api list-object-versions --bucket "$BUCKET" --prefix doc.txt --query "DeleteMarkers[?IsLatest==\`true\`].VersionId | [0]" --output text)
aws s3api delete-object --bucket "$BUCKET" --key doc.txt --version-id "$MARKER_ID"
```

## Step 4: Inspect the lifecycle policy

### PowerShell or Bash

```
aws s3api get-bucket-lifecycle-configuration --bucket $Bucket
```

You'll see the full rule. Lifecycle runs **once per day**, not in real time — don't expect transitions to fire instantly.

## Exam gotchas

- **Versioning + DELETE creates a delete-marker, not a deletion.** The data is still there. To truly delete, delete the version-id. To "restore" a deleted object, delete the delete-marker.
- **You can't un-version a bucket.** Only Suspend. Existing versions stay.
- **MFA Delete** must be enabled by root via CLI. Cannot be enabled in console. Frequent exam distractor.
- **Storage class minimums apply regardless of lifecycle rule.** Standard-IA requires 30 days minimum charge. Glacier 90 days. Deep Archive 180 days.
- **Glacier Instant Retrieval is NOT the same as Glacier Flexible.** Instant = milliseconds (like Standard) but cheaper for rarely-accessed data. Flexible = the older "tape" Glacier (1 min – 12 hr retrieval).
- **Aborting incomplete multipart uploads should always be in a lifecycle rule.** Default = those parts sit in storage forever. A rule like "abort after 7 days" prevents this.
- **Expiration vs Transition** are different actions in the same rule. Expiration deletes; transition moves to a colder class.
- **Noncurrent vs current versions** have separate transition rules. You usually want noncurrent versions to expire faster than current.

## Cleanup

> The cleanup script handles **versioned-bucket deletion** properly: lists all object versions + delete-markers, deletes them, then deletes the bucket. `aws s3 rm --recursive` doesn't work on versioned buckets — you'd see the bucket "empty" but still un-deletable.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before Lab 3.6.** Lab 3.6 needs a fresh bucket configured for event notifications.

Continue: [Lab 3.6 — Event notifications](../lab-06-event-notifications/README.md)
