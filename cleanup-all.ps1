<#
.SYNOPSIS
    Tear down ALL DVA-C02 lab stacks in the current AWS account + region.

.DESCRIPTION
    Finds every CloudFormation stack starting with "dva-lab-" in the default
    region, empties any S3 buckets they expose as Bucket / BucketName
    outputs, then deletes the stacks.

.PARAMETER Yes
    Skip the confirmation prompt.

.PARAMETER PurgeArtifacts
    Also empty + delete the dva-lab-artifacts-<account>-<region> bucket.

.EXAMPLE
    .\cleanup-all.ps1
    .\cleanup-all.ps1 -Yes
    .\cleanup-all.ps1 -Yes -PurgeArtifacts
#>

[CmdletBinding()]
param(
    [Alias('y')]
    [switch]$Yes,
    [switch]$PurgeArtifacts
)

$ErrorActionPreference = 'Continue'

$Region = if ($env:AWS_DEFAULT_REGION) { $env:AWS_DEFAULT_REGION } else { 'us-east-1' }
$AccountId = (aws sts get-caller-identity --query Account --output text)

Write-Host "Region:  $Region"
Write-Host "Account: $AccountId"
Write-Host ""
Write-Host "Finding all dva-lab-* stacks..."

$Statuses = @(
    'CREATE_COMPLETE','UPDATE_COMPLETE','ROLLBACK_COMPLETE',
    'UPDATE_ROLLBACK_COMPLETE','CREATE_FAILED','ROLLBACK_FAILED',
    'UPDATE_FAILED','UPDATE_ROLLBACK_FAILED','IMPORT_COMPLETE',
    'IMPORT_ROLLBACK_COMPLETE','IMPORT_ROLLBACK_FAILED'
)

$StacksRaw = aws cloudformation list-stacks `
    --stack-status-filter $Statuses `
    --query 'StackSummaries[?starts_with(StackName, `dva-lab-`)].StackName' `
    --output text

$Stacks = @()
if (-not [string]::IsNullOrWhiteSpace($StacksRaw)) {
    $Stacks = $StacksRaw -split '\s+' | Where-Object { $_ }
}

if ($Stacks.Count -eq 0) {
    Write-Host "No dva-lab-* stacks found."
} else {
    Write-Host "Found stacks:"
    $Stacks | ForEach-Object { Write-Host "  - $_" }
}

$ArtifactsBucket = "dva-lab-artifacts-$AccountId-$Region"
$ShouldPurgeArtifacts = $false
if ($PurgeArtifacts) {
    aws s3api head-bucket --bucket $ArtifactsBucket 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $ShouldPurgeArtifacts = $true
        Write-Host "Will also purge artifacts bucket: $ArtifactsBucket"
    } else {
        Write-Host "No artifacts bucket found at $ArtifactsBucket — skipping purge."
    }
}

if ($Stacks.Count -eq 0 -and -not $ShouldPurgeArtifacts) {
    Write-Host "Nothing to do."
    exit 0
}

if (-not $Yes) {
    Write-Host ""
    $reply = Read-Host "Proceed? [y/N]"
    if ($reply -notmatch '^[Yy]$') {
        Write-Host "Aborted."
        exit 0
    }
}

function Empty-Bucket {
    param([string]$BucketName)

    Write-Host "  Emptying bucket: $BucketName"

    $versionsJson = aws s3api list-object-versions --bucket $BucketName `
        --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' `
        --output json 2>$null
    if ($versionsJson -and $versionsJson -notmatch '"Objects":\s*null') {
        aws s3api delete-objects --bucket $BucketName --delete $versionsJson 2>$null | Out-Null
    }

    $markersJson = aws s3api list-object-versions --bucket $BucketName `
        --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' `
        --output json 2>$null
    if ($markersJson -and $markersJson -notmatch '"Objects":\s*null') {
        aws s3api delete-objects --bucket $BucketName --delete $markersJson 2>$null | Out-Null
    }

    aws s3 rm "s3://$BucketName" --recursive 2>$null | Out-Null
}

foreach ($s in $Stacks) {
    Write-Host ""
    Write-Host "=== Deleting $s ==="

    $BucketsRaw = aws cloudformation describe-stacks --stack-name $s `
        --query 'Stacks[0].Outputs[?ends_with(OutputKey, `Bucket`) || ends_with(OutputKey, `BucketName`)].OutputValue' `
        --output text 2>$null

    if ($BucketsRaw) {
        $Buckets = $BucketsRaw -split '\s+' | Where-Object { $_ -and $_ -ne 'None' }
        foreach ($b in $Buckets) {
            Empty-Bucket -BucketName $b
        }
    }

    aws cloudformation update-termination-protection `
        --stack-name $s `
        --no-enable-termination-protection 2>$null | Out-Null

    aws cloudformation delete-stack --stack-name $s
}

if ($ShouldPurgeArtifacts) {
    Write-Host ""
    Write-Host "=== Purging artifacts bucket: $ArtifactsBucket ==="
    Empty-Bucket -BucketName $ArtifactsBucket
    aws s3api delete-bucket --bucket $ArtifactsBucket 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Deleted $ArtifactsBucket"
    } else {
        Write-Host "  Warning: failed to delete $ArtifactsBucket (may still hold objects from in-flight stacks)"
    }
}

Write-Host ""
Write-Host "Delete commands issued. Stacks will tear down in the background."
Write-Host "Monitor with:"
Write-Host "  aws cloudformation list-stacks --stack-status-filter DELETE_IN_PROGRESS"
