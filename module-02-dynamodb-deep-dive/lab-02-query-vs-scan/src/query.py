"""
Query examples.

Input:
  {"user_id": "u-001"}                 -> all orders for that user
  {"user_id": "u-001", "year": "2024"} -> only 2024 orders for that user (begins_with on sort key)
"""
import json
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)


def handler(event, context):
    user_id = event["user_id"]
    year = event.get("year")

    # boto3 has a fluent Key/Attr builder -- equivalent to KeyConditionExpression strings
    if year:
        key_cond = Key("user_id").eq(user_id) & Key("order_sk").begins_with(year)
    else:
        key_cond = Key("user_id").eq(user_id)

    response = table.query(
        KeyConditionExpression=key_cond,
        # Ask DynamoDB to return capacity stats so we can see what we used
        ReturnConsumedCapacity="TOTAL",
    )

    return {
        "returned_count": response["Count"],
        "scanned_count": response["ScannedCount"],
        "consumed_capacity": str(response.get("ConsumedCapacity")),
        "items": json.loads(json.dumps(response["Items"], cls=DecimalEncoder)),
    }
