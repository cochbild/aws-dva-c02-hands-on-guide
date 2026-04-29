#!/usr/bin/env bash
# End-to-end test of the capstone:
# 1. Sign up + admin-confirm a Cognito user
# 2. Get a JWT
# 3. Submit an order to the API
# 4. Verify DDB write + EventBridge fanout + DLQ + S3 audit + status update
set -euo pipefail

STACK="dva-lab-10-01-capstone"
EMAIL="${EMAIL:-alice@example.com}"
PASSWORD="${PASSWORD:-Pa55word!}"

OUT() { aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }

API_URL=$(OUT ApiUrl)
POOL_ID=$(OUT UserPoolId)
CLIENT_ID=$(OUT UserPoolClientId)
TABLE=$(OUT TableName)
BUCKET=$(OUT ArchiveBucket)

echo "==> Sign up + confirm user $EMAIL"
aws cognito-idp sign-up --client-id "$CLIENT_ID" --username "$EMAIL" --password "$PASSWORD" \
  --user-attributes Name=email,Value="$EMAIL" 2>/dev/null || echo "  (user exists or already signed up)"
aws cognito-idp admin-confirm-sign-up --user-pool-id "$POOL_ID" --username "$EMAIL" 2>/dev/null || echo "  (already confirmed)"

echo "==> Get JWT"
ID_TOKEN=$(aws cognito-idp admin-initiate-auth \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters "USERNAME=$EMAIL,PASSWORD=$PASSWORD" \
  --query 'AuthenticationResult.IdToken' --output text)
echo "  ${ID_TOKEN:0:40}..."

echo "==> Submit order"
ORDER_PAYLOAD='{"items":[{"name":"pepperoni","price":15},{"name":"coke","price":3}],"tier":"basic"}'
RESPONSE=$(curl -s -X POST "$API_URL/orders" \
  -H "Authorization: $ID_TOKEN" \
  -H "Content-Type: application/json" \
  --data "$ORDER_PAYLOAD")
echo "  Response: $RESPONSE"
ORDER_ID=$(echo "$RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["orderId"])')

echo "==> Wait for async pipeline (DDB stream + EventBridge → ChargeCustomer)..."
sleep 10

echo "==> Verify DDB record (should be status=CHARGED)"
aws dynamodb get-item --table-name "$TABLE" --key "{\"orderId\":{\"S\":\"$ORDER_ID\"}}" --query 'Item.{status:status.S,total:total.S}'

echo "==> Verify S3 audit file"
aws s3 ls "s3://$BUCKET/audit/" --recursive | head -5

echo "==> Done. Check the X-Ray service map and CloudWatch dashboard:"
OUT DashboardUrl
