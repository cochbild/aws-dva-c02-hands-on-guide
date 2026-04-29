param(
    [Parameter(Mandatory=$true)]
    [string]$DeliveryStream,
    [int]$Count = 100
)

$batchSize = 500
$sent = 0

while ($sent -lt $Count) {
    $remaining = $Count - $sent
    $thisBatch = [Math]::Min($remaining, $batchSize)

    $records = @()
    for ($i = 1; $i -le $thisBatch; $i++) {
        $payload = @{ id = ($sent + $i); ts = [int][double]::Parse((Get-Date -UFormat %s)); event = "sample" } | ConvertTo-Json -Compress
        $payload = "$payload`n"
        $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
        $b64 = [Convert]::ToBase64String($bytes)
        $records += @{ Data = $b64 }
    }

    $json = $records | ConvertTo-Json -Compress
    $tmp = New-TemporaryFile
    Set-Content -Path $tmp.FullName -Value $json -Encoding ascii
    aws firehose put-record-batch --delivery-stream-name $DeliveryStream --records "file://$($tmp.FullName)" --output text | Out-Null
    Remove-Item $tmp.FullName

    $sent += $thisBatch
}

Write-Host "Sent $sent records to $DeliveryStream"
