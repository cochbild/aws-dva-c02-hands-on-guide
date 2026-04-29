# Module 10: Capstone — End-to-End Serverless Application

> 🟡 **Pennies — but multiple chargeable resources.** Lambda + DynamoDB on-demand + EventBridge + SNS are free-tier. **One KMS key (~$1/month) and one Secrets Manager secret (~$0.40/month)** linger until cleanup deletion windows close. Run cleanup as soon as you finish testing.

> ⚠️ **Deploy time: ~5 min.** No EC2 / NAT / ALB — all serverless.

The exam tests you on individual concepts; the real world tests whether you can wire them together. This capstone is a single, deployable application that exercises every major topic from Modules 1–9.

## Quickstart

```
# 1. Package + deploy
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-$ACCOUNT-$AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

pip install -r src/requirements.txt -t src/

aws cloudformation package --template-file template.yaml --s3-bucket "$ARTIFACTS_BUCKET" --output-template-file packaged.yaml
aws cloudformation deploy --template-file packaged.yaml --stack-name dva-lab-10-01-capstone --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND

# 2. Run the end-to-end test
./scripts/test-flow.sh                # Bash
.\scripts\test-flow.ps1               # PowerShell

# 3. Cleanup
./cleanup.sh                          # Bash
.\cleanup.ps1                         # PowerShell
```

## What you'll build

**An order-processing system** for a fictional pizza shop:

1. **Frontend** (out of scope for this lab; we'll provide a curl-based test harness) submits an order
2. **API Gateway (HTTP API)** — endpoint backed by Cognito JWT auth
3. **`CreateOrder` Lambda** — validates, writes to DynamoDB, publishes to EventBridge
4. **EventBridge custom bus** — routes `OrderCreated` events
5. **`ChargeCustomer` Lambda** — async, fetches Stripe key from Secrets Manager (mock), updates order status
6. **`SendConfirmation` Lambda** — async via SNS, emails customer (mock SES)
7. **DynamoDB** with stream → **`AuditLog` Lambda** writes audit trail
8. **Step Functions Express workflow** — orchestrates the order pipeline (replaces direct EventBridge fanout for the "premium" tier)
9. **CloudWatch dashboard** — orders/min, latency, error rate
10. **X-Ray tracing** end-to-end
11. **CodePipeline** — GitHub source → CodeBuild test → SAM deploy → manual approval → prod

## Architecture diagram (textual)

```
                           Cognito User Pool
                                 |
                                 | JWT
                                 v
[Client] -----> [API Gateway HTTP API] ------> [CreateOrder Lambda]
                                                       |
                                                       v
                                            [DynamoDB Orders Table]
                                                       |
                                                       | (stream)
                                                       v
                                            [AuditLog Lambda] ---> [S3 archive]
                                                       
                                            [EventBridge custom bus]
                                                       |
                              ┌────────────────────────┼────────────────────────┐
                              v                        v                        v
                  [ChargeCustomer Lambda]   [SendConfirmation via SNS]   [Step Functions Express]
                              |                        |                  (premium-tier orchestration)
                              v                        v                        |
                       [Update Order]           [Email customer]        ┌────────┴────────┐
                                                                        v                  v
                                                              [Inventory check]   [Loyalty points]
```

## What this capstone exercises (topic checklist)

| Module 1 (Lambda) | ✓ async invokes, ESM (DDB streams), versions/aliases, layers |
| Module 2 (DynamoDB) | ✓ composite keys, transactions for atomicity, streams |
| Module 3 (S3) | ✓ archive bucket, presigned URLs for receipt downloads |
| Module 4 (API GW + Cognito) | ✓ HTTP API + JWT authorizer, stages |
| Module 5 (Messaging + Events) | ✓ EventBridge custom bus, SNS for fanout, SQS DLQ |
| Module 6 (Step Functions) | ✓ Express workflow with parallel branches |
| Module 7 (Secrets/Config) | ✓ Secrets Manager for "Stripe key", AppConfig for premium-tier flag |
| Module 8 (CI/CD) | ✓ Full pipeline GitHub → build → deploy → approval |
| Module 9 (Observability) | ✓ X-Ray traces, EMF metrics, CW dashboard, alarms |

## Lab plan (8 stages, ~3-4 hours total)

| Stage | What you build |
|---|---|
| 10.1 | Cognito User Pool, sign up a test user, get a JWT |
| 10.2 | DynamoDB Orders table, CreateOrder Lambda, API Gateway with JWT auth — end-to-end "create order" working |
| 10.3 | EventBridge custom bus + ChargeCustomer Lambda subscriber |
| 10.4 | SNS fanout for SendConfirmation; DDB Streams → AuditLog Lambda |
| 10.5 | Step Functions Express for premium tier (with AppConfig flag) |
| 10.6 | Add X-Ray tracing end-to-end |
| 10.7 | CloudWatch dashboard + alarms |
| 10.8 | CodePipeline wiring it all together |

## Operational expectations

- **Idempotent** — submitting the same order twice doesn't double-charge (use DynamoDB conditional writes from Module 2.4)
- **Resilient** — every async path has a DLQ
- **Observable** — every Lambda emits structured logs and EMF metrics
- **Secure** — secrets in Secrets Manager, JWT auth at the edge, IAM least-privilege per function
- **Deployable** — one `sam deploy` (or one `cdk deploy`) brings up the whole stack

## What "done" looks like

You can:
1. Hit the API endpoint with a JWT, submit an order, and watch it propagate through the system in CloudWatch Logs Insights
2. Drop into the X-Ray service map and see the full request graph including DynamoDB write and EventBridge publish as subsegments
3. Open the dashboard and see real-time order metrics
4. Push a code change to GitHub and watch the pipeline deploy it through to production after manual approval
5. Tear it all down with one `cleanup.sh`

## Why a capstone?

Individual labs are quick wins, but the exam scenario questions read like "your team is building X with components Y and Z; the system needs to handle failure mode F and scale property S — which combination of services is correct?" Your edge on those questions comes from having actually built something where you had to make those trade-offs yourself.

After finishing this capstone, you should be able to draw the architecture diagram from memory and explain why each AWS service is in it.

## Practice tip

When you're done with the implementation, try modifying the design:
- "What if confirmation emails need to be guaranteed delivered even if SES is down for an hour?" → add SQS between EventBridge and the SES Lambda
- "What if the auth layer needs to support social login?" → add Google/Facebook IdP to the User Pool
- "What if we need to support 10,000 orders/sec at peak?" → switch DynamoDB to provisioned + auto-scaling, increase Lambda reserved concurrency, add SQS buffer

These are the discussions that come up in exam scenarios. Practicing them on a system you built grounds the answers.

## Final exam-prep checklist

After this capstone, you should know without looking up:

- [ ] Lambda reserved vs provisioned concurrency, and what reserved=0 does
- [ ] Versions vs aliases and how AutoPublishAlias works
- [ ] DynamoDB LSI vs GSI and which supports strong consistency
- [ ] DynamoDB transactions cost and limits (100 items, 4 MB, 2x cost)
- [ ] S3 multipart upload size limits (5 MB part minimum, 5 GB max, 10,000 parts)
- [ ] Presigned URL max duration (7 days for IAM, session length for STS)
- [ ] SQS visibility timeout 6x function timeout rule
- [ ] Cognito User Pool vs Identity Pool
- [ ] Step Functions Standard vs Express (1 year vs 5 min, at-most-once vs at-least-once)
- [ ] CodeDeploy hooks per platform (Lambda 2, ECS 5, EC2 5)
- [ ] X-Ray annotations indexed, metadata not
- [ ] EMF preferred over PutMetricData

If any of these aren't instant recall, revisit the relevant module.

Good luck on the exam.
