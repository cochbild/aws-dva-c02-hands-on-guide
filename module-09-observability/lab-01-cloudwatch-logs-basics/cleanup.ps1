# Tear down Lab 9.1.
$STACK = "dva-lab-09-01-logs-basics"
Write-Host "Deleting stack $STACK..."
aws cloudformation delete-stack --stack-name $STACK
aws cloudformation wait stack-delete-complete --stack-name $STACK 2>$null

foreach ($lg in @('/aws/lambda/dva-lab-09-01-emitter','/aws/lambda/dva-lab-09-01-forwarder')) {
  aws logs delete-log-group --log-group-name $lg 2>$null | Out-Null
}

Write-Host "OK Stack $STACK deleted."
