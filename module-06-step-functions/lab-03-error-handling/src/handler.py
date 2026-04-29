"""Lambda that simulates different failure patterns based on input.

Custom errors are raised with name-prefixed message: Step Functions extracts
the prefix as the error name. The state machine's Retry catches FlakyError;
Catch covers everything else (FatalError + States.ALL).
"""
import os

# In-memory counter — works because Lambda warm starts share the env
_attempts = {"flaky-once": 0}


def work(event, context):
    pattern = event.get("fail_pattern", "none")

    if pattern == "none":
        return {"ok": True, "msg": "no failure"}

    if pattern == "flaky-once":
        _attempts["flaky-once"] += 1
        if _attempts["flaky-once"] <= 2:
            raise FlakyError(f"transient failure attempt {_attempts['flaky-once']}")
        return {"ok": True, "msg": f"recovered on attempt {_attempts['flaky-once']}"}

    if pattern == "flaky-forever":
        raise FlakyError("permanent flaky failure (retries will exhaust)")

    if pattern == "fatal":
        raise FatalError("non-retryable error — Catch should handle this")

    return {"ok": True, "msg": "unknown pattern, treated as success"}


# Custom error classes — Step Functions matches by class NAME
class FlakyError(Exception):
    pass


class FatalError(Exception):
    pass
