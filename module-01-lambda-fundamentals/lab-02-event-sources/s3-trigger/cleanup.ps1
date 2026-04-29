# Cleanup for Lab 1.2C — S3 trigger sub-stack
# Empties the bucket first (CFN can't delete non-empty buckets), then deletes the stack.
$ErrorActionPreference = 'Continue'
$STACK_NAME = "dva-lab-01-02-s3"

$BUCKET = aws cloudformation describe-stacks --stack-name $STACK_NAME `
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' `
    --output text 2>$null

if ($BUCKET -and $BUCKET -ne 'None') {
    Write-Host "Emptying bucket: $BUCKET"
    aws s3 rm "s3://$BUCKET" --recursive 2>$null | Out-Null
}

Write-Host "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name $STACK_NAME
aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME 2>$null

aws cloudformation describe-stacks --stack-name $STACK_NAME 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists — check CloudFormation console"
    exit 1
}
Write-Host "✓ Stack deleted: $STACK_NAME"
