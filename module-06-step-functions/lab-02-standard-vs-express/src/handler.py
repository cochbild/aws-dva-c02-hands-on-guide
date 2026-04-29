"""DoWork Lambda — invoked from both the Standard and Express state machines."""


def work(event, context):
    order_id = event.get("order_id", "unknown")
    amount = event.get("amount", 0)
    return {
        "result": {
            "processed_order": order_id,
            "amount": amount,
            "status": "ok",
        }
    }
