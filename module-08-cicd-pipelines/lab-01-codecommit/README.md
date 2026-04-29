# Lab 8.1 — CodeCommit

> ⚠️ **CodeCommit is closed to new AWS accounts.** As of 2024-07-25, AWS no longer enables CodeCommit on accounts that have never used it. If your account was created after that date and has no CodeCommit history, the `aws codecommit create-repository` call in this lab will fail with `AccessDeniedException`. **Skip to Lab 8.2** and use a local `git init` + S3 source action when CodePipeline labs reference a "source repo." The exam still tests CodeCommit conceptually — the theory portion of this README is the part that matters; the deploy is optional if your account can't run it.

> 🟢 **Free tier** — CodeCommit is free for the first 5 active users, perpetual. This lab uses 1 user.

## What you'll learn

- Create a CodeCommit repository via CloudFormation, grant your IAM user access
- Push code three different ways: HTTPS git credentials, SSH key, and `git-remote-codecommit` (grc) helper
- Understand the trade-offs and pick the right one for your workflow

## Exam blueprint reference

- **D3.TS1** Knowledge of: Git-based version control tools (Git, AWS CodeCommit)
- **D3.TS4** Knowledge of: Git-based version control tools (Git, AWS CodeCommit); Skills in: Committing code to a repository to invoke build, test, and deployment actions
- **D2.TS1** Skills in: Configuring programmatic access to AWS

> ⚠️ **CodeCommit closed-to-new-customers note** — In mid-2024 AWS announced CodeCommit is closed to new customers. **Existing customers (and most exam-takers' sandbox accounts) still have access** and the exam still tests it. If your account is brand new and the service is unavailable, skip this lab and read the README — labs 8.2–8.6 fall back to GitHub or S3 sources.

## Theory primer

### What CodeCommit is (and isn't)

CodeCommit is **managed Git hosting** in AWS — like GitHub Repositories but in your own account, with IAM-based access control. Repos store code; users authenticate via:

1. **HTTPS git credentials** — username/password generated under IAM user → Security credentials → "HTTPS Git credentials for CodeCommit". Easiest. Cached by git on first push.
2. **SSH key** — upload an SSH public key to your IAM user. Use a special username format `APKA...` (the SSH key ID). Best for shared workstations where credential helpers are flaky.
3. **`git-remote-codecommit` (grc)** — Python helper that signs requests with your env-var AWS credentials. **No git creds, no SSH key.** Best for the env-var workflow this course uses.

### IAM permissions needed

CodeCommit operations are permissioned via IAM policies. Common policies:

- `AWSCodeCommitFullAccess` — everything
- `AWSCodeCommitPowerUser` — read/write but no admin (no delete repo, no branch protection bypass)
- `AWSCodeCommitReadOnly` — pull-only

Custom policies use actions like `codecommit:GitPush`, `codecommit:GitPull`, `codecommit:CreateBranch`. The two `Git*` actions are pseudo-actions — they cover all the underlying API operations a `git push`/`git pull` makes.

## Architecture

```
+---------------------------+
|  Your laptop              |
|  - aws CLI w/ env-var creds|
|  - git                    |
|  - git-remote-codecommit  |
+--------+------------------+
         | git push codecommit::us-east-1://dva-lab-08-01
         v
+---------------------------+
|  CodeCommit               |
|  Repo: dva-lab-08-01-app  |
+---------------------------+
```

## Prerequisites

- Foundation prerequisites complete (`aws sts get-caller-identity` works)
- Your IAM user has `AWSCodeCommitPowerUser` (or `AdministratorAccess` for sandbox)
- Python 3.12 installed (for grc helper, if you use that path)
- Git installed

## Step 1: Deploy the repo

The template creates the repo. We'll push code in Step 2.

### PowerShell

```powershell
aws cloudformation deploy `
  --template-file template.yaml `
  --stack-name dva-lab-08-01-codecommit `
  --capabilities CAPABILITY_IAM
```

### Bash

```bash
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name dva-lab-08-01-codecommit \
  --capabilities CAPABILITY_IAM
```

### Read the outputs

#### PowerShell

```powershell
$STACK = "dva-lab-08-01-codecommit"
$REPO_NAME = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='RepoName'].OutputValue" --output text
$CLONE_HTTPS = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='CloneUrlHttps'].OutputValue" --output text
$CLONE_GRC = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='CloneUrlGrc'].OutputValue" --output text
"Repo: $REPO_NAME"
"HTTPS clone: $CLONE_HTTPS"
"grc clone:   $CLONE_GRC"
```

#### Bash

```bash
STACK="dva-lab-08-01-codecommit"
REPO_NAME=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='RepoName'].OutputValue" --output text)
CLONE_HTTPS=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='CloneUrlHttps'].OutputValue" --output text)
CLONE_GRC=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='CloneUrlGrc'].OutputValue" --output text)
echo "Repo: $REPO_NAME"
echo "HTTPS clone: $CLONE_HTTPS"
echo "grc clone:   $CLONE_GRC"
```

## Step 2: Authenticate and push (pick ONE path)

### Path A — `git-remote-codecommit` (grc) — RECOMMENDED for this course

This is the path the rest of Module 8 assumes. Uses your env-var AWS credentials directly. No git credentials, no SSH key.

#### Install grc

```
pip install git-remote-codecommit
```

#### Clone using the grc URL scheme

The clone URL takes the form `codecommit::REGION://REPO` (or `codecommit://REPO` if the default region is set).

#### PowerShell

```powershell
git clone $CLONE_GRC
cd $REPO_NAME
```

#### Bash

```bash
git clone "$CLONE_GRC"
cd "$REPO_NAME"
```

The first push will use your `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` env vars to sign the request — same SigV4 signing the AWS CLI uses.

### Path B — HTTPS git credentials (manual)

Slow path; documented because the **exam tests this is even an option**.

1. Console → IAM → Users → your-user → **Security credentials** tab → **HTTPS Git credentials for AWS CodeCommit** → **Generate credentials**.
2. Save the username (looks like `your-user-at-12345`) and password.
3. Clone using the HTTPS URL:

```
git clone <CLONE_HTTPS>
# (prompted for username and password — paste the generated ones)
```

Git's credential helper caches them on first use. On Windows, that's the Windows Credential Manager. On macOS, the Keychain.

### Path C — SSH key (also exam-relevant)

1. Generate SSH key locally if you don't have one: `ssh-keygen -t rsa -b 4096`
2. IAM Console → Users → your-user → **Security credentials** → **SSH public keys for CodeCommit** → **Upload SSH public key** (paste `~/.ssh/id_rsa.pub`)
3. Note the **SSH key ID** that AWS returns (looks like `APKA...`).
4. Add a host entry to `~/.ssh/config`:

```
Host git-codecommit.*.amazonaws.com
  User APKAEXAMPLE12345        # the SSH key ID
  IdentityFile ~/.ssh/id_rsa
```

5. Clone using `ssh://git-codecommit.us-east-1.amazonaws.com/v1/repos/<REPO>`.

## Step 3: Create initial content and push

This sample app gets reused in labs 8.2 (CodeBuild builds it), 8.3 (CodeDeploy deploys it to Lambda), 8.4 (deploys to EC2), 8.5 (deploys to ECS), 8.6 (full pipeline).

### PowerShell

```powershell
# Inside the cloned repo directory
Copy-Item ..\src\app.py .
Copy-Item ..\src\requirements.txt .
Copy-Item ..\src\README.md .
git add .
git commit -m "feat: initial app"
git push origin main
```

### Bash

```bash
# Inside the cloned repo directory
cp ../src/app.py .
cp ../src/requirements.txt .
cp ../src/README.md .
git add .
git commit -m "feat: initial app"
git push origin main
```

### Verify the push worked

```
aws codecommit get-branch --repository-name $REPO_NAME --branch-name main
```

You should see a `commit` field with your latest commit ID.

## Step 4: Compare — list commits via the CLI

CodeCommit exposes git operations as API calls. The exam loves these:

```
aws codecommit list-branches --repository-name $REPO_NAME
aws codecommit get-commit --repository-name $REPO_NAME --commit-id <SHA-from-step-3>
aws codecommit list-pull-requests --repository-name $REPO_NAME
```

This means CI tools (and CodePipeline) can inspect repos without a git client.

## Step 5: Trigger config — events vs notifications

CodeCommit can fire **EventBridge events** on push/branch/pull-request changes. CodePipeline (Lab 8.6) subscribes to one. Look at what's available:

```
aws events list-rule-names-by-target --target-arn arn:aws:codepipeline:<region>:<acct>:<pipeline> 2>$null
```

Note: in older AWS docs you may see "CodeCommit triggers" (SNS / Lambda) — those still exist but EventBridge rules are the modern path.

## Exam gotchas

1. **`Git*` IAM actions** are pseudo-actions. `codecommit:GitPush` covers all the underlying API ops a push performs. Don't confuse with `codecommit:CreateCommit` which is a single API op.
2. **CodeCommit credentials are NOT your AWS credentials.** Three separate auth paths (HTTPS git creds, SSH key, grc) each have their own setup.
3. **CodeCommit supports cross-account access** via IAM role assumption. Pattern: `assume-role` in account A, then push.
4. **HTTPS git creds are per-IAM-user**, max 2 per user. They're for **CodeCommit only** — not GitHub or anywhere else.
5. **CodeCommit triggers vs notifications vs EventBridge** — three different things. CodePipeline integrations use **EventBridge** as of 2020+.

## Cleanup

> 🔁 **Keep this stack — Labs 8.2 through 8.6 reuse this repo.** Skip cleanup until you finish Lab 8.6.

If you must cleanup early (e.g., to stop the lab series here):

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🔁 **Keep this stack — [Lab 8.2: CodeBuild](../lab-02-codebuild/README.md) builds the app you just pushed.**
