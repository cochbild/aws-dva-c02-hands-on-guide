"""Function A — consumes shared layer."""
import requests   # provided by the layer (NOT in the Lambda runtime)


def handler(event, context):
    r = requests.get("https://httpbin.org/uuid", timeout=5)
    return {
        "function": "A",
        "status_code": r.status_code,
        "uuid": r.json().get("uuid"),
    }
