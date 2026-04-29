# DVA-C02 Lab 5.2 cleanup
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-05-02-sns-fanout"

foreach ($key in @("QueueUrl", "FifoQueueUrl")) {
    $url = aws cloudformation describe-stacks --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='$key'].OutputValue" `
        --output text 2>$null
    if ($url -and $url -ne 'None') {
        aws sqs purge-queue --queue-url $url 2>$null
    }
}

Write-Host "Deleting stack: $StackName"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null

aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists — check CloudFormation console"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
