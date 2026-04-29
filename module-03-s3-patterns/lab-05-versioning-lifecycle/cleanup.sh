#!/usr/bin/env bash
# DVA-C02 Lab 3.5 cleanup — properly empty versioned bucket then delete stack
set -uo pipefail
STACK_NAME="dva-lab-03-05-versioning-lifecycle"

BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [ -n "$BUCKET" ] && [ "$BUCKET" != "None" ]; then
  echo "Deleting all object versions in $BUCKET..."
  aws s3api delete-objects --bucket "$BUCKET" \
    --delete "$(aws s3api list-object-versions --bucket "$BUCKET" \
      --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
      --output json 2>/dev/null)" 2>/dev/null || true

  echo "Deleting all delete-markers..."
  aws s3api delete-objects --bucket "$BUCKET" \
    --delete "$(aws s3api list-object-versions --bucket "$BUCKET" \
      --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' \
      --output json 2>/dev/null)" 2>/dev/null || true

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
