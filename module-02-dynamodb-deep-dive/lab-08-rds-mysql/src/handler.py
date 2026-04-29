import json
import os
import boto3
import pymysql

_secrets = boto3.client("secretsmanager")
_creds = None


def get_credentials():
    global _creds
    if _creds is None:
        resp = _secrets.get_secret_value(SecretId=os.environ["SECRET_ARN"])
        _creds = json.loads(resp["SecretString"])
    return _creds


def handler(event, context):
    creds = get_credentials()
    conn = pymysql.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ["DB_PORT"]),
        user=creds["username"],
        password=creds["password"],
        database=creds.get("dbname", "mysql"),
        connect_timeout=5,
    )
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT VERSION(), NOW()")
            version, now = cur.fetchone()
            cur.execute("SHOW TABLES")
            tables = [row[0] for row in cur.fetchall()]
        return {
            "ok": True,
            "mysql_version": version,
            "current_time": str(now),
            "row_count": len(tables),
            "tables": tables,
        }
    finally:
        conn.close()
