# DVA-C02 Lab 3.3 cleanup
$ErrorActionPreference = 'Continue'
$Stack = "dva-lab-03-03-multipart-upload"

Write-Host "Aborting any in-progress multipart uploads..."
$Bucket = aws cloudformation describe-stacks --stack-name $Stack `
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" `
  --output text 2>$null

if ($Bucket -and $Bucket -ne 'None') {
  $uploadsRaw = aws s3api list-multipart-uploads --bucket $Bucket `
    --query 'Uploads[].[Key,UploadId]' --output text 2>$null
  if ($uploadsRaw) {
    $uploadsRaw -split "`n" | ForEach-Object {
      $parts = $_ -split '\s+'
      if ($parts[0]) {
        aws s3api abort-multipart-upload --bucket $Bucket --key $parts[0] --upload-id $parts[1] 2>$null | Out-Null
      }
    }
  }
  Write-Host "Emptying bucket: $Bucket"
  aws s3 rm "s3://$Bucket" --recursive 2>$null | Out-Null
}

Write-Host "Deleting stack: $Stack"
aws cloudformation delete-stack --stack-name $Stack
aws cloudformation wait stack-delete-complete --stack-name $Stack 2>$null

$exists = aws cloudformation describe-stacks --stack-name $Stack 2>$null
if ($exists) { Write-Host "✗ Stack still exists" -ForegroundColor Red; exit 1 }
Write-Host "✓ Stack deleted: $Stack" -ForegroundColor Green
