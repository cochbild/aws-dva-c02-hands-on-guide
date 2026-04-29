"""
DVA-C02 Lab 2.5 — Transactions.

Demonstrates TransactWriteItems for an atomic 3-step money transfer:
  1. Debit sender (with balance check)
  2. Credit receiver
  3. Insert transfer log (with idempotency check)

If any step fails, all are rolled back.
"""
import json
import logging
import os
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Use the low-level client for transactions -- the resource API has TransactWriteItems too
# but the parameter format is uglier
client = boto3.client("dynamodb")
ACCOUNTS = os.environ["ACCOUNTS_TABLE"]
TRANSFERS = os.environ["TRANSFERS_TABLE"]


def handler(event, context):
    op = event["op"]
    try:
        return {
            "init": _init,
            "get": _get,
            "transfer": _transfer,
        }[op](event)
    except ClientError as e:
        # TransactionCanceledException carries CancellationReasons describing each item's outcome
        return {
            "error_code": e.response["Error"]["Code"],
            "error_message": e.response["Error"]["Message"],
            "cancellation_reasons": e.response.get("CancellationReasons"),
        }


def _init(event):
    """Bulk init accounts via BatchWriteItem (not transactional, just bulk)."""
    items = []
    for acc in event["accounts"]:
        items.append({
            "PutRequest": {
                "Item": {
                    "account_id": {"S": acc["id"]},
                    "balance": {"N": str(acc["balance"])},
                }
            }
        })
    client.batch_write_item(RequestItems={ACCOUNTS: items})
    return {"initialized": [a["id"] for a in event["accounts"]]}


def _get(event):
    response = client.get_item(
        TableName=ACCOUNTS,
        Key={"account_id": {"S": event["id"]}},
        ConsistentRead=True,
    )
    item = response.get("Item")
    if not item:
        return {"found": False}
    return {
        "id": item["account_id"]["S"],
        "balance": int(item["balance"]["N"]),
    }


def _transfer(event):
    """
    Atomic 3-step transfer:
      1. Debit `from` -- condition: balance >= amount
      2. Credit `to`
      3. Insert transfer log -- condition: attribute_not_exists(transfer_id)
    """
    sender = event["from"]
    receiver = event["to"]
    amount = event["amount"]
    transfer_id = event["transfer_id"]

    response = client.transact_write_items(
        TransactItems=[
            {
                "Update": {
                    "TableName": ACCOUNTS,
                    "Key": {"account_id": {"S": sender}},
                    "UpdateExpression": "SET balance = balance - :amt",
                    "ConditionExpression": "balance >= :amt",
                    "ExpressionAttributeValues": {":amt": {"N": str(amount)}},
                }
            },
            {
                "Update": {
                    "TableName": ACCOUNTS,
                    "Key": {"account_id": {"S": receiver}},
                    "UpdateExpression": "SET balance = balance + :amt",
                    "ExpressionAttributeValues": {":amt": {"N": str(amount)}},
                }
            },
            {
                "Put": {
                    "TableName": TRANSFERS,
                    "Item": {
                        "transfer_id": {"S": transfer_id},
                        "from": {"S": sender},
                        "to": {"S": receiver},
                        "amount": {"N": str(amount)},
                    },
                    # Idempotency: refuse to re-apply the same transfer
                    "ConditionExpression": "attribute_not_exists(transfer_id)",
                }
            },
        ],
        # ClientRequestToken makes the whole thing idempotent for ~10 min
        # ClientRequestToken=transfer_id,
    )
    logger.info("transfer ok: %s -> %s amount=%d", sender, receiver, amount)
    return {"ok": True, "transfer_id": transfer_id}
