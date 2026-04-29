# Lab 4.8 — Route 53 + WAF

> 🔴 **Costs real money.**
> - Route 53 public hosted zone: **$0.50/month** flat
> - Route 53 queries: $0.40 per million (negligible at lab volume)
> - WAF Web ACL: **$5/month** + $1 per rule + $0.60 per million requests
> - **Total ≈ $5.50–$6.50/month while running.** Run cleanup as soon as you finish.

## What you'll learn

- The seven Route 53 routing policies and which production scenario each one solves
- How AWS WAF web ACLs attach to API Gateway, ALB, and CloudFront — and which **scope** each requires (REGIONAL vs CLOUDFRONT)
- How to wire a **rate-based rule** (the most common WAF rule on the exam) and an AWS **managed rule group**
- Why this lab uses a placeholder zone name — and what would change if you used a real domain you own

## Exam blueprint reference

- **D2 TS1** — *"IAM"* (resource policies on API Gateway pair with WAF ACLs)
- **D4 TS3** — *"Caching"*, *"Profiling application performance"* (rate-limiting is performance protection)

## Theory primer

### Route 53 routing policies

| Policy | When |
|---|---|
| **Simple** | One target, no routing logic. Just an A/AAAA/CNAME record. |
| **Weighted** | Send X% to target A, Y% to target B. Used for **canary** at the DNS level. |
| **Latency** | Send each request to the AWS region with lowest latency from the resolver. |
| **Failover** | Primary + secondary. Health checks decide. The classic **active-passive HA** pattern. |
| **Geolocation** | Different answers based on the resolver's continent/country/state. |
| **Geoproximity** | Like geolocation but with a **bias** toward shifting more or less traffic to specific regions. (Requires Traffic Flow.) |
| **Multi-value answer** | Up to 8 healthy resource records returned per query. Like simple but with health-checked answers. |

### WAF web ACL scopes

| Scope | Where it attaches |
|---|---|
| **REGIONAL** | API Gateway REST API, ALB, AppSync, Cognito User Pool |
| **CLOUDFRONT** | CloudFront distributions |

A web ACL of one scope **cannot** attach to the other. The exam likes "we have a CloudFront distribution and we want to add WAF — which web ACL scope?" Answer: CLOUDFRONT.

> **HTTP API doesn't support WAF directly.** Use CloudFront in front of HTTP API and attach WAF to the CloudFront distribution instead.

### WAF rule types

| Type | Use case |
|---|---|
| **Managed rule group** (AWS or AWS Marketplace) | Pre-built rules: AWSManagedRulesCommonRuleSet (OWASP top 10), AnonymousIpList, KnownBadInputs, etc. |
| **Rate-based** | Limit requests per IP per 5-minute window. Default 2000/5min, range 100–20M. |
| **Regex** | Match strings or patterns in URI / body / headers. |
| **IP set** | Allow-list or block-list specific IPs / CIDRs. |
| **Geo match** | Allow-list or block-list specific countries. |
| **Custom** | Combine the above with logical operators. |

### Default action

Each web ACL has a **default action** — Allow or Block. The rules **override** the default. Production: most ACLs are Allow + a list of Block rules (block bad bots, rate-limit abusers, …). Some are Block + a list of Allow rules ("allow only my known partners").

## Architecture

```
                                  ┌────────────────────────────┐
   client ──► (Route 53 public ──►│  REST API Gateway          │
              hosted zone for     │  /hello                    │
              dva-lab.example —   │                            │
              not delegated to    │  Web ACL attached:         │
              real registrar)     │  - AWS Common rules        │
                                  │  - rate-limit 100/5min     │
                                  └────────────────────────────┘
```

> **About the placeholder zone:** Route 53 creates a public hosted zone for any domain string. Without delegation from a real registrar, no internet resolver returns these records. We create the zone to demonstrate the routing-policy record types (you'll see them in `list-resource-record-sets`), and we apply WAF directly to the API Gateway so you can test the rate-limit rule via the API GW URL.
>
> If you own a real domain, set the `DomainName` parameter to that domain and delegate the NS records from your registrar. Then the Route 53 records resolve publicly.

## Step 1: Deploy

### PowerShell or Bash

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-04-08-route53-waf --parameter-overrides DomainName=dva-lab.example --capabilities CAPABILITY_IAM
```

## Step 2: Inspect the Route 53 records

The template creates 4 record sets to demonstrate routing policies:
1. `simple.dva-lab.example` — A record, simple policy
2. `weighted.dva-lab.example` — A record, weighted policy (90/10 split)
3. `failover.dva-lab.example` — A record, failover policy (primary + secondary)
4. `geo.dva-lab.example` — A record, geolocation policy (US vs default)

### PowerShell or Bash

```
ZONE_ID=$(aws cloudformation describe-stacks --stack-name dva-lab-04-08-route53-waf --query "Stacks[0].Outputs[?OutputKey=='HostedZoneId'].OutputValue" --output text)

aws route53 list-resource-record-sets --hosted-zone-id "$ZONE_ID" \
  --query "ResourceRecordSets[?contains(Name, 'dva-lab.example')]" \
  --output table
```

You'll see each record's `Type`, `SetIdentifier`, and policy-specific fields like `Weight`, `Failover`, `GeoLocation`.

## Step 3: Test WAF — normal request

The web ACL allows traffic by default and includes one **rate-based rule** at 100 requests per 5 minutes per IP. Hit the API a few times normally:

### PowerShell

```powershell
$ApiUrl = aws cloudformation describe-stacks --stack-name dva-lab-04-08-route53-waf --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text

# Single normal request — should succeed
curl.exe -i "$ApiUrl/hello"
```

### Bash

```bash
API_URL=$(aws cloudformation describe-stacks --stack-name dva-lab-04-08-route53-waf --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)

# Should succeed
curl -i "$API_URL/hello"
```

## Step 4: Test WAF — trigger the rate-based block

Spam ~120 requests in <5 minutes from your IP. Around request ~100 you'll start seeing **HTTP 403** with body `Forbidden`. That's WAF, not API Gateway.

### PowerShell

```powershell
1..120 | ForEach-Object {
  $code = curl.exe -s -o $null -w "%{http_code}" "$ApiUrl/hello"
  Write-Host "$_`: $code"
}
```

### Bash

```bash
for i in $(seq 1 120); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/hello")
  echo "$i: $code"
done
```

You should see `200` for the first ~100 requests, then `403` from request ~100 onward as WAF rate-limits your IP.

> **Wait ~5 minutes** for the rate window to slide and your IP to be unblocked.

## Step 5: Inspect the WAF metrics

Each web ACL emits CloudWatch metrics:

```
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=dva-lab-04-08-acl Name=Region,Value=$AWS_DEFAULT_REGION Name=Rule,Value=ALL \
  --start-time $(date -u -d '15 minutes ago' '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -u -v-15M '+%Y-%m-%dT%H:%M:%S') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%S') \
  --period 60 \
  --statistics Sum
```

You'll see how many requests WAF blocked and which rule matched.

## Step 6: Compare — what changes for CloudFront WAF?

The web ACL in this template is `Scope: REGIONAL`. To attach to a CloudFront distribution instead, you'd:
1. Change `Scope: CLOUDFRONT`
2. Deploy in **us-east-1** (CloudFront's WAF home region — required regardless of where your distribution is)
3. Use `WebACLId` reference on the distribution (lab 4.7 didn't have WAF; you could add it)

This is the most common Route-53/WAF gotcha on the exam: "I have a CloudFront distribution in eu-west-1, why won't my WAF attach?" Because the WAF for CloudFront must live in us-east-1.

## Exam gotchas

- **Route 53 routing policies (memorize the 7).** Especially: weighted (canary), latency (closest region), failover (active-passive HA), geolocation (per-country answers).
- **A Route 53 alias record can point to AWS resources without an A/AAAA IP.** It's a Route-53-specific record type, NOT a CNAME. Aliases work at the apex of a domain (CNAMEs cannot).
- **Health checks** can be HTTP/HTTPS or TCP. Used by Failover and Multi-value-answer routing. Cost: $0.50/health-check-month + endpoint charges.
- **WAF scopes:** REGIONAL for API GW REST / ALB / AppSync / Cognito User Pool. CLOUDFRONT for CloudFront. **CloudFront WAF must be deployed in us-east-1.**
- **HTTP API doesn't support WAF directly.** Use CloudFront in front + attach WAF there.
- **Rate-based rule window is fixed at 5 minutes.** Limit field is requests-per-IP-per-5-minutes.
- **Default action vs rule actions:** rules override the default. A web ACL with default Allow + one Block rule is the common shape.
- **AWS Shield (Standard) is automatic and free** — DDoS protection at L3/L4. **AWS Shield Advanced is $3000/month** for L7 DDoS + dedicated SOC + cost protection. Out of DVA-C02 scope but knowing Standard exists is worth it.
- **Custom domain on API Gateway** uses ACM certificates: regional API → cert in same region; edge-optimized API → cert in **us-east-1** (CloudFront's region).
- **Certificate Manager (ACM)** issues free public certs that auto-renew. **Cannot** be exported. **ACM Private CA** is $400/month + per-cert charges — issues exportable private certs (out of scope here, demoed in Module 7).

## Cleanup

> 🔴 **Do this NOW.** Route 53 + WAF accrue ~$5.50/month while running.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

The cleanup deletes the WAF web ACL association first, then the ACL, then deletes the stack (which removes the hosted zone + records).

## What's next

> 🎉 **Module 4 complete!** You've built and broken every API Gateway / Cognito / Edge feature on the exam.

Continue: [Module 5 — Messaging & Events](../../module-05-messaging-events/README.md)
