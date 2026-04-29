#!/usr/bin/env bash
# Tear down Lab 9.1.
set -uo pipefail

STACK="dva-lab-09-01-logs-basics"
echo "Deleting stack $STACK..."
aws cloudformation delete-stack --stack-name "$STACK"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" 2>/dev/null || true

# Best-effort: ensure log groups gone (CFN normally removes them since we
# created them in the template, but be defensive)
for lg in /aws/lambda/dva-lab-09-01-emitter /aws/lambda/dva-lab-09-01-forwarder; do
  aws logs delete-log-group --log-group-name "$lg" 2>/dev/null || true
done

echo "✓ Stack $STACK deleted."
