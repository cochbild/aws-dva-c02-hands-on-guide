# Cleanup for Lab 1.2A — SQS consumer sub-stack
$ErrorActionPreference = 'Continue'
$STACK_NAME = "dva-lab-01-02-sqs"

Write-Host "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name $STACK_NAME
aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME 2>$null

aws cloudformation describe-stacks --stack-name $STACK_NAME 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists — check CloudFormation console"
    exit 1
}
Write-Host "✓ Stack deleted: $STACK_NAME"
