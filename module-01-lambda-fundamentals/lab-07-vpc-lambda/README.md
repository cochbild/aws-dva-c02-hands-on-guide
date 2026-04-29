# Lab 1.7 — VPC Lambda

> 🟢 **Free tier** — Uses an S3 gateway VPC endpoint (free) instead of a NAT Gateway. No internet egress = no per-hour charges. (The bucket and Lambda are also free-tier.)

**Goal:** Connect a Lambda to a VPC, see the Hyperplane ENI architecture, and access a private resource (we'll use a private S3 bucket via VPC endpoint to keep cost down).

## Concepts

### Why put a Lambda in a VPC?

Default Lambdas run in an AWS-managed VPC. They can reach the public internet but **cannot** reach resources in your VPC (RDS, ElastiCache, EC2 with private IPs).

When you configure a function for VPC access, Lambda creates ENIs (Elastic Network Interfaces) in the subnets you specify, and the function's outbound traffic flows through those ENIs.

### Hyperplane ENIs (the modern architecture)

**Pre-2019:** every cold start created a new ENI. ENI creation took 10–20 seconds. Cold starts in VPC were brutal.

**Post-2019:** Lambda creates a small pool of **Hyperplane ENIs** when you first attach the function to a VPC. These are shared across many concurrent executions. Cold start penalty for VPC is now ~zero.

**Exam keyword:** "Hyperplane ENI" or "no significant cold-start penalty for VPC Lambda" — both mean the same thing.

### What VPC config requires

- One or more **subnets** (multiple AZs for HA)
- One or more **security groups**
- IAM permission `ec2:CreateNetworkInterface`, `ec2:DescribeNetworkInterfaces`, `ec2:DeleteNetworkInterface` (the AWS-managed `AWSLambdaVPCAccessExecutionRole` policy contains all of these)

### Internet access from a VPC Lambda

A VPC Lambda **does not** have internet access by default. To call public AWS APIs (DynamoDB, SQS, KMS, …) or external HTTPS endpoints, you need:

- A **NAT gateway** in a public subnet (Lambda must be in a private subnet that routes 0.0.0.0/0 to the NAT) — 🔴 ~$0.045/hr
- OR **VPC endpoints** for the specific AWS services (cheaper, no internet egress) — what this lab uses

**Exam pattern:** if a question describes a Lambda in a VPC that "cannot reach DynamoDB", the answer is almost always "add a Gateway VPC endpoint for DynamoDB" or "add NAT gateway access".

### Gateway endpoints vs Interface endpoints

| Type | Services | Cost | How it works |
|---|---|---|---|
| **Gateway** | S3, DynamoDB only | **Free** | Route table entry pointing to the endpoint |
| **Interface** | Most other AWS services | $0.01/hr per AZ + data | ENI in your subnet with a private IP |

For S3 and DynamoDB, **always prefer the gateway endpoint** unless you need cross-VPC access. For everything else (SQS, SNS, KMS, Secrets Manager, …) you need an interface endpoint.

## Steps

### 1. Deploy

**PowerShell or Bash:**

```
sam build
sam deploy --guided --stack-name dva-lab-01-07-vpc-lambda
```

This creates a minimal VPC, two private subnets, an S3 gateway VPC endpoint, an S3 bucket, and a Lambda configured to run in the VPC.

### 2. Inspect the ENIs

**PowerShell:**

```powershell
$STACK = "dva-lab-01-07-vpc-lambda"
$SG = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='LambdaSecurityGroupId'].OutputValue" --output text

aws ec2 describe-network-interfaces `
  --filters "Name=group-id,Values=$SG" `
  --query 'NetworkInterfaces[].{Id:NetworkInterfaceId,Description:Description,Status:Status}'
```

**Bash:**

```bash
STACK="dva-lab-01-07-vpc-lambda"
SG=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`LambdaSecurityGroupId`].OutputValue' --output text)

aws ec2 describe-network-interfaces \
  --filters "Name=group-id,Values=$SG" \
  --query 'NetworkInterfaces[].{Id:NetworkInterfaceId,Description:Description,Status:Status}'
```

You'll see ENIs with descriptions like `AWS Lambda VPC ENI-...`. These are the Hyperplane ENIs.

### 3. Test S3 access through the gateway endpoint

**PowerShell:**

```powershell
$FN = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text

aws lambda invoke --function-name $FN --payload '{}' --cli-binary-format raw-in-base64-out r.json
Get-Content r.json
```

**Bash:**

```bash
FN=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`FunctionName`].OutputValue' --output text)

aws lambda invoke --function-name "$FN" \
  --payload '{}' --cli-binary-format raw-in-base64-out /tmp/r.json
cat /tmp/r.json
```

The function lists objects in the bucket — and it does it through the VPC endpoint, with no internet access required.

### 4. Verify no public internet

The function tries to reach `https://api.github.com` and fails (no NAT, no internet endpoint). Look at the response — it'll have an error showing the timeout.

### 5. Look at the routes

**PowerShell:**

```powershell
$ROUTE_TABLE = aws cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='RouteTableId'].OutputValue" --output text
aws ec2 describe-route-tables --route-table-ids $ROUTE_TABLE --query 'RouteTables[0].Routes'
```

**Bash:**

```bash
ROUTE_TABLE=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`RouteTableId`].OutputValue' --output text)

aws ec2 describe-route-tables --route-table-ids "$ROUTE_TABLE" \
  --query 'RouteTables[0].Routes'
```

You'll see a route to the S3 prefix list ID via the VPC endpoint. That's the gateway endpoint mechanism.

## Exam gotchas

- **Cold start in VPC is essentially the same as non-VPC** thanks to Hyperplane ENIs. Old exam dumps may say otherwise — they're outdated.
- **Subnets must have available IPs.** Hyperplane ENIs consume IPs from your subnets. A `/28` subnet (16 IPs total, 11 usable) can run out fast under high concurrency.
- **VPC Lambda + internet:** you cannot give a Lambda a public IP directly. The function is always in private subnets. Internet egress requires NAT gateway (private subnet) or a public subnet with IGW *plus* a workaround that's rarely correct.
- **DNS resolution must be enabled in the VPC.** `enableDnsSupport` and `enableDnsHostnames` should both be `true`. Otherwise the Lambda can't resolve AWS service endpoints.
- **For RDS access:** put the Lambda in the same VPC, configure SG to allow port 5432 (Postgres) / 3306 (MySQL) inbound from the Lambda's SG. **Use RDS Proxy** for high-concurrency Lambdas to avoid exhausting DB connections — connection pooling is a known Lambda pain point.
- **For ElastiCache access:** same VPC + SG rules. ElastiCache has no public endpoint, so VPC is mandatory.
- **`AWSLambdaVPCAccessExecutionRole` managed policy** is the one to attach for VPC functions.
- **Security group rules:** Lambda's SG controls *outbound* traffic from the function. The target's SG must allow *inbound* from the Lambda's SG.

## Cleanup

**PowerShell:**

```powershell
.\cleanup.ps1
```

**Bash:**

```bash
./cleanup.sh
```

> The VPC stack takes ~5 minutes to delete due to ENI cleanup.

## What's next

> 🧹 **Run cleanup before the next module** — Module 2 (DynamoDB) deploys fresh tables.

Module 1 done! On to [Module 2 — DynamoDB Deep Dive](../../module-02-dynamodb-deep-dive/README.md).
