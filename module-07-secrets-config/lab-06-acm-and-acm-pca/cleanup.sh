#!/usr/bin/env bash
# DVA-C02 Lab 7.6 cleanup — also removes any imported certificate from Step 3
set -uo pipefail
STACK_NAME="dva-lab-07-06-acm"

# Delete any imported certs that are tagged as our lab's
for arn in $(aws acm list-certificates --query "CertificateSummaryList[?contains(DomainName,'dva-lab.example') || contains(DomainName,'dva-lab-07')].CertificateArn" --output text 2>/dev/null); do
  STACK_OWNED=$(aws acm describe-certificate --certificate-arn "$arn" --query "Certificate.Type" --output text 2>/dev/null)
  if [ "$STACK_OWNED" = "IMPORTED" ]; then
    echo "Deleting imported cert: $arn"
    aws acm delete-certificate --certificate-arn "$arn" 2>/dev/null || true
  fi
done

echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "✗ Stack still exists"
  exit 1
fi
echo "✓ Stack deleted: $STACK_NAME"
