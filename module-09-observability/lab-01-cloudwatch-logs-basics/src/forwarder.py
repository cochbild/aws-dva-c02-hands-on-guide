"""Receives a subscription-filter event from CloudWatch Logs.

Subscription-filter events are gzipped + base64-encoded in event['awslogs']['data'].
Format reference:
https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html#LambdaFunctionExample
"""

import base64
import gzip
import json


def handler(event, context):
    raw = event["awslogs"]["data"]
    decoded = json.loads(gzip.decompress(base64.b64decode(raw)))

    log_group = decoded["logGroup"]
    log_stream = decoded["logStream"]
    log_events = decoded["logEvents"]

    print(f"RECEIVED {len(log_events)} error events from {log_group}")
    for e in log_events:
        # e['timestamp'] is ms since epoch; e['message'] is the log line
        print(f"  - ts={e['timestamp']} msg={e['message'][:200]}")

    return {"forwarded": len(log_events), "logGroup": log_group, "logStream": log_stream}
