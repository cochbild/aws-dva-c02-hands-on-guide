# Lab 4.7 — CloudFront in front of API Gateway

> 🟡 **Free tier (first 12 months)** — CloudFront free tier covers 1 TB egress + 10M requests/month, perpetual on the AWS Free Tier. Beyond 12 months: ~$0.085/GB egress in North America. The lab traffic is tiny (kilobytes).

> ⚠️ **Deploy time: ~15–20 minutes.** CloudFront distribution provisioning is slow because the config has to propagate to 400+ POPs.

## What you'll learn

- The CloudFront origin/cache-behavior model and **what gets cached** vs **what gets forwarded**
- The **Origin Access Control (OAC)** vs Origin Access Identity (OAI) distinction for S3 origins (OAI is legacy)
- How CloudFront **`X-Cache` and `Age` headers** prove a hit/miss
- **Cache key vs origin request** — different headers / cookies / query strings can be in one or the other or both

## Exam blueprint reference

- **D4 TS3 — Knowledge of:**
  - *"Caching"*
- **D4 TS3 — Skills in:**
  - *"Caching content based on request headers"*
- **D2 TS2** — TLS in transit (CloudFront is HTTPS by default)

## Theory primer

### CloudFront in five concepts

1. **Distribution** — the global object you create. Has a domain name like `d1234.cloudfront.net` and points to one or more origins.
2. **Origin** — where CloudFront fetches uncached content. Can be S3, ALB, EC2, API Gateway, or any HTTP endpoint.
3. **Cache behavior** — a path-pattern rule (e.g., `/api/*`) that says how CloudFront should cache + which origin it routes to + which headers/query strings/cookies are part of the cache key.
4. **Cache policy** — the modern reusable bundle of cache-key + TTL settings. (Legacy: forwarded-values inline.)
5. **Origin request policy** — what to forward to the origin **even when CloudFront caches the response**. Lets you cache `/api/*` aggressively while still passing the user's `Authorization` header to the origin so the origin can authenticate.

### Cache key vs origin request — the distinction the exam tests

Imagine you cache `/api/products`. The cache key includes `path`. The cached response is served to anyone who asks for `/api/products` with a matching cache key.

**The cache key is what makes two requests "the same" from CloudFront's perspective.**

If you add `Authorization` header to the cache key: each user gets their own cache. Tons of cache entries. Low hit rate.

If you add `Authorization` to the **origin request** (but NOT to the cache key): all users share one cached response, but the origin still receives the user's `Authorization` to authenticate the request that cached it. **Useless for personalized responses, perfect for "everyone authenticated sees the same products list".**

### TTLs

- **Min TTL / Max TTL / Default TTL:** the boundaries CloudFront enforces.
- **Origin TTL** (via `Cache-Control: max-age=N` from the origin): the origin's preference.
- **Resolved TTL** = min(Max TTL, max(Min TTL, origin's max-age, Default TTL)) — basically: origin gets to decide within the bounds.

`Cache-Control: no-cache, no-store` from the origin means **don't cache** even if min TTL is set.

### Headers CloudFront sets on responses

| Header | Meaning |
|---|---|
| `X-Cache: Hit from cloudfront` | Served from edge cache |
| `X-Cache: Miss from cloudfront` | Fetched from origin |
| `X-Cache: RefreshHit from cloudfront` | Cache had a stale response, validated with origin |
| `Age: <seconds>` | How long since this cached response was fetched |
| `Via: 1.1 ...` | Identifies CloudFront in the chain |

### OAC vs OAI (S3 origins)

- **OAI** (Origin Access Identity) — legacy. Created an IAM-like principal that the bucket policy authorized. SigV2-only. Use OAC for new work.
- **OAC** (Origin Access Control) — modern. Uses SigV4. Required for SSE-KMS-encrypted buckets. Created as a CloudFront resource that gets a CFN-managed signing key.

We don't use S3 origin in this lab (it's API Gateway), but the exam contrasts these two for S3.

## Architecture

```
   Internet ──► CloudFront distribution: d12345.cloudfront.net
                  │
                  │  Cache behavior /*  (default)
                  │    Cache policy: 30s default, 1min max
                  │    Origin request policy: forward Authorization, cache key includes nothing extra
                  │
                  ▼
                API Gateway REST API
                  /hello — returns {"message": "hello", "ts": <unix-time>}
```

The Lambda returns the current time on every invocation, so you can SEE caching: identical body within a 30-second TTL window, then a fresh body when the cache expires.

## Step 1: Deploy

⚠️ This deploys a CloudFront distribution. Expect ~15–20 minutes for `Status` to leave `InProgress`.

### PowerShell or Bash

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-04-07-cloudfront-api --capabilities CAPABILITY_IAM
```

You can watch:
```
aws cloudfront get-distribution --id <DistributionId> --query "Distribution.Status"
```

It progresses `InProgress` → `Deployed`.

## Step 2: Test the cache

### PowerShell

```powershell
$CfDomain = aws cloudformation describe-stacks --stack-name dva-lab-04-07-cloudfront-api --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" --output text

# First call — cache MISS
curl.exe -i "https://$CfDomain/hello"

# Second call within 30s — cache HIT, same response body
Start-Sleep -Seconds 2
curl.exe -i "https://$CfDomain/hello"

# After TTL — cache MISS again, new ts
Start-Sleep -Seconds 35
curl.exe -i "https://$CfDomain/hello"
```

### Bash

```bash
CF_DOMAIN=$(aws cloudformation describe-stacks --stack-name dva-lab-04-07-cloudfront-api --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" --output text)

# Miss
curl -i "https://$CF_DOMAIN/hello"
# Hit
sleep 2
curl -i "https://$CF_DOMAIN/hello"
# Miss again after TTL
sleep 35
curl -i "https://$CF_DOMAIN/hello"
```

Look at:
- `X-Cache: Miss from cloudfront` on the first call
- `X-Cache: Hit from cloudfront` on the second
- `Age: 2` (or whatever)
- After 35 seconds, the body's `ts` is fresh and `X-Cache: Miss from cloudfront` again

## Step 3: Compare — bypass the cache

CloudFront ignores `Cache-Control: no-cache` from the *client* — it would still serve from cache. To force a miss for testing, change the cache key (e.g., add `?bust=<random>`):

```bash
curl -i "https://$CF_DOMAIN/hello?bust=$(date +%s)"
```

Cache key is `path + querystring` (configurable). Each unique query string is a separate cache entry → forced miss every time.

## Step 4: Compare — direct vs CDN

Hit the API Gateway directly and CloudFront-fronted in parallel:

```bash
API_URL=$(aws cloudformation describe-stacks --stack-name dva-lab-04-07-cloudfront-api --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)

# direct — no caching
curl -s -w "\nDirect: %{time_total}s\n" "$API_URL/hello" | tail -1

# CDN — cached
curl -s -w "\nCDN:    %{time_total}s\n" "https://$CF_DOMAIN/hello" | tail -1
```

CDN should be measurably faster (especially across continents). Even uncached, the request travels CloudFront's optimized network from POP to origin, often beating direct.

## Exam gotchas

- **OAC > OAI for new S3 origins.** OAI is legacy (SigV2). OAC is required for SSE-KMS-encrypted buckets and supports SigV4.
- **Bucket policy is the actual access mechanism for OAC/OAI.** The CloudFront principal must be allowed by the bucket policy. CFN sets this when you wire the OAC up.
- **Cache key vs Origin request policy:** different concepts. Cache key = "is this request the same as another"? Origin request = "what do we forward to the origin"?
- **TTLs interact with origin's `Cache-Control`:** Min/Max bound the origin's preference. `no-store` overrides.
- **Field-level encryption** is a CloudFront feature for encrypting specific JSON fields with public keys before forwarding to origin. Niche but on the exam.
- **Signed URLs vs Signed Cookies:** Signed URLs for one-off downloads; Signed Cookies when you want to authorize many resources at once (e.g., a video player loading many segments).
- **Lambda@Edge vs CloudFront Functions:**
  - **Lambda@Edge** runs Lambda at edge locations. Full Node.js / Python runtime. ~50ms execution. Costs per ms.
  - **CloudFront Functions** are tiny (sub-ms) JavaScript snippets that run on viewer-facing event types. Cheaper. Limited (no network access, no SDK).
- **Geo-restriction** is a distribution-level setting, allow-list or deny-list of countries.
- **Custom error responses** let you serve a per-status-code page (e.g., 503 → static maintenance.html).
- **TLS 1.0 / 1.1 are deprecated.** New distributions use 1.2/1.3 by default.

## Cleanup

> ⚠️ **CloudFront distributions take 5–15 minutes to delete.** They have to propagate the "deleted" state across all POPs.

The script disables the distribution first (CFN can't delete an enabled distribution), waits for it to deploy the disabled state, then deletes the stack.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before Lab 4.8.** Lab 4.8 is the most expensive lab in the module — Route 53 hosted zone + ALB + WAF.

Continue: [Lab 4.8 — Route 53 + WAF](../lab-08-route53-and-waf/README.md)
