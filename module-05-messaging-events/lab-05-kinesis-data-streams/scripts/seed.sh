#!/usr/bin/env bash
# Send N records to a Kinesis stream, varying partition key
set -euo pipefail
STREAM="${1:?stream name required}"
COUNT="${2:-50}"

for i in $(seq 1 "$COUNT"); do
  KEY="customer-$((i % 5))"
  DATA=$(printf '{"id":%d,"customer":"%s","ts":%d}' "$i" "$KEY" "$(date +%s)" | base64 | tr -d '\n')
  aws kinesis put-record --stream-name "$STREAM" --partition-key "$KEY" --data "$DATA" --output text >/dev/null
done

echo "Sent $COUNT records to $STREAM"
