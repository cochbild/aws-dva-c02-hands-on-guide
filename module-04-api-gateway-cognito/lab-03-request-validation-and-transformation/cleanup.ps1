# Lab 4.3 cleanup — same stack as Lab 4.2
$ErrorActionPreference = 'Continue'
$STACK = "dva-lab-04-02-stages"

Write-Host "Deleting stack $STACK..."
aws cloudformation delete-stack --stack-name $STACK
aws cloudformation wait stack-delete-complete --stack-name $STACK 2>$null
Write-Host "✓ $STACK deleted"
Remove-Item -Path "packaged.yaml" -ErrorAction SilentlyContinue
