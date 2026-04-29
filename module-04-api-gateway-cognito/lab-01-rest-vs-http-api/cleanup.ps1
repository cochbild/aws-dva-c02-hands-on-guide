# Lab 4.1 cleanup
$ErrorActionPreference = 'Continue'
$STACK = "dva-lab-04-01-rest-vs-http"

Write-Host "Deleting stack $STACK..."
aws cloudformation delete-stack --stack-name $STACK
aws cloudformation wait stack-delete-complete --stack-name $STACK 2>$null
Write-Host "✓ $STACK deleted"
Remove-Item -Path "packaged.yaml" -ErrorAction SilentlyContinue
