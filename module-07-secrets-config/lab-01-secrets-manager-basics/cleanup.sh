#!/usr/bin/env bash
# Lab 7.1 cleanup — delete the secret (force, no recovery window) then the stack.
#
# WARNING: --force-delete-without-recovery is for labs only. In production,
# use a recovery window of 7-30 days so a fat-finger is recoverable.

set -uo pipefail

STACK="dva-lab-07-01-secrets-mgr"

echo "=== Lab 7.1 cleanup ==="

# 1. Delete the secret with no recovery window (zero cost from this point).
SECRET_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='SecretArn'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [ -n "$SECRET_ARN" ] && [ "$SECRET_ARN" != "None" ]; then
  echo "Force-deleting secret: $SECRET_ARN"
  aws secretsmanager delete-secret \
    --secret-id "$SECRET_ARN" \
    --force-delete-without-recovery 2>/dev/null || true
fi

# 2. Delete the rotation schedule first (CFN sometimes hangs on this otherwise).
#    The secret being gone makes this a no-op, but it's defensive.

# 3. Delete the stack.
echo "Deleting stack: $STACK"
aws cloudformation delete-stack --stack-name "$STACK"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" 2>/dev/null || true

# 4. Verify.
if aws cloudformation describe-stacks --stack-name "$STACK" 2>&1 | grep -q "does not exist"; then
  echo "✓ Stack $STACK deleted."
else
  echo "✗ Stack $STACK still exists. Inspect with:"
  echo "  aws cloudformation describe-stack-events --stack-name $STACK --max-items 30"
  exit 1
fi
