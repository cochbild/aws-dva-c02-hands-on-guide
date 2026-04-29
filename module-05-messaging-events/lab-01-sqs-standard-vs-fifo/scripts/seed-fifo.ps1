<#
.SYNOPSIS
    Send 5 messages each to MessageGroupId order-A and order-B.
.PARAMETER QueueUrl
    FIFO SQS queue URL (must end in .fifo).
#>
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$QueueUrl
)

foreach ($group in "order-A", "order-B") {
    1..5 | ForEach-Object {
        $padded = "{0:D2}" -f $_
        aws sqs send-message `
            --queue-url $QueueUrl `
            --message-body "$group-msg-$padded" `
            --message-group-id $group `
            --output text | Out-Null
        Write-Host "sent $group-msg-$padded to group $group"
    }
}

Write-Host "Done. Sent 10 messages (5 per group) to $QueueUrl"
