#!/usr/bin/env bash
# Seed sessions with varying TTL values to demonstrate TTL behavior.
set -euo pipefail
TABLE="dva-lab-02-07-sessions"
NOW=$(date +%s)

declare -A SESSIONS=(
  ["expired-1hr-ago"]=$((NOW - 3600))
  ["expires-60-sec"]=$((NOW + 60))
  ["expires-1-hr"]=$((NOW + 3600))
  ["expires-1-day"]=$((NOW + 86400))
  ["expires-30-day"]=$((NOW + 2592000))
)

for sid in "${!SESSIONS[@]}"; do
  exp=${SESSIONS[$sid]}
  aws dynamodb put-item \
    --table-name "$TABLE" \
    --item "{\"session_id\":{\"S\":\"$sid\"},\"data\":{\"S\":\"sample\"},\"expires_at\":{\"N\":\"$exp\"}}"
  echo "  put $sid (expires_at=$exp)"
done

echo ""
echo "Seeded 5 sessions into $TABLE"
echo "NOTE: 'expired-1hr-ago' has TTL in the past but will still be readable"
echo "      until DynamoDB's TTL sweeper removes it (up to 48 hours)."
