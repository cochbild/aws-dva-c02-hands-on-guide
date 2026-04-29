"""
DVA-C02 Lab 1.2A — SQS consumer with partial batch responses.

Demonstrates:
- Reading SQS records from event["Records"]
- Reporting per-message failures via batchItemFailures
- Why visibility timeout matters

Test data:
- Messages with body == '{"id": "fail-me"}' will be reported as failed.
- All other messages succeed.
"""
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    """SQS ESM passes a batch of records via event['Records']."""
    batch_item_failures = []

    for record in event["Records"]:
        message_id = record["messageId"]
        body = record["body"]

        try:
            data = json.loads(body)
            logger.info("processing message", extra={"message_id": message_id, "data": data})

            # Simulated failure
            if data.get("id") == "fail-me":
                raise ValueError("simulated processing failure")

            # ... your real processing logic would go here ...

        except Exception as e:
            logger.error(
                "failed to process message",
                extra={"message_id": message_id, "error": str(e)},
            )
            # Report this individual failure -- only this message goes back to the queue.
            # If we raised here instead, the WHOLE batch would go back.
            batch_item_failures.append({"itemIdentifier": message_id})

    # Return shape required when FunctionResponseTypes includes ReportBatchItemFailures
    return {"batchItemFailures": batch_item_failures}
