#!/usr/bin/env bash
# Cleanup for Lab 3.1.
#
# WARNING: this also tears down the bucket used by labs 3.2, 3.3, and 3.4.
# Only run this after you've finished Lab 3.4 (or if you want to start over).

set -uo pipefail

STACK="dva-lab-03-01-bucket-basics"

BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [ -n "$BUCKET" ] && [ "$BUCKET" != "None" ]; then
    echo "Emptying bucket: $BUCKET"

    # Versioned-bucket-safe deletion: clear all versions and delete-markers
    VERSIONS=$(aws s3api list-object-versions --bucket "$BUCKET" \
      --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
      --output json 2>/dev/null || echo "")
    if [ -n "$VERSIONS" ] && ! echo "$VERSIONS" | grep -q '"Objects": null'; then
        aws s3api delete-objects --bucket "$BUCKET" --delete "$VERSIONS" >/dev/null 2>&1 || true
    fi

    MARKERS=$(aws s3api list-object-versions --bucket "$BUCKET" \
      --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' \
      --output json 2>/dev/null || echo "")
    if [ -n "$MARKERS" ] && ! echo "$MARKERS" | grep -q '"Objects": null'; then
        aws s3api delete-objects --bucket "$BUCKET" --delete "$MARKERS" >/dev/null 2>&1 || true
    fi

    # Fallback for unversioned objects
    aws s3 rm "s3://$BUCKET" --recursive 2>/dev/null || true
fi

echo "Deleting stack: $STACK"
aws cloudformation delete-stack --stack-name "$STACK"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" 2>/dev/null || true

if aws cloudformation describe-stacks --stack-name "$STACK" 2>&1 | grep -q "does not exist"; then
    echo "✓ Stack $STACK deleted"
else
    echo "✗ Stack $STACK still exists — check console:"
    echo "  aws cloudformation describe-stack-events --stack-name $STACK --max-items 30"
fi
