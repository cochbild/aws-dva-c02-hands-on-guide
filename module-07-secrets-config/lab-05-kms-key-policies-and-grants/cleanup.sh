#!/usr/bin/env bash
set -uo pipefail
STACK_NAME="dva-lab-07-05-kms-grants"

# Revoke any active grants we created during the lab
KEY_ID=$(aws cloudformation list-exports --query "Exports[?Name=='dva-lab-07-04-key-id'].Value" --output text 2>/dev/null || echo "")
ROLE_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='RoleArn'].OutputValue" --output text 2>/dev/null || echo "")
if [ -n "$KEY_ID" ] && [ "$KEY_ID" != "None" ] && [ -n "$ROLE_ARN" ]; then
  for grant in $(aws kms list-grants --key-id "$KEY_ID" --query "Grants[?GranteePrincipal=='$ROLE_ARN'].GrantId" --output text 2>/dev/null); do
    [ -n "$grant" ] && aws kms revoke-grant --key-id "$KEY_ID" --grant-id "$grant" 2>/dev/null || true
  done
fi

echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
