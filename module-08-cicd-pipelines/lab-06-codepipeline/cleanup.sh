#!/usr/bin/env bash
set -uo pipefail
STACK_NAME="dva-lab-08-06-codepipeline"

# Empty pipeline buckets
for KEY in ArtifactsBucket RepoSeedBucket; do
  B=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='$KEY'].OutputValue" --output text 2>/dev/null || echo "")
  [ -n "$B" ] && [ "$B" != "None" ] && aws s3 rm "s3://$B" --recursive 2>/dev/null || true
done

# The pipeline's deploy created a separate stack — delete it too
aws cloudformation delete-stack --stack-name dva-lab-08-06-deployed 2>/dev/null || true

echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
