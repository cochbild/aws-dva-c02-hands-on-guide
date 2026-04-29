"""Three handlers in one file for the integration-patterns lab."""
import json
import logging
import time

import boto3

log = logging.getLogger()
log.setLevel(logging.INFO)

_sfn = boto3.client("stepfunctions")


def preprocess(event, context):
    return {"order_id": event.get("order_id"), "preprocessed_at": int(time.time())}


def finalize(event, context):
    return {"finalized": True, "order_id": event.get("preprocess", {}).get("preprocessed", {}).get("order_id")}


def callback_worker(event, context):
    """SQS-driven worker that auto-approves the task by calling SendTaskSuccess."""
    for record in event["Records"]:
        body = json.loads(record["body"])
        token = body["taskToken"]
        original_input = body["input"]
        log.info("Auto-approving task for input: %s", original_input)
        _sfn.send_task_success(
            taskToken=token,
            output=json.dumps({"approved": True, "approver": "auto", "ts": int(time.time())}),
        )
    return {"processed": len(event["Records"])}
