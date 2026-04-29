# DVA-C02 Lab 4.7 cleanup
# CloudFront distributions can't be deleted while enabled — disable first, wait, then delete the stack.
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-04-07-cloudfront-api"

$DistId = aws cloudformation describe-stacks --stack-name $StackName `
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" `
  --output text 2>$null

if ($DistId -and $DistId -ne 'None') {
    Write-Host "Disabling CloudFront distribution $DistId..."
    $etag = aws cloudfront get-distribution-config --id $DistId --query "ETag" --output text
    $cfgJson = aws cloudfront get-distribution-config --id $DistId --query "DistributionConfig" | Out-String
    $cfg = $cfgJson | ConvertFrom-Json
    $cfg.Enabled = $false
    $cfgPath = Join-Path $env:TEMP "dist-config.json"
    $cfg | ConvertTo-Json -Depth 100 | Set-Content $cfgPath -Encoding ascii
    aws cloudfront update-distribution --id $DistId --if-match $etag --distribution-config "file://$cfgPath" | Out-Null

    Write-Host "Waiting for distribution to deploy disabled state (5-15 min)..."
    aws cloudfront wait distribution-deployed --id $DistId
}

Write-Host "Deleting stack: $StackName (CloudFront removal takes additional minutes)"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null

aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists — check CloudFormation console"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
