"""Function B — consumes shared layer (same dep as A)."""
import requests


def handler(event, context):
    r = requests.get("https://httpbin.org/ip", timeout=5)
    return {
        "function": "B",
        "status_code": r.status_code,
        "origin": r.json().get("origin"),
    }
