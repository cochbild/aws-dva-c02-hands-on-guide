#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="dva-lab-01-07-vpc-lambda"

# Empty bucket first since CloudFormation can't delete non-empty
BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -n "$BUCKET" ]; then
  echo "Emptying bucket: $BUCKET"
  aws s3 rm "s3://$BUCKET" --recursive || true
fi

echo "Deleting stack (this takes ~5 min for VPC ENI cleanup)..."
sam delete --stack-name "$STACK_NAME" --no-prompts
