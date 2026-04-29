"""Demonstrates PutMetricData (sync, costs per call) vs EMF (free metric extraction)."""
import json
import random
import time

import boto3

cw = boto3.client("cloudwatch")


def emit_putmetricdata(metric_name, value, unit, service):
    cw.put_metric_data(
        Namespace="dva-lab-09-03/sync",
        MetricData=[{
            "MetricName": metric_name,
            "Value": value,
            "Unit": unit,
            "Dimensions": [{"Name": "Service", "Value": service}],
        }],
    )


def emit_emf(metric_name, value, unit, service):
    """Write a single EMF log line. CloudWatch extracts the metric for free."""
    print(json.dumps({
        "_aws": {
            "Timestamp": int(time.time() * 1000),
            "CloudWatchMetrics": [{
                "Namespace": "dva-lab-09-03/emf",
                "Dimensions": [["Service"]],
                "Metrics": [{"Name": metric_name, "Unit": unit}],
            }],
        },
        "Service": service,
        metric_name: value,
    }))


def handler(event, context):
    services = ["Checkout", "Cart", "Search"]
    sync_count = 0
    emf_count = 0
    for _ in range(20):
        svc = random.choice(services)
        latency = random.randint(20, 250)
        # both approaches emit the same WorkLatency observation
        emit_putmetricdata("WorkLatency", latency, "Milliseconds", svc)
        sync_count += 1
        emit_emf("WorkLatency", latency, "Milliseconds", svc)
        emf_count += 1
    return {
        "putmetricdata_calls": sync_count,
        "emf_log_lines": emf_count,
        "note": "Watch CloudWatch Metrics: dva-lab-09-03/sync (instant) vs dva-lab-09-03/emf (~60s lag, free extraction)",
    }
