# Prerequisites

Get these set up before starting Lab 1.1. Allow ~30 minutes from a clean machine.

You'll need everything in **Section A** (mandatory) and the credentials setup in **Section B**. **Section C** (optional tools) is recommended but not required.

---

## A. Mandatory tooling

### A.1 — AWS account

You need an account where you have **admin** (or close to it) IAM permissions. A personal/sandbox account is ideal. **Never run these labs in a shared production account** — several labs intentionally use permissive IAM policies for teaching purposes, and several labs deploy resources that incur charges.

### A.2 — AWS CLI v2

#### Install

**Windows (PowerShell, run as Administrator):**
```powershell
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi /qn
# Or via winget:
winget install -e --id Amazon.AWSCLI
```

**macOS:**
```bash
brew install awscli
# Or:
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**Linux (x86_64):**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

#### Verify

**PowerShell or Bash:**
```
aws --version
```

Expect `aws-cli/2.x.x`. If you get v1, uninstall it and reinstall v2.

### A.3 — Python 3.12

Lambda function code in this course targets Python 3.12.

**Windows:**
```powershell
winget install -e --id Python.Python.3.12
```

**macOS:**
```bash
brew install python@3.12
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3.12 python3.12-venv
```

**Verify:**
```
python --version    # PowerShell
python3 --version   # Bash
```

Either should report `Python 3.12.x`. If your system Python is different, also install 3.12 alongside it; the labs only care that `python3.12` (or whatever your shell aliases to it) works.

### A.4 — Git

Almost certainly already installed. Verify:

```
git --version
```

If missing: `winget install Git.Git` (Windows) / `brew install git` (Mac) / `sudo apt install git` (Linux).

### A.5 — AWS SAM CLI (used in Lab 1.1 only)

The rest of the course uses `aws cloudformation deploy`. Lab 1.1 specifically teaches SAM CLI because **SAM is on the exam**.

**Windows:**
```powershell
winget install -e --id Amazon.SAM-CLI
```

**macOS:**
```bash
brew install aws-sam-cli
```

**Linux:**
```bash
wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
sudo ./sam-installation/install
```

**Verify:**
```
sam --version
```

Expect `1.x.x`.

---

## B. Credentials setup

This course uses **environment variables** for AWS credentials. No `aws configure`. Reasons:

1. Environment variables don't leak into git via `~/.aws/credentials`.
2. They rotate cleanly (close the shell, gone).
3. The exam tests the SDK credential provider chain order: **env vars → shared credentials file → IAM role** — env vars come first.

### B.1 — Create an IAM user (or use SSO temporary creds)

In your AWS account:

1. Go to **IAM → Users → Create user**.
2. Name it something like `dva-labs-user`.
3. Attach policy: **`AdministratorAccess`** (sandbox account only — never do this in production).
4. After creating: **Security credentials → Create access key → CLI use case**.
5. Copy the **Access key ID** and **Secret access key** somewhere safe. You'll set them as env vars next.

> **If your org uses IAM Identity Center / SSO**, you can instead run `aws sso login` and let it populate temporary credentials. The labs work identically — just make sure `aws sts get-caller-identity` succeeds before continuing.

### B.2 — Set environment variables

#### PowerShell — current session only

```powershell
$env:AWS_ACCESS_KEY_ID     = "AKIA..."
$env:AWS_SECRET_ACCESS_KEY = "wJa..."
$env:AWS_DEFAULT_REGION    = "us-east-1"
```

These vanish when you close the shell. Good for quick testing.

#### PowerShell — persisted across sessions (User-level)

```powershell
[Environment]::SetEnvironmentVariable("AWS_ACCESS_KEY_ID",     "AKIA...", "User")
[Environment]::SetEnvironmentVariable("AWS_SECRET_ACCESS_KEY", "wJa...",  "User")
[Environment]::SetEnvironmentVariable("AWS_DEFAULT_REGION",    "us-east-1","User")
# Open a new PowerShell window for these to take effect
```

To remove them later:

```powershell
[Environment]::SetEnvironmentVariable("AWS_ACCESS_KEY_ID",     $null, "User")
[Environment]::SetEnvironmentVariable("AWS_SECRET_ACCESS_KEY", $null, "User")
[Environment]::SetEnvironmentVariable("AWS_DEFAULT_REGION",    $null, "User")
```

#### Bash — current session only

```bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="wJa..."
export AWS_DEFAULT_REGION="us-east-1"
```

#### Bash — persisted across sessions

Append the three `export` lines to:

- `~/.bashrc` (Linux, default Bash)
- `~/.bash_profile` or `~/.profile` (macOS Bash)
- `~/.zshrc` (macOS default since Catalina)

Then either restart the shell or `source ~/.bashrc` (etc.).

> **Security tip for Bash:** if you persist credentials in `~/.bashrc`, ensure the file isn't world-readable: `chmod 600 ~/.bashrc`.

### B.3 — Verify credentials work

**PowerShell or Bash:**
```
aws sts get-caller-identity
```

Expected output (your details, not these):
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/dva-labs-user"
}
```

If you see this, you're ready. If not, double-check the env vars (`echo $env:AWS_ACCESS_KEY_ID` in PowerShell or `echo $AWS_ACCESS_KEY_ID` in Bash).

---

## C. Optional tooling

You don't need these for any lab to work, but they make life easier.

### C.1 — Docker (for local Lambda testing)

`sam local invoke` runs Lambdas locally in a container. Used optionally in Lab 1.1, then never again in the course.

**Windows / Mac:** Install Docker Desktop from <https://www.docker.com/products/docker-desktop/>.

**Linux:** Follow the Docker Engine install for your distro at <https://docs.docker.com/engine/install/>.

### C.2 — `jq` — JSON parser

Useful for parsing CLI output in Bash. The labs avoid `jq` to keep things shell-portable, but you'll appreciate it for ad-hoc exploration.

```
brew install jq          # macOS
sudo apt install jq      # Ubuntu/Debian
winget install jqlang.jq # Windows
```

### C.3 — Node.js 20+ (for Module 8 CDK lab in TypeScript)

Module 8 has one CDK lab in TypeScript. Skip it if you'd rather. Otherwise:

```
winget install OpenJS.NodeJS.LTS  # Windows
brew install node                  # macOS
# Linux: see https://nodejs.org/en/download/package-manager
```

Verify: `node --version` should be 20.x or higher.

### C.4 — VS Code AWS Toolkit

If you use VS Code, the AWS Toolkit extension gives template highlighting, Lambda local debugging, and a stack browser. Install from the VS Code marketplace.

---

## D. Final sanity check

Before starting Lab 1.1, run all of these. Every one should succeed:

**PowerShell or Bash:**
```
aws --version              # aws-cli/2.x.x
python --version           # Python 3.12.x  (or use python3 on Bash)
git --version              # any recent
sam --version              # 1.x.x          (only needed for Lab 1.1)
aws sts get-caller-identity # returns your account info
```

If everything passes: continue to [`module-01-lambda-fundamentals/README.md`](../module-01-lambda-fundamentals/README.md).

---

## E. Common setup problems

| Symptom | Cause | Fix |
|---|---|---|
| `Unable to locate credentials` | Env vars not set in current shell | Set them again — a new shell doesn't inherit unless persisted |
| `An error occurred (UnauthorizedOperation)` | IAM user lacks needed permission | Sandbox account: attach `AdministratorAccess`. Org account: ask admin |
| `aws configure` overwrote my creds | You ran configure | Delete `~/.aws/credentials` (or rename), or just use env vars (they take precedence) |
| `Region missing` | `AWS_DEFAULT_REGION` not set | Export/set it. Don't pass `--region` on every command — labs assume the default |
| Command works in PowerShell but not in Bash | Line-continuation char (`` ` `` vs `\`) | Use the block matching your shell |
| `(Expired)` token | Using STS temporary creds, expired | Re-login: `aws sso login` or refresh STS |
