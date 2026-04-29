#!/usr/bin/env bash
# DVA-C02 Lab 5.5 cleanup
set -uo pipefail
STACK_NAME="dva-lab-05-05-kinesis"

URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='DlqUrl'].OutputValue" \
  --output text 2>/dev/null || echo "")
[ -n "$URL" ] && [ "$URL" != "None" ] && aws sqs purge-queue --queue-url "$URL" 2>/dev/null || true

echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists — check CloudFormation console"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
