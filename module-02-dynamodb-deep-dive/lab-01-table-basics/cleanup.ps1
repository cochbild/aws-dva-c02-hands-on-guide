# DVA-C02 Lab 2.1 cleanup
# WARNING: Labs 2.2-2.6 depend on the resources this stack creates.
# Run cleanup for those FIRST (in reverse order: 2.6, 2.5, 2.4, 2.3, 2.2)
# before running this script.
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-02-01-table-basics"

Write-Host "Deleting stack: $StackName"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null

aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists — check CloudFormation console (likely an export is still in use)"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
