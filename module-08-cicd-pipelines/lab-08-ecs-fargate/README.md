# Lab 8.8 — ECS Fargate (ECR + Service)

> 🔴 **NOT free tier.** Fargate task: ~$0.04/hour vCPU + $0.005/hour memory ≈ **$30/month per task** if left running. ECR: 500 MB free for 12 months, then $0.10/GB/month.
>
> **Cleanup IMMEDIATELY after testing.**

> ⚠️ **Deploy time: ~5 min** (cluster + service start).

## What you'll learn

- The full container deployment loop: **build image → push to ECR → register task definition → deploy service**
- The ECS task vs service distinction
- **Task role vs task execution role** — the most-tested ECS exam concept
- Fargate vs EC2 launch types

## Exam blueprint reference

- **D3 TS1** — *"Container images"*, *"Lambda deployment packaging"* (ECR is referenced for both)
- **D1 TS1** — *"Architectural patterns (microservices)"*

## Theory primer

### Task definition vs task vs service

- **Task definition** — the recipe: image, CPU, memory, environment, port mappings, IAM roles, networking mode. Versioned (revision number).
- **Task** — a running instance of a task definition.
- **Service** — keeps N tasks running, replaces failed ones, integrates with load balancers. (Tasks without a service: one-off jobs, like `aws ecs run-task`.)

### Task role vs task execution role (exam loves this)

- **Task execution role** — used by ECS itself (the "agent") to do things on behalf of the task: pull image from ECR, write logs to CloudWatch, fetch Secrets Manager / SSM values for env vars
- **Task role** — used by the **container code at runtime** when it makes AWS API calls (call DynamoDB, write to S3, etc.)

If your container can't pull its image: **execution role** is the problem. If your container code can't reach S3: **task role** is the problem.

### Fargate vs EC2 launch types

| | **Fargate** | **EC2** |
|---|---|---|
| Compute | AWS-managed | You manage EC2 instances + ECS agent |
| Pricing | Per task (vCPU + memory + ephemeral storage above 20 GB) | Per EC2 instance |
| Network | `awsvpc` mode required | `awsvpc` / `bridge` / `host` / `none` |
| Right for | Serverless containers, variable load | High-throughput steady-state, GPU workloads, customizations |

### Network modes

- **`awsvpc`** (Fargate; preferred for EC2) — each task gets its own ENI + IP. Like a tiny VM.
- **`bridge`** (EC2 only) — Docker bridge. Tasks share host network. Port collisions.
- **`host`** (EC2 only) — task uses host network. No port mapping.
- **`none`** — no networking.

### ECR essentials

- **Private repository** by default. Cross-account access via repo policy.
- **Public repositories** also exist (`public.ecr.aws/...`).
- **Image scanning** (basic = ECR; enhanced = Inspector) catches vulnerabilities.
- **Lifecycle policies** auto-delete old images.
- **Image immutability** can be enforced (no overwriting tags).

## Architecture

```
   docker push          ──► ECR private repo: dva-lab-08-08
                              │
   register task def    ──┼──► ECS task definition (Fargate)
                              │
   create service       ──► ECS service (1 task) ── runs in awsvpc subnet
                              │
   public IP via ENI    ──► curl :80
```

## Prerequisites

- Default VPC + 2 subnets (we'll look them up)
- Docker installed (only for Step 2; can skip if you push from CodeBuild instead)

## Step 1: Deploy infra

```
# Look up VPC + subnets
DEFAULT_VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
SUBNETS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$DEFAULT_VPC Name=default-for-az,Values=true --query 'Subnets[*].SubnetId' --output text | tr '[:space:]' ',' | sed 's/,$//')

aws cloudformation deploy --template-file template.yaml \
  --stack-name dva-lab-08-08-ecs-fargate \
  --parameter-overrides VpcId=$DEFAULT_VPC SubnetIds=$SUBNETS \
  --capabilities CAPABILITY_IAM
```

## Step 2: Push an image to ECR

The lab uses `public.ecr.aws/nginx/nginx` by default — no Docker push required for the basic flow. To push your own image:

```
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REPO=$(aws cloudformation describe-stacks --stack-name dva-lab-08-08-ecs-fargate --query "Stacks[0].Outputs[?OutputKey=='RepoUri'].OutputValue" --output text)

# Authenticate Docker to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin "$REPO"

# Build & push
echo 'FROM public.ecr.aws/nginx/nginx:latest
RUN echo "<h1>Hello from custom image</h1>" > /usr/share/nginx/html/index.html' > Dockerfile

docker build -t dva-lab-08-08:latest .
docker tag dva-lab-08-08:latest "$REPO:latest"
docker push "$REPO:latest"
```

After push, the deployed service still uses the public nginx image. To use the new image, register a new task definition and update the service — covered in CodeDeploy ECS (Lab 8.5).

## Step 3: Reach the service

```
SVC_IP=$(aws ecs list-tasks --cluster dva-lab-08-08-cluster --service-name dva-lab-08-08-svc --query 'taskArns[0]' --output text)
ENI=$(aws ecs describe-tasks --cluster dva-lab-08-08-cluster --tasks "$SVC_IP" --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)
PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids "$ENI" --query "NetworkInterfaces[0].Association.PublicIp" --output text)

curl "http://$PUBLIC_IP"
```

You'll see the default nginx page.

## Exam gotchas

- **Task execution role** vs **task role** — the most-tested distinction.
- **`awsvpc` is required for Fargate.** Each task gets a private IP on a subnet. Public IPs require `AssignPublicIp: ENABLED` in the network config (and a public subnet).
- **ECR repository must exist before push.** Create with `aws ecr create-repository` or via CFN.
- **`get-login-password` returns a token; Docker uses it to log in.** Token is valid for 12 hours.
- **Image tag conventions**: tag with both `latest` and a versioned tag (`v1.2.3`) — never deploy from `latest` alone.
- **Image immutability** prevents overwrites; combined with lifecycle policies, gives proper artifact hygiene.
- **AWS Copilot CLI** is a higher-level tool that wraps ECS + CodePipeline + Secrets Manager + Service Discovery — out of detailed scope but mentioned on the exam.

## Cleanup

> 🔴 **Do this NOW.** Fargate is dollar-an-hour territory.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🧹 **Run cleanup before Lab 8.9.**

Continue: [Lab 8.9 — Beanstalk + Amplify](../lab-09-beanstalk-and-amplify/README.md)
