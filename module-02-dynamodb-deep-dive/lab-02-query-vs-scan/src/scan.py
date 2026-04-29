"""
Scan example with filter.

Input: {"min_total": 100}

Notice that scanned_count > returned_count -- you pay for the scan, filter is post-read.
"""
import json
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)


def handler(event, context):
    min_total = Decimal(str(event.get("min_total", 0)))

    response = table.scan(
        FilterExpression=Attr("total").gte(min_total),
        ReturnConsumedCapacity="TOTAL",
    )

    return {
        "returned_count": response["Count"],
        "scanned_count": response["ScannedCount"],   # how many items were read; you paid for ALL of these
        "consumed_capacity": str(response.get("ConsumedCapacity")),
        "items": json.loads(json.dumps(response["Items"], cls=DecimalEncoder)),
    }
