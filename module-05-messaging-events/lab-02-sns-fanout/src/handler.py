"""SNS Lambda subscriber — logs every message it receives."""
import json
import logging

log = logging.getLogger()
log.setLevel(logging.INFO)


def handler(event, context):
    for record in event["Records"]:
        sns = record["Sns"]
        attrs = sns.get("MessageAttributes", {})
        log.info("SNS message: id=%s message=%s attrs=%s",
                 sns["MessageId"], sns["Message"], json.dumps(attrs))
    return {"received": len(event["Records"])}
