#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';

class DvaLab0807Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const fn = new lambda.Function(this, 'HelloFn', {
      functionName: 'dva-lab-08-07-cdk',
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromInline(
        'def handler(event, context):\n    return {"msg": "hello from CDK"}'
      ),
      handler: 'index.handler',
      timeout: Duration.seconds(10),
      logRetention: logs.RetentionDays.THREE_DAYS,
    });

    new CfnOutput(this, 'FunctionName', {
      value: fn.functionName,
    });
  }
}

const app = new cdk.App();
new DvaLab0807Stack(app, 'dva-lab-08-07-cdk', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
