# DVA-C02 Lab 2.11 cleanup
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-02-11-memorydb"

Write-Host "Deleting stack: $StackName (MemoryDB deletion takes ~10 min)"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null

aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists — check CloudFormation console"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
