# DVA-C02 Lab 2.10 cleanup
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-02-10-elasticache-redis"

Write-Host "Deleting stack: $StackName (ElastiCache deletion takes ~5 min)"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null

aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists — check CloudFormation console"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
