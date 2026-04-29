#!/usr/bin/env bash
# DVA-C02 Lab 1.1 cleanup
set -uo pipefail
STACK_NAME="dva-lab-01-01-hello-sam"

echo "Deleting stack: $STACK_NAME"
sam delete --stack-name "$STACK_NAME" --no-prompts 2>/dev/null || \
  aws cloudformation delete-stack --stack-name "$STACK_NAME"

echo "Waiting for delete to complete..."
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists — check CloudFormation console"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
