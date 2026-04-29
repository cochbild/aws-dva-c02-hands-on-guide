<#
.SYNOPSIS
    Cleanup for Lab 8.1 — CodeCommit repo.

.DESCRIPTION
    IMPORTANT: This deletes the repo used by labs 8.2-8.6. Only run if you've
    finished Lab 8.6 or are stopping the chain early.
#>

$ErrorActionPreference = 'Continue'
$Stack = "dva-lab-08-01-codecommit"

Write-Host "=== Cleaning up $Stack ==="

aws cloudformation delete-stack --stack-name $Stack
aws cloudformation wait stack-delete-complete --stack-name $Stack 2>$null

# Verify
$exists = aws cloudformation describe-stacks --stack-name $Stack 2>$null
if ($exists) {
    Write-Host "X Stack still exists - check console for delete errors"
    exit 1
}

Write-Host "+ Stack $Stack deleted"
Write-Host ""
Write-Host "If you have a local clone of the repo at .\dva-lab-08-app\, delete it manually:"
Write-Host "  Remove-Item -Recurse -Force dva-lab-08-app"
