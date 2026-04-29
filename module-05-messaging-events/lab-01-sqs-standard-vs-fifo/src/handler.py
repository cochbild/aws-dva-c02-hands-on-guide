"""Consumer handlers for Lab 5.1.

Both handlers receive SQS event source mapping events.
Messages whose body starts with "fail-" are deliberately raised so we can
demonstrate visibility-timeout retry and DLQ redrive behavior.

ReportBatchItemFailures is enabled in the template, so we return the
itemIdentifier for each failed message instead of raising — this lets us
fail individual records without re-delivering the entire batch.
"""

import json
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def _process_record(record: dict) -> None:
    body = record.get("body", "")
    msg_id = record.get("messageId", "?")
    receive_count = record.get("attributes", {}).get("ApproximateReceiveCount", "1")

    logger.info(json.dumps({
        "messageId": msg_id,
        "body": body,
        "receiveCount": receive_count,
        "messageGroupId": record.get("attributes", {}).get("MessageGroupId"),
    }))

    if body.startswith("fail-"):
        raise RuntimeError(f"deliberate failure for {body}")


def standard_handler(event, context):
    failures = []
    for record in event.get("Records", []):
        try:
            _process_record(record)
        except Exception as e:  # noqa: BLE001
            logger.exception("processing failed for %s", record.get("messageId"))
            failures.append({"itemIdentifier": record.get("messageId")})

    return {"batchItemFailures": failures}


def fifo_handler(event, context):
    # FIFO consumer logs the message-group-id so the lab can demonstrate ordering.
    failures = []
    for record in event.get("Records", []):
        try:
            _process_record(record)
        except Exception:
            logger.exception("processing failed")
            failures.append({"itemIdentifier": record.get("messageId")})
    return {"batchItemFailures": failures}
