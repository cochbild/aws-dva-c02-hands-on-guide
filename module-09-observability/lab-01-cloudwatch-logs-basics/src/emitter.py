"""Emits a mix of INFO and ERROR log lines per invoke.

Demonstrates:
- Lambda runtime auto-routes stdout to CloudWatch Logs
- LoggingConfig:LogFormat: JSON wraps print() output in JSON envelopes
- ~1 in 5 ERRORs to give the metric filter and subscription filter something
  to match
"""

import random


def handler(event, context):
    items = event.get("items", list(range(5)))
    error_rate = float(event.get("error_rate", 0.2))

    processed = 0
    failed = 0
    for item_id in items:
        if random.random() < error_rate:
            print(f'{{"level":"ERROR","msg":"failed to process id={item_id}: timeout"}}')
            failed += 1
        else:
            print(f'{{"level":"INFO","msg":"processed item id={item_id}"}}')
            processed += 1

    return {"processed": processed, "failed": failed, "request_id": context.aws_request_id}
