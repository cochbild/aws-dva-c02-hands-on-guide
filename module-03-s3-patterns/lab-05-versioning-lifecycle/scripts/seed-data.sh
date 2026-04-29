#!/usr/bin/env bash
# Upload the same key 5 times to demonstrate versioning
set -euo pipefail
BUCKET="${1:?bucket name required}"

for i in 1 2 3 4 5; do
  echo "version $i — content at $(date)" > /tmp/doc.txt
  aws s3 cp /tmp/doc.txt "s3://$BUCKET/doc.txt"
  sleep 1
done

echo "Done. 5 versions of doc.txt uploaded to $BUCKET"
