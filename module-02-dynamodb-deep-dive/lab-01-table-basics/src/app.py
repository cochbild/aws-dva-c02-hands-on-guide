"""
DVA-C02 Lab 2.1 — DynamoDB CRUD operations.

Demonstrates every CRUD pattern:
- PutItem with attribute_not_exists guard (idempotent create)
- GetItem
- UpdateItem with atomic increment via ADD
- DeleteItem
- ConditionExpression-based safety
"""
import json
import logging
import os
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Init phase: client created once per execution environment
ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])


class DecimalEncoder(json.JSONEncoder):
    """boto3 returns numbers as Decimal; json.dumps doesn't know how to handle them."""
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def handler(event, context):
    op = event.get("op")
    logger.info("op=%s", op)

    try:
        if op == "create":
            return _create(event)
        elif op == "get":
            return _get(event)
        elif op == "increment_age":
            return _increment_age(event)
        elif op == "delete":
            return _delete(event)
        else:
            return {"error": f"unknown op: {op}"}
    except ClientError as e:
        # ClientError carries an AWS-specific error code we should surface
        return {
            "error_code": e.response["Error"]["Code"],
            "error_message": e.response["Error"]["Message"],
        }


def _create(event):
    """PutItem with attribute_not_exists -- fails if item already exists."""
    item = {
        "user_id": event["user_id"],
        "name": event["name"],
        "age": event["age"],
    }
    table.put_item(
        Item=item,
        ConditionExpression="attribute_not_exists(user_id)",
    )
    return {"created": item}


def _get(event):
    """GetItem -- returns the full item or None."""
    response = table.get_item(
        Key={"user_id": event["user_id"]},
        ConsistentRead=False,   # eventually consistent (cheaper)
    )
    item = response.get("Item")
    if item is None:
        return {"found": False}
    return {"found": True, "item": json.loads(json.dumps(item, cls=DecimalEncoder))}


def _increment_age(event):
    """UpdateItem with atomic ADD -- thread-safe counter increment."""
    response = table.update_item(
        Key={"user_id": event["user_id"]},
        # ADD on a number attribute = atomic increment
        UpdateExpression="ADD age :inc",
        ExpressionAttributeValues={":inc": 1},
        ConditionExpression="attribute_exists(user_id)",   # don't accidentally create a new item
        ReturnValues="ALL_NEW",   # return the item AFTER the update
    )
    return {
        "updated": json.loads(json.dumps(response.get("Attributes", {}), cls=DecimalEncoder))
    }


def _delete(event):
    """DeleteItem -- idempotent by default."""
    response = table.delete_item(
        Key={"user_id": event["user_id"]},
        ReturnValues="ALL_OLD",
    )
    deleted = response.get("Attributes")
    if deleted is None:
        return {"deleted": False, "reason": "no item with that key"}
    return {"deleted": True, "old": json.loads(json.dumps(deleted, cls=DecimalEncoder))}
