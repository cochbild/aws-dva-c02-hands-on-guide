"""SQS consumer that simulates poison messages.

Body shape: {"id": "...", "fail": true|false}
- fail=true: raise → message returns to queue, eventually DLQ
- fail=false: return success → message deleted
"""
import json
import logging

log = logging.getLogger()
log.setLevel(logging.INFO)


def handler(event, context):
    for record in event["Records"]:
        body = json.loads(record["body"])
        log.info("Processing %s (attempt approx %s)", body, record["attributes"].get("ApproximateReceiveCount"))
        if body.get("fail"):
            raise Exception(f"poison message: {body['id']}")
    return {"ok": True, "processed": len(event["Records"])}
