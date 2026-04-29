<#
.SYNOPSIS
    Lab 7.1 cleanup — delete secret (force, no recovery window) then the stack.

.DESCRIPTION
    --force-delete-without-recovery is for labs only. In production,
    use a recovery window of 7-30 days so a fat-finger is recoverable.
#>

$ErrorActionPreference = 'Continue'
$Stack = "dva-lab-07-01-secrets-mgr"

Write-Host "=== Lab 7.1 cleanup ==="

# 1. Delete the secret with no recovery window (zero cost from this point).
$SecretArn = aws cloudformation describe-stacks --stack-name $Stack `
    --query "Stacks[0].Outputs[?OutputKey=='SecretArn'].OutputValue" `
    --output text 2>$null

if ($SecretArn -and $SecretArn -ne 'None') {
    Write-Host "Force-deleting secret: $SecretArn"
    aws secretsmanager delete-secret `
        --secret-id $SecretArn `
        --force-delete-without-recovery 2>$null | Out-Null
}

# 2. Delete the stack.
Write-Host "Deleting stack: $Stack"
aws cloudformation delete-stack --stack-name $Stack
aws cloudformation wait stack-delete-complete --stack-name $Stack 2>$null

# 3. Verify.
$probe = aws cloudformation describe-stacks --stack-name $Stack 2>&1
if ($probe -match 'does not exist') {
    Write-Host "✓ Stack $Stack deleted."
} else {
    Write-Host "✗ Stack $Stack still exists. Inspect with:"
    Write-Host "  aws cloudformation describe-stack-events --stack-name $Stack --max-items 30"
    exit 1
}
