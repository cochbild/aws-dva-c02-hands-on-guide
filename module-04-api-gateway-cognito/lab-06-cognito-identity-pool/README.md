# Lab 4.6 — Cognito Identity Pool

> 🟢 **Free tier** — Identity Pools have no MAU charge. The S3 bucket is empty and small.

## What you'll learn

- How an **Identity Pool** turns a Cognito User Pool JWT into **temporary AWS IAM credentials**
- The two IAM roles every Identity Pool has: **authenticated** and **unauthenticated**
- The full **STS AssumeRoleWithWebIdentity** flow, all the way to a successful S3 call signed with credentials granted to the user

## Exam blueprint reference

- **D2 TS1 — Knowledge of:**
  - *"The comparison of user pools and identity pools in Amazon Cognito"*
  - *"Bearer tokens (JWT, OAuth, AWS STS)"*
- **D2 TS1 — Skills in:**
  - *"Configuring programmatic access to AWS"*
  - *"Assuming an IAM role"*

## Theory primer

### What an Identity Pool actually is

An Identity Pool is a "broker" that exchanges federated identity proof (a User Pool JWT, a Google token, a SAML assertion, a custom developer-provided identity, …) for **temporary AWS credentials** issued by **STS**.

```
User signs into User Pool (Lab 4.5)              ─►  ID + Access JWT
                                                    │
JWT to Identity Pool's GetCredentialsForIdentity ───┴─►  Identity Pool
                                                          │
STS AssumeRoleWithWebIdentity using the configured role ─┘
                                                          │
                                                          ▼
                                              {AccessKeyId, SecretAccessKey,
                                               SessionToken, Expiration}
```

The user (or your client app) now has temporary AWS credentials that match an IAM role's permissions. They can hit S3 / DynamoDB / etc. directly from the client.

### Why this matters (real-world)

For a phone or browser app:

- **Without an Identity Pool**: every S3 / DynamoDB / etc. call has to go through your backend (API Gateway + Lambda) so your backend can sign with its own credentials. More latency, more cost, more code.
- **With an Identity Pool**: the client gets scoped IAM credentials and calls AWS directly. Lower latency, less code, scopes enforced by IAM not by your code.

### The two roles

Every Identity Pool has at minimum:

- **Auth role** — assumed when the identity provider authenticated the user successfully
- **Unauth role** — assumed when the user is anonymous (only relevant if you allow unauth identities)

This lab disables unauth identities (`AllowUnauthenticatedIdentities: false`). Production: enable only if you really need anonymous access.

### Using the credentials

```python
import boto3
# After GetCredentialsForIdentity returns:
creds = {"AccessKeyId": "AKIA...", "SecretAccessKey": "...", "SessionToken": "..."}
s3 = boto3.client("s3",
    aws_access_key_id=creds["AccessKeyId"],
    aws_secret_access_key=creds["SecretAccessKey"],
    aws_session_token=creds["SessionToken"]
)
s3.list_objects_v2(Bucket="my-private-bucket")
```

The IAM role attached to the Identity Pool's auth role determines what the user can do. Want per-user S3 prefix isolation? Use IAM **policy variables** like `${cognito-identity.amazonaws.com:sub}` to scope `Resource:` in the policy to the user's own folder.

## Architecture

```
   Lab 4.5 User Pool ─────► JWT ─────► Identity Pool (this lab)
                                        │
                                        │ AssumeRoleWithWebIdentity
                                        ▼
                                      Auth IAM Role
                                        │
                                        │ permissions: s3:GetObject, s3:PutObject, s3:ListBucket
                                        │ resource:    arn:aws:s3:::dva-lab-04-06-bucket-…/*
                                        │              arn:aws:s3:::dva-lab-04-06-bucket-…
                                        ▼
                                      Private S3 bucket (this lab)
```

## Prerequisites

**Lab 4.5 stack must still be deployed** — this lab `Fn::ImportValue`s the User Pool ID and ARN.

Verify:
```
aws cloudformation describe-stacks --stack-name dva-lab-04-05-cognito-user-pool --query "Stacks[0].StackStatus" --output text
```

## Step 1: Deploy

### PowerShell or Bash

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-04-06-cognito-identity-pool --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

## Step 2: Sign in (User Pool) and exchange for AWS credentials (Identity Pool)

### PowerShell

```powershell
$PoolId    = aws cloudformation describe-stacks --stack-name dva-lab-04-05-cognito-user-pool --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text
$ClientId  = aws cloudformation describe-stacks --stack-name dva-lab-04-05-cognito-user-pool --query "Stacks[0].Outputs[?OutputKey=='ClientId'].OutputValue" --output text
$IdPool    = aws cloudformation describe-stacks --stack-name dva-lab-04-06-cognito-identity-pool --query "Stacks[0].Outputs[?OutputKey=='IdentityPoolId'].OutputValue" --output text
$Bucket    = aws cloudformation describe-stacks --stack-name dva-lab-04-06-cognito-identity-pool --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text
$Region    = $env:AWS_DEFAULT_REGION

# 1. Get a User Pool ID token (alice was created in Lab 4.5)
$Auth = aws cognito-idp admin-initiate-auth `
  --user-pool-id $PoolId `
  --client-id $ClientId `
  --auth-flow ADMIN_USER_PASSWORD_AUTH `
  --auth-parameters "USERNAME=alice@example.com,PASSWORD=Pa55word!"
$IdToken = ($Auth | ConvertFrom-Json).AuthenticationResult.IdToken

# 2. Exchange the JWT at the Identity Pool — first, get an Identity ID
$ProviderName = "cognito-idp.${Region}.amazonaws.com/${PoolId}"
$IdentityId = aws cognito-identity get-id `
  --identity-pool-id $IdPool `
  --logins "${ProviderName}=$IdToken" `
  --query IdentityId --output text

# 3. Get AWS credentials for that identity
$Creds = aws cognito-identity get-credentials-for-identity `
  --identity-id $IdentityId `
  --logins "${ProviderName}=$IdToken"
$CredObj = $Creds | ConvertFrom-Json

$AK = $CredObj.Credentials.AccessKeyId
$SK = $CredObj.Credentials.SecretKey
$ST = $CredObj.Credentials.SessionToken

Write-Host "Got temporary credentials. AK starts with: $($AK.Substring(0,8))..."
```

### Bash

```bash
POOL_ID=$(aws cloudformation describe-stacks --stack-name dva-lab-04-05-cognito-user-pool --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
CLIENT_ID=$(aws cloudformation describe-stacks --stack-name dva-lab-04-05-cognito-user-pool --query "Stacks[0].Outputs[?OutputKey=='ClientId'].OutputValue" --output text)
ID_POOL=$(aws cloudformation describe-stacks --stack-name dva-lab-04-06-cognito-identity-pool --query "Stacks[0].Outputs[?OutputKey=='IdentityPoolId'].OutputValue" --output text)
BUCKET=$(aws cloudformation describe-stacks --stack-name dva-lab-04-06-cognito-identity-pool --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
REGION="$AWS_DEFAULT_REGION"

# 1. Get User Pool ID token
ID_TOKEN=$(aws cognito-idp admin-initiate-auth \
  --user-pool-id "$POOL_ID" \
  --client-id "$CLIENT_ID" \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters "USERNAME=alice@example.com,PASSWORD=Pa55word!" \
  --query "AuthenticationResult.IdToken" --output text)

# 2. Get Identity ID from Identity Pool
PROVIDER="cognito-idp.${REGION}.amazonaws.com/${POOL_ID}"
IDENTITY_ID=$(aws cognito-identity get-id \
  --identity-pool-id "$ID_POOL" \
  --logins "${PROVIDER}=${ID_TOKEN}" \
  --query IdentityId --output text)

# 3. Get AWS credentials for that identity
read -r AK SK ST < <(aws cognito-identity get-credentials-for-identity \
  --identity-id "$IDENTITY_ID" \
  --logins "${PROVIDER}=${ID_TOKEN}" \
  --query 'Credentials.[AccessKeyId,SecretKey,SessionToken]' --output text)

echo "Got temporary credentials. AK starts with: ${AK:0:8}..."
```

## Step 3: Use the temp credentials to access S3

The auth role's policy allows `s3:ListBucket`, `s3:PutObject`, `s3:GetObject` on the lab bucket.

### PowerShell

```powershell
# Switch to the federated credentials for one command
$env:AWS_ACCESS_KEY_ID_BACKUP     = $env:AWS_ACCESS_KEY_ID
$env:AWS_SECRET_ACCESS_KEY_BACKUP = $env:AWS_SECRET_ACCESS_KEY
$env:AWS_SESSION_TOKEN_BACKUP     = $env:AWS_SESSION_TOKEN
$env:AWS_ACCESS_KEY_ID     = $AK
$env:AWS_SECRET_ACCESS_KEY = $SK
$env:AWS_SESSION_TOKEN     = $ST

aws sts get-caller-identity     # should show role assumed by federated identity
aws s3api list-objects --bucket $Bucket   # should succeed
echo "uploaded by alice via federated creds" | Out-File hello.txt -Encoding ascii
aws s3 cp hello.txt "s3://$Bucket/alice/hello.txt"

# Restore your original credentials
$env:AWS_ACCESS_KEY_ID     = $env:AWS_ACCESS_KEY_ID_BACKUP
$env:AWS_SECRET_ACCESS_KEY = $env:AWS_SECRET_ACCESS_KEY_BACKUP
$env:AWS_SESSION_TOKEN     = $env:AWS_SESSION_TOKEN_BACKUP
```

### Bash

```bash
# Save and switch
ORIGINAL_AK="$AWS_ACCESS_KEY_ID"
ORIGINAL_SK="$AWS_SECRET_ACCESS_KEY"
ORIGINAL_ST="${AWS_SESSION_TOKEN:-}"
export AWS_ACCESS_KEY_ID="$AK"
export AWS_SECRET_ACCESS_KEY="$SK"
export AWS_SESSION_TOKEN="$ST"

aws sts get-caller-identity
aws s3api list-objects --bucket "$BUCKET"
echo "uploaded by alice via federated creds" > /tmp/hello.txt
aws s3 cp /tmp/hello.txt "s3://$BUCKET/alice/hello.txt"

# Restore
export AWS_ACCESS_KEY_ID="$ORIGINAL_AK"
export AWS_SECRET_ACCESS_KEY="$ORIGINAL_SK"
[ -n "$ORIGINAL_ST" ] && export AWS_SESSION_TOKEN="$ORIGINAL_ST" || unset AWS_SESSION_TOKEN
```

You just signed an S3 PutObject as Alice's federated IAM principal. **No backend involved**.

## Step 4: Compare — what `sts get-caller-identity` shows

When you used your original creds, the ARN was your IAM user. When you used the federated creds, the ARN looks like:

```
arn:aws:sts::123456789012:assumed-role/dva-lab-04-06-auth-role/CognitoIdentityCredentials
```

**Different principal.** Same human, different IAM identity. CloudTrail logs both — you can audit "who did what" using the `userIdentity.principalId` field.

## Step 5: Compare — try to access an unauthorized bucket

The auth role only allows actions on `dva-lab-04-06-bucket-…`. Try a different bucket:

```
aws s3 ls s3://some-other-bucket
```

`AccessDenied`. The IAM role is scoped — even though Alice is "authenticated", she can't go off-script.

## Exam gotchas

- **User Pool authenticates; Identity Pool authorizes (with AWS).** Two distinct services that work together. The exam will have you pick which one to use.
- **Temporary credentials, not long-lived keys.** Default expiry is 1 hour. Refresh by calling `GetCredentialsForIdentity` again with a fresh JWT.
- **AssumeRoleWithWebIdentity** is the underlying STS call. Identity Pool wraps it. The exam may use that name.
- **IAM policy variables for per-user scoping:** `${cognito-identity.amazonaws.com:sub}` resolves to the federated user's identity ID. Use it in `Resource:` to scope to per-user prefixes (e.g., `arn:aws:s3:::bucket/users/${cognito-identity.amazonaws.com:sub}/*`).
- **Enhanced flow vs Basic flow:** the modern flow uses `GetCredentialsForIdentity` (one call, Identity Pool handles AssumeRoleWithWebIdentity for you). Basic flow uses `GetOpenIdToken` then explicit `AssumeRoleWithWebIdentity`. Enhanced is preferred.
- **Unauth role** is dangerous: any unauthenticated client can use it. Only enable if you specifically need it.
- **Identity Pool vs API Gateway IAM auth:** if API Gateway has IAM authorization on a method, the caller can sign requests using the federated credentials from an Identity Pool. That's the chain that lets a phone app talk directly to API Gateway with per-user IAM policies.
- **Logins map** in `get-id` and `get-credentials-for-identity` is keyed by **provider name string** like `cognito-idp.<region>.amazonaws.com/<pool-id>` — get this format wrong and you get `NotAuthorizedException`.

## Cleanup

> Cleans up the Identity Pool, the IAM roles, and the bucket. Lab 4.5 (User Pool) is left intact unless you cleanup that lab too.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

After this lab also run lab 4.5's cleanup if you're moving to Lab 4.7:
```
cd ../lab-05-cognito-user-pool
./cleanup.sh   # or .\cleanup.ps1
```

## What's next

> 🧹 **Run cleanup on this lab AND Lab 4.5 before Lab 4.7.** Lab 4.7 (CloudFront) is a separate stack with no Cognito dependency.

Continue: [Lab 4.7 — CloudFront in front of API](../lab-07-cloudfront-in-front-of-api/README.md)
