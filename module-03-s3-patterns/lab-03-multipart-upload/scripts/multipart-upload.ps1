# 5-step S3 multipart upload demo.
# Usage: .\multipart-upload.ps1 -Bucket <bucket> -Key <key> -File <file>
param(
  [Parameter(Mandatory)] [string]$Bucket,
  [Parameter(Mandatory)] [string]$Key,
  [Parameter(Mandatory)] [string]$File
)
$ErrorActionPreference = 'Stop'

$PartSize = 5 * 1024 * 1024
$FileSize = (Get-Item $File).Length
$NumParts = [Math]::Ceiling($FileSize / $PartSize)
Write-Host "File size: $FileSize bytes ($([Math]::Round($FileSize/1MB,1)) MB)"
Write-Host "Will split into $NumParts parts"
Write-Host ""

# Step 1: CreateMultipartUpload
Write-Host "=== Step 1: CreateMultipartUpload ==="
$UploadId = aws s3api create-multipart-upload --bucket $Bucket --key $Key --query UploadId --output text
Write-Host "UploadId: $UploadId"
Write-Host ""

# Step 2: UploadPart for each chunk
Write-Host "=== Step 2: UploadPart x $NumParts ==="
$Parts = @()
$Stream = [System.IO.File]::OpenRead($File)
try {
  for ($i = 1; $i -le $NumParts; $i++) {
    $TmpFile = [System.IO.Path]::GetTempFileName()
    $ChunkSize = [Math]::Min($PartSize, $FileSize - $Stream.Position)
    $Buffer = New-Object byte[] $ChunkSize
    [void]$Stream.Read($Buffer, 0, $ChunkSize)
    [System.IO.File]::WriteAllBytes($TmpFile, $Buffer)
    $ETag = aws s3api upload-part `
      --bucket $Bucket --key $Key `
      --part-number $i --upload-id $UploadId `
      --body $TmpFile `
      --query ETag --output text
    Remove-Item $TmpFile
    Write-Host "  Part $i uploaded — ETag $ETag"
    $Parts += @{ PartNumber = $i; ETag = $ETag.Trim('"') }
  }
} finally { $Stream.Close() }
Write-Host ""

# Step 3: ListParts
Write-Host "=== Step 3: ListParts (sanity check) ==="
aws s3api list-parts --bucket $Bucket --key $Key --upload-id $UploadId --query 'Parts[].{PartNumber:PartNumber,Size:Size}'
Write-Host ""

# Step 4: CompleteMultipartUpload
Write-Host "=== Step 4: CompleteMultipartUpload ==="
@{ Parts = $Parts | ForEach-Object { @{ PartNumber = $_.PartNumber; ETag = "`"$($_.ETag)`"" } } } | ConvertTo-Json -Depth 4 | Out-File parts.json -Encoding ascii
aws s3api complete-multipart-upload `
  --bucket $Bucket --key $Key `
  --upload-id $UploadId `
  --multipart-upload "file://parts.json"
Remove-Item parts.json
Write-Host ""

Write-Host "=== Done. Verify with: ==="
Write-Host "  aws s3api head-object --bucket $Bucket --key $Key"
