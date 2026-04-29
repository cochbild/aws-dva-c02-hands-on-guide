# DVA-C02 Lab 7.4 cleanup — schedules CMK for 7-day delete
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-07-04-kms-envelope"

$KeyId = aws cloudformation describe-stacks --stack-name $StackName `
  --query "Stacks[0].Outputs[?OutputKey=='KeyId'].OutputValue" `
  --output text 2>$null

Write-Host "Deleting stack: $StackName"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null

if ($KeyId -and $KeyId -ne 'None') {
    Write-Host "Scheduling KMS key deletion (7-day window): $KeyId"
    aws kms schedule-key-deletion --key-id $KeyId --pending-window-in-days 7 2>$null
}

Write-Host "✓ Stack deleted: $StackName"
Write-Host "ℹ KMS key incurs `$1/month until the 7-day deletion window closes"
