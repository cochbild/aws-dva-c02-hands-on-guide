$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-08-09-beanstalk"

$Bucket = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='EbBucket'].OutputValue" --output text 2>$null
if ($Bucket -and $Bucket -ne 'None') { aws s3 rm "s3://$Bucket" --recursive 2>$null }

Write-Host "Deleting stack: $StackName (Beanstalk teardown ~5 min)"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null
aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Host "✗ Stack still exists"; exit 1 }
Write-Host "✓ Stack deleted: $StackName"
