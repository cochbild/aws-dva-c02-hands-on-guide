"""Three Lambdas, one file. Wired separately by handler name."""


def validate_address(event, context):
    return {"address_ok": True, "tenantId": event.get("tenantId")}


def charge_card(event, context):
    return {"charged": True, "amount": sum(o.get("amount", 0) for o in event.get("orders", []))}


def process_order(event, context):
    order = event["order"]
    return {
        "order_id": order["id"],
        "tenant": event["tenantId"],
        "amount": order["amount"],
        "status": "processed",
    }
