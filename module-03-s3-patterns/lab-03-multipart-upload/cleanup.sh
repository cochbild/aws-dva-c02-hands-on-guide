#!/usr/bin/env bash
# DVA-C02 Lab 3.3 cleanup
set -uo pipefail
STACK_NAME="dva-lab-03-03-multipart-upload"

echo "Aborting any in-progress multipart uploads..."
BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [ -n "$BUCKET" ] && [ "$BUCKET" != "None" ]; then
  # Abort all in-progress multipart uploads first (otherwise empty fails)
  aws s3api list-multipart-uploads --bucket "$BUCKET" \
    --query 'Uploads[].[Key,UploadId]' --output text 2>/dev/null | \
    while read -r key uid; do
      [ -n "$key" ] && aws s3api abort-multipart-upload \
        --bucket "$BUCKET" --key "$key" --upload-id "$uid" 2>/dev/null || true
    done
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
