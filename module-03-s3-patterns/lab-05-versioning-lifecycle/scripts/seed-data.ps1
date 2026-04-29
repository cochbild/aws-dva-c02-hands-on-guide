param(
    [Parameter(Mandatory=$true)]
    [string]$BucketName
)

$tmp = [IO.Path]::Combine($env:TEMP, "doc.txt")

1..5 | ForEach-Object {
    "version $_ - content at $(Get-Date)" | Out-File -FilePath $tmp -Encoding ascii
    aws s3 cp $tmp "s3://$BucketName/doc.txt"
    Start-Sleep -Seconds 1
}

Write-Host "Done. 5 versions of doc.txt uploaded to $BucketName"
