# Lab 4.5 — Cognito User Pool + JWT Authorizer

> 🟢 **Free tier** — Cognito's free tier includes 50,000 MAU on Essentials and is perpetual. Lambda + API Gateway invokes are inside their free tiers at this volume.

## What you'll learn

- The difference between a Cognito **User Pool** (authentication, returns JWT) and an **Identity Pool** (federated AWS credentials, returns IAM creds via STS) — covered separately in Lab 4.6
- How to gate an API Gateway REST API with a Cognito User Pool authorizer
- The **three tokens** Cognito returns (ID, Access, Refresh) and which one to send to the API
- How to sign a user up + confirm + sign in **entirely from the CLI** without the Hosted UI

## Exam blueprint reference

- **D2 TS1 — Knowledge of:**
  - *"Identity federation (SAML, OIDC, Amazon Cognito)"*
  - *"Bearer tokens (JWT, OAuth, AWS STS)"*
  - *"The comparison of user pools and identity pools in Amazon Cognito"*
- **D2 TS1 — Skills in:**
  - *"Securing applications by using bearer tokens"*
  - *"Using an identity provider to implement federated access"*

## Theory primer

### User Pool vs Identity Pool — the table the exam is built around

| | **User Pool** | **Identity Pool** |
|---|---|---|
| What it is | A user directory (sign-up / sign-in / MFA) | A bridge to AWS IAM credentials |
| What it returns | JWT tokens (ID + Access + Refresh) | Temporary IAM credentials (AccessKey + SecretKey + SessionToken) via STS |
| Used by | Your application's auth flow; API Gateway authorizers | AWS SDK calls that need to reach AWS services directly (S3 from a phone app, for example) |
| Identity providers | Built-in users + federated SAML/OIDC/Google/Facebook/etc. | Cognito User Pool (this lab feeds Lab 4.6), or any of the federated providers directly |
| Cost | $0 / 50K MAU on Essentials | $0 (no MAU charge) |

A common pattern (Lab 4.6 builds it):

```
Phone app → User Pool (sign in)            → ID/Access JWTs
         → Identity Pool (exchange JWT)    → STS AssumeRoleWithWebIdentity
         → temporary AWS credentials       → SDK call to S3, DynamoDB, etc.
```

### The three Cognito tokens

| Token | What it contains | When to use |
|---|---|---|
| **ID token** | User's identity claims (email, sub, custom attrs) | "Who is this user?" — show their name in UI; **API Gateway authorizer reads this** |
| **Access token** | Scopes (OAuth-style) | Authorize calls to a *resource server* (your API); not human-readable user info |
| **Refresh token** | Long-lived; gets new ID + Access tokens | Re-auth without re-prompting password |

API Gateway's Cognito User Pool authorizer reads the **ID token** by default. The header is:
```
Authorization: <id-token>
```
**Note:** unlike standard OAuth, API Gateway does NOT want `Bearer ` prefix when using the Cognito User Pool authorizer (it's literal `Authorization: <token>`). Lambda authorizers and JWT authorizers (HTTP API) typically expect `Bearer `. Read the question carefully.

### Sign-up flow (this lab)

```
1. SignUp                 → user is in UNCONFIRMED state, not usable
2. AdminConfirmSignUp     → user moves to CONFIRMED (skips email/SMS confirmation)
3. AdminInitiateAuth      → returns ID + Access + Refresh tokens
                            (uses ADMIN_USER_PASSWORD_AUTH or ADMIN_NO_SRP_AUTH)
4. Call API with Authorization: <ID token>
```

### Token validation that API Gateway does for you

When you pass a Cognito User Pool to an authorizer, API Gateway:
1. Fetches the User Pool's JWKS (public keys) once and caches them
2. Verifies the JWT signature
3. Verifies the issuer (`iss` claim)
4. Verifies token expiry (`exp` claim)
5. Verifies token use (`token_use` claim — must be `id` for User Pool authorizer)

You don't write any of this — it's free.

## Architecture

```
                         ┌────────────────────────────────────────┐
   sign up / confirm  ──►│  Cognito User Pool                     │
   admin auth         ◄──│  dva-lab-04-05-pool                    │
   (returns 3 JWTs)      │  + App Client: dva-lab-04-05-cli       │
                         └─────────┬──────────────────────────────┘
                                   │ verifies ID token via JWKS
                                   ▼
                         ┌────────────────────────────────────────┐
   request +           ──►  Cognito User Pool Authorizer         │
   Authorization: <id>     │                                      │
                           │  REST API Gateway                    │
                           │  /me  (GET, authorizer required)     │
                           │  /open (GET, no auth, comparison)    │
                           └─────────┬────────────────────────────┘
                                     │
                                     ▼
                           ┌────────────────────────────────────┐
                           │  Lambda — echoes the requestContext│
                           │  (so you can see the claims)       │
                           └────────────────────────────────────┘
```

## Step 1: Deploy

The template creates the User Pool, app client, the API, the authorizer, and the Lambda. No external code packaging needed (Lambda code is small enough to inline).

### PowerShell or Bash

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-04-05-cognito-user-pool --capabilities CAPABILITY_IAM
```

## Step 2: Sign up + confirm a test user

For lab convenience we use **admin** APIs to create + confirm the user, skipping the email-verification flow. In production you'd let the user receive an email or SMS confirmation code.

### PowerShell

```powershell
$PoolId   = aws cloudformation describe-stacks --stack-name dva-lab-04-05-cognito-user-pool --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text
$ClientId = aws cloudformation describe-stacks --stack-name dva-lab-04-05-cognito-user-pool --query "Stacks[0].Outputs[?OutputKey=='ClientId'].OutputValue" --output text
$ApiUrl   = aws cloudformation describe-stacks --stack-name dva-lab-04-05-cognito-user-pool --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text

# 1. Sign up — initial password must satisfy the pool's policy (Pa55word!)
aws cognito-idp sign-up `
  --client-id $ClientId `
  --username "alice@example.com" `
  --password "Pa55word!" `
  --user-attributes Name=email,Value=alice@example.com

# 2. Admin-confirm so we can skip email verification
aws cognito-idp admin-confirm-sign-up --user-pool-id $PoolId --username "alice@example.com"

# 3. Admin-initiate-auth — returns the three tokens
$Auth = aws cognito-idp admin-initiate-auth `
  --user-pool-id $PoolId `
  --client-id $ClientId `
  --auth-flow ADMIN_USER_PASSWORD_AUTH `
  --auth-parameters "USERNAME=alice@example.com,PASSWORD=Pa55word!"
$AuthObj = $Auth | ConvertFrom-Json
$IdToken = $AuthObj.AuthenticationResult.IdToken

Write-Host "ID token (truncated):`n$($IdToken.Substring(0,80))..."
```

### Bash

```bash
POOL_ID=$(aws cloudformation describe-stacks --stack-name dva-lab-04-05-cognito-user-pool --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
CLIENT_ID=$(aws cloudformation describe-stacks --stack-name dva-lab-04-05-cognito-user-pool --query "Stacks[0].Outputs[?OutputKey=='ClientId'].OutputValue" --output text)
API_URL=$(aws cloudformation describe-stacks --stack-name dva-lab-04-05-cognito-user-pool --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)

# Sign up
aws cognito-idp sign-up \
  --client-id "$CLIENT_ID" \
  --username "alice@example.com" \
  --password "Pa55word!" \
  --user-attributes Name=email,Value=alice@example.com

# Admin-confirm
aws cognito-idp admin-confirm-sign-up --user-pool-id "$POOL_ID" --username "alice@example.com"

# Admin-initiate-auth
ID_TOKEN=$(aws cognito-idp admin-initiate-auth \
  --user-pool-id "$POOL_ID" \
  --client-id "$CLIENT_ID" \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters "USERNAME=alice@example.com,PASSWORD=Pa55word!" \
  --query "AuthenticationResult.IdToken" --output text)

echo "ID token (truncated):"
echo "${ID_TOKEN:0:80}..."
```

## Step 3: Decode the ID token

JWTs are `header.payload.signature` base64-encoded. Decode the payload:

### PowerShell

```powershell
$payloadB64 = ($IdToken -split '\.')[1]
# Pad for base64
$payloadB64 = $payloadB64 + ('=' * ((4 - $payloadB64.Length % 4) % 4))
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payloadB64.Replace('-','+').Replace('_','/')))
```

### Bash

```bash
echo "$ID_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null
```

You'll see something like:
```json
{
  "sub": "a1b2c3d4-...",
  "email": "alice@example.com",
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxx",
  "token_use": "id",
  "auth_time": 1714390000,
  "exp": 1714393600,
  "iat": 1714390000,
  ...
}
```

## Step 4: Call the protected endpoint

### PowerShell

```powershell
# Without token — should fail with 401
curl.exe -i "$ApiUrl/me"

# With token
curl.exe -i "$ApiUrl/me" -H "Authorization: $IdToken"
```

### Bash

```bash
# Without token — 401
curl -i "$API_URL/me"

# With token — 200, see your email and sub in the response
curl -i "$API_URL/me" -H "Authorization: $ID_TOKEN"
```

The Lambda returns the API Gateway `requestContext.authorizer.claims` — that's where API Gateway parsed and trusted-handed-off the JWT claims to your Lambda.

## Step 5: Compare — open endpoint

`/open` has no authorizer. Hit it without a token to confirm:

```
curl -i "$API_URL/open"
```

200 OK. The endpoint exists to demonstrate the **same API can mix authorized and unauthorized methods** — it's a common production pattern (public health checks alongside protected business endpoints).

## Step 6: Refresh the token

Tokens expire. Use the refresh token to get a new ID + Access pair without re-prompting the password:

```
aws cognito-idp initiate-auth \
  --client-id "$CLIENT_ID" \
  --auth-flow REFRESH_TOKEN_AUTH \
  --auth-parameters REFRESH_TOKEN="$REFRESH_TOKEN"
```

(In Step 2, the refresh token is in `$AuthObj.AuthenticationResult.RefreshToken` for PowerShell, or you can extract it via `--query` for Bash. Try it as an exercise.)

## Exam gotchas

- **API Gateway Cognito User Pool authorizer wants the ID token, NOT the access token.** `token_use: id`. Sending the access token gets 401.
- **`Authorization: <token>` (no `Bearer ` prefix)** for API Gateway's Cognito User Pool authorizer. JWT authorizers (HTTP API) accept `Bearer <token>`.
- **`AdminInitiateAuth` requires the app client to be configured for ADMIN_USER_PASSWORD_AUTH** (or ADMIN_NO_SRP_AUTH). Check ExplicitAuthFlows in the client config.
- **App client without secret** = good for SPA / mobile / public clients. With secret = server-side / confidential clients.
- **Token expiry** defaults: ID + Access = 1 hour; Refresh = 30 days. Configurable per app client.
- **JWT signature verification** uses Cognito's public JWKS at `https://cognito-idp.<region>.amazonaws.com/<pool-id>/.well-known/jwks.json`. API Gateway caches this. Lambda authorizers must do this themselves.
- **MFA** can be SMS, TOTP, or both. SMS costs (SNS charges). TOTP is free.
- **`token_use` claim is your friend.** If you write your own JWT verifier, always check `token_use` matches the kind you expect (id vs access).
- **Cognito SAML / OIDC federation** — User Pool can chain to an external IdP. Users still appear in the User Pool but their auth happens elsewhere. Common pattern for "use your corporate Google login".
- **Resource Server + scopes** are how you do OAuth-style authorization (access tokens with scopes like `read:orders`, `write:orders`). Out of scope for this lab; mentioned because the exam references it.

## Cleanup

> The lab-06 lab REUSES this user pool. **Don't run cleanup yet** if you're going on to Lab 4.6.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🔁 **Keep this stack — Lab 4.6 reuses the User Pool to demonstrate Identity Pool federation.**

Continue: [Lab 4.6 — Cognito Identity Pool](../lab-06-cognito-identity-pool/README.md)
