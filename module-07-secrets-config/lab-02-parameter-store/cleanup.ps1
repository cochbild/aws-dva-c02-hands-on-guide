$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-07-02-param-store"

# If user converted api-key to SecureString manually, delete it directly
aws ssm delete-parameter --name /dva/lab-07/api-key 2>$null

Write-Host "Deleting stack: $StackName"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null
aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
