# Invoke the emitter 100 times to populate CloudWatch Logs.
$FN = "dva-lab-09-01-emitter"
Write-Host "Invoking $FN 100 times..."
$null = New-Item -Path "out.json" -ItemType File -Force
for ($i = 1; $i -le 100; $i++) {
  aws lambda invoke `
    --function-name $FN `
    --cli-input-json file://payloads/invoke.json `
    --cli-binary-format raw-in-base64-out `
    out.json | Out-Null
  if ($i % 10 -eq 0) { Write-Host "  $i / 100" }
}
Remove-Item out.json -ErrorAction SilentlyContinue
Write-Host "Done. Wait ~30 seconds for log delivery before querying."
