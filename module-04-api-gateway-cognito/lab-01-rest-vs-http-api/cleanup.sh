#!/usr/bin/env bash
# Lab 4.1 cleanup
set -uo pipefail
STACK="dva-lab-04-01-rest-vs-http"

echo "Deleting stack $STACK..."
aws cloudformation delete-stack --stack-name "$STACK"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" 2>/dev/null
echo "✓ $STACK deleted"
rm -f packaged.yaml
