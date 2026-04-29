#!/usr/bin/env bash
# DVA-C02 Lab 3.4 cleanup — schedule KMS key deletion + delete stack
set -uo pipefail
STACK_NAME="dva-lab-03-04-encryption-variants"

# Empty the KMS bucket first
BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='KmsBucketName'].OutputValue" \
  --output text 2>/dev/null || echo "")
if [ -n "$BUCKET" ] && [ "$BUCKET" != "None" ]; then
  echo "Emptying bucket: $BUCKET"
  aws s3 rm "s3://$BUCKET" --recursive 2>/dev/null || true
fi

# Schedule the customer-managed key for deletion (7-day minimum window)
KEY_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='KmsKeyId'].OutputValue" \
  --output text 2>/dev/null || echo "")
if [ -n "$KEY_ID" ] && [ "$KEY_ID" != "None" ]; then
  echo "Scheduling KMS key deletion (7-day window): $KEY_ID"
  aws kms schedule-key-deletion --key-id "$KEY_ID" --pending-window-in-days 7 2>/dev/null || true
fi

echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists — check CloudFormation console"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
echo "ℹ KMS key continues to incur \$1/month until the 7-day deletion window closes"
