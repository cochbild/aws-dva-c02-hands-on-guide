<#
.SYNOPSIS
    Seed the source SQS queue for Lab 1.2A.

.DESCRIPTION
    Sends 5 valid messages and 1 designed-to-fail message
    (body.id == "fail-me" — the consumer raises on this one).

.EXAMPLE
    .\seed-sqs.ps1 -QueueUrl https://sqs.us-east-1.amazonaws.com/123/dva-lab-01-02-sqs-source
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$QueueUrl
)

$ErrorActionPreference = 'Stop'

# 5 well-formed messages
1..5 | ForEach-Object {
    $body = "{`"id`": `"order-$_`", `"qty`": $_}"
    aws sqs send-message --queue-url $QueueUrl --message-body $body | Out-Null
    Write-Host "  sent: order-$_"
}

# 1 message that the consumer raises on
aws sqs send-message --queue-url $QueueUrl --message-body '{"id": "fail-me", "qty": 99}' | Out-Null
Write-Host "  sent: fail-me  (Lambda will fail this one — watch DLQ)"

Write-Host ""
Write-Host "✓ 6 messages sent. Tail the function logs to watch processing."
