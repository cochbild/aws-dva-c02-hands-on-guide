#!/usr/bin/env bash
# Cleanup for Lab 8.1 — CodeCommit repo.
#
# IMPORTANT: This deletes the repo used by labs 8.2-8.6. Only run if you've
# finished Lab 8.6 or are stopping the chain early.

set -uo pipefail

STACK="dva-lab-08-01-codecommit"

echo "=== Cleaning up $STACK ==="

aws cloudformation delete-stack --stack-name "$STACK"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" || true

# Verify
if aws cloudformation describe-stacks --stack-name "$STACK" >/dev/null 2>&1; then
  echo "✗ Stack still exists — check console for delete errors"
  exit 1
fi

echo "✓ Stack $STACK deleted"
echo
echo "If you have a local clone of the repo at ./dva-lab-08-app/, delete it manually:"
echo "  rm -rf dva-lab-08-app/"
