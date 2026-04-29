#!/usr/bin/env bash
# DVA-C02 Capstone cleanup
set -uo pipefail
STACK_NAME="dva-lab-10-01-capstone"

# Empty archive bucket
BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ArchiveBucket'].OutputValue" --output text 2>/dev/null || echo "")
[ -n "$BUCKET" ] && [ "$BUCKET" != "None" ] && aws s3 rm "s3://$BUCKET" --recursive 2>/dev/null || true

# Schedule KMS key for delete
KEY_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='KmsKeyArn'].OutputValue" --output text 2>/dev/null || echo "")
[ -n "$KEY_ARN" ] && [ "$KEY_ARN" != "None" ] && aws kms schedule-key-deletion --key-id "$KEY_ARN" --pending-window-in-days 7 2>/dev/null || true

# Force-delete the secret (skip 7-day recovery window for the lab)
SECRET_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='StripeSecretArn'].OutputValue" --output text 2>/dev/null || echo "")
[ -n "$SECRET_ARN" ] && [ "$SECRET_ARN" != "None" ] && aws secretsmanager delete-secret --secret-id "$SECRET_ARN" --force-delete-without-recovery 2>/dev/null || true

# Purge DLQ
DLQ=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='EbDlqUrl'].OutputValue" --output text 2>/dev/null || echo "")
[ -n "$DLQ" ] && [ "$DLQ" != "None" ] && aws sqs purge-queue --queue-url "$DLQ" 2>/dev/null || true

echo "Deleting stack: $STACK_NAME (this is the biggest stack — ~5-10 min)"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists — check console (sometimes Cognito or DynamoDB linger)"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
echo "ℹ KMS key incurs \$1/month until the 7-day deletion window closes"
