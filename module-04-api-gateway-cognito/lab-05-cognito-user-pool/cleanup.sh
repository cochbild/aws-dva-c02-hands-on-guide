#!/usr/bin/env bash
# DVA-C02 Lab 4.5 cleanup
set -uo pipefail
STACK_NAME="dva-lab-04-05-cognito-user-pool"

echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists — check CloudFormation console (Lab 4.6 may still depend on its exports)"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
