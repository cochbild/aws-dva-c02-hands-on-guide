#!/usr/bin/env bash
set -uo pipefail
STACK_NAME="dva-lab-07-02-param-store"

# If user converted the api-key to SecureString via CLI, we need to delete it
# directly because CFN won't track changes to the type.
aws ssm delete-parameter --name /dva/lab-07/api-key 2>/dev/null || true

echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
