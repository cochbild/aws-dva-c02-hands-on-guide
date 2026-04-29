# Seed sessions with varying TTL values to demonstrate TTL behavior.
$Table = "dva-lab-02-07-sessions"
$Now = [int][double]::Parse((Get-Date -UFormat %s))

$Sessions = @{
    "expired-1hr-ago" = $Now - 3600
    "expires-60-sec"  = $Now + 60
    "expires-1-hr"    = $Now + 3600
    "expires-1-day"   = $Now + 86400
    "expires-30-day"  = $Now + 2592000
}

foreach ($sid in $Sessions.Keys) {
    $exp = $Sessions[$sid]
    $item = @{
        session_id = @{ S = $sid }
        data       = @{ S = "sample" }
        expires_at = @{ N = "$exp" }
    } | ConvertTo-Json -Compress
    aws dynamodb put-item --table-name $Table --item $item
    Write-Host "  put $sid (expires_at=$exp)"
}

Write-Host ""
Write-Host "Seeded 5 sessions into $Table"
Write-Host "NOTE: 'expired-1hr-ago' has TTL in the past but will still be readable"
Write-Host "      until DynamoDB's TTL sweeper removes it (up to 48 hours)."
