"""Lab 4.1 — Hello handler for both REST and HTTP API.

Detects which API type invoked it by inspecting the event shape, then echoes
the event so the lab can compare REST v1.0 vs HTTP v2.0 event formats.
"""
import json


def lambda_handler(event, context):
    # HTTP API v2.0 has 'version': '2.0' and 'requestContext.http.method'.
    # REST API v1.0 has 'httpMethod' at top level (no version key).
    api_version = event.get("version", "1.0")
    if api_version == "2.0":
        api_type = "HTTP API"
        method = event.get("requestContext", {}).get("http", {}).get("method", "?")
        path = event.get("rawPath", "?")
    else:
        api_type = "REST API"
        method = event.get("httpMethod", "?")
        path = event.get("path", "?")

    body = {
        "message": f"hello from {api_type}",
        "method": method,
        "path": path,
        "eventVersion": api_version,
        "echo": event,
    }
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }
