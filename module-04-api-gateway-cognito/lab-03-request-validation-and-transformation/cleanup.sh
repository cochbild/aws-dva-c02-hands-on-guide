#!/usr/bin/env bash
# Lab 4.3 cleanup — same stack as Lab 4.2
set -uo pipefail
STACK="dva-lab-04-02-stages"

echo "Deleting stack $STACK..."
aws cloudformation delete-stack --stack-name "$STACK"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" 2>/dev/null
echo "✓ $STACK deleted"
rm -f packaged.yaml
