#!/usr/bin/env bash
# CDK manages its own stack — use cdk destroy
set -uo pipefail

if [ -d cdk ]; then
  cd cdk
  npx cdk destroy --force 2>/dev/null || aws cloudformation delete-stack --stack-name dva-lab-08-07-cdk
  cd ..
fi

echo "✓ Lab 8.7 cleanup complete"
echo "ℹ The CDKToolkit bootstrap stack remains — leave it for future CDK labs, or delete via 'aws cloudformation delete-stack --stack-name CDKToolkit'"
