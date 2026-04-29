"""
DVA-C02 Lab 1.7 — VPC Lambda.

Demonstrates:
- Lambda running in a VPC reaching S3 via the gateway endpoint (no internet)
- Failure to reach the public internet (no NAT, no internet endpoint)
"""
import logging
import os
import socket

import boto3
import urllib.request
import urllib.error

logger = logging.getLogger()
logger.setLevel(logging.INFO)
s3 = boto3.client("s3")


def handler(event, context):
    bucket = os.environ["BUCKET_NAME"]
    result = {"bucket": bucket}

    # 1. List bucket contents -- works through the S3 gateway VPC endpoint
    try:
        response = s3.list_objects_v2(Bucket=bucket, MaxKeys=10)
        result["s3_via_endpoint"] = {
            "ok": True,
            "object_count": response.get("KeyCount", 0),
            "objects": [obj["Key"] for obj in response.get("Contents", [])],
        }
    except Exception as e:
        result["s3_via_endpoint"] = {"ok": False, "error": str(e)}

    # 2. Try to reach a public site -- expected to fail (no NAT)
    try:
        socket.setdefaulttimeout(3)
        with urllib.request.urlopen("https://api.github.com", timeout=3) as r:
            result["public_internet"] = {"ok": True, "status": r.status}
    except (urllib.error.URLError, socket.timeout, OSError) as e:
        result["public_internet"] = {"ok": False, "error": str(e)}

    return result
