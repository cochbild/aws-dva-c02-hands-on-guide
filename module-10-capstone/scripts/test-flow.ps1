# End-to-end test of the capstone
$ErrorActionPreference = 'Stop'

$Stack = 'dva-lab-10-01-capstone'
$Email = if ($env:EMAIL) { $env:EMAIL } else { 'alice@example.com' }
$Password = if ($env:PASSWORD) { $env:PASSWORD } else { 'Pa55word!' }

function Get-Output($key) {
    aws cloudformation describe-stacks --stack-name $Stack `
        --query "Stacks[0].Outputs[?OutputKey=='$key'].OutputValue" --output text
}

$ApiUrl = Get-Output ApiUrl
$PoolId = Get-Output UserPoolId
$ClientId = Get-Output UserPoolClientId
$Table = Get-Output TableName
$Bucket = Get-Output ArchiveBucket

Write-Host "==> Sign up + confirm user $Email"
aws cognito-idp sign-up --client-id $ClientId --username $Email --password $Password `
    --user-attributes Name=email,Value=$Email 2>$null
aws cognito-idp admin-confirm-sign-up --user-pool-id $PoolId --username $Email 2>$null

Write-Host "==> Get JWT"
$auth = aws cognito-idp admin-initiate-auth `
    --user-pool-id $PoolId --client-id $ClientId `
    --auth-flow ADMIN_USER_PASSWORD_AUTH `
    --auth-parameters "USERNAME=$Email,PASSWORD=$Password" | ConvertFrom-Json
$IdToken = $auth.AuthenticationResult.IdToken
Write-Host "  $($IdToken.Substring(0, 40))..."

Write-Host "==> Submit order"
$body = '{"items":[{"name":"pepperoni","price":15},{"name":"coke","price":3}],"tier":"basic"}'
$response = curl.exe -s -X POST "$ApiUrl/orders" `
    -H "Authorization: $IdToken" `
    -H "Content-Type: application/json" `
    --data $body
Write-Host "  Response: $response"
$orderId = ($response | ConvertFrom-Json).orderId

Write-Host "==> Wait 10s for async pipeline..."
Start-Sleep -Seconds 10

Write-Host "==> Verify DDB record"
aws dynamodb get-item --table-name $Table --key "{`"orderId`":{`"S`":`"$orderId`"}}" --query 'Item.{status:status.S,total:total.S}'

Write-Host "==> Verify S3 audit file"
aws s3 ls "s3://$Bucket/audit/" --recursive | Select-Object -First 5

Write-Host "==> Dashboard: $(Get-Output DashboardUrl)"
