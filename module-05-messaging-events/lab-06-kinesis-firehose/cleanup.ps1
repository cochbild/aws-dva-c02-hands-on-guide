# DVA-C02 Lab 5.6 cleanup
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-05-06-firehose"

$bucket = aws cloudformation describe-stacks --stack-name $StackName `
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" `
  --output text 2>$null
if ($bucket -and $bucket -ne 'None') {
    aws s3 rm "s3://$bucket" --recursive 2>$null
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
