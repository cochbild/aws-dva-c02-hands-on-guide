#!/usr/bin/env bash
set -uo pipefail
STACK_NAME="dva-lab-06-05-integration-patterns"

URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='QueueUrl'].OutputValue" \
  --output text 2>/dev/null || echo "")
[ -n "$URL" ] && [ "$URL" != "None" ] && aws sqs purge-queue --queue-url "$URL" 2>/dev/null || true

echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
