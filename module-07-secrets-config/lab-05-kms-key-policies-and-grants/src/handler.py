"""Test KMS access — fails without grant, succeeds with grant."""
import os
import boto3

kms = boto3.client("kms")


def handler(event, context):
    action = event.get("action", "encrypt")
    plaintext = event.get("plaintext", "test")
    try:
        if action == "encrypt":
            resp = kms.encrypt(KeyId=os.environ["KEY_ARN"], Plaintext=plaintext.encode())
            return {"ok": True, "ciphertext_first_30": resp["CiphertextBlob"].hex()[:60]}
        elif action == "describe":
            resp = kms.describe_key(KeyId=os.environ["KEY_ARN"])
            return {"ok": True, "key_id": resp["KeyMetadata"]["KeyId"]}
    except Exception as e:
        return {"ok": False, "error": str(e), "error_type": type(e).__name__}
