# Cleanup all three sub-labs of Lab 1.2 in sequence.
$ErrorActionPreference = 'Continue'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

& "$ScriptDir\sqs-consumer\cleanup.ps1"
& "$ScriptDir\ddb-streams\cleanup.ps1"
& "$ScriptDir\s3-trigger\cleanup.ps1"

Write-Host ""
Write-Host "✓ All Lab 1.2 sub-stacks deleted."
