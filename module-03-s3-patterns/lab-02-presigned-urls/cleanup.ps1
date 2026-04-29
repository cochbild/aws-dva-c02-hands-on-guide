<#
.SYNOPSIS
    Cleanup for Lab 3.2 — removes only the presigner Lambda stack.
    The Lab 3.1 bucket is untouched.
#>

$ErrorActionPreference = 'Continue'

$STACK = "dva-lab-03-02-presigned-urls"

Write-Host "Deleting stack: $STACK"
aws cloudformation delete-stack --stack-name $STACK
aws cloudformation wait stack-delete-complete --stack-name $STACK 2>$null

$check = aws cloudformation describe-stacks --stack-name $STACK 2>&1
if ($check -match "does not exist") {
    Write-Host "✓ Stack $STACK deleted"
} else {
    Write-Host "✗ Stack $STACK still exists"
}
