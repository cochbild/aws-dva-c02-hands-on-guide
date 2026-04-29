#!/usr/bin/env bash
# DVA-C02 Lab 4.7 cleanup
# CloudFront distributions can't be deleted while enabled — disable first, wait, then delete the stack.
set -uo pipefail
STACK_NAME="dva-lab-04-07-cloudfront-api"

DIST_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [ -n "$DIST_ID" ] && [ "$DIST_ID" != "None" ]; then
  echo "Disabling CloudFront distribution $DIST_ID (this is required before delete)..."
  ETAG=$(aws cloudfront get-distribution-config --id "$DIST_ID" --query "ETag" --output text)
  aws cloudfront get-distribution-config --id "$DIST_ID" --query "DistributionConfig" > /tmp/dist-config.json
  # Set Enabled: false
  python3 -c "import json,sys;d=json.load(open('/tmp/dist-config.json'));d['Enabled']=False;json.dump(d,open('/tmp/dist-config.json','w'))" \
    || sed -i 's/"Enabled":\s*true/"Enabled": false/' /tmp/dist-config.json
  aws cloudfront update-distribution --id "$DIST_ID" --if-match "$ETAG" --distribution-config file:///tmp/dist-config.json >/dev/null

  echo "Waiting for distribution to deploy disabled state (5–15 min)..."
  aws cloudfront wait distribution-deployed --id "$DIST_ID"
fi

echo "Deleting stack: $STACK_NAME (CloudFront removal takes additional minutes)"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists — check CloudFormation console"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
