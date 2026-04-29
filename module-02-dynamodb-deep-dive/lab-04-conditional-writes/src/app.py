"""
DVA-C02 Lab 2.4 — Conditional writes patterns.

Demonstrates:
- Idempotent create (attribute_not_exists)
- Atomic counter (ADD)
- Optimistic locking with version attribute
- Returning ALL_OLD on conditional check failure
"""
import json
import logging
import os
import time
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def _to_json(obj):
    return json.loads(json.dumps(obj, cls=DecimalEncoder))


def handler(event, context):
    op = event["op"]
    try:
        return {
            "create_idempotent": _create_idempotent,
            "get": _get,
            "increment": _increment,
            "create_with_version": _create_with_version,
            "race_update": _race_update,
        }[op](event)
    except ClientError as e:
        return {
            "error_code": e.response["Error"]["Code"],
            "error_message": e.response["Error"]["Message"],
            # On conditional failure, this returns the current item state
            "current_item": _to_json(e.response.get("Item", {})),
        }


def _create_idempotent(event):
    table.put_item(
        Item={"id": event["id"], "data": event["data"], "count": 0},
        ConditionExpression="attribute_not_exists(id)",
        # On failure, return the existing item
        ReturnValuesOnConditionCheckFailure="ALL_OLD",
    )
    return {"created": event["id"]}


def _get(event):
    response = table.get_item(Key={"id": event["id"]}, ConsistentRead=True)
    return {"item": _to_json(response.get("Item"))}


def _increment(event):
    """Atomic counter -- no read needed, no race possible."""
    response = table.update_item(
        Key={"id": event["id"]},
        UpdateExpression="ADD #c :inc",
        ExpressionAttributeNames={"#c": "count"},
        ExpressionAttributeValues={":inc": 1},
        ReturnValues="ALL_NEW",
    )
    return {"after": _to_json(response["Attributes"])}


def _create_with_version(event):
    table.put_item(
        Item={"id": event["id"], "status": "pending", "version": 0},
        ConditionExpression="attribute_not_exists(id)",
    )
    return {"created": event["id"], "version": 0}


def _race_update(event):
    """
    Demonstrates optimistic locking. Steps:
      1. Read item + version
      2. Simulate work (sleep)
      3. Write with ConditionExpression on version
    Concurrent invocations: one wins, others get ConditionalCheckFailedException.
    """
    # Read current version
    item = table.get_item(Key={"id": event["id"]}, ConsistentRead=True)["Item"]
    current_version = int(item["version"])

    # Simulate work -- gives the race window
    logger.info("read version=%d, sleeping...", current_version)
    time.sleep(2)

    # Conditional update
    response = table.update_item(
        Key={"id": event["id"]},
        UpdateExpression="SET #s = :s, version = :new_v",
        ConditionExpression="version = :old_v",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": "shipped",
            ":new_v": current_version + 1,
            ":old_v": current_version,
        },
        ReturnValues="ALL_NEW",
        ReturnValuesOnConditionCheckFailure="ALL_OLD",
    )
    return {"won_the_race": True, "after": _to_json(response["Attributes"])}
