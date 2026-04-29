"""Kinesis stream consumer — decodes base64 payloads and logs them."""
import base64
import json
import logging

log = logging.getLogger()
log.setLevel(logging.INFO)


def handler(event, context):
    log.info("Received batch of %d records", len(event["Records"]))
    for record in event["Records"]:
        kinesis = record["kinesis"]
        payload = base64.b64decode(kinesis["data"]).decode()
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            parsed = payload
        log.info("partitionKey=%s seq=%s payload=%s",
                 kinesis["partitionKey"],
                 kinesis["sequenceNumber"][:20],
                 parsed)
        # Simulate poison: any record with intentional_fail=true raises
        if isinstance(parsed, dict) and parsed.get("intentional_fail"):
            raise Exception(f"poison record: {parsed}")
    return {"ok": True, "processed": len(event["Records"])}
