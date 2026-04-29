"""
DVA-C02 Lab 1.1 — Hello Lambda

Demonstrates:
- Module-level (init phase) code
- Handler signature
- Reading environment variables
- Using context object
- Structured logging
"""
import json
import logging
import os
from datetime import datetime, timezone

# This block runs ONCE per execution environment (cold start only).
# Use it for SDK clients, DB connections, and config loading.
logger = logging.getLogger()
logger.setLevel(logging.INFO)
GREETING = os.environ.get("GREETING", "hello")
logger.info("init phase complete, greeting=%s", GREETING)


def handler(event, context):
    """
    Lambda handler.

    Args:
        event: input payload (dict for JSON invokes)
        context: runtime info -- request ID, function ARN, remaining time, etc.

    Returns:
        For sync invokes (this case): whatever you return goes back to the caller.
        For async invokes: return value is ignored.
    """
    name = event.get("name", "world") if isinstance(event, dict) else "world"

    logger.info(
        "invoked",
        extra={
            "request_id": context.aws_request_id,
            "function_name": context.function_name,
            "remaining_ms": context.get_remaining_time_in_millis(),
        },
    )

    return {
        "statusCode": 200,
        "body": json.dumps(
            {
                "message": f"{GREETING}, {name}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "request_id": context.aws_request_id,
            }
        ),
    }
