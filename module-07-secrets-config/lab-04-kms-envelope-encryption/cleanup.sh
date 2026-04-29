#!/usr/bin/env bash
# DVA-C02 Lab 7.4 cleanup — schedules CMK for 7-day delete
set -uo pipefail
STACK_NAME="dva-lab-07-04-kms-envelope"

KEY_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='KeyId'].OutputValue" \
  --output text 2>/dev/null || echo "")

echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null

# Stack delete leaves the key (CFN can't delete actively-referenced keys cleanly).
# Schedule it manually.
if [ -n "$KEY_ID" ] && [ "$KEY_ID" != "None" ]; then
  echo "Scheduling KMS key deletion (7-day window): $KEY_ID"
  aws kms schedule-key-deletion --key-id "$KEY_ID" --pending-window-in-days 7 2>/dev/null || true
fi

echo "✓ Stack deleted: $STACK_NAME"
echo "ℹ KMS key incurs \$1/month until the 7-day deletion window closes"
