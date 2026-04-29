"""Lab 4.2 — handler echoes which Lambda alias served the request.

The stage variable 'alias' from API Gateway picks which Lambda alias to
invoke. The Lambda receives the alias value via context.invoked_function_arn
(which ends in :alias-name) and via event.stageVariables.
"""
import json


def lambda_handler(event, context):
    invoked_arn = context.invoked_function_arn
    alias = invoked_arn.split(":")[-1] if ":" in invoked_arn else "unknown"

    body = {
        "message": "hello from stages lab",
        "version": "v1",
        "alias": alias,
        "invokedArn": invoked_arn,
        "stageVariables": event.get("stageVariables", {}),
        "stage": event.get("requestContext", {}).get("stage"),
    }
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }
