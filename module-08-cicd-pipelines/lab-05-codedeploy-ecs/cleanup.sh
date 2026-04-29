#!/usr/bin/env bash
set -uo pipefail
STACK_NAME="dva-lab-08-05-codedeploy-ecs"

echo "Deleting stack: $STACK_NAME (ECS + ALB cleanup takes ~10 min)"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
