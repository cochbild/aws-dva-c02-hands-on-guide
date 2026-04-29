# Module 4: API Gateway, Cognito & Edge

The most-tested service combination on the developer exam. APIs are how serverless code is exposed to the world; Cognito is how it's secured; CloudFront, Route 53, and WAF are how it's globally distributed and protected.

The exam will hit you with: REST vs HTTP API trade-offs, Cognito User Pool vs Identity Pool, JWT authorizer vs Lambda authorizer vs Cognito authorizer, throttling hierarchy, mapping templates, custom domain wiring, CloudFront cache key behavior, Route 53 routing policies, and WAF rule types. This module exists to make all of that muscle memory.

## Module charter

By the end of this module, you can pick up an exam question about any of those topics and know which option to choose **because you have built and broken each one yourself**.

## Lab sequence

```
4.1 REST vs HTTP API           [🟢 free]    [🧹 cleanup]
4.2 Stages & stage variables   [🟢 free]    [🔁 keep — reused by 4.3 + 4.4]
4.3 Validation & transforms    [🟢 free]    [🔁 keep — extends 4.2]
4.4 Throttling & usage plans   [🟢 free]    [🧹 cleanup before 4.5]
4.5 Cognito User Pool + JWT    [🟢 free]    [🔁 keep — reused by 4.6]
4.6 Cognito Identity Pool      [🟢 free]    [🧹 cleanup]
4.7 CloudFront in front of API [🟡 12mo FT] [🧹 cleanup]
4.8 Route 53 + WAF             [🔴 ~$0.50+/mo] [🧹 cleanup IMMEDIATELY]
```

The **🔁 keep** chains let you bypass redundant deploys. **🧹 cleanup** breaks indicate that the next lab's design diverges enough to need a fresh stack.

## Exam blueprint mapping

| Lab | Domain | Task statements covered |
|---|---|---|
| 4.1 | D1 / D4 | TS1: API design, async vs sync; TS3: caching content |
| 4.2 | D1 / D3 | TS1: API design; D3 TS2: dev endpoints / API GW stages; D3 TS3: API GW stages, IaC |
| 4.3 | D1 | TS1: creating/extending APIs (req/resp transformations, validation, status codes) |
| 4.4 | D1 / D4 | TS1: API design; D4 TS3: throttling, optimizing |
| 4.5 | D2 | TS1: identity federation, JWT/OAuth, Cognito user pools, IAM, RBAC, principle of least privilege |
| 4.6 | D2 | TS1: Cognito identity pools vs user pools, federated AWS access via STS |
| 4.7 | D4 | TS3: caching content based on request headers |
| 4.8 | D2 / D4 | D2 TS1: WAF; D4 TS3: routing policies; certificate management |

## Theory primer (read once, reference often)

### REST vs HTTP API — the table that matters

| Feature | REST API | HTTP API |
|---|:---:|:---:|
| Lambda proxy integration | ✅ | ✅ |
| Lambda non-proxy + VTL mapping | ✅ | ❌ |
| Direct AWS service integration | ✅ | ✅ (limited) |
| HTTP/HTTPS proxy integration | ✅ | ✅ |
| Mock integration | ✅ | ❌ |
| Request validation | ✅ | ❌ |
| Mapping templates (VTL) | ✅ | ❌ |
| API keys + usage plans | ✅ | ❌ |
| AWS WAF | ✅ | ❌ (use CloudFront WAF in front) |
| Resource policies | ✅ | ❌ |
| Caching | ✅ (paid) | ❌ |
| X-Ray tracing | ✅ | ❌ |
| JWT authorizer (built-in) | ❌ | ✅ |
| Lambda authorizer | ✅ | ✅ |
| Cognito User Pool authorizer | ✅ | ✅ via JWT |
| IAM authorization | ✅ | ✅ |
| Custom domain | ✅ | ✅ |
| Stage variables | ✅ | ❌ |
| Cost (per million) | ~$3.50 | ~$1.00 |

**Picking rule:** if you need usage plans, mapping templates, request validation, WAF, or caching → REST. Otherwise default to HTTP. The exam will give scenarios that fit one side or the other; the table above tells you which.

### Authorization options

| Authorizer | API type | What it validates | Where the token lives |
|---|---|---|---|
| **None** | Both | Nothing | n/a |
| **IAM** | Both | SigV4 signature | `Authorization` header (signed) |
| **Cognito User Pool authorizer** | REST | Cognito JWT | `Authorization` header |
| **JWT authorizer** | HTTP | Any OIDC JWT (incl. Cognito) | `Authorization` header |
| **Lambda authorizer (TOKEN)** | Both | Whatever your code says | `Authorization` header (or custom) |
| **Lambda authorizer (REQUEST)** | REST | Whatever your code says | Anywhere in the request |
| **API key** | REST | Identifies caller for usage tracking | `x-api-key` header — **NOT authentication** |

### Cognito User Pool vs Identity Pool — the question that will be asked

> **User Pool = "who you are."** Authentication. Returns **JWTs** (ID + access + refresh).
>
> **Identity Pool = "what AWS can you touch."** Authorization. Returns **temporary AWS credentials** (via STS) so the user can call AWS services directly.

|  | User Pool | Identity Pool |
|---|---|---|
| Output | JWT (ID, access, refresh) | AWS STS credentials |
| Use for | API auth, login flows | Direct S3/DynamoDB calls from browser/mobile |
| Federate from | Google, Facebook, Apple, SAML, OIDC | User Pool (most common), Google, Facebook, SAML, OIDC, custom |
| MFA | ✅ | n/a |
| Hosted UI | ✅ | ❌ |

**Common pattern A:** User → User Pool → JWT → API Gateway (Cognito authorizer) → Lambda. **No Identity Pool needed.**
**Common pattern B:** User → User Pool → JWT → Identity Pool → STS creds → direct S3 upload. **Identity Pool is the bridge.**

### CloudFront cache key (Module 9 covers monitoring; here we cover behavior)

Cache key = method + path + (whitelist of) query strings + (whitelist of) headers + (whitelist of) cookies. **Only what's whitelisted varies the cache.** `Cache-Control: max-age=0` from the client bypasses cache only if invalidation IAM permission is granted.

TTL precedence (most authoritative wins):
1. Origin's `Cache-Control: s-maxage=` or `Cache-Control: max-age=`
2. Origin's `Expires` header
3. Distribution's **default TTL** if no origin headers
4. Distribution's **min/max TTL** clamps the result

### Route 53 routing policies

| Policy | Use case (the exam scenario) |
|---|---|
| **Simple** | One record, one or more values, no health checks |
| **Weighted** | "Send 80% to v1, 20% to v2" — A/B, canary at DNS |
| **Latency-based** | Lowest-latency region wins per requester |
| **Failover** | Primary + secondary; secondary serves only when primary's health check fails |
| **Geolocation** | Different content by user country/continent |
| **Geoproximity** | Geolocation + bias toward a region (Traffic Flow only) |
| **Multivalue answer** | Up to 8 healthy records returned, like simple but with health checks |

### WAF rule types

| Rule | What it does |
|---|---|
| **AWS managed rule groups** | Pre-built (CommonRuleSet, KnownBadInputs, SQLiRuleSet, etc.) — the lazy "good enough" choice |
| **Rate-based rule** | Block IPs sending more than N requests in 5 minutes |
| **Geo match rule** | Block / allow specific countries |
| **IP set rule** | Allow / block specific IPs |
| **Regex / size / SQLi / XSS match rule** | Custom inspection of headers/body/URI |

WAF attaches to: CloudFront, regional API Gateway (REST only), ALB, AppSync, Cognito User Pool. **NOT HTTP API directly** — front it with CloudFront if you need WAF.

## Cleanup overview

Every lab has its own `cleanup.sh` / `cleanup.ps1`. The 🔴 lab (4.8) has the most aggressive cleanup — Route 53 hosted zones + ALB are non-trivial monthly cost.

If you ever lose track:

```bash
../../cleanup-all.sh        # Bash
```
```powershell
..\..\cleanup-all.ps1       # PowerShell
```

## Get started

[Lab 4.1 — REST vs HTTP API →](lab-01-rest-vs-http-api/README.md)
