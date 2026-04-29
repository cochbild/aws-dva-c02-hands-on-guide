# DVA-C02 Capstone cleanup
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-10-01-capstone"

$Bucket = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='ArchiveBucket'].OutputValue" --output text 2>$null
if ($Bucket -and $Bucket -ne 'None') { aws s3 rm "s3://$Bucket" --recursive 2>$null }

$KeyArn = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='KmsKeyArn'].OutputValue" --output text 2>$null
if ($KeyArn -and $KeyArn -ne 'None') { aws kms schedule-key-deletion --key-id $KeyArn --pending-window-in-days 7 2>$null }

$SecretArn = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='StripeSecretArn'].OutputValue" --output text 2>$null
if ($SecretArn -and $SecretArn -ne 'None') { aws secretsmanager delete-secret --secret-id $SecretArn --force-delete-without-recovery 2>$null }

$Dlq = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='EbDlqUrl'].OutputValue" --output text 2>$null
if ($Dlq -and $Dlq -ne 'None') { aws sqs purge-queue --queue-url $Dlq 2>$null }

Write-Host "Deleting stack: $StackName (this is the biggest stack — ~5-10 min)"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null
aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists — check console (sometimes Cognito or DynamoDB linger)"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
Write-Host "ℹ KMS key incurs `$1/month until the 7-day deletion window closes"
