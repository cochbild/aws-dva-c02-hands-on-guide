# DVA-C02 Lab 3.4 cleanup — schedule KMS key deletion + delete stack
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-03-04-encryption-variants"

# Empty the KMS bucket first
$Bucket = aws cloudformation describe-stacks --stack-name $StackName `
  --query "Stacks[0].Outputs[?OutputKey=='KmsBucketName'].OutputValue" `
  --output text 2>$null
if ($Bucket -and $Bucket -ne 'None') {
  Write-Host "Emptying bucket: $Bucket"
  aws s3 rm "s3://$Bucket" --recursive 2>$null
}

# Schedule the customer-managed key for deletion (7-day minimum window)
$KeyId = aws cloudformation describe-stacks --stack-name $StackName `
  --query "Stacks[0].Outputs[?OutputKey=='KmsKeyId'].OutputValue" `
  --output text 2>$null
if ($KeyId -and $KeyId -ne 'None') {
  Write-Host "Scheduling KMS key deletion (7-day window): $KeyId"
  aws kms schedule-key-deletion --key-id $KeyId --pending-window-in-days 7 2>$null
}

Write-Host "Deleting stack: $StackName"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null

aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists — check CloudFormation console"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
Write-Host "ℹ KMS key continues to incur `$1/month until the 7-day deletion window closes"
