"""
DVA-C02 Lab 1.2B — DynamoDB Streams consumer.

Demonstrates:
- Reading stream records (eventName: INSERT/MODIFY/REMOVE)
- DynamoDB attribute format ({"S": "..."}, {"N": "..."} etc.)
- BisectBatchOnFunctionError isolation
- Reporting partial batch failures with sequence numbers

Test data:
- An item with value < 0 raises an exception (poison pill).
- BisectBatchOnFunctionError will split the batch on failure;
  after MaximumRetryAttempts the bad record goes to the on-failure SQS queue.
"""
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    batch_item_failures = []

    for record in event["Records"]:
        seq = record["dynamodb"]["SequenceNumber"]
        event_name = record["eventName"]   # INSERT | MODIFY | REMOVE

        try:
            if event_name in ("INSERT", "MODIFY"):
                new_image = record["dynamodb"].get("NewImage", {})
                pk = new_image.get("pk", {}).get("S")
                value = int(new_image.get("value", {}).get("N", "0"))

                logger.info("processing", extra={
                    "event": event_name, "pk": pk, "value": value, "seq": seq,
                })

                if value < 0:
                    raise ValueError(f"poison pill: value={value} for pk={pk}")

            elif event_name == "REMOVE":
                old_image = record["dynamodb"].get("OldImage", {})
                logger.info("deleted", extra={"old_image": old_image})

        except Exception as e:
            logger.error("record failed", extra={"seq": seq, "error": str(e)})
            batch_item_failures.append({"itemIdentifier": seq})

    return {"batchItemFailures": batch_item_failures}
