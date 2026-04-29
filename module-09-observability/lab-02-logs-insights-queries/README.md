# Lab 9.2 — CloudWatch Logs Insights queries

> 🟢 **Free tier** — Logs Insights gives 5 GB scanned per month free, then $0.005/GB. The lab scans well under 1 MB per query.

## What you'll learn

- The Logs Insights query language (fields, filter, parse, stats, sort, limit)
- How to query JSON-structured logs vs unstructured logs
- The exam's favorite query patterns: top errors, slowest invocations, p99 latency from `REPORT` lines

## Exam blueprint reference

- **Domain 4 / TS1 — Knowledge of:** "Languages for log queries (for example, Amazon CloudWatch Logs Insights)"
- **Domain 4 / TS1 — Skills in:** "Querying logs to find relevant data"

---

## Prerequisites

- **Lab 9.1 must still be deployed and have generated logs.** This lab queries those logs. If you cleaned up 9.1, redeploy and re-run `scripts/generate-logs` from 9.1 first.

---

## Theory primer

### The query language

Logs Insights queries are pipelines of commands separated by `|`. Read top-down:

```
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(1m)
| sort @timestamp desc
| limit 100
```

Built-in fields (always available):
- `@timestamp` — ms since epoch
- `@message` — full log line
- `@logStream` — which stream (= which execution environment for Lambda)
- `@log` — log group ARN
- `@requestId`, `@duration`, `@billedDuration`, `@memorySize`, `@maxMemoryUsed`, `@initDuration` — extracted from Lambda `REPORT` lines

### Commands

| Command | What it does | Example |
|---|---|---|
| `fields` | Choose columns + compute new ones | `fields @timestamp, level, msg` |
| `filter` | Where clause | `filter level = "ERROR"` |
| `parse` | Extract fields from unstructured text | `parse @message "user=*" as user` |
| `stats` | Aggregate | `stats count() by bin(5m)` |
| `sort` | Order | `sort @timestamp desc` |
| `limit` | Truncate output | `limit 50` |
| `display` | Choose output columns (rare) | |
| `dedup` | Deduplicate by field(s) | `dedup user` |

### Aggregations available in `stats`

`count()`, `sum(x)`, `avg(x)`, `min(x)`, `max(x)`, `pct(x, 95)`, `stddev(x)`, `count_distinct(x)`.

### Time bucketing

`bin(<duration>)` — buckets timestamps into intervals: `bin(1m)`, `bin(5m)`, `bin(1h)`. Use in `stats ... by bin(...)` for time series.

### JSON auto-fields

When your log line is valid JSON (which Lambda does when `LoggingConfig.LogFormat: JSON` is set), Logs Insights auto-extracts top-level keys as fields. The lines from Lab 9.1's emitter look like:

```json
{"timestamp":"2026-04-28T18:15:32.123Z","level":"INFO","message":"{\"level\":\"INFO\",\"msg\":\"processed item id=1\"}"}
```

The Lambda runtime's JSON wrapper means our actual app log line ends up nested in `message` as a string — a quirk worth understanding for the exam.

---

## Step 1: Verify Lab 9.1 is still deployed

**PowerShell or Bash:**
```
aws cloudformation describe-stacks --stack-name dva-lab-09-01-logs-basics --query "Stacks[0].StackStatus" --output text
```

Should return `CREATE_COMPLETE` or `UPDATE_COMPLETE`. If the stack doesn't exist, redeploy Lab 9.1 first.

### PowerShell

```powershell
$STACK = "dva-lab-09-01-logs-basics"
$EMITTER_LG = aws cloudformation describe-stacks --stack-name $STACK `
  --query "Stacks[0].Outputs[?OutputKey=='EmitterLogGroup'].OutputValue" --output text
Write-Host "Querying log group: $EMITTER_LG"
```

### Bash

```bash
STACK="dva-lab-09-01-logs-basics"
EMITTER_LG=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='EmitterLogGroup'].OutputValue" --output text)
echo "Querying log group: $EMITTER_LG"
```

---

## Step 2: Run a query from the CLI

Logs Insights queries from the CLI are a 3-step dance: start the query, poll for results, read the results.

The lab ships pre-built query files in `queries/`. Pick one to run.

### PowerShell

```powershell
$QUERY = Get-Content -Raw -Path "queries/01-recent-errors.txt"

$END   = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$START = [DateTimeOffset]::UtcNow.AddMinutes(-30).ToUnixTimeSeconds()

$QID = aws logs start-query `
  --log-group-name $EMITTER_LG `
  --start-time $START --end-time $END `
  --query-string $QUERY `
  --query queryId --output text

Write-Host "Query started: $QID"
Start-Sleep -Seconds 5

aws logs get-query-results --query-id $QID
```

### Bash

```bash
QUERY=$(cat queries/01-recent-errors.txt)
END=$(date -u +%s)
START=$(date -u -d "-30 minutes" +%s 2>/dev/null || date -u -v-30M +%s)

QID=$(aws logs start-query \
  --log-group-name "$EMITTER_LG" \
  --start-time "$START" --end-time "$END" \
  --query-string "$QUERY" \
  --query queryId --output text)

echo "Query started: $QID"
sleep 5

aws logs get-query-results --query-id "$QID"
```

You can also run all of these from the **CloudWatch Logs Insights console** which is more pleasant (autocomplete, click-to-discover-fields). The CLI path is what the exam tests.

---

## Step 3: Walk through the canned queries

Open and run each of these (substitute `01-recent-errors.txt` with each filename in turn):

### `queries/01-recent-errors.txt` — Recent errors

```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50
```

The bread-and-butter "show me the most recent errors" query. Note `like /ERROR/` is a regex match, not just a substring — case-sensitive by default.

### `queries/02-error-rate-by-minute.txt` — Time-bucketed error counts

```
filter @message like /ERROR/
| stats count() as errorCount by bin(1m)
| sort errorCount desc
```

Find the worst minutes. Useful for correlating with deploys.

### `queries/03-top-error-types.txt` — Group by parsed field

```
filter @message like /ERROR/
| parse @message /failed to process id=(?<itemId>\d+):\s*(?<reason>.+)"/
| stats count() by reason
| sort @count desc
```

The `parse` command extracts a field (`reason`) from inside the message using a named-capture regex. `stats ... by reason` then groups by extracted value.

### `queries/04-slow-invokes.txt` — Lambda-specific REPORT analysis

```
filter @type = "REPORT"
| stats max(@duration), avg(@duration), pct(@duration, 95), pct(@duration, 99) by bin(5m)
| sort @timestamp desc
```

`@duration` is auto-extracted from `REPORT` lines. `pct(x, 99)` = p99. This is the canonical way to find Lambda performance regressions.

### `queries/05-cold-starts.txt` — Cold-start frequency

```
filter @type = "REPORT" and ispresent(@initDuration)
| stats count() as coldStarts, avg(@initDuration) as avgInitMs by bin(15m)
```

`@initDuration` only exists on cold starts. `ispresent(field)` filters to lines where the field is non-null.

### `queries/06-cross-loggroup.txt` — Multi-group query

```
fields @timestamp, @log, @message
| filter @message like /ERROR/ or @message like /forwarded/
| sort @timestamp desc
| limit 100
```

Run this with **two** log groups — emitter and forwarder. CloudWatch correlates events by timestamp across groups, which is how you trace a request that fanned out.

To run a multi-group query from the CLI, pass `--log-group-name-prefix /aws/lambda/dva-lab-09-01` instead of `--log-group-name`:

**PowerShell or Bash:**
```
aws logs start-query \
  --log-group-name-prefix /aws/lambda/dva-lab-09-01 \
  --start-time $START --end-time $END \
  --query-string "$(cat queries/06-cross-loggroup.txt)"
```

---

## Step 4 (Compare): the cost of "scan everything"

Run a query that scans every byte of every event in the time window:

**PowerShell or Bash:**
```
fields @timestamp, @message
| limit 10000
```

vs a query that filters first:

**PowerShell or Bash:**
```
filter level = "ERROR"
| stats count() by bin(1m)
```

Logs Insights bills per **byte scanned** ($0.005/GB after the 5 GB free tier). A wide `fields ... | limit` query scans every event in the time window — cheap on this lab (~50 KB) but expensive on a production log group with GB/day. **Always filter early.**

The exam tests this awareness as a cost-optimization knowledge point.

---

## Exam gotchas

1. **Logs Insights bills by bytes scanned, not by results returned.** Filtering early reduces cost.
2. **`@duration` is in milliseconds.** `@billedDuration` is also milliseconds; the difference is rounding to the nearest 1 ms (since 2020 — used to be 100 ms).
3. **`@initDuration` only exists on cold starts.** Use `ispresent(@initDuration)` to count cold starts.
4. **`parse` uses regex with named captures.** Syntax: `parse @message /pattern (?<name>regex)/`.
5. **Logs Insights queries time out at 60 seconds** and can only scan up to 50 GB per query. Long time ranges on huge log groups will time out — narrow the window or use a subscription filter to a different store.
6. **Logs Insights does not modify logs.** Queries are read-only and don't filter what's stored.
7. **A query can target up to 50 log groups.** Use `--log-group-name-prefix` from the CLI for matching prefixes.

---

## Cleanup

> 🧹 **Run cleanup before Lab 9.3.** This lab and its dependency Lab 9.1 should both be torn down. Lab 9.3 starts fresh.

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
chmod +x cleanup.sh
./cleanup.sh
```

The cleanup script tears down both this lab and Lab 9.1's stack — they are linked.

---

## What's next

> 🧹 **Run cleanup before the next lab.** Lab 9.3 (Custom metrics & EMF) creates its own emitter from scratch.
