"""Lab 4.3 — handler that responds to /hello (proxy) and /orders (non-proxy via VTL).

For non-proxy integrations, the event is the OUTPUT of the request mapping
template — already transformed shape. The Lambda checks the qty field and
deliberately raises with 'ORDER_TOO_LARGE' to demonstrate selectionPattern
status code overrides.
"""
import json


def lambda_handler(event, context):
    invoked_arn = context.invoked_function_arn
    alias = invoked_arn.split(":")[-1] if ":" in invoked_arn else "unknown"

    # /orders path: event is the transformed shape from the VTL template
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

    # /hello path: proxy event shape
    body = {
        "message": "hello from validation lab",
        "alias": alias,
    }
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }
