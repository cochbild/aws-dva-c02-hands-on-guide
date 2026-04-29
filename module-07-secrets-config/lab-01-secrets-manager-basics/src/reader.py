"""Lab 7.1 reader Lambda.

Demonstrates module-level caching of a secret. The boto3 client and the
fetched secret value are stored in module globals, so they survive across
warm invocations of the same execution environment.

NEVER returns the password value itself — only metadata. This is the
production-safe pattern when you need to verify a secret was loaded but
don't want to leak it through CloudWatch.
"""
import hashlib
import json
import os

import boto3

# Module-level state — populated once per cold start.
_sm = boto3.client("secretsmanager")
_secret_cache = None  # tuple of (secret_dict, version_id) or None


def _load_secret():
    """Fetch the secret. Called once per cold start; cached afterwards."""
    resp = _sm.get_secret_value(SecretId=os.environ["SECRET_ARN"])
    payload = json.loads(resp["SecretString"])
    return payload, resp["VersionId"]


def handler(event, context):
    global _secret_cache
    cached = _secret_cache is not None
    if not cached:
        _secret_cache = _load_secret()
    secret, version_id = _secret_cache

    pwd = secret["password"]
    return {
        "username": secret["username"],
        "password_length": len(pwd),
        "password_hash": hashlib.sha256(pwd.encode("utf-8")).hexdigest(),
        "version_id": version_id,
        "cached": cached,
    }
