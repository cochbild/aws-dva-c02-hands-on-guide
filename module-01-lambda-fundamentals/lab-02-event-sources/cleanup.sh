#!/usr/bin/env bash
# Cleanup all three sub-labs of Lab 1.2 in sequence.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

bash "$SCRIPT_DIR/sqs-consumer/cleanup.sh"
bash "$SCRIPT_DIR/ddb-streams/cleanup.sh"
bash "$SCRIPT_DIR/s3-trigger/cleanup.sh"

echo
echo "✓ All Lab 1.2 sub-stacks deleted."
