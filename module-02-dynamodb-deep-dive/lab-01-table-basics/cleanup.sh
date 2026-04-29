#!/usr/bin/env bash
# DVA-C02 Lab 2.1 cleanup
# WARNING: Labs 2.2-2.6 depend on the resources this stack creates.
# Run cleanup for those FIRST (in reverse order: 2.6, 2.5, 2.4, 2.3, 2.2)
# before running this script.
set -uo pipefail
STACK_NAME="dva-lab-02-01-table-basics"

echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists — check CloudFormation console (likely an export is still in use)"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
