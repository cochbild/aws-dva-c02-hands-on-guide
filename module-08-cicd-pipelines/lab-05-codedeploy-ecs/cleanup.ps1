$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-08-05-codedeploy-ecs"
Write-Host "Deleting stack: $StackName (ECS + ALB cleanup takes ~10 min)"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null
aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Host "✗ Stack still exists"; exit 1 }
Write-Host "✓ Stack deleted: $StackName"
