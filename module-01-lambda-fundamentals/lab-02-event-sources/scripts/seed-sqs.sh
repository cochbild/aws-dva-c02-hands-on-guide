#!/usr/bin/env bash
# Seed the source SQS queue for Lab 1.2A.
# Sends 5 valid messages and 1 designed-to-fail message.
# Usage: ./seed-sqs.sh <queue-url>

set -euo pipefail

QUEUE_URL="${1:-}"
if [ -z "$QUEUE_URL" ]; then
  echo "Usage: $0 <queue-url>" >&2
  exit 1
fi

# 5 well-formed messages
for i in 1 2 3 4 5; do
  aws sqs send-message \
    --queue-url "$QUEUE_URL" \
    --message-body "{\"id\": \"order-${i}\", \"qty\": ${i}}" >/dev/null
  echo "  sent: order-${i}"
done

# 1 message that the consumer raises on (body.id == "fail-me")
aws sqs send-message \
  --queue-url "$QUEUE_URL" \
  --message-body '{"id": "fail-me", "qty": 99}' >/dev/null
echo "  sent: fail-me  (Lambda will fail this one — watch DLQ)"

echo
echo "✓ 6 messages sent. Tail the function logs to watch processing."
