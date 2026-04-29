"""
DVA-C02 Lab 1.6 — Function that succeeds or fails based on input.

Async invokes only:
  {"action": "succeed"}  -> returns ok, result lands in SuccessQueue
  {"action": "fail"}     -> raises after retries, lands in FailureQueue
"""
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    action = event.get("action", "succeed")
    logger.info("invoked", extra={"action": action, "request_id": context.aws_request_id})

    if action == "fail":
        raise RuntimeError("simulated failure for OnFailure destination")

    return {"ok": True, "echo": event}
