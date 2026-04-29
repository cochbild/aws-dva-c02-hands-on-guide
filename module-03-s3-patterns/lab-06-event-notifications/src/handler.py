"""
Two handlers in one file:
- uploads_handler: receives the legacy S3 event-notification shape
- eventbridge_handler: receives the newer EventBridge S3 event shape

Both just log the event so you can see the difference.
"""
import json
import logging

log = logging.getLogger()
log.setLevel(logging.INFO)


def uploads_handler(event, context):
    log.info("=== DIRECT S3 EVENT (legacy Records[] shape) ===")
    log.info(json.dumps(event))
    for record in event.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]
        log.info(f"Direct: bucket={bucket} key={key} eventName={record['eventName']}")
    return {"ok": True, "shape": "legacy", "records": len(event.get("Records", []))}


def eventbridge_handler(event, context):
    log.info("=== EVENTBRIDGE S3 EVENT (flat detail-type shape) ===")
    log.info(json.dumps(event))
    bucket = event.get("detail", {}).get("bucket", {}).get("name")
    key = event.get("detail", {}).get("object", {}).get("key")
    log.info(f"EventBridge: bucket={bucket} key={key} detail-type={event.get('detail-type')}")
    return {"ok": True, "shape": "eventbridge", "bucket": bucket, "key": key}
