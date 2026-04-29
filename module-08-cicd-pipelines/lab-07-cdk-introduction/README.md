# Lab 8.7 — AWS CDK Introduction (TypeScript)

> 🟢 **Free tier-friendly.** Same Lambda + IAM stack as Lab 1.1 but defined in TypeScript instead of YAML. Lambda invokes are free. CDK itself has no charge.

> Requires **Node.js 20+** (see [`prerequisites/README.md`](../../prerequisites/README.md) section C.3).

## What you'll learn

- How CDK **synthesizes** TypeScript/Python/Java/C# code into CloudFormation
- The **L1/L2/L3 construct** hierarchy
- The **bootstrap** step that prepares an account for CDK deploys
- `cdk diff`, `cdk synth`, `cdk deploy`, `cdk destroy` — the four commands you'll use 95% of the time

## Exam blueprint reference

- **D3 TS3** — *"Implementing and deploying infrastructure as code (IaC) templates"*
- **D3 TS4** — *"Application deployment that uses AWS services and tools (CloudFormation, AWS Cloud Development Kit [AWS CDK], AWS SAM)"*

## Theory primer

### CDK in 90 seconds

CDK is a TypeScript/Python/Java/C# library that synthesizes CloudFormation. You write:

```typescript
const fn = new lambda.Function(this, 'HelloFn', {
  runtime: lambda.Runtime.PYTHON_3_12,
  code: lambda.Code.fromAsset('src'),
  handler: 'index.handler',
});
```

CDK turns that into ~30 lines of CloudFormation YAML when you run `cdk synth`. `cdk deploy` synthesizes + deploys.

### L1, L2, L3 constructs

- **L1 (CFN)** — 1:1 with CloudFormation resources. `CfnFunction`. Verbose. Good for unsupported features.
- **L2 (curated)** — most common. `lambda.Function`. Sensible defaults. Helpers like `fn.grantInvoke(otherFn)`.
- **L3 (patterns)** — multi-resource patterns. `LambdaRestApi` creates Lambda + API GW + IAM in one line.

### Bootstrap

Before first `cdk deploy` in an account+region, run `cdk bootstrap`. CDK creates an S3 bucket for assets, an IAM role for deployments, and SSM parameters tracking versions.

```
cdk bootstrap aws://<account>/<region>
```

Run once per account-region. CDK stack name: `CDKToolkit`.

### `cdk synth` vs `cdk deploy`

- `cdk synth` — local: outputs the generated CloudFormation template
- `cdk diff` — local: compares synthesized vs deployed; preview changes
- `cdk deploy` — synth + deploy; creates a CloudFormation stack
- `cdk destroy` — delete the deployed stack

## Step 1: Bootstrap (once per account+region)

If you've never used CDK in this account+region:

```
npx cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/$AWS_DEFAULT_REGION
```

(In PowerShell: `aws://$($Account)/$env:AWS_DEFAULT_REGION`.)

## Step 2: Install dependencies

```
cd cdk
npm install
```

## Step 3: Inspect what CDK will deploy

### PowerShell or Bash

```
cd cdk
npx cdk synth
```

Outputs the generated CloudFormation YAML. Compare the source TypeScript (~50 lines) with the synthesized YAML (~250 lines). CDK is doing the boring stuff (IAM role, log group, permissions, code asset upload) for you.

## Step 4: Deploy

```
npx cdk deploy --require-approval never
```

(Without `--require-approval never`, CDK prompts for IAM changes.)

## Step 5: Test the function

```
aws lambda invoke --function-name $(aws cloudformation describe-stacks --stack-name dva-lab-08-07-cdk --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text) --cli-binary-format raw-in-base64-out --payload '{}' out.json
cat out.json
```

## Step 6: Compare — change code, run `cdk diff`

Edit `src/index.py` to return a different message. Then:

```
npx cdk diff
```

CDK shows you exactly what will change. Then `npx cdk deploy` to apply.

## Exam gotchas

- **CDK synthesizes CloudFormation** — every CDK app deploys via the CFN service. So everything you know about CFN (rollbacks, drift detection, change sets) applies.
- **Bootstrap is required.** Forgetting it = deploy errors about missing CDK toolkit assets.
- **`cdk destroy` ≠ `cdk bootstrap` removal.** Destroy removes your stack. The CDKToolkit stack persists until you delete it manually.
- **CDK constructs are not magic** — read the synth output. Each construct expands to specific CFN resources.
- **CDK Pipelines** is an L3 construct that creates a CodePipeline that deploys CDK stacks. Self-mutating: when you change the pipeline definition, the pipeline updates itself.
- **CDK assets** (Lambda code from `Code.fromAsset(...)`) get uploaded to the bootstrap bucket, then referenced from the synthesized template. CFN can't do this on its own.

## Cleanup

```
cd cdk
npx cdk destroy --force
```

> CDK doesn't tear down the bootstrap stack — leave it; it's harmless. Or delete the `CDKToolkit` stack manually if you want a clean account.

## What's next

> 🧹 **Run `cdk destroy` before Lab 8.8.**

Continue: [Lab 8.8 — ECS Fargate (ECR + Service)](../lab-08-ecs-fargate/README.md)
