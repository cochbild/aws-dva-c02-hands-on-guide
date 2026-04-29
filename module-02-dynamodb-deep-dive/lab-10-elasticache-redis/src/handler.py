"""
Demonstrates the four caching strategies the DVA-C02 exam tests by name.
Each strategy is timed so the difference between cache-hit and DB-simulated
latency is observable in the response.
"""
import os
import time
import redis

REDIS = redis.Redis(host=os.environ["REDIS_HOST"], port=int(os.environ["REDIS_PORT"]), decode_responses=True)
TTL_SECONDS = 60


def fake_db_lookup(key):
    """Simulate a 50ms relational DB call."""
    time.sleep(0.05)
    return f"db-value-for-{key}"


def fake_db_write(key, value):
    """Simulate a 30ms relational DB write."""
    time.sleep(0.03)


# ---- Strategy 1: cache-aside (lazy loading) ----
def cache_aside_get(key):
    cached = REDIS.get(key)
    if cached is not None:
        return cached, "hit"
    value = fake_db_lookup(key)
    REDIS.setex(key, TTL_SECONDS, value)
    return value, "miss"


# ---- Strategy 2: write-through ----
def write_through(key, value):
    fake_db_write(key, value)
    REDIS.setex(key, TTL_SECONDS, value)


# ---- Strategy 3: read-through (presented as a wrapper that hides the miss path) ----
class ReadThroughCache:
    def get(self, key):
        cached = REDIS.get(key)
        if cached is not None:
            return cached, "hit"
        value = fake_db_lookup(key)
        REDIS.setex(key, TTL_SECONDS, value)
        return value, "miss"


# ---- Strategy 4: write-behind (queued; not implemented for safety, just described) ----
def write_behind_explanation():
    return (
        "Write-behind queues the DB write asynchronously. "
        "Risk: cache failure between cache-write and DB-flush loses data. "
        "Implement with SQS / Kinesis behind the cache write."
    )


def time_op(op, *args):
    t0 = time.perf_counter()
    result = op(*args)
    return result, round((time.perf_counter() - t0) * 1000, 2)


def handler(event, context):
    # Reset for a clean demo
    REDIS.flushdb()

    # Cache-aside: first call is a miss, subsequent are hits
    (val_miss, status1), ms1 = time_op(cache_aside_get, "user:42")
    (val_hit, status2), ms2 = time_op(cache_aside_get, "user:42")

    # Write-through: write hits both cache and DB; subsequent reads are hits
    _, ms3 = time_op(write_through, "user:99", "alice")
    (val99, status3), ms4 = time_op(cache_aside_get, "user:99")

    # Read-through (wrapper)
    rt = ReadThroughCache()
    (val_rt, status_rt), ms5 = time_op(rt.get, "user:7")

    return {
        "ttl_seconds": TTL_SECONDS,
        "redis_endpoint": os.environ["REDIS_HOST"],
        "results": [
            {"strategy": "cache-aside (miss)", "key": "user:42", "ms": ms1, "value": val_miss, "status": status1},
            {"strategy": "cache-aside (hit)", "key": "user:42", "ms": ms2, "value": val_hit, "status": status2},
            {"strategy": "write-through (write)", "key": "user:99", "ms": ms3},
            {"strategy": "cache-aside (after write-through)", "key": "user:99", "ms": ms4, "value": val99, "status": status3},
            {"strategy": "read-through", "key": "user:7", "ms": ms5, "value": val_rt, "status": status_rt},
        ],
        "write_behind": write_behind_explanation(),
    }
