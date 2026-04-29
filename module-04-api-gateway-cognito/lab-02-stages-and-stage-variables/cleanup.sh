#!/usr/bin/env bash
# Lab 4.2 cleanup — also tears down lab 4.3 + 4.4 since they extend this stack
set -uo pipefail
STACK="dva-lab-04-02-stages"

echo "Deleting stack $STACK..."
aws cloudformation delete-stack --stack-name "$STACK"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" 2>/dev/null
echo "✓ $STACK deleted"
rm -f packaged.yaml
