#!/usr/bin/env bash
# Tear down ALL DVA-C02 lab stacks in the current AWS account + region.
#
# Finds every CloudFormation stack starting with "dva-lab-" in the default
# region (AWS_DEFAULT_REGION), empties any S3 buckets they expose as
# BucketName outputs, then deletes the stacks.
#
# Stacks named dva-lab-* are this course's convention. Any other stacks
# in your account are left alone.
#
# Usage:
#   ./cleanup-all.sh                      # interactive: prints stacks, asks before deleting
#   ./cleanup-all.sh -y                   # auto-confirm
#   ./cleanup-all.sh --purge-artifacts    # also empty + delete the dva-lab-artifacts-<acct>-<region> bucket
#   ./cleanup-all.sh -y --purge-artifacts # both

set -uo pipefail

AUTO_CONFIRM=0
PURGE_ARTIFACTS=0
for arg in "$@"; do
  case "$arg" in
    -y|--yes)             AUTO_CONFIRM=1 ;;
    --purge-artifacts)    PURGE_ARTIFACTS=1 ;;
    *) echo "Unknown flag: $arg" >&2; exit 2 ;;
  esac
done

REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Region:  $REGION"
echo "Account: $ACCOUNT_ID"
echo
echo "Finding all dva-lab-* stacks..."

# Include stacks in any non-deleted state, in case some are stuck
STACKS=$(aws cloudformation list-stacks \
  --stack-status-filter \
    CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE \
    UPDATE_ROLLBACK_COMPLETE CREATE_FAILED ROLLBACK_FAILED \
    UPDATE_FAILED UPDATE_ROLLBACK_FAILED IMPORT_COMPLETE \
    IMPORT_ROLLBACK_COMPLETE IMPORT_ROLLBACK_FAILED \
  --query 'StackSummaries[?starts_with(StackName, `dva-lab-`)].StackName' \
  --output text 2>/dev/null)

if [ -z "$STACKS" ]; then
  echo "No dva-lab-* stacks found."
else
  echo "Found stacks:"
  for s in $STACKS; do
    echo "  - $s"
  done
fi

if [ "$PURGE_ARTIFACTS" -eq 1 ]; then
  ARTIFACTS_BUCKET="dva-lab-artifacts-${ACCOUNT_ID}-${REGION}"
  if aws s3api head-bucket --bucket "$ARTIFACTS_BUCKET" 2>/dev/null; then
    echo "Will also purge artifacts bucket: $ARTIFACTS_BUCKET"
  else
    echo "No artifacts bucket found at $ARTIFACTS_BUCKET — skipping purge."
    PURGE_ARTIFACTS=0
  fi
fi

if [ -z "$STACKS" ] && [ "$PURGE_ARTIFACTS" -eq 0 ]; then
  echo "Nothing to do."
  exit 0
fi

if [ "$AUTO_CONFIRM" -eq 0 ]; then
  echo
  read -r -p "Proceed? [y/N] " REPLY
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

empty_bucket() {
  local b="$1"
  echo "  Emptying bucket: $b"

  # Delete object versions (versioned buckets). Skip the call entirely if
  # the bucket has no versions — passing {"Objects": null} produces a
  # MalformedXML error from delete-objects.
  local versions_json
  versions_json=$(aws s3api list-object-versions --bucket "$b" \
    --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
    --output json 2>/dev/null)
  if [ -n "$versions_json" ] && ! echo "$versions_json" | grep -q '"Objects": null'; then
    aws s3api delete-objects --bucket "$b" --delete "$versions_json" >/dev/null 2>&1 || true
  fi

  # Delete delete-markers
  local markers_json
  markers_json=$(aws s3api list-object-versions --bucket "$b" \
    --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' \
    --output json 2>/dev/null)
  if [ -n "$markers_json" ] && ! echo "$markers_json" | grep -q '"Objects": null'; then
    aws s3api delete-objects --bucket "$b" --delete "$markers_json" >/dev/null 2>&1 || true
  fi

  # Fallback unversioned recursive delete
  aws s3 rm "s3://$b" --recursive >/dev/null 2>&1 || true
}

for s in $STACKS; do
  echo
  echo "=== Deleting $s ==="

  BUCKETS=$(aws cloudformation describe-stacks --stack-name "$s" \
    --query 'Stacks[0].Outputs[?ends_with(OutputKey, `Bucket`) || ends_with(OutputKey, `BucketName`)].OutputValue' \
    --output text 2>/dev/null || echo "")
  for b in $BUCKETS; do
    if [ -n "$b" ] && [ "$b" != "None" ]; then
      empty_bucket "$b"
    fi
  done

  # Disable termination protection (rare on lab stacks, but safe)
  aws cloudformation update-termination-protection \
    --stack-name "$s" \
    --no-enable-termination-protection >/dev/null 2>&1 || true

  aws cloudformation delete-stack --stack-name "$s"
done

if [ "$PURGE_ARTIFACTS" -eq 1 ]; then
  echo
  echo "=== Purging artifacts bucket: $ARTIFACTS_BUCKET ==="
  empty_bucket "$ARTIFACTS_BUCKET"
  aws s3api delete-bucket --bucket "$ARTIFACTS_BUCKET" 2>/dev/null \
    && echo "  Deleted $ARTIFACTS_BUCKET" \
    || echo "  Warning: failed to delete $ARTIFACTS_BUCKET (may still hold objects from in-flight stacks)"
fi

echo
echo "Delete commands issued. Stacks will tear down in the background."
echo "Monitor with:"
echo "  aws cloudformation list-stacks --stack-status-filter DELETE_IN_PROGRESS"
