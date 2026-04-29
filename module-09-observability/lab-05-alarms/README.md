# Lab 9.5 — CloudWatch Alarms

> 🟢 **Free tier** — first 10 alarms / month free, perpetual. SNS first 1M publishes/month free.

## What you'll learn

- **Metric alarms**: threshold + evaluation periods + datapoints to alarm
- **Composite alarms**: AND/OR combinations of multiple metric alarms with deduplication
- **Anomaly detection** alarms — math-model-based instead of static threshold
- **Missing data behavior**: `notBreaching`, `breaching`, `ignore`, `missing`
- The `M out of N` pattern for noisy metrics

## Exam blueprint reference

- **D4 TS2 Skills in:** *"Implementing notification alerts for specific actions"*

## Theory primer

### Metric alarms

```yaml
Type: AWS::CloudWatch::Alarm
Properties:
  Namespace: AWS/Lambda
  MetricName: Errors
  Statistic: Sum
  Period: 60                  # seconds
  EvaluationPeriods: 2        # require 2 consecutive periods to fire
  DatapointsToAlarm: 2        # all 2 must breach (M-out-of-N)
  Threshold: 5
  ComparisonOperator: GreaterThanThreshold
  TreatMissingData: notBreaching
  AlarmActions:
    - !Ref AlarmTopic
```

Alarm states:
- **OK** — within threshold
- **ALARM** — threshold breached
- **INSUFFICIENT_DATA** — not enough data points yet

### Missing data behavior

| Setting | Behavior on missing data |
|---|---|
| `missing` (default) | Stays in current state, doesn't trigger transition |
| `notBreaching` | Treated as OK (recommended for "this metric only fires when something happens") |
| `breaching` | Treated as ALARM (paranoid: silence = failure) |
| `ignore` | Don't change alarm state at all |

### M-out-of-N

- `EvaluationPeriods: 5` and `DatapointsToAlarm: 3` = "fire if 3 of the last 5 periods breach". Reduces noise.
- `EvaluationPeriods: 5` and `DatapointsToAlarm: 5` = "fire only if 5 consecutive periods breach". Strictest.

### Composite alarms

```yaml
Type: AWS::CloudWatch::CompositeAlarm
Properties:
  AlarmRule: !Sub "(ALARM(${HighErrorsAlarm}) AND ALARM(${HighLatencyAlarm}))"
  ActionsEnabled: true
  AlarmActions: [...]
```

Combine 2+ metric alarms with `AND`, `OR`, `NOT`, `TRUE`, `FALSE`. Useful for **deduplication** — fires once when both error rate AND latency are high (don't fire two notifications when they're the same incident).

### Anomaly detection alarms

Instead of static threshold, CloudWatch builds a **machine-learned model** of the metric's normal range. Alarm fires when the actual value is N standard deviations outside.

```yaml
Threshold: 2  # 2 standard deviations
ComparisonOperator: LessThanLowerOrGreaterThanUpperThreshold
ThresholdMetricId: ad1
Metrics:
  - Id: m1
    MetricStat: { ... }
  - Id: ad1
    Expression: ANOMALY_DETECTION_BAND(m1, 2)
```

Higher false-positive rate but better for metrics with daily/weekly patterns.

## Architecture

```
   Lambda (errors trigger)  ──► AWS/Lambda Errors metric
                                     │
                            HighErrorsAlarm (Threshold > 5, 2 of 2 periods)
                                     │
                                     ▼
                                AlarmTopic (SNS)
                                     │
                                     └─► your email subscription

   Two metric alarms        ──► CompositeAlarm (HighErrors AND HighLatency)
                                     │
                                     └─► single notification
```

## Step 1: Deploy

```
aws cloudformation deploy --template-file template.yaml --stack-name dva-lab-09-05-alarms --parameter-overrides EmailAddress=YOUR-EMAIL@example.com --capabilities CAPABILITY_IAM
```

> Replace `YOUR-EMAIL@example.com` with your real email. SNS will email you to confirm subscription.

## Step 2: Confirm SNS subscription

Check your email. Click the AWS confirmation link. The subscription is now active.

## Step 3: Trigger alarms

The Lambda intentionally fails on payload `{"fail": true}`. Hit it 6+ times to exceed the threshold:

### PowerShell

```powershell
$Fn = aws cloudformation describe-stacks --stack-name dva-lab-09-05-alarms --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text
1..10 | ForEach-Object {
  aws lambda invoke --function-name $Fn --cli-binary-format raw-in-base64-out --payload '{"fail":true}' out.json | Out-Null
}
```

### Bash

```bash
FN=$(aws cloudformation describe-stacks --stack-name dva-lab-09-05-alarms --query "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue" --output text)
for i in $(seq 1 10); do
  aws lambda invoke --function-name "$FN" --cli-binary-function raw-in-base64-out --payload '{"fail":true}' out.json >/dev/null
done
```

## Step 4: Watch the alarm flip

```
aws cloudwatch describe-alarms --alarm-names dva-lab-09-05-high-errors --query 'MetricAlarms[0].{State:StateValue,Reason:StateReasonData}'
```

Wait ~3 minutes for the metric to aggregate. `StateValue: ALARM`. SNS sends the email.

## Step 5: Inspect the composite alarm

```
aws cloudwatch describe-alarms --alarm-names dva-lab-09-05-composite
```

Even with HighErrors firing, the composite waits for HighLatency to also fire. With our test (errors only, no slow invocations), the composite stays OK — that's working as intended.

## Exam gotchas

- **`EvaluationPeriods` × `Period` = the alarm's evaluation window.** Don't set Period < the metric's resolution.
- **`DatapointsToAlarm`** lets you implement M-out-of-N. Default = EvaluationPeriods (all-must-breach).
- **`TreatMissingData`** matters for sparse metrics. Lambda Errors only emits when there's an error — missing data should be `notBreaching`, not `missing` (or you stay in INSUFFICIENT_DATA forever).
- **Composite alarms** support `AND`, `OR`, `NOT`. Three-deep nesting allowed.
- **Anomaly detection** uses a 2-week training window. Don't expect it to work on day one of a new metric.
- **High-resolution alarms** (1-second) require high-resolution metrics. Cost more.
- **Alarm actions**: SNS topic, EC2 actions (stop/terminate/recover/reboot), Auto Scaling, OpsItem creation, Systems Manager actions.

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

> 🧹 **Run cleanup before Lab 9.6.**

Continue: [Lab 9.6 — CloudTrail](../lab-06-cloudtrail/README.md)
