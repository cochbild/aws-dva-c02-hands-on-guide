"""Seed tasks for the LSI/GSI demo."""
import os
import random
from datetime import datetime, timedelta

import boto3

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])

USERS = ["u-001", "u-002", "u-003"]
STATUSES = ["pending", "in_progress", "done"]


def handler(event, context):
    base = datetime(2025, 1, 1)
    written = 0
    with table.batch_writer() as batch:
        for user in USERS:
            for i in range(8):
                due = base + timedelta(days=random.randint(0, 365))
                batch.put_item(Item={
                    "user_id": user,
                    "task_id": f"task-{user}-{i:03d}",
                    "title": f"Task {i} for {user}",
                    "due_date": due.strftime("%Y-%m-%d"),
                    "status": random.choice(STATUSES),
                })
                written += 1
    return {"written": written}
