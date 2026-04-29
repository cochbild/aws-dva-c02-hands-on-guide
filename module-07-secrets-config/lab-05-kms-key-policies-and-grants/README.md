# Lab 7.5 — KMS Key Policies and Grants

> 🟡 **Pennies** — reuses Lab 7.4's CMK ($1/month while it exists). No additional KMS key created.

## What you'll learn

- The **KMS key policy** as the gatekeeper — IAM alone cannot grant access to a customer-managed key
- **Grants** — temporary, programmatic permissions issued to a principal that can be revoked or expired
- The **IAM + Key Policy AND** evaluation: BOTH must allow for an action to succeed (cross-account exception applies)
- Cross-account encryption — what changes vs same-account

## Exam blueprint reference

- **D2 TS2** — *"Differences between AWS managed and customer-managed AWS KMS keys"*, *"Using encryption across account boundaries"*

## Theory primer

### The "KMS dual policy" model — exam loves this

For a same-account principal to use a customer-managed CMK:

1. **The IAM policy** on the calling principal must allow the KMS action (`kms:Encrypt`, etc.) on the key's ARN
2. **AND the key policy** on the CMK must allow the calling principal to perform that action

If either is missing, the call fails. Default key policies grant the **root account** full access via `Action: kms:*` — but this **only works** if individual IAM principals also have IAM permissions for the action. The root account is not a magic bypass.

> Exception: AWS-managed keys (alias/aws/...) have a fixed key policy that grants account access — IAM alone is sufficient. Customer-managed: BOTH required.

### Grants

A grant is a programmatic, temporary permission. Useful when:
- An AWS service (e.g., Lambda, RDS) needs to use the key on your behalf
- You want to allow an external principal to encrypt for a short window
- Granular operations: a grant can specify exactly `Encrypt + GenerateDataKey + DescribeKey` and nothing else

Grants:
- Are issued by `kms:CreateGrant`
- Live for a configurable retiring time, or until `kms:RevokeGrant` is called
- Don't appear in the key policy — they live in the key's grant store

### Cross-account access

To let Account B encrypt under your CMK in Account A:

1. **Key policy in Account A** must allow Account B's principal (`Principal: arn:aws:iam::<B>:root` or specific IAM ARN)
2. **IAM policy in Account B** must allow `kms:Encrypt` on Account A's key ARN

Both required. Same dual-policy model.

### Order of evaluation (read carefully)

For ANY KMS request:
1. **Key policy explicit Deny** — overrides everything
2. **IAM policy explicit Deny** — overrides everything else
3. **Key policy Allow** — required
4. **IAM policy Allow** — required (for same-account; cross-account principal's IAM is in their account)
5. **Grants** — additional path; don't override key policy denies

## Architecture

```
   ┌─ Lab 7.5 stack: NEW Lambda + grant ─────────────────────┐
   │                                                          │
   │   Lambda role: NO IAM permission for KMS                 │
   │   ↓                                                      │
   │   Calls kms.encrypt(KeyId=lab-7-4-key) ── DENIED         │
   │                                                          │
   │   After CreateGrant on lab-7-4 key for this Lambda:      │
   │   ↓                                                      │
   │   Calls kms.encrypt(KeyId=lab-7-4-key) ── ALLOWED        │
   └──────────────────────────────────────────────────────────┘
```

## Prerequisites

**Lab 7.4 stack must still be deployed** — this lab `Fn::ImportValue`s the key ARN.

## Step 1: Deploy

The template uses `CodeUri: src/`, so we need to `package` (upload code to S3) before `deploy`.

### PowerShell

```powershell
$ACCOUNT = aws sts get-caller-identity --query Account --output text
$ARTIFACTS_BUCKET = "dva-lab-artifacts-$ACCOUNT-$env:AWS_DEFAULT_REGION"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>$null

aws cloudformation package `
  --template-file template.yaml `
  --s3-bucket $ARTIFACTS_BUCKET `
  --output-template-file packaged.yaml

aws cloudformation deploy `
  --template-file packaged.yaml `
  --stack-name dva-lab-07-05-kms-grants `
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Bash

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCOUNT}-${AWS_DEFAULT_REGION}"
aws s3 mb "s3://$ARTIFACTS_BUCKET" 2>/dev/null || true

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACTS_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name dva-lab-07-05-kms-grants \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

## Step 2: Try to encrypt — fails

The Lambda has NO `kms:*` permissions in its IAM role. With only the key policy's account-wide allow (`AWS: root`), the call still fails because the role's IAM doesn't grant the action.

### PowerShell or Bash

```
FN=$(aws cloudformation describe-stacks --stack-name dva-lab-07-05-kms-grants --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text)
aws lambda invoke --function-name "$FN" --cli-binary-format raw-in-base64-out --payload '{"action":"encrypt","plaintext":"hello"}' out.json
cat out.json
```

You'll see `AccessDeniedException` for `kms:Encrypt`. **Key policy alone isn't enough** — IAM must also allow.

## Step 3: Create a grant — encryption now works

A grant is a per-key permission given to a specific principal:

```
KEY_ARN=$(aws cloudformation list-exports --query "Exports[?Name=='dva-lab-07-04-key-arn'].Value" --output text)
ROLE_ARN=$(aws cloudformation describe-stacks --stack-name dva-lab-07-05-kms-grants --query "Stacks[0].Outputs[?OutputKey=='RoleArn'].OutputValue" --output text)

GRANT_TOKEN=$(aws kms create-grant \
  --key-id "$KEY_ARN" \
  --grantee-principal "$ROLE_ARN" \
  --operations Encrypt Decrypt GenerateDataKey \
  --query GrantId --output text)

echo "Grant: $GRANT_TOKEN"
```

Now invoke again:

```
aws lambda invoke --function-name "$FN" --cli-binary-format raw-in-base64-out --payload '{"action":"encrypt","plaintext":"hello"}' out.json
cat out.json
```

Encryption succeeds. **The grant gave the Lambda's role exactly the actions listed**, even though its IAM policy still has no `kms:*`.

## Step 4: List grants on the key

```
aws kms list-grants --key-id "$KEY_ARN"
```

## Step 5: Revoke the grant

```
aws kms revoke-grant --key-id "$KEY_ARN" --grant-id "$GRANT_TOKEN"
```

Re-invoke the Lambda — back to `AccessDeniedException`. **Grants are temporary tools** — revoke as soon as the work is done.

## Step 6: Compare — same effect via IAM policy

To make this permanent, attach an inline IAM policy to the Lambda role:

```yaml
Policies:
  - PolicyName: KmsEncrypt
    PolicyDocument:
      Statement:
        - Effect: Allow
          Action: [kms:Encrypt, kms:Decrypt, kms:GenerateDataKey]
          Resource: <key-arn>
```

Plus the key policy must already grant the account (Lab 7.4's policy does).

## Exam gotchas

- **CMKs require BOTH IAM AND key policy permissions** for same-account principals. AWS-managed keys (`alias/aws/*`) only require IAM.
- **Cross-account: key policy in owner account + IAM in caller account.** Both required.
- **Grants are an alternative path** — they don't bypass DENY in key policy, but they don't require IAM permissions on the grantee either.
- **Key policy default**: when you create a CMK without specifying a policy, AWS gives the root user full access. This means anyone with IAM `kms:*` in your account can use the key. Most enterprises lock this down.
- **`kms:ViaService`** condition limits which service can use the key (e.g., only `s3.us-east-1.amazonaws.com` can use this key for encryption — useful for default S3 SSE-KMS keys).
- **`kms:CallerAccount`** condition limits which account can use the key (useful for multi-account organizations).
- **`RetireGrant`** — only the retiring principal listed in the grant can retire it. Different from RevokeGrant which is account admin only.
- **`grants` vs `key policy`**: grants are programmatic and temporary; key policies are declarative and persistent. Use grants for AWS service integrations and short-lived workloads.

## Cleanup

> Cleans up the Lab 7.5 stack only. Lab 7.4's CMK persists until you cleanup that lab too.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

After this lab also run lab 7.4's cleanup to schedule the CMK for deletion:
```
cd ../lab-04-kms-envelope-encryption
./cleanup.sh   # or .\cleanup.ps1
```

## What's next

> 🧹 **Run cleanup on this lab AND Lab 7.4 before Lab 7.6.**

Continue: [Lab 7.6 — ACM and ACM-PCA](../lab-06-acm-and-acm-pca/README.md)
