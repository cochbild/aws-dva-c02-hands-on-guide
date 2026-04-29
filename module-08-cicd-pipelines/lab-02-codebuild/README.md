# Lab 8.2 — CodeBuild

> 🟢 **Free tier** — 100 build minutes / month on `general1.small` Linux, perpetual. This lab uses ~5 minutes of build time.

## What you'll learn

- Write a `buildspec.yml` covering all four phases (`install`, `pre_build`, `build`, `post_build`) plus `finally`, `artifacts`, `cache`, and `reports`
- Inject env vars three ways: plaintext, **Parameter Store**, and **Secrets Manager**
- Run unit tests, capture a JUnit-format report, package the artifact for downstream CodeDeploy

## Exam blueprint reference

- **D3.TS1** Skills in: Managing dependencies of the code module within the package; Organizing files for application deployment
- **D3.TS3** Knowledge of: Branches and actions in the CI/CD workflow; Automated software testing
- **D2.TS3** Skills in: Using secret management services to secure sensitive data
- **D4.TS1** Skills in: Troubleshooting deployment failures by using service output logs

## Theory primer

### `buildspec.yml` skeleton

```yaml
version: 0.2

env:
  variables:
    APP_NAME: my-app
    LOG_LEVEL: INFO
  parameter-store:
    DEPLOY_BUCKET: /dva-lab-08/deploy-bucket   # SSM Parameter Store
  secrets-manager:
    GITHUB_TOKEN: dva-lab-08/github:token       # SecretId:JsonKey

phases:
  install:
    runtime-versions:                # multi-runtime images only
      python: 3.12
    commands:
      - pip install -r requirements.txt -r requirements-dev.txt

  pre_build:
    commands:
      - echo "Build starting on $(date) for commit $CODEBUILD_RESOLVED_SOURCE_VERSION"

  build:
    commands:
      - python -m pytest --junitxml=test-reports/junit.xml || true
      - python -m zipapp -p "/usr/bin/env python3" -o app.zip src/

  post_build:
    commands:
      - echo "Build finished, artifact size: $(stat -c%s app.zip) bytes"

artifacts:
  files:
    - app.zip
    - appspec.yml
  name: dva-lab-08-app-$CODEBUILD_RESOLVED_SOURCE_VERSION

reports:
  pytest:
    files:
      - test-reports/junit.xml
    file-format: JUNITXML

cache:
  paths:
    - /root/.cache/pip/**/*
```

### Phase order — memorize cold

| Phase | When it runs | Common use |
|---|---|---|
| `install` | First. Set up runtimes, install OS-level deps. | `pip install`, `apt install`, `npm ci` |
| `pre_build` | After install. | Login to ECR, fetch dependencies, set env |
| `build` | The main work. | Compile, test, package |
| `post_build` | After build, **even if build phase failed** (in some images) | Push artifacts, notify |
| `finally` (per-phase) | After commands of that phase, regardless of success | Cleanup |

> The `finally` block is per-phase, not its own phase. A `phases.build.finally:` runs after `phases.build.commands:`.

### Env var precedence

1. `env.secrets-manager` and `env.parameter-store` resolved **before** any phase runs
2. `env.variables` set in the buildspec
3. CodeBuild project-level env vars (set in CFN/console)
4. AWS-injected: `CODEBUILD_BUILD_ID`, `CODEBUILD_RESOLVED_SOURCE_VERSION`, `CODEBUILD_SRC_DIR`, etc.

### Cache options

- `NO_CACHE` (default) — fresh container each build
- `LOCAL` — instance-local, fastest, evicted when instance recycles
  - Modes: `LOCAL_SOURCE_CACHE`, `LOCAL_DOCKER_LAYER_CACHE`, `LOCAL_CUSTOM_CACHE`
- `S3` — slower but cross-build, useful for `pip`/`maven`/`node_modules`

### Reports — automated test result tracking

CodeBuild can ingest JUnit, NUnit, TestNG, Cucumber JSON. Reports are visible in the console with pass/fail trends. Required IAM action: `codebuild:BatchPutTestCases`.

## Architecture

```
                   +----------------+   build-spec runs in
GitHub/CodeCommit  |   CodeBuild    |   /codebuild/output/srcXXXX/src
        +--------->|  (Linux 5.0,   +--->  /codebuild/output/artifacts
                   |   python:3.12) |
                   +-------+--------+
                           | env from SSM + Secrets Manager
                           v
        +-----------+      +-------------------+
        | Parameter |      | Secrets Manager   |
        | Store     |      | (DB password etc) |
        +-----------+      +-------------------+
                           | artifacts
                           v
                   +-------+--------+
                   |   S3 Artifact  |
                   |    Bucket      |
                   +----------------+
```

## Prerequisites

- **Lab 8.1 complete** and the CodeCommit repo `dva-lab-08-app` exists with code pushed to `main` (it must contain `app.py`).
- The grc helper or HTTPS git creds set up so CodeBuild's source action can pull.

## Step 1: Seed Parameter Store + Secrets Manager

These exist so the buildspec can pull them. The lab template references them.

### PowerShell or Bash

```
aws ssm put-parameter --name "/dva-lab-08/deploy-bucket" \
  --value "dva-lab-08-deploy-$(aws sts get-caller-identity --query Account --output text)" \
  --type String --overwrite

aws secretsmanager create-secret \
  --name dva-lab-08/build-token \
  --secret-string "{\"token\":\"sample-token-not-real\"}" 2>$null
# (idempotent — re-run is fine; on conflict the create call fails, which we ignore)
```

> 🟡 **Cost reminder** — that Secrets Manager secret is $0.40/month. Cleanup deletes it.

## Step 2: Deploy the build project

### PowerShell

```powershell
aws cloudformation deploy `
  --template-file template.yaml `
  --stack-name dva-lab-08-02-codebuild `
  --capabilities CAPABILITY_IAM `
  --parameter-overrides RepoName=dva-lab-08-app
```

### Bash

```bash
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name dva-lab-08-02-codebuild \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides RepoName=dva-lab-08-app
```

## Step 3: Push the buildspec to the repo

The buildspec lives in `buildspec.yml` here. Copy it into your local clone of the CodeCommit repo (from Lab 8.1):

### PowerShell

```powershell
Copy-Item .\buildspec.yml ..\..\..\dva-lab-08-app\
Copy-Item .\src\test_app.py ..\..\..\dva-lab-08-app\
cd ..\..\..\dva-lab-08-app
git add buildspec.yml test_app.py
git commit -m "ci: add buildspec + smoke test"
git push origin main
cd -
```

### Bash

```bash
cp ./buildspec.yml ../../../dva-lab-08-app/
cp ./src/test_app.py ../../../dva-lab-08-app/
cd ../../../dva-lab-08-app
git add buildspec.yml test_app.py
git commit -m "ci: add buildspec + smoke test"
git push origin main
cd -
```

(adjust paths if your `dva-lab-08-app` clone is elsewhere)

## Step 4: Trigger a build

### PowerShell or Bash

```
aws codebuild start-build --project-name dva-lab-08-02-build
```

Save the returned `id`. Then watch:

### PowerShell

```powershell
$BUILD_ID = "<the id from start-build>"
aws codebuild batch-get-builds --ids $BUILD_ID `
  --query "builds[0].{phase:currentPhase,status:buildStatus,logs:logs.deepLink}"
```

### Bash

```bash
BUILD_ID="<the id from start-build>"
aws codebuild batch-get-builds --ids "$BUILD_ID" \
  --query "builds[0].{phase:currentPhase,status:buildStatus,logs:logs.deepLink}"
```

Re-run until `status: SUCCEEDED`. Open the `logs.deepLink` URL in a browser to watch CloudWatch Logs in real time.

## Step 5: Inspect the artifact and the report

```
ARTIFACT_BUCKET=$(aws cloudformation describe-stacks --stack-name dva-lab-08-02-codebuild \
  --query "Stacks[0].Outputs[?OutputKey=='ArtifactBucket'].OutputValue" --output text)

aws s3 ls "s3://$ARTIFACT_BUCKET/" --recursive
```

You'll see the artifact zip the build produced.

For the test report:

```
aws codebuild list-reports-for-report-group \
  --report-group-arn $(aws codebuild batch-get-projects --names dva-lab-08-02-build \
    --query "projects[0].secondaryArtifacts[0].location" --output text) 2>$null

# Or look in console: CodeBuild → Reports
```

## Step 6: Compare — change cache mode, rebuild

The default lab template uses `NO_CACHE`. Edit `template.yaml`, change:

```yaml
Cache:
  Type: NO_CACHE
```

to:

```yaml
Cache:
  Type: S3
  Location: !Sub "${ArtifactBucket}/cache/"
```

Redeploy and trigger two builds back-to-back. The second one should be ~30% faster on the `install` phase because pip's cache is preserved.

## Exam gotchas

1. **`buildspec.yml` location** — by default at the repo root. Override with `BuildSpec` property in the project (can point to a different file or even an inline script).
2. **Phase order** — `install` → `pre_build` → `build` → `post_build`. Memorize.
3. **`post_build` runs even if `build` fails** in most images (so you can push partial logs etc.). Some platforms differ — for absolute guarantees use `finally`.
4. **Secrets vs plaintext env** — `env.variables` is plaintext (visible in CloudWatch Logs!). Use `env.parameter-store` for SecureString or `env.secrets-manager` for sensitive values.
5. **Reports require an IAM permission** — `codebuild:BatchPutTestCases`, `codebuild:CreateReport`, `codebuild:UpdateReport`. The default service role has them; custom roles often miss them.
6. **`CODEBUILD_RESOLVED_SOURCE_VERSION`** — the actual commit SHA used for the build. Differs from `CODEBUILD_SOURCE_VERSION` which can be a branch name.
7. **Local cache modes can be combined** — `LOCAL_SOURCE_CACHE | LOCAL_DOCKER_LAYER_CACHE`. They're flags, not exclusive.
8. **CodeBuild can run privileged Docker** if `PrivilegedMode: true`. Required for `docker build` inside a build.

## Cleanup

> 🔁 **Keep this stack — Labs 8.3 through 8.6 reuse this CodeBuild project.** Skip cleanup until you finish Lab 8.6.

If you must cleanup early:

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🔁 **Keep this stack — [Lab 8.3: CodeDeploy for Lambda](../lab-03-codedeploy-lambda/README.md) deploys the artifact this build just produced.**
