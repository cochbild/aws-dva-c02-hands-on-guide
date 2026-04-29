import os
import boto3

_data = boto3.client("rds-data")


def execute(sql, params=None):
    kwargs = {
        "resourceArn": os.environ["CLUSTER_ARN"],
        "secretArn": os.environ["SECRET_ARN"],
        "database": os.environ["DB_NAME"],
        "sql": sql,
    }
    if params:
        kwargs["parameters"] = params
    return _data.execute_statement(**kwargs)


def handler(event, context):
    version = execute("SELECT VERSION() AS v, NOW() AS now")
    create = execute(
        "CREATE TABLE IF NOT EXISTS visits (id INT AUTO_INCREMENT PRIMARY KEY, ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)"
    )
    insert = execute("INSERT INTO visits () VALUES ()")
    count = execute("SELECT COUNT(*) AS n FROM visits")

    return {
        "ok": True,
        "version_record": version["records"][0],
        "rows_inserted": insert["numberOfRecordsUpdated"],
        "total_visits": count["records"][0],
    }
