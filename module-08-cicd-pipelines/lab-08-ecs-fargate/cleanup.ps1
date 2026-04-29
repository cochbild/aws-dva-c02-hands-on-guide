$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-08-08-ecs-fargate"

# Empty the ECR repo
$imageIds = aws ecr list-images --repository-name dva-lab-08-08 --query 'imageIds[*]' --output json 2>$null
if ($imageIds -and $imageIds -ne '[]') {
    aws ecr batch-delete-image --repository-name dva-lab-08-08 --image-ids $imageIds 2>$null | Out-Null
}

Write-Host "Deleting stack: $StackName (Fargate cleanup ~5 min)"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null
aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Host "✗ Stack still exists"; exit 1 }
Write-Host "✓ Stack deleted: $StackName"
