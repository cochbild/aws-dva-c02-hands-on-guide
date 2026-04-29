# CDK manages its own stack — use cdk destroy
$ErrorActionPreference = 'Continue'

if (Test-Path cdk) {
    Push-Location cdk
    npx cdk destroy --force 2>$null
    if ($LASTEXITCODE -ne 0) {
        aws cloudformation delete-stack --stack-name dva-lab-08-07-cdk
    }
    Pop-Location
}

Write-Host "✓ Lab 8.7 cleanup complete"
Write-Host "ℹ The CDKToolkit bootstrap stack remains — leave it for future CDK labs, or delete via 'aws cloudformation delete-stack --stack-name CDKToolkit'"
