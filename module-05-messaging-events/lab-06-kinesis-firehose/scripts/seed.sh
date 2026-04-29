#!/usr/bin/env bash
# Send N records to a Firehose delivery stream
set -euo pipefail
STREAM="${1:?delivery stream required}"
COUNT="${2:-100}"

# put-record-batch supports up to 500 records per call
BATCH_SIZE=500
SENT=0

while [ "$SENT" -lt "$COUNT" ]; do
  remaining=$((COUNT - SENT))
  this_batch=$((remaining < BATCH_SIZE ? remaining : BATCH_SIZE))

  records="["
  for i in $(seq 1 "$this_batch"); do
    payload=$(printf '{"id":%d,"ts":%d,"event":"sample"}\n' "$((SENT + i))" "$(date +%s)")
    encoded=$(printf '%s' "$payload" | base64 | tr -d '\n')
    [ "$i" -gt 1 ] && records="${records},"
    records="${records}{\"Data\":\"${encoded}\"}"
  done
  records="${records}]"

  aws firehose put-record-batch --delivery-stream-name "$STREAM" --records "$records" --output text >/dev/null
  SENT=$((SENT + this_batch))
done

echo "Sent $SENT records to $STREAM"
