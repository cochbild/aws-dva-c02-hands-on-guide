$ErrorActionPreference = 'Continue'
$Stack = 'dva-lab-06-01-asl-basics'
Write-Host "Deleting stack: $Stack"
aws cloudformation delete-stack --stack-name $Stack
aws cloudformation wait stack-delete-complete --stack-name $Stack 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ stack deleted"
} else {
    Write-Host "✗ delete did not finish cleanly — check console"
}
