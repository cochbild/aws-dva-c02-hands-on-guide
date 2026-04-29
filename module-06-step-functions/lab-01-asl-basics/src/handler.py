"""Lab 6.1 — validate handler.

Receives an order { amount: float, currency: str, ...}, normalises the amount
to USD using a fixed FX table, and returns { ok, amountUsd, reason }.

This is intentionally tiny — the lab focuses on the state machine, not the code.
"""

FX = {
    "USD": 1.0,
    "EUR": 1.10,
    "GBP": 1.27,
    "JPY": 0.0067,
}


def validate(event, context):
    amount = event.get("amount")
    currency = event.get("currency", "USD").upper()

    if amount is None or not isinstance(amount, (int, float)):
        return {"ok": False, "amountUsd": 0.0, "reason": "amount missing or not numeric"}
    if currency not in FX:
        return {"ok": False, "amountUsd": 0.0, "reason": f"unknown currency {currency}"}
    if amount <= 0:
        return {"ok": False, "amountUsd": 0.0, "reason": "amount must be positive"}

    amount_usd = round(float(amount) * FX[currency], 2)
    return {"ok": True, "amountUsd": amount_usd, "reason": ""}
