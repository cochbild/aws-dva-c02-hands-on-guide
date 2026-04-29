"""
MemoryDB durable counter demo.

The MemoryDB cluster has TLS required, so the redis client uses ssl=True.
ACL is the open-access ACL ("default" user, no auth) for lab simplicity.
"""
import os
import redis

_client = redis.Redis(
    host=os.environ["MEMORYDB_HOST"],
    port=int(os.environ["MEMORYDB_PORT"]),
    ssl=True,
    ssl_cert_reqs=None,
    decode_responses=True,
)


def handler(event, context):
    counter = _client.incr("dva:lab:counter")
    _client.set("last:request_id", context.aws_request_id)

    info = _client.info("server")
    return {
        "ok": True,
        "counter": counter,
        "last_request_id": _client.get("last:request_id"),
        "redis_version": info.get("redis_version"),
        "uptime_seconds": info.get("uptime_in_seconds"),
        "endpoint": os.environ["MEMORYDB_HOST"],
    }
