<#
.SYNOPSIS
    Send 10 messages to the Standard SQS queue.
.PARAMETER QueueUrl
    SQS queue URL.
#>
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$QueueUrl
)

1..10 | ForEach-Object {
    $padded = "{0:D3}" -f $_
    aws sqs send-message --queue-url $QueueUrl --message-body "msg-$padded" --output text | Out-Null
    Write-Host "sent msg-$padded"
}

Write-Host "Done. Sent 10 messages to $QueueUrl"
