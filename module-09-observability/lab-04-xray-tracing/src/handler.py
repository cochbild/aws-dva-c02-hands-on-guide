"""X-Ray traced Lambda. patch_all() auto-instruments boto3.

Adds an annotation per request (user_tier from query string), a custom
subsegment ('process_order'), and metadata.
"""
import json
import os
import time

import boto3
from aws_xray_sdk.core import xray_recorder, patch_all

patch_all()  # auto-instrument boto3 + urllib

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])


def handler(event, context):
    qs = event.get("queryStringParameters") or {}
    tier = qs.get("tier", "silver")

    xray_recorder.put_annotation("user_tier", tier)
    xray_recorder.put_metadata("request_event", {"path": event.get("path"), "tier": tier})

    # Auto-traced via patch_all
    table.put_item(Item={"id": str(time.time_ns()), "tier": tier})

    # Custom subsegment for our business logic
    with xray_recorder.in_subsegment("process_order"):
        time.sleep(0.05)  # simulate work
        result = {"tier": tier, "processed": True}

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(result),
    }
