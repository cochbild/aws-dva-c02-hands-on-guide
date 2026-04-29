$ErrorActionPreference = 'Continue'
$STACK = "dva-lab-01-07-vpc-lambda"

# Empty any S3 bucket the stack owns before stack delete
$Bucket = aws cloudformation describe-stacks --stack-name $STACK `
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' `
    --output text 2>$null

if ($Bucket -and $Bucket -ne 'None') {
    Write-Host "Emptying bucket: $Bucket"
    aws s3 rm "s3://$Bucket" --recursive
}

Write-Host "Deleting stack (this takes ~5 min for VPC ENI cleanup)..."
sam delete --stack-name $STACK --no-prompts
