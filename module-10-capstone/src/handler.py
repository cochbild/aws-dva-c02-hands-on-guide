"""Capstone application — three Lambdas in one file.

- create_order: API GW backend; validates, writes DDB, publishes EventBridge
- charge_customer: EventBridge subscriber; reads Stripe secret, updates DDB, publishes SNS
- audit_log: DDB Streams consumer; archives mutations to S3
"""
import json
import os
import time
import uuid

import boto3
from aws_xray_sdk.core import patch_all

patch_all()

ddb = boto3.resource("dynamodb")
events = boto3.client("events")
secrets = boto3.client("secretsmanager")
sns = boto3.client("sns")
s3 = boto3.client("s3")

_table = None
_stripe_creds = None


def _get_table():
    global _table
    if _table is None:
        _table = ddb.Table(os.environ["TABLE_NAME"])
    return _table


def _emf(metric_name, value, unit="Count", **dims):
    """Emit an EMF metric line — free metric extraction."""
    print(json.dumps({
        "_aws": {
            "Timestamp": int(time.time() * 1000),
            "CloudWatchMetrics": [{
                "Namespace": "DvaCapstone",
                "Dimensions": [list(dims.keys())] if dims else [[]],
                "Metrics": [{"Name": metric_name, "Unit": unit}],
            }],
        },
        **dims,
        metric_name: value,
    }))


# ─────────────── create_order ───────────────
def create_order(event, context):
    """API GW HTTP API integration. Body: {"items":[{"name":..,"price":..}], "tier":"basic|premium"}."""
    try:
        claims = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
        customer_id = claims.get("sub", "anonymous")

        body = json.loads(event.get("body") or "{}")
        items = body.get("items", [])
        tier = body.get("tier", "basic")
        total = sum(item.get("price", 0) for item in items)
        order_id = body.get("idempotency_key") or str(uuid.uuid4())

        # Idempotent write: ConditionExpression rejects duplicates
        try:
            _get_table().put_item(
                Item={
                    "orderId": order_id,
                    "customerId": customer_id,
                    "items": items,
                    "tier": tier,
                    "total": str(total),
                    "status": "PENDING",
                    "createdAt": int(time.time()),
                },
                ConditionExpression="attribute_not_exists(orderId)",
            )
        except _get_table().meta.client.exceptions.ConditionalCheckFailedException:
            return {
                "statusCode": 200,
                "body": json.dumps({"orderId": order_id, "duplicate": True}),
            }

        # Publish OrderCreated to EventBridge
        events.put_events(Entries=[{
            "Source": "dva-capstone.orders",
            "DetailType": "OrderCreated",
            "EventBusName": os.environ["BUS_NAME"],
            "Detail": json.dumps({
                "orderId": order_id,
                "customerId": customer_id,
                "tier": tier,
                "total": total,
            }),
        }])

        _emf("OrdersCreated", 1, tier=tier)

        return {
            "statusCode": 201,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"orderId": order_id, "status": "PENDING"}),
        }
    except Exception as e:
        _emf("OrdersFailed", 1)
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}


# ─────────────── charge_customer ───────────────
def charge_customer(event, context):
    """Receives EventBridge OrderCreated event (or Step Functions Lambda invocation).
    Fetches stripe secret, charges (mock), updates order to CHARGED, publishes confirmation.
    """
    global _stripe_creds
    if _stripe_creds is None:
        resp = secrets.get_secret_value(SecretId=os.environ["STRIPE_SECRET_ARN"])
        _stripe_creds = json.loads(resp["SecretString"])

    # Event shape varies: from EventBridge it's {"detail": {...}}; from Step Functions it's the raw detail
    detail = event.get("detail", event)
    order_id = detail.get("orderId")
    customer_id = detail.get("customerId")
    total = detail.get("total")

    # Mock the charge
    print(f"Charging {total} to customer {customer_id} via stripe (mock)")

    # Update order status
    _get_table().update_item(
        Key={"orderId": order_id},
        UpdateExpression="SET #s = :s, chargedAt = :t",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": "CHARGED", ":t": int(time.time())},
    )

    # Notify
    sns.publish(
        TopicArn=os.environ["CONFIRMATION_TOPIC_ARN"],
        Subject="Order confirmed",
        Message=f"Your order {order_id} for {total} has been charged. Thank you!",
    )

    _emf("OrdersCharged", 1)
    return {"orderId": order_id, "status": "CHARGED"}


# ─────────────── audit_log ───────────────
def audit_log(event, context):
    """DDB Streams consumer — archive every mutation to S3."""
    archive_bucket = os.environ["ARCHIVE_BUCKET"]
    for record in event.get("Records", []):
        event_name = record["eventName"]  # INSERT / MODIFY / REMOVE
        keys = record["dynamodb"].get("Keys", {})
        order_id = keys.get("orderId", {}).get("S", "unknown")

        body = {
            "eventName": event_name,
            "timestamp": int(time.time()),
            "keys": keys,
            "newImage": record["dynamodb"].get("NewImage"),
            "oldImage": record["dynamodb"].get("OldImage"),
        }

        s3.put_object(
            Bucket=archive_bucket,
            Key=f"audit/{time.strftime('%Y/%m/%d')}/{order_id}-{int(time.time()*1000)}-{event_name}.json",
            Body=json.dumps(body, default=str).encode(),
            ContentType="application/json",
        )

    _emf("AuditEventsArchived", len(event.get("Records", [])))
    return {"archived": len(event.get("Records", []))}
