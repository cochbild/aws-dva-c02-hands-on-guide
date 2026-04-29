"""
DVA-C02 Lab 3.2 — Presigned URL generator.

Generates a presigned PUT URL (forces Content-Type and SSE-S3 via signed
headers) and a presigned GET URL. Both expire in `expires_in` seconds
(default 300). URL signing is purely client-side — no API call to AWS.
"""

import json
import logging
import os
from typing import Any

import boto3
from botocore.config import Config

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# SDK client created at module scope - reused across invokes (CONVENTIONS §2)
_BUCKET = os.environ["TARGET_BUCKET"]
_s3 = boto3.client(
    "s3",
    config=Config(signature_version="s3v4"),
)


def lambda_handler(event: dict, context: Any) -> dict:
    """
    Event shape:
        { "key": "uploads/test.txt", "expires_in": 300 }
    """
    key = event.get("key", "uploads/test.txt")
    expires_in = int(event.get("expires_in", 300))

    if not key.startswith("uploads/"):
        return {"error": "key must start with 'uploads/' (IAM policy scope)"}

    # PUT URL: client must send Content-Type: text/plain and the SSE header
    put_url = _s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": _BUCKET,
            "Key": key,
            "ContentType": "text/plain",
            "ServerSideEncryption": "AES256",
        },
        ExpiresIn=expires_in,
        HttpMethod="PUT",
    )

    # GET URL: no header binding
    get_url = _s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": _BUCKET, "Key": key},
        ExpiresIn=expires_in,
        HttpMethod="GET",
    )

    logger.info("Generated presigned URLs for s3://%s/%s (expires_in=%ds)", _BUCKET, key, expires_in)

    return {
        "bucket": _BUCKET,
        "key": key,
        "expires_in": expires_in,
        "put_url": put_url,
        "get_url": get_url,
        "required_headers_for_put": {
            "Content-Type": "text/plain",
            "x-amz-server-side-encryption": "AES256",
        },
    }
