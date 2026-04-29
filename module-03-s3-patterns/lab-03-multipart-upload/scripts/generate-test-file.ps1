# Create a 12 MB test file: 5 MB part 1 + 5 MB part 2 + 2 MB last part = 3 parts
$SizeBytes = 12 * 1024 * 1024
$bytes = New-Object byte[] $SizeBytes
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$rng.GetBytes($bytes)
[System.IO.File]::WriteAllBytes("bigfile.bin", $bytes)
$info = Get-Item bigfile.bin
Write-Host "Created bigfile.bin: $($info.Length / 1MB) MB"
