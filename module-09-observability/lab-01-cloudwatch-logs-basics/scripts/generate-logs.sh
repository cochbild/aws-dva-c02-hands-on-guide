#!/usr/bin/env bash
# Invoke the emitter 100 times to populate CloudWatch Logs.
set -uo pipefail

FN="dva-lab-09-01-emitter"
echo "Invoking $FN 100 times..."
for i in $(seq 1 100); do
  aws lambda invoke \
    --function-name "$FN" \
    --cli-input-json file://payloads/invoke.json \
    --cli-binary-format raw-in-base64-out \
    /dev/null > /dev/null
  if (( i % 10 == 0 )); then
    echo "  $i / 100"
  fi
done
echo "Done. Wait ~30 seconds for log delivery before querying."
