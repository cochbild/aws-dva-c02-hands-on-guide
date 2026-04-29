<#
.SYNOPSIS
    Seed sample HTML and text objects into the Lab 3.1 bucket for static website hosting.
#>

$ErrorActionPreference = 'Stop'

$STACK  = "dva-lab-03-01-bucket-basics"
$BUCKET = aws cloudformation describe-stacks `
    --stack-name $STACK `
    --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" `
    --output text

if (-not $BUCKET -or $BUCKET -eq 'None') {
    Write-Error "Bucket not found. Did Lab 3.1 deploy succeed?"
    exit 1
}

Write-Host "Seeding objects into s3://$BUCKET ..."

$TMP = New-Item -ItemType Directory -Path (Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid())) -Force

try {
    $indexHtml = @'
<!doctype html>
<html><head><meta charset="utf-8"><title>DVA-C02 Lab 3.1</title></head>
<body><h1>It works.</h1>
<p>This page is served from S3 static website hosting. No CloudFront. HTTP only.</p>
<p><a href="hello.txt">hello.txt</a></p>
</body></html>
'@

    $errorHtml = @'
<!doctype html>
<html><head><meta charset="utf-8"><title>404</title></head>
<body><h1>Not here.</h1>
<p>The error document is also served by S3 — no Lambda, no API Gateway.</p>
</body></html>
'@

    Set-Content -Path (Join-Path $TMP 'index.html') -Value $indexHtml -Encoding UTF8 -NoNewline
    Set-Content -Path (Join-Path $TMP 'error.html') -Value $errorHtml -Encoding UTF8 -NoNewline
    Set-Content -Path (Join-Path $TMP 'hello.txt')  -Value "hello, world. (Lab 3.1)" -Encoding UTF8 -NoNewline

    aws s3 cp (Join-Path $TMP 'index.html') "s3://$BUCKET/index.html" --content-type "text/html"
    aws s3 cp (Join-Path $TMP 'error.html') "s3://$BUCKET/error.html" --content-type "text/html"
    aws s3 cp (Join-Path $TMP 'hello.txt')  "s3://$BUCKET/hello.txt"  --content-type "text/plain"
}
finally {
    Remove-Item -Path $TMP -Recurse -Force
}

Write-Host ""
Write-Host "Seeded 3 objects:"
aws s3api list-objects-v2 --bucket $BUCKET --query 'Contents[].Key' --output text
