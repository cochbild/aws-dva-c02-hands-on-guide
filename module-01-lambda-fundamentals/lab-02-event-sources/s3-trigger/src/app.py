"""
DVA-C02 Lab 1.2C — S3 → Lambda async push processor.

Demonstrates:
- S3 event format (Records with s3.bucket.name and s3.object.key)
- Reading the object via boto3
- Async invoke retry behavior + on-failure destination

Failure pattern:
- File without "hello" key in JSON raises an exception.
- After 2 retries (default async), event lands in the OnFailure SQS queue.
"""
import json
import logging
import urllib.parse

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)
s3 = boto3.client("s3")


def handler(event, context):
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        # S3 URL-encodes object keys -- always decode
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

        logger.info("processing", extra={"bucket": bucket, "key": key})

        obj = s3.get_object(Bucket=bucket, Key=key)
        body = obj["Body"].read().decode("utf-8")

        try:
            data = json.loads(body)
        except json.JSONDecodeError as e:
            # Raising here -> async invoke retries 2x, then DLQ/destination
            raise ValueError(f"not valid JSON: {key}") from e

        if "hello" not in data:
            raise ValueError(f"missing 'hello' key in {key}")

        logger.info("processed successfully", extra={"key": key, "data": data})

    return {"processed": len(event["Records"])}
