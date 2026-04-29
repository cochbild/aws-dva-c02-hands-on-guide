# Lab 7.6 — ACM and ACM-PCA

> 🟢 **Free** — ACM public certificates and imported certificates are free. **ACM Private CA is $400/month** (yes, four hundred) — we DO NOT deploy one in this lab.

## What you'll learn

- How **ACM** issues, manages, and renews **free public TLS certificates** for AWS resources (CloudFront, ALB, API Gateway)
- The **DNS validation** flow (and why email validation exists but is mostly avoided)
- How to **import** an externally-issued certificate into ACM
- Why **ACM Private CA** exists, what it costs, and when to use it (without actually deploying one)

## Exam blueprint reference

- **D2 TS2 — Knowledge of:**
  - *"Encryption at rest and in transit"*
  - *"Certificate management (AWS Certificate Manager Private Certificate Authority)"*

## Theory primer

### What ACM does

| Capability | ACM (public) | ACM (imported) | ACM Private CA |
|---|---|---|---|
| Cost | Free | Free | **$400/month per CA + $0.75/cert** |
| Auto-renewal | Yes (handled by AWS) | No (you bring your own renewal) | Configurable |
| Validation | DNS or Email | None (you provide cert + key) | Issued by your CA |
| Exportable | **No** | No | **Yes** |
| Use with | CloudFront, ALB/NLB, API Gateway, App Runner, etc. | Same | Internal services, certificate-based auth |
| Public-trust | Yes (DigiCert / Amazon Trust Services) | Whatever the original CA provides | Private (your CA only) |

### DNS vs Email validation

When you request an ACM public cert, AWS needs to verify you own the domain.

- **DNS validation** — ACM gives you a CNAME record like `_abc123.example.com → _xyz.acm-validations.aws`. You add it to your DNS. ACM polls every 60s; once it sees the record, the cert is issued. **Auto-renews** — ACM keeps polling, if the record is still there, it renews the cert before expiry.
- **Email validation** — ACM emails 3 generic addresses (admin@, administrator@, hostmaster@) plus the WHOIS contact. The recipient clicks a link. Doesn't auto-renew (you have to click again every year).

DNS is the production answer. Email is legacy / demo-only.

### Imported certificates

Got a cert from another CA you trust? Import:
- Provide the cert PEM, the private key PEM, and (optional) the intermediate cert chain
- ACM stores them and lets AWS resources use them like an issued cert
- **No auto-renewal** — you must re-import before expiry

### Why ACM Private CA

If you need:
- Certificates for internal services that don't need to be publicly trusted (microservice-to-microservice TLS, mTLS auth between Lambdas, IoT device identity)
- A consistent certificate root managed by AWS (vs running OpenSSL CA yourself)

ACM PCA gives you a private root and intermediate CAs. **Heavy compliance use case** — the $400/month is steep.

For DVA-C02, knowing PCA exists, what it does, and the cost is enough.

### Where ACM certs attach

Certificates aren't standalone — they attach to:
- **CloudFront** distributions (cert must be in `us-east-1`)
- **API Gateway** REST or HTTP APIs (regional or edge — edge cert in `us-east-1`)
- **Application/Network Load Balancers** (cert in same region as ALB/NLB)
- **App Runner**, **VPN**, **Elastic Beanstalk** environments

You can't use an ACM cert directly on EC2 (no API to give you the private key — ACM doesn't export it). For EC2, use ACM Private CA + export, or import your own cert.

## Step 1: Deploy

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-07-06-acm --capabilities CAPABILITY_IAM
```

The stack creates an ACM **request** for `dva-lab-07-06.example.com`. Without DNS delegation it won't validate — that's expected. The cert sits in `PENDING_VALIDATION`. We'll demonstrate the request shape, not full issuance.

## Step 2: Inspect the cert request

### PowerShell

```powershell
$Arn = aws cloudformation describe-stacks --stack-name dva-lab-07-06-acm --query "Stacks[0].Outputs[?OutputKey=='CertArn'].OutputValue" --output text
aws acm describe-certificate --certificate-arn $Arn
```

### Bash

```bash
ARN=$(aws cloudformation describe-stacks --stack-name dva-lab-07-06-acm --query "Stacks[0].Outputs[?OutputKey=='CertArn'].OutputValue" --output text)
aws acm describe-certificate --certificate-arn "$ARN"
```

You'll see:
- `Status: PENDING_VALIDATION`
- `DomainValidationOptions[*].ResourceRecord` — the CNAME record you'd add to DNS
- `Type: AMAZON_ISSUED`
- `KeyAlgorithm: RSA_2048`

If you owned the domain and added that CNAME, ACM would auto-validate within ~5 min and the status would flip to `ISSUED`.

## Step 3: Compare — import a self-signed certificate

In production: never import self-signed. For learning, this proves the import flow works:

### Bash

```bash
# Generate a self-signed cert + private key locally
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 30 -nodes \
  -subj "/CN=dva-lab.example/O=DVA Lab/C=US"

# Import into ACM
IMPORT_ARN=$(aws acm import-certificate \
  --certificate fileb://cert.pem \
  --private-key fileb://key.pem \
  --query CertificateArn --output text)

echo "Imported: $IMPORT_ARN"
aws acm describe-certificate --certificate-arn "$IMPORT_ARN" --query "Certificate.[Type,Status,NotAfter]"
```

### PowerShell

```powershell
# Generate self-signed cert with OpenSSL (install via choco/winget if needed) or use New-SelfSignedCertificate + export
# Easiest cross-platform path — use openssl in WSL or Git Bash, then import

# After cert.pem and key.pem exist:
$ImportArn = aws acm import-certificate `
  --certificate fileb://cert.pem `
  --private-key fileb://key.pem `
  --query CertificateArn --output text

aws acm describe-certificate --certificate-arn $ImportArn --query "Certificate.[Type,Status,NotAfter]"
```

Note `Type: IMPORTED` and `Status: ISSUED` immediately — no validation needed because you provided the private key.

To clean it up:
```
aws acm delete-certificate --certificate-arn "$IMPORT_ARN"
```

## Step 4: Compare — list certs

```
aws acm list-certificates --query "CertificateSummaryList[].{Arn:CertificateArn,Domain:DomainName,Type:Type,Status:Status}"
```

You'll see both: the pending public cert and (optionally) the imported one.

## Exam gotchas

- **ACM public certs are FREE and auto-renew.** The exam may ask "cheapest TLS for an ALB" — ACM public.
- **CloudFront certs MUST live in `us-east-1`**, regardless of where the distribution serves traffic from. Common gotcha — deploying CloudFront in `eu-west-1` and trying to attach a cert from `eu-west-1` will fail.
- **API Gateway edge-optimized certs** also live in `us-east-1` (they're CloudFront under the hood). Regional API Gateway certs live in the API's region.
- **ACM cert auto-renewal requires DNS validation to remain valid** — i.e., the original CNAME must still be present in DNS. ACM tries to re-validate ~60 days before expiry.
- **You can't export a public ACM cert.** You can't use it outside AWS resources. For exportable certs: import your own, or use ACM Private CA.
- **ACM Private CA cost: $400/month per CA**, plus per-cert charges. Used only when you specifically need an internal certificate hierarchy.
- **Imported certs don't auto-renew.** You're responsible for re-importing before expiry.
- **`*` wildcard certs** are supported for one level: `*.example.com` covers `a.example.com` and `b.example.com` but NOT `a.b.example.com`. For SANs (multiple unrelated domains), list each in `SubjectAlternativeNames`.
- **EFS, EC2, ECS task definition env vars** — ACM doesn't export, so for these use Secrets Manager / Parameter Store + your own pem.

## Cleanup

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

The cleanup script deletes any imported certificates AND removes the CloudFormation stack (which removes the requested public cert).

## What's next

> 🎉 **Module 7 complete!** You've covered every secrets/config/encryption service the DVA-C02 exam tests: Secrets Manager (with rotation), Parameter Store (3 types + tiers + hierarchies), AppConfig (gradual rollout), KMS (envelope + key policies + grants), and ACM (public + imported, plus PCA awareness).

Continue: [Module 8 — CI/CD, Containers & Deployment](../../module-08-cicd-pipelines/README.md)
