# DVA-C02 Lab 3.5 cleanup — properly empty versioned bucket then delete stack
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-03-05-versioning-lifecycle"

$Bucket = aws cloudformation describe-stacks --stack-name $StackName `
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" `
  --output text 2>$null

if ($Bucket -and $Bucket -ne 'None') {
    Write-Host "Deleting all object versions in $Bucket..."
    $versionsJson = aws s3api list-object-versions --bucket $Bucket `
        --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' `
        --output json 2>$null
    if ($versionsJson -and $versionsJson -notmatch '"Objects":\s*null') {
        aws s3api delete-objects --bucket $Bucket --delete $versionsJson 2>$null | Out-Null
    }

    Write-Host "Deleting all delete-markers..."
    $markersJson = aws s3api list-object-versions --bucket $Bucket `
        --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' `
        --output json 2>$null
    if ($markersJson -and $markersJson -notmatch '"Objects":\s*null') {
        aws s3api delete-objects --bucket $Bucket --delete $markersJson 2>$null | Out-Null
    }

    aws s3 rm "s3://$Bucket" --recursive 2>$null | Out-Null
}

Write-Host "Deleting stack: $StackName"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null

aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists — check CloudFormation console"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
