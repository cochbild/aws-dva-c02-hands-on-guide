"""
DVA-C02 Lab 2.6 — Audit trail from DynamoDB Streams.

Captures every change to the posts table and writes a normalized audit entry
to a separate audit table. Demonstrates:
  - Reading NewImage and OldImage
  - Converting DynamoDB JSON to plain dicts via TypeDeserializer
  - Building idempotent audit IDs from sequence numbers
"""
import json
import logging
import os
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.types import TypeDeserializer

logger = logging.getLogger()
logger.setLevel(logging.INFO)

audit_table = boto3.resource("dynamodb").Table(os.environ["AUDIT_TABLE"])
deser = TypeDeserializer()


def _unwrap(image: dict) -> dict:
    """Convert {'attr': {'S': 'value'}, ...} to {'attr': 'value', ...}."""
    return {k: deser.deserialize(v) for k, v in image.items()} if image else {}


def handler(event, context):
    failures = []
    for record in event["Records"]:
        seq = record["dynamodb"]["SequenceNumber"]
        try:
            audit_table.put_item(
                Item={
                    # Idempotent audit_id from sequence number -- replays are safe
                    "audit_id": f"{record['eventName']}#{seq}",
                    "event_name": record["eventName"],
                    "occurred_at": datetime.now(timezone.utc).isoformat(),
                    "sequence_number": seq,
                    "keys": json.dumps(_unwrap(record["dynamodb"]["Keys"])),
                    "old_image": json.dumps(_unwrap(record["dynamodb"].get("OldImage", {}))),
                    "new_image": json.dumps(_unwrap(record["dynamodb"].get("NewImage", {}))),
                },
                ConditionExpression="attribute_not_exists(audit_id)",
            )
        except Exception as e:
            # Swallow "already exists" (idempotent replay) but report other errors
            err_code = getattr(e, "response", {}).get("Error", {}).get("Code")
            if err_code == "ConditionalCheckFailedException":
                logger.info("duplicate audit, skipping", extra={"seq": seq})
                continue
            logger.error("audit failed", extra={"seq": seq, "error": str(e)})
            failures.append({"itemIdentifier": seq})

    return {"batchItemFailures": failures}
