<#
.SYNOPSIS
    Cleanup for Lab 3.1.

.DESCRIPTION
    Tears down the bucket shared by labs 3.1 - 3.4. Only run after Lab 3.4
    or if you want to start the module over.
#>

$ErrorActionPreference = 'Continue'

$STACK = "dva-lab-03-01-bucket-basics"

$BUCKET = aws cloudformation describe-stacks `
    --stack-name $STACK `
    --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" `
    --output text 2>$null

if ($BUCKET -and $BUCKET -ne 'None') {
    Write-Host "Emptying bucket: $BUCKET"

    $versions = aws s3api list-object-versions --bucket $BUCKET `
        --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' `
        --output json 2>$null
    if ($versions -and $versions -notmatch '"Objects":\s*null') {
        aws s3api delete-objects --bucket $BUCKET --delete $versions 2>$null | Out-Null
    }

    $markers = aws s3api list-object-versions --bucket $BUCKET `
        --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' `
        --output json 2>$null
    if ($markers -and $markers -notmatch '"Objects":\s*null') {
        aws s3api delete-objects --bucket $BUCKET --delete $markers 2>$null | Out-Null
    }

    aws s3 rm "s3://$BUCKET" --recursive 2>$null | Out-Null
}

Write-Host "Deleting stack: $STACK"
aws cloudformation delete-stack --stack-name $STACK
aws cloudformation wait stack-delete-complete --stack-name $STACK 2>$null

$check = aws cloudformation describe-stacks --stack-name $STACK 2>&1
if ($check -match "does not exist") {
    Write-Host "✓ Stack $STACK deleted"
} else {
    Write-Host "✗ Stack $STACK still exists — check console:"
    Write-Host "  aws cloudformation describe-stack-events --stack-name $STACK --max-items 30"
}
