#!/usr/bin/env bash
set -uo pipefail
STACK_NAME="dva-lab-08-09-beanstalk"

BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='EbBucket'].OutputValue" --output text 2>/dev/null || echo "")
[ -n "$BUCKET" ] && [ "$BUCKET" != "None" ] && aws s3 rm "s3://$BUCKET" --recursive 2>/dev/null || true

echo "Deleting stack: $STACK_NAME (Beanstalk teardown ~5 min)"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
