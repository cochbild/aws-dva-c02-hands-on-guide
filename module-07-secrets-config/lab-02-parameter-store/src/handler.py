"""Reads a parameter hierarchy in one call + a SecureString individually."""
import boto3

ssm = boto3.client("ssm")


def handler(event, context):
    db_resp = ssm.get_parameters_by_path(
        Path="/dva/lab-07/database",
        Recursive=True,
        WithDecryption=False,
    )
    db_config = {p["Name"].split("/")[-1]: p["Value"] for p in db_resp["Parameters"]}

    api_key = ssm.get_parameter(
        Name="/dva/lab-07/api-key",
        WithDecryption=True,
    )["Parameter"]["Value"]

    version = ssm.get_parameter(Name="/dva/lab-07/version")["Parameter"]["Value"]

    return {
        "db_config": db_config,
        "api_key_starts_with": api_key[:6] + "..." if len(api_key) > 6 else api_key,
        "version": version,
    }
