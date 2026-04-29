"""Lab 7.1 custom rotation Lambda.

Implements the standard four-step rotation state machine that AWS-managed
RDS-style rotation Lambdas use. Secrets Manager invokes this Lambda four
times per rotation, once per step, with the step name in event["Step"].

Steps:

  1. createSecret  — generate a new value, store it as AWSPENDING
  2. setSecret     — apply the new value to the credential's owner
                     (in this lab there's no owner, so it's a no-op)
  3. testSecret    — verify the new value works (no-op here)
  4. finishSecret  — promote AWSPENDING to AWSCURRENT

Event shape (from Secrets Manager):

  {
    "SecretId": "arn:...",
    "ClientRequestToken": "<uuid for AWSPENDING>",
    "Step": "createSecret" | "setSecret" | "testSecret" | "finishSecret"
  }
"""
import json
import logging

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sm = boto3.client("secretsmanager")


def handler(event, context):
    secret_id = event["SecretId"]
    token = event["ClientRequestToken"]
    step = event["Step"]

    logger.info("Rotation step=%s secret=%s token=%s", step, secret_id, token)

    metadata = sm.describe_secret(SecretId=secret_id)
    if not metadata.get("RotationEnabled"):
        raise ValueError(f"Secret {secret_id} is not enabled for rotation")

    versions = metadata["VersionIdsToStages"]
    if token not in versions:
        raise ValueError(f"Token {token} has no stage for secret {secret_id}")
    if "AWSCURRENT" in versions[token]:
        logger.info("Token %s already AWSCURRENT — nothing to do", token)
        return
    if "AWSPENDING" not in versions[token]:
        raise ValueError(f"Token {token} not staged as AWSPENDING")

    if step == "createSecret":
        create_secret(secret_id, token)
    elif step == "setSecret":
        set_secret(secret_id, token)
    elif step == "testSecret":
        test_secret(secret_id, token)
    elif step == "finishSecret":
        finish_secret(secret_id, token)
    else:
        raise ValueError(f"Unknown step {step}")


def create_secret(secret_id, token):
    """Generate a new secret value and stage as AWSPENDING."""
    try:
        sm.get_secret_value(SecretId=secret_id, VersionId=token, VersionStage="AWSPENDING")
        logger.info("AWSPENDING already exists for token %s — leaving as-is", token)
        return
    except sm.exceptions.ResourceNotFoundException:
        pass

    current = sm.get_secret_value(SecretId=secret_id, VersionStage="AWSCURRENT")
    current_payload = json.loads(current["SecretString"])

    new_password = sm.get_random_password(
        PasswordLength=24, ExcludePunctuation=True
    )["RandomPassword"]
    new_payload = {**current_payload, "password": new_password}

    sm.put_secret_value(
        SecretId=secret_id,
        ClientRequestToken=token,
        SecretString=json.dumps(new_payload),
        VersionStages=["AWSPENDING"],
    )
    logger.info("createSecret: staged new password as AWSPENDING")


def set_secret(secret_id, token):
    """Apply the new value to the credential's owner.

    For RDS this would change the master password. This lab has no owner,
    so it's a no-op — but the step still runs.
    """
    logger.info("setSecret: no external owner in this lab, skipping")


def test_secret(secret_id, token):
    """Verify the new value works.

    For RDS this would connect to the database with the new password.
    Lab no-op — but in production a failure here aborts rotation, leaving
    AWSCURRENT untouched.
    """
    pending = sm.get_secret_value(SecretId=secret_id, VersionId=token, VersionStage="AWSPENDING")
    payload = json.loads(pending["SecretString"])
    assert "password" in payload, "AWSPENDING is missing 'password' field"
    logger.info("testSecret: AWSPENDING value is well-formed")


def finish_secret(secret_id, token):
    """Promote AWSPENDING to AWSCURRENT."""
    metadata = sm.describe_secret(SecretId=secret_id)
    current_version = None
    for vid, stages in metadata["VersionIdsToStages"].items():
        if "AWSCURRENT" in stages:
            current_version = vid
            break

    if current_version == token:
        logger.info("finishSecret: token already AWSCURRENT — nothing to do")
        return

    sm.update_secret_version_stage(
        SecretId=secret_id,
        VersionStage="AWSCURRENT",
        MoveToVersionId=token,
        RemoveFromVersionId=current_version,
    )
    logger.info(
        "finishSecret: AWSCURRENT moved to %s, old version %s now AWSPREVIOUS",
        token, current_version,
    )
