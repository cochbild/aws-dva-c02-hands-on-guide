# Lab 9.6 — CloudTrail

> 🟡 **Pennies** — first **management-events trail per account is FREE**. Data events (S3 object-level, Lambda invokes) cost $0.10 per 100,000 events. CloudTrail Insights costs $0.35 per 100,000 events analyzed.

## What you'll learn

- The difference between **management events** (control-plane API calls — free first copy) and **data events** (data-plane operations like S3 GetObject / Lambda Invoke — paid)
- **Trail** vs **Event history** — the trail logs to S3 for retention; Event history is the last 90 days searchable in console
- **Multi-region** trails (recommended — captures all regions in one S3 bucket)
- **Log file integrity validation** — SHA-256 + RSA digest files
- **CloudTrail Insights** — anomaly detection on API call volumes / error rates

## Exam blueprint reference

- **D4 TS1** — *"Logging and monitoring systems"*
- **D2 TS1** — auditing IAM and AWS API usage

## Theory primer

### Management vs data events

| | **Management** | **Data** |
|---|---|---|
| Examples | `IAM:CreateUser`, `EC2:RunInstances`, `S3:CreateBucket`, `Lambda:UpdateFunction` | `S3:GetObject`, `Lambda:Invoke`, `DynamoDB:PutItem` |
| Volume | Low (humans + IaC + services) | Massive (every object read/write) |
| Cost | First trail per account = free | Paid: $0.10 per 100,000 events |
| Default | Logged | NOT logged unless explicitly enabled |

The exam loves: "S3 GetObject events aren't in CloudTrail — why?" — Because **data events are off by default**. You must enable them explicitly.

### Event history

The CloudTrail console's **Event history** view shows the last 90 days of management events automatically — **no trail needed**. You can only filter on a small set of fields. For long-term retention or rich analysis: create a trail.

### Trail destinations

- **S3 bucket** (required) — durable JSON log files
- **CloudWatch Logs** (optional) — enables filtering / alarming via metric filters
- **EventBridge** (always on) — events dispatched to default bus; build rules for real-time reaction

### Multi-region trails

```yaml
IsMultiRegionTrail: true
IncludeGlobalServiceEvents: true   # IAM, Route 53 (global services log to us-east-1)
```

Recommended: one multi-region trail per account, captures everything everywhere.

### Log file integrity

`EnableLogFileValidation: true` — CloudTrail writes a digest file every hour with SHA-256 hashes of the log files, signed with AWS's private key. Detects tampering. Free.

### CloudTrail Insights

Enabled per-trail. Analyzes management event call volume + error-rate baseline; flags anomalies. Costs extra. Useful for: spike-detection on `iam:CreateUser`, error-rate spike on `s3:PutObject`, etc.

## Architecture

```
   AWS API calls in any region          ──► CloudTrail multi-region trail
   (us-east-1, us-west-2, etc.)              │
                                              ▼
                                          S3 bucket: dva-lab-09-06-cloudtrail-...
                                              │
                                              └── /AWSLogs/<account>/CloudTrail/<region>/<year>/<month>/<day>/
                                                  (one log file per N events; gzipped JSON)

   ALSO ──► EventBridge default bus (real-time)
   ALSO ──► (optional) CloudWatch Logs group for filtering/alarming
```

## Step 1: Deploy

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-09-06-cloudtrail --capabilities CAPABILITY_IAM
```

## Step 2: Generate API activity

Run any management API calls — they should appear within ~5 minutes:

```
aws sts get-caller-identity
aws s3 mb s3://temp-dva-lab-09-06-test-$(date +%s) || true
aws iam list-users --max-items 1
```

## Step 3: Inspect log files

CloudTrail writes log files every ~5 min.

```
BUCKET=$(aws cloudformation describe-stacks --stack-name dva-lab-09-06-cloudtrail --query "Stacks[0].Outputs[?OutputKey=='TrailBucket'].OutputValue" --output text)
aws s3 ls "s3://$BUCKET/AWSLogs/" --recursive | head -10
```

Pick one file, copy it locally, decompress, look at the JSON:

```
KEY=$(aws s3 ls "s3://$BUCKET/AWSLogs/" --recursive | grep '\.gz$' | head -1 | awk '{print $NF}')
aws s3 cp "s3://$BUCKET/$KEY" trail.gz
gunzip -c trail.gz | python -m json.tool | head -50
```

You'll see the structured event records: `eventName`, `userIdentity`, `requestParameters`, `responseElements`, `sourceIPAddress`, etc.

## Step 4: Compare — Event history (no trail needed)

```
aws cloudtrail lookup-events --max-results 5 --lookup-attributes AttributeKey=EventName,AttributeValue=GetCallerIdentity
```

Same data shape, but limited to last 90 days and a small set of filterable fields. The trail in S3 retains forever (you control retention).

## Step 5: Compare — enable data events (advanced)

By default, the lab's trail logs management events only. To enable data events for a specific S3 bucket:

```
aws cloudtrail put-event-selectors \
  --trail-name $(aws cloudformation describe-stacks --stack-name dva-lab-09-06-cloudtrail --query "Stacks[0].Outputs[?OutputKey=='TrailName'].OutputValue" --output text) \
  --event-selectors '[{"ReadWriteType":"All","IncludeManagementEvents":true,"DataResources":[{"Type":"AWS::S3::Object","Values":["arn:aws:s3:::dva-lab-09-06-cloudtrail-'"$ACCOUNT_ID"'-/'"*"'"]}]}]'
```

Now S3 object-level operations on that bucket get logged. **Beware data event volume + cost.**

## Exam gotchas

- **First management-events trail per account is FREE.** Additional trails cost $2/month each.
- **Data events are OFF by default** — must enable per resource.
- **Multi-region trail** captures all regions; without it you'd need one trail per region.
- **Log file integrity validation** uses SHA-256 + signed digest files. Free. Always enable in production.
- **CloudWatch metric filters** can turn CloudTrail events into custom metrics — alert on, e.g., `iam:DeleteUser` or `ec2:TerminateInstances`.
- **EventBridge integration** is automatic — every CloudTrail event lands on the default bus. Build rules for real-time reactions ("page on root login").
- **Console events do NOT appear in CloudTrail** for AWS Console session itself (sign-in events are tracked elsewhere — IAM Access Analyzer + sign-in logs).
- **CloudTrail vs CloudWatch Logs**: CloudTrail = audit trail of API calls. CloudWatch Logs = application/system output. Different purposes; both critical.
- **Insight events** add anomaly detection on top of management events. Cost extra. Not all management events are eligible (only "write" actions).
- **Cross-account trail**: an organization trail (CloudTrail Organizations) sends all member-account events to a central S3 bucket. Outside DVA-C02 deep scope but referenced.

## Cleanup

### PowerShell

```powershell
.\cleanup.ps1
```

### Bash

```bash
./cleanup.sh
```

## What's next

> 🎉 **Module 9 complete!** You've covered every observability service in the DVA-C02 exam scope: CloudWatch Logs (basics + Logs Insights), custom metrics (PutMetricData + EMF), X-Ray (Active tracing + service maps + annotations), CloudWatch Alarms (metric + composite + anomaly), CloudTrail (management + data events).

Continue: [Module 10 — Capstone](../../module-10-capstone/README.md)
