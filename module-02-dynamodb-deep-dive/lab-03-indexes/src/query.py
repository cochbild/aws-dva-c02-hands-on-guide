"""
Query LSI or GSI based on input.

LSI:
  {"index": "LSI_DueDate", "user_id": "u-001"}
  {"index": "LSI_DueDate", "user_id": "u-001", "due_before": "2025-06-01"}
  {"index": "LSI_DueDate", "user_id": "u-001", "consistent": true}  -- supported

GSI:
  {"index": "GSI_Status", "status": "pending"}
  {"index": "GSI_Status", "status": "pending", "consistent": true}  -- ValidationException
"""
import json
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        return float(o) if isinstance(o, Decimal) else super().default(o)


def handler(event, context):
    index = event["index"]
    consistent = event.get("consistent", False)

    try:
        if index == "LSI_DueDate":
            user_id = event["user_id"]
            if "due_before" in event:
                cond = Key("user_id").eq(user_id) & Key("due_date").lt(event["due_before"])
            else:
                cond = Key("user_id").eq(user_id)

            response = table.query(
                IndexName=index,
                KeyConditionExpression=cond,
                ConsistentRead=consistent,   # works on LSI
                ReturnConsumedCapacity="INDEXES",
            )

        elif index == "GSI_Status":
            response = table.query(
                IndexName=index,
                KeyConditionExpression=Key("status").eq(event["status"]),
                ConsistentRead=consistent,   # FAILS on GSI
                ReturnConsumedCapacity="INDEXES",
            )

        else:
            return {"error": f"unknown index: {index}"}

    except ClientError as e:
        return {
            "error_code": e.response["Error"]["Code"],
            "error_message": e.response["Error"]["Message"],
        }

    return {
        "count": response["Count"],
        "items": json.loads(json.dumps(response["Items"], cls=DecimalEncoder)),
        "consumed_capacity": str(response.get("ConsumedCapacity")),
    }
