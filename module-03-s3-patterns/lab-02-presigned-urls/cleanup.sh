#!/usr/bin/env bash
# Cleanup for Lab 3.2 — removes only the presigner Lambda stack.
# The Lab 3.1 bucket is untouched.

set -uo pipefail

STACK="dva-lab-03-02-presigned-urls"

echo "Deleting stack: $STACK"
aws cloudformation delete-stack --stack-name "$STACK"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" 2>/dev/null || true

if aws cloudformation describe-stacks --stack-name "$STACK" 2>&1 | grep -q "does not exist"; then
    echo "✓ Stack $STACK deleted"
else
    echo "✗ Stack $STACK still exists"
fi
