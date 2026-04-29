#!/usr/bin/env bash
# DVA-C02 Lab 2.8 cleanup — also removes any manual snapshot taken in Step 6
set -uo pipefail
STACK_NAME="dva-lab-02-08-rds-mysql"

# Best-effort: delete the manual snapshot if it exists
aws rds delete-db-snapshot --db-snapshot-identifier dva-lab-02-08-snap-1 2>/dev/null || true

echo "Deleting stack: $STACK_NAME (RDS deletion takes 5–10 minutes)"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists — check CloudFormation console"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
