"""KMS envelope-encryption demo.

Steps:
1. GenerateDataKey -> plaintext_key + encrypted_data_key
2. Encrypt data with plaintext_key (locally, AES-GCM)
3. Discard plaintext_key
4. Decrypt encrypted_data_key via KMS -> plaintext_key
5. Decrypt data with plaintext_key

The encryption context binds the ciphertext to a tenant id; decrypting with
a different tenant id raises InvalidCiphertextException.
"""
import base64
import json
import os

import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

kms = boto3.client("kms")


def _enc_context(tenant_id):
    return {"tenant_id": str(tenant_id), "purpose": "lab-07-04"}


def envelope_encrypt(plaintext: str, tenant_id: str):
    resp = kms.generate_data_key(
        KeyId=os.environ["KEY_ARN"],
        KeySpec="AES_256",
        EncryptionContext=_enc_context(tenant_id),
    )
    plaintext_key = resp["Plaintext"]
    encrypted_data_key = resp["CiphertextBlob"]

    aes = AESGCM(plaintext_key)
    nonce = os.urandom(12)
    ciphertext = aes.encrypt(nonce, plaintext.encode(), None)

    # Discard plaintext key reference (Python GC will collect)
    del plaintext_key

    return {
        "encrypted_data_key": base64.b64encode(encrypted_data_key).decode(),
        "nonce": base64.b64encode(nonce).decode(),
        "ciphertext": base64.b64encode(ciphertext).decode(),
    }


def envelope_decrypt(envelope: dict, tenant_id: str) -> str:
    encrypted_data_key = base64.b64decode(envelope["encrypted_data_key"])
    nonce = base64.b64decode(envelope["nonce"])
    ciphertext = base64.b64decode(envelope["ciphertext"])

    resp = kms.decrypt(
        CiphertextBlob=encrypted_data_key,
        EncryptionContext=_enc_context(tenant_id),
    )
    plaintext_key = resp["Plaintext"]

    aes = AESGCM(plaintext_key)
    plaintext = aes.decrypt(nonce, ciphertext, None).decode()

    del plaintext_key
    return plaintext


def handler(event, context):
    plaintext = event.get("plaintext", "default secret")
    tenant_id = event.get("tenant_id", "default")
    decrypt_as = event.get("decrypt_as_tenant", tenant_id)

    envelope = envelope_encrypt(plaintext, tenant_id)

    try:
        decrypted = envelope_decrypt(envelope, decrypt_as)
        return {
            "ok": True,
            "encrypted_data_key": envelope["encrypted_data_key"][:30] + "...",
            "ciphertext": envelope["ciphertext"][:30] + "...",
            "decrypted": decrypted,
        }
    except Exception as e:
        return {
            "ok": False,
            "error": str(e),
            "note": (
                "If you set decrypt_as_tenant != tenant_id, the EncryptionContext "
                "mismatch causes InvalidCiphertextException — that's the demo."
            ),
        }
