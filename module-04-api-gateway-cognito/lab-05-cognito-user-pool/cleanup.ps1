# DVA-C02 Lab 4.5 cleanup
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-04-05-cognito-user-pool"

Write-Host "Deleting stack: $StackName"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null

aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists — check CloudFormation console (Lab 4.6 may still depend on its exports)"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
