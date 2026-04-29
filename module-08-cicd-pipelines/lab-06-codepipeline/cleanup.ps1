$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-08-06-codepipeline"

foreach ($key in @("ArtifactsBucket", "RepoSeedBucket")) {
    $b = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='$key'].OutputValue" --output text 2>$null
    if ($b -and $b -ne 'None') { aws s3 rm "s3://$b" --recursive 2>$null }
}

aws cloudformation delete-stack --stack-name dva-lab-08-06-deployed 2>$null

Write-Host "Deleting stack: $StackName"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null
aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Host "✗ Stack still exists"; exit 1 }
Write-Host "✓ Stack deleted: $StackName"
