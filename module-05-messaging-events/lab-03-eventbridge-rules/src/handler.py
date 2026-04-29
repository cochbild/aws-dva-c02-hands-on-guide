"""EventBridge target — receives the InputTransformer-shaped payload."""
import json
import logging

log = logging.getLogger()
log.setLevel(logging.INFO)


def handler(event, context):
    log.info("Transformed event received: %s", json.dumps(event))
    return {"received": event}
