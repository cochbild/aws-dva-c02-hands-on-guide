"""DVA-C02 Lab 1.5 — Sleeps to simulate slow downstream and consume concurrency."""
import os
import time


def handler(event, context):
    sleep_secs = float(os.environ.get("SLEEP_SECS", "1"))
    time.sleep(sleep_secs)
    return {
        "slept": sleep_secs,
        "request_id": context.aws_request_id,
        "remaining_ms_at_end": context.get_remaining_time_in_millis(),
    }
