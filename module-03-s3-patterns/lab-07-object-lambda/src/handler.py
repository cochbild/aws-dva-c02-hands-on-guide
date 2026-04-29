"""
S3 Object Lambda — PII redactor.

Receives a GetObject event with a presigned URL to the original object,
fetches it, redacts SSN / credit-card / email patterns, and writes the
redacted body back via WriteGetObjectResponse.
"""
import json
import logging
import re
import urllib.request

import boto3

log = logging.getLogger()
log.setLevel(logging.INFO)

_s3 = boto3.client("s3")

# Patterns
SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
CC_RE = re.compile(r"\b(?:\d{4}-){3}\d{4}\b|\b\d{4}-\d{6}-\d{5}\b")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def redact(body: str) -> tuple[str, dict]:
    counts = {"ssn": 0, "cc": 0, "email": 0}

    def _ssn(_):
        counts["ssn"] += 1
        return "[SSN-REDACTED]"

    def _cc(_):
        counts["cc"] += 1
        return "[CC-REDACTED]"

    def _email(_):
        counts["email"] += 1
        return "[EMAIL-REDACTED]"

    body = SSN_RE.sub(_ssn, body)
    body = CC_RE.sub(_cc, body)
    body = EMAIL_RE.sub(_email, body)
    return body, counts


def handler(event, context):
    log.info("Object Lambda event: %s", json.dumps(event))
    ctx = event["getObjectContext"]
    request_route = ctx["outputRoute"]
    request_token = ctx["outputToken"]
    input_url = ctx["inputS3Url"]

    try:
        with urllib.request.urlopen(input_url) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        # Propagate not-found / forbidden status to the client cleanly,
        # otherwise S3 hangs until 60s timeout.
        log.warning("HTTPError fetching original: %s", e)
        _s3.write_get_object_response(
            RequestRoute=request_route,
            RequestToken=request_token,
            StatusCode=e.code,
        )
        return {"ok": False, "status": e.code}

    redacted, counts = redact(body)
    log.info("Redaction counts: %s", counts)

    _s3.write_get_object_response(
        RequestRoute=request_route,
        RequestToken=request_token,
        StatusCode=status,
        Body=redacted.encode("utf-8"),
        ContentType="text/plain",
    )

    return {"ok": True, "redactions": counts}
