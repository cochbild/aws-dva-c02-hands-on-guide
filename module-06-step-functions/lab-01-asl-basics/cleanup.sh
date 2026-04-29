#!/usr/bin/env bash
set -uo pipefail
STACK="dva-lab-06-01-asl-basics"
echo "Deleting stack: $STACK"
aws cloudformation delete-stack --stack-name "$STACK"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" 2>/dev/null && \
  echo "✓ stack deleted" || echo "✗ delete did not finish cleanly — check console"
