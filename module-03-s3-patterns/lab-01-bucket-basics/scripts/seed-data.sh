#!/usr/bin/env bash
set -euo pipefail

STACK="dva-lab-03-01-bucket-basics"
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text)

if [ -z "$BUCKET" ] || [ "$BUCKET" = "None" ]; then
  echo "ERROR: bucket not found. Did Lab 3.1 deploy succeed?"
  exit 1
fi

echo "Seeding objects into s3://$BUCKET ..."

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

cat > "$TMPDIR/index.html" <<'HTML'
<!doctype html>
<html><head><meta charset="utf-8"><title>DVA-C02 Lab 3.1</title></head>
<body><h1>It works.</h1>
<p>This page is served from S3 static website hosting. No CloudFront. HTTP only.</p>
<p><a href="hello.txt">hello.txt</a></p>
</body></html>
HTML

cat > "$TMPDIR/error.html" <<'HTML'
<!doctype html>
<html><head><meta charset="utf-8"><title>404</title></head>
<body><h1>Not here.</h1>
<p>The error document is also served by S3 — no Lambda, no API Gateway.</p>
</body></html>
HTML

echo "hello, world. (Lab 3.1)" > "$TMPDIR/hello.txt"

aws s3 cp "$TMPDIR/index.html" "s3://$BUCKET/index.html" --content-type "text/html"
aws s3 cp "$TMPDIR/error.html" "s3://$BUCKET/error.html" --content-type "text/html"
aws s3 cp "$TMPDIR/hello.txt"  "s3://$BUCKET/hello.txt"  --content-type "text/plain"

echo
echo "Seeded 3 objects:"
aws s3api list-objects-v2 --bucket "$BUCKET" --query 'Contents[].Key' --output text
