$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-07-05-kms-grants"

$KeyId = aws cloudformation list-exports --query "Exports[?Name=='dva-lab-07-04-key-id'].Value" --output text 2>$null
$RoleArn = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='RoleArn'].OutputValue" --output text 2>$null
if ($KeyId -and $KeyId -ne 'None' -and $RoleArn) {
    $grants = aws kms list-grants --key-id $KeyId --query "Grants[?GranteePrincipal=='$RoleArn'].GrantId" --output text 2>$null
    if ($grants) {
        foreach ($g in ($grants -split '\s+')) {
            if ($g) { aws kms revoke-grant --key-id $KeyId --grant-id $g 2>$null }
        }
    }
}

Write-Host "Deleting stack: $StackName"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null
aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
