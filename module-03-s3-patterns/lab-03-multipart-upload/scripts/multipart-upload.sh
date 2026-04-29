#!/usr/bin/env bash
# 5-step S3 multipart upload demo.
# Usage: multipart-upload.sh <bucket> <key> <file>
set -euo pipefail
BUCKET="${1:?bucket required}"
KEY="${2:?key required}"
FILE="${3:?file required}"

PART_SIZE=$((5 * 1024 * 1024))   # 5 MB
FILE_SIZE=$(stat -c%s "$FILE" 2>/dev/null || stat -f%z "$FILE")
echo "File size: $FILE_SIZE bytes ($((FILE_SIZE / 1024 / 1024)) MB)"
NUM_PARTS=$(( (FILE_SIZE + PART_SIZE - 1) / PART_SIZE ))
echo "Will split into $NUM_PARTS parts"
echo ""

# Step 1: CreateMultipartUpload
echo "=== Step 1: CreateMultipartUpload ==="
UPLOAD_ID=$(aws s3api create-multipart-upload \
  --bucket "$BUCKET" --key "$KEY" \
  --query UploadId --output text)
echo "UploadId: $UPLOAD_ID"
echo ""

# Step 2: UploadPart for each chunk
echo "=== Step 2: UploadPart x $NUM_PARTS ==="
PARTS_JSON='{"Parts":['
for i in $(seq 1 $NUM_PARTS); do
  OFFSET=$(( (i - 1) * PART_SIZE ))
  TMPFILE=$(mktemp)
  dd if="$FILE" of="$TMPFILE" bs="$PART_SIZE" count=1 skip=$((i - 1)) status=none 2>/dev/null
  ETAG=$(aws s3api upload-part \
    --bucket "$BUCKET" --key "$KEY" \
    --part-number "$i" --upload-id "$UPLOAD_ID" \
    --body "$TMPFILE" \
    --query ETag --output text)
  rm "$TMPFILE"
  echo "  Part $i uploaded — ETag $ETAG"
  if [ "$i" -gt 1 ]; then PARTS_JSON+=','; fi
  PARTS_JSON+="{\"PartNumber\":$i,\"ETag\":$ETAG}"
done
PARTS_JSON+=']}'
echo ""

# Step 3: ListParts (optional, for visibility)
echo "=== Step 3: ListParts (sanity check) ==="
aws s3api list-parts --bucket "$BUCKET" --key "$KEY" --upload-id "$UPLOAD_ID" \
  --query 'Parts[].{PartNumber:PartNumber,Size:Size}'
echo ""

# Step 4: CompleteMultipartUpload
echo "=== Step 4: CompleteMultipartUpload ==="
echo "$PARTS_JSON" > parts.json
aws s3api complete-multipart-upload \
  --bucket "$BUCKET" --key "$KEY" \
  --upload-id "$UPLOAD_ID" \
  --multipart-upload "file://parts.json"
rm parts.json
echo ""

echo "=== Done. Verify with: ==="
echo "  aws s3api head-object --bucket $BUCKET --key $KEY"
