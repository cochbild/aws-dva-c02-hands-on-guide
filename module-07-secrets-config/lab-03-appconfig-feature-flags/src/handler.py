"""Polls AppConfig directly. Production would use the AppConfig agent layer instead."""
import json
import os

import boto3

_data = boto3.client("appconfigdata")
_session_token = None


def _get_session_token():
    global _session_token
    if _session_token is None:
        resp = _data.start_configuration_session(
            ApplicationIdentifier=os.environ["APP_ID"],
            EnvironmentIdentifier=os.environ["ENV_ID"],
            ConfigurationProfileIdentifier=os.environ["PROFILE_ID"],
        )
        _session_token = resp["InitialConfigurationToken"]
    return _session_token


def handler(event, context):
    global _session_token
    token = _get_session_token()
    resp = _data.get_latest_configuration(ConfigurationToken=token)
    _session_token = resp["NextPollConfigurationToken"]
    body = resp["Configuration"].read().decode() if resp["Configuration"] else "{}"
    config = json.loads(body) if body else {}
    return {
        "config": config,
        "version_label": resp.get("VersionLabel", "unknown"),
        "next_poll_in_seconds": resp.get("NextPollIntervalInSeconds"),
    }
