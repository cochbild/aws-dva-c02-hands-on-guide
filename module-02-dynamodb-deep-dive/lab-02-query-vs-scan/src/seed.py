"""Seed the orders table with sample data."""
import os
import random
from decimal import Decimal

import boto3

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])

USERS = ["u-001", "u-002", "u-003", "u-004", "u-005"]
DATES_2024 = ["2024-01-15", "2024-03-22", "2024-06-10", "2024-09-05", "2024-12-01"]
DATES_2023 = ["2023-04-12", "2023-08-19"]


def handler(event, context):
    written = 0
    # batch_writer handles batching + retries automatically
    with table.batch_writer() as batch:
        for user in USERS:
            for i, date in enumerate(DATES_2024 + DATES_2023):
                batch.put_item(Item={
                    "user_id": user,
                    "order_sk": f"{date}#order-{user}-{i:03d}",
                    "order_date": date,
                    "order_id": f"order-{user}-{i:03d}",
                    "total": Decimal(str(round(random.uniform(20, 500), 2))),
                    "status": random.choice(["paid", "pending", "shipped"]),
                })
                written += 1
    return {"written": written}
