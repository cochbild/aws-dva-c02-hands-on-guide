param(
    [Parameter(Mandatory=$true)]
    [string]$StreamName,
    [int]$Count = 50
)

1..$Count | ForEach-Object {
    $key = "customer-$($_ % 5)"
    $payload = @{ id = $_; customer = $key; ts = [int][double]::Parse((Get-Date -UFormat %s)) } | ConvertTo-Json -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
    $b64 = [Convert]::ToBase64String($bytes)
    aws kinesis put-record --stream-name $StreamName --partition-key $key --data $b64 --output text | Out-Null
}

Write-Host "Sent $Count records to $StreamName"
