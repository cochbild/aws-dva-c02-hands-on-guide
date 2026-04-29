# DVA-C02 Lab 2.8 cleanup — also removes any manual snapshot taken in Step 6
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-02-08-rds-mysql"

# Best-effort: delete the manual snapshot if it exists
aws rds delete-db-snapshot --db-snapshot-identifier dva-lab-02-08-snap-1 2>$null

Write-Host "Deleting stack: $StackName (RDS deletion takes 5-10 minutes)"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null

aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists — check CloudFormation console"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
