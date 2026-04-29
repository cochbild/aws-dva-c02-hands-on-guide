# DVA-C02 Lab 7.6 cleanup
$ErrorActionPreference = 'Continue'
$StackName = "dva-lab-07-06-acm"

# Delete any imported certs that look like ours
$arns = aws acm list-certificates --query "CertificateSummaryList[?contains(DomainName,'dva-lab.example') || contains(DomainName,'dva-lab-07')].CertificateArn" --output text 2>$null
if ($arns) {
    foreach ($arn in ($arns -split '\s+')) {
        if ($arn) {
            $type = aws acm describe-certificate --certificate-arn $arn --query "Certificate.Type" --output text 2>$null
            if ($type -eq 'IMPORTED') {
                Write-Host "Deleting imported cert: $arn"
                aws acm delete-certificate --certificate-arn $arn 2>$null
            }
        }
    }
}

Write-Host "Deleting stack: $StackName"
aws cloudformation delete-stack --stack-name $StackName
aws cloudformation wait stack-delete-complete --stack-name $StackName 2>$null
aws cloudformation describe-stacks --stack-name $StackName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ Stack still exists"
    exit 1
}
Write-Host "✓ Stack deleted: $StackName"
