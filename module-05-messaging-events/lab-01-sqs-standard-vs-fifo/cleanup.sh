#!/usr/bin/env bash
# Tear down Lab 5.1 (SQS Standard vs FIFO).
set -uo pipefail

STACK="dva-lab-05-01-sqs"

echo "Purging queues before stack delete (so DELETE_COMPLETE is faster)..."
for OUTPUT_KEY in StandardQueueUrl StandardDlqUrl FifoQueueUrl; do
  URL=$(aws cloudformation describe-stacks --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$OUTPUT_KEY'].OutputValue" \
    --output text 2>/dev/null || echo "")
  if [ -n "$URL" ] && [ "$URL" != "None" ]; then
    echo "  purging $URL"
    aws sqs purge-queue --queue-url "$URL" 2>/dev/null || true
  fi
done

echo "Deleting stack $STACK..."
aws cloudformation delete-stack --stack-name "$STACK"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" 2>/dev/null && \
  echo "✓ stack deleted" || \
  echo "Stack delete in progress; verify with: aws cloudformation describe-stacks --stack-name $STACK"
