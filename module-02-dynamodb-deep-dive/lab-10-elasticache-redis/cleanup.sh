#!/usr/bin/env bash
# DVA-C02 Lab 2.10 cleanup
set -uo pipefail
STACK_NAME="dva-lab-02-10-elasticache-redis"

echo "Deleting stack: $STACK_NAME (ElastiCache deletion takes ~5 min)"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists — check CloudFormation console"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
