#!/usr/bin/env bash
# Send 10 messages to the Standard queue.
# Usage: ./seed-standard.sh <queue-url>
set -euo pipefail

QUEUE_URL="${1:-}"
if [ -z "$QUEUE_URL" ]; then
  echo "usage: $0 <queue-url>" >&2
  exit 1
fi

for i in $(seq 1 10); do
  PADDED=$(printf "%03d" "$i")
  aws sqs send-message \
    --queue-url "$QUEUE_URL" \
    --message-body "msg-$PADDED" \
    --output text >/dev/null
  echo "sent msg-$PADDED"
done

echo "Done. Sent 10 messages to $QUEUE_URL"
