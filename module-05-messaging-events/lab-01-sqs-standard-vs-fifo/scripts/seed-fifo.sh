#!/usr/bin/env bash
# Send 5 messages to MessageGroupId=order-A and 5 to MessageGroupId=order-B.
# Both groups will be ordered internally; groups may interleave with each other.
# Usage: ./seed-fifo.sh <queue-url>
set -euo pipefail

QUEUE_URL="${1:-}"
if [ -z "$QUEUE_URL" ]; then
  echo "usage: $0 <queue-url>" >&2
  exit 1
fi

for group in order-A order-B; do
  for i in $(seq 1 5); do
    PADDED=$(printf "%02d" "$i")
    aws sqs send-message \
      --queue-url "$QUEUE_URL" \
      --message-body "$group-msg-$PADDED" \
      --message-group-id "$group" \
      --output text >/dev/null
    echo "sent $group-msg-$PADDED to group $group"
  done
done

echo "Done. Sent 10 messages (5 per group) to $QUEUE_URL"
