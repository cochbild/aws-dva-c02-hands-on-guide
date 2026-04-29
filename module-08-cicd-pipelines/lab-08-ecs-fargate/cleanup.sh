#!/usr/bin/env bash
set -uo pipefail
STACK_NAME="dva-lab-08-08-ecs-fargate"

# Empty the ECR repo (CFN can't delete a non-empty private repo)
aws ecr batch-delete-image --repository-name dva-lab-08-08 \
  --image-ids "$(aws ecr list-images --repository-name dva-lab-08-08 --query 'imageIds[*]' --output json 2>/dev/null)" 2>/dev/null || true

echo "Deleting stack: $STACK_NAME (Fargate cleanup ~5 min)"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
