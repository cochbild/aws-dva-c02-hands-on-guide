# Lab 8.9 — Elastic Beanstalk + Amplify Hosting

> 🔴 **Beanstalk: NOT free tier (after 12 months).** Single-instance environment uses one t3.micro EC2 (free for first 12 months, then $7.50/month). 🟢 **Amplify hosting**: 1000 build min/month + 5 GB storage + 15 GB egress/month free for first 12 months.

> ⚠️ **Beanstalk deploy time: ~6–8 minutes.**

## What you'll learn

- Elastic Beanstalk's **PaaS abstraction** — environment, application version, platform, deployment policy
- The five Beanstalk **deployment policies** — All at once, Rolling, Rolling with additional batch, Immutable, Blue/Green via swap-URL
- AWS Amplify Hosting — Git-driven static site / SPA hosting (vs full-stack Amplify with backend)
- When to choose Beanstalk vs ECS vs Lambda for "I just want to run my app"

## Exam blueprint reference

- **D3 TS4** — *"Application deployment that uses AWS services and tools (CloudFormation, CDK, SAM, CodeArtifact, Copilot, Amplify, Lambda)"*

## Theory primer

### Beanstalk in 60 seconds

Give Beanstalk:
- Source code (zip, jar, war, Docker image, or Dockerfile)
- A **platform** (Python 3.12 on Amazon Linux 2023, Java 17, Node.js 20, .NET 8, PHP 8.2, Ruby 3.2, Go, Docker)
- An **environment** (web server tier OR worker tier)

Beanstalk creates: EC2 instances, ELB (if multi-instance), Auto Scaling Group, security groups, CloudWatch alarms, S3 versions store. It deploys your app on the instances.

You upload **application versions**; Beanstalk swaps them in via the chosen deployment policy.

### Environment tiers

- **Web Server tier** — public-facing HTTP/HTTPS service
- **Worker tier** — backed by an SQS queue; instances pull messages, process; auto-scales on queue depth

### The five deployment policies

| Policy | Speed | Risk | Downtime | Cost |
|---|---|---|---|---|
| **All at once** | Fastest | Highest | Yes | Same |
| **Rolling** | Medium | Some | No | Same |
| **Rolling with additional batch** | Slow | Low | No | Slightly more during deploy |
| **Immutable** | Slowest | Lowest | No | 2x during deploy |
| **Blue/Green** (manual swap) | Slow | Lowest | No | 2x during deploy |

**Immutable**: spawn a new ASG with the new version; if all health checks pass, swap in. If any fail, terminate the new ASG. Safest non-blue/green option.

**Blue/Green**: technically not a Beanstalk deployment policy — you use the **environment swap URL** feature: deploy to a new env, swap the CNAMEs to point at it.

### `.ebextensions` configuration files

Beanstalk apps can ship with a `.ebextensions/` folder containing YAML config files that customize the environment:

```yaml
# .ebextensions/01-options.config
option_settings:
  aws:elasticbeanstalk:application:environment:
    DB_HOST: db.example.com
  aws:autoscaling:asg:
    MinSize: 1
    MaxSize: 4
```

Files run in alphabetical order during deploy.

### Amplify Hosting (vs full Amplify)

Two distinct services often confused:

- **AWS Amplify Hosting** — connect a Git repo (GitHub, BitBucket, GitLab, CodeCommit). Amplify auto-builds + hosts your static site / SPA on push. Atomic deploys, branch-per-environment, custom domains, password protection, redirects/rewrites. **No backend** in this mode.
- **AWS Amplify (full)** — provides backend SDK + auth + GraphQL/REST API + storage + functions, scaffolded from Amplify CLI. Used for mobile / web apps wanting a "Firebase for AWS" experience.

The exam asks about hosting in the static-site context.

### Beanstalk vs ECS vs Lambda

| Question | Answer |
|---|---|
| "I have a JAR / Python app and want it running with auto-scaling, no DevOps" | Beanstalk |
| "I have a Docker image and want orchestration" | ECS (or App Runner) |
| "I have functions that run on events" | Lambda |
| "I have a static SPA + Git repo" | Amplify Hosting (or S3 + CloudFront) |

## Architecture

```
   Git push or aws elasticbeanstalk create-application-version
                  │
                  ▼
   Beanstalk env: dva-lab-08-09-env (single-instance, web tier)
                  │
                  ├── EC2 t3.micro running platform: Python 3.12 + Amazon Linux 2023
                  ├── (no ELB — single instance)
                  └── CloudWatch logs
```

## Step 1: Build a sample app version

Beanstalk needs a zip. The lab includes a tiny Flask app:

### PowerShell or Bash

```
cd app
zip -r ../app-v1.zip .
cd ..
```

## Step 2: Deploy infra + app

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-08-09-beanstalk --capabilities CAPABILITY_IAM
```

This creates the application + a single-instance environment + the EC2 instance role.

After ~8 min, the env health flips to Green.

## Step 3: Find the URL and visit

```
URL=$(aws elasticbeanstalk describe-environments --environment-names dva-lab-08-09-env --query "Environments[0].CNAME" --output text)
echo "http://$URL"
curl "http://$URL"
```

You should see the Flask "hello from beanstalk" response.

## Step 4: Compare — application versions and deploy policies

```
# Upload v2
aws s3 cp app-v2.zip "s3://$EB_BUCKET/app-v2.zip"

# Register the version
aws elasticbeanstalk create-application-version \
  --application-name dva-lab-08-09-app \
  --version-label v2 \
  --source-bundle S3Bucket=$EB_BUCKET,S3Key=app-v2.zip

# Update environment to use v2 (default policy: All at once)
aws elasticbeanstalk update-environment \
  --environment-name dva-lab-08-09-env \
  --version-label v2
```

For a different policy, set `aws:elasticbeanstalk:command:DeploymentPolicy` in `.ebextensions` or via `update-environment --option-settings`.

## Step 5: Compare — Amplify Hosting (concept only)

Amplify Hosting is provisioned per-Git-repo. Demo flow (without actually running):

```
aws amplify create-app --name dva-lab-08-09-static \
  --repository "https://github.com/<you>/<repo>" \
  --access-token <github-pat> \
  --build-spec '{"version":"1.0","applications":[{"appRoot":"/","frontend":{"phases":{"build":{"commands":["npm run build"]}}, "artifacts":{"baseDirectory":"build","files":["**/*"]}}}]}'

aws amplify create-branch --app-id <id> --branch-name main
aws amplify start-job --app-id <id> --branch-name main --job-type RELEASE
```

Amplify polls the repo for changes; on push to `main`, it auto-builds and deploys. Each branch becomes its own environment with its own URL.

## Exam gotchas

- **Beanstalk = PaaS.** It uses CloudFormation under the hood — you can see the generated stack.
- **Application vs application version vs environment**: 1 app contains many versions; many environments can run different versions.
- **`.ebextensions` runs in alphabetical order.** Common bug: 02-fixthing.config runs before 01-config.config when you intended the reverse.
- **`Saved Configurations`** — capture an environment's config and apply it elsewhere.
- **Worker environment + cron.yaml** — in worker tier, a `cron.yaml` file at the repo root creates SQS messages on a schedule (Beanstalk's cron-equivalent).
- **Health agent vs Basic Health**: enhanced gives you per-process info (CPU per process, request/response rates). Costs slightly more.
- **Beanstalk deployment policies** — five types; know each by name.
- **Amplify Hosting builds run in CodeBuild under the hood.** Free tier 1000 build min/month for first 12 months.
- **Amplify CLI app vs Amplify Hosting app** — they are the same `aws amplify` API but different feature sets. Hosting only is the simpler product.

## Cleanup

> 🔴 **Do this NOW.** EC2 + Beanstalk env charges accrue while running.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🎉 **Module 8 complete!** You've covered every CI/CD + container + deployment service in the DVA-C02 exam scope.

Continue: [Module 9 — Observability](../../module-09-observability/README.md)
