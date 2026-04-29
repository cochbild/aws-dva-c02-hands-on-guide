# DVA-C02 Lab 1.1 cleanup
$ErrorActionPreference = 'Continue'
$Stack = "dva-lab-01-01-hello-sam"

Write-Host "Deleting stack: $Stack"
sam delete --stack-name $Stack --no-prompts 2>$null
if ($LASTEXITCODE -ne 0) {
    aws cloudformation delete-stack --stack-name $Stack
}

Write-Host "Waiting for delete to complete..."
aws cloudformation wait stack-delete-complete --stack-name $Stack 2>$null

aws cloudformation describe-stacks --stack-name $Stack 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "X Stack still exists - check CloudFormation console"
    exit 1
}
Write-Host "OK Stack deleted: $Stack"
