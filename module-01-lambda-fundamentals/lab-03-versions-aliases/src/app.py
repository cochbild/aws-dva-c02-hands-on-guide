"""
DVA-C02 Lab 1.3 — Versioned Lambda.

Returns a message and the function version that handled the request.
The version is read from the function ARN in the context.
"""
import json

# CHANGE THIS TO TRIGGER A NEW VERSION ON DEPLOY
MESSAGE = "hello from v1"


def handler(event, context):
    # invoked_function_arn looks like:
    #   arn:aws:lambda:us-east-1:123:function:dva-lab-01-03-versions:live
    # The piece after the final colon is the alias OR version (or empty if $LATEST).
    arn_parts = context.invoked_function_arn.split(":")
    qualifier = arn_parts[-1] if len(arn_parts) >= 8 else "$LATEST"

    return {
        "message": MESSAGE,
        # context.function_version is the actual numbered version handling this invoke,
        # even when invoked through an alias (resolved at request time)
        "version": context.function_version,
        "qualifier_invoked": qualifier,
    }
