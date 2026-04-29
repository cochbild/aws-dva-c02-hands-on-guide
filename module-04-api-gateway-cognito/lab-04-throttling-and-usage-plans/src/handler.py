"""Lab 4.4 — same handler as 4.3 (the API surface is unchanged; we only add
throttling, API key, and usage plan to the existing methods)."""
import json


def lambda_handler(event, context):
    invoked_arn = context.invoked_function_arn
    alias = invoked_arn.split(":")[-1] if ":" in invoked_arn else "unknown"

    if "qty" in event:
        qty = event["qty"]
        if qty > 1000:
            raise Exception("ORDER_TOO_LARGE: max 1000 per order")
        return {
            "ok": True,
            "customerId": event.get("customer_id"),
            "qty": qty,
            "source": event.get("source"),
            "alias": alias,
            "requestId": event.get("request_id"),
        }

    body = {"message": "hello from throttling lab", "alias": alias}
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }
