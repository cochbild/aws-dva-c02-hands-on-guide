#!/usr/bin/env bash
# DVA-C02 Lab 3.6 cleanup
set -uo pipefail
STACK_NAME="dva-lab-03-06-event-notifications"

BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text 2>/dev/null || echo "")
if [ -n "$BUCKET" ] && [ "$BUCKET" != "None" ]; then
  echo "Emptying bucket: $BUCKET"
  aws s3 rm "s3://$BUCKET" --recursive 2>/dev/null || true
fi

echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists — check CloudFormation console"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
