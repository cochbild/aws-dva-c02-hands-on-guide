window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "m09-observability", questions: [

  { id: "m09-001", topic: "cw-logs-basics", domain: 4,
    stem: "A team runs 40 Lambda functions. The CloudWatch Logs storage bill increases every month. Company policy requires the team to keep application logs for 30 days only. The team wants the solution with the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Set a retention policy of 30 days on each function's log group.", correct: true,
        why: "Log groups keep data indefinitely by default. A 30-day retention policy makes CloudWatch Logs delete older events automatically, with no extra process to run." },
      { text: "Create an S3 Lifecycle rule that expires log data after 30 days.", correct: false,
        why: "S3 Lifecycle rules act on objects in S3 buckets. They do not delete data in CloudWatch Logs, so storage keeps growing." },
      { text: "Run a daily CreateExportTask to Amazon S3, and then delete the exported log streams.", correct: false,
        why: "This needs a scheduled job and only one export task can run at a time in an account. It adds operational overhead that a retention policy avoids." },
      { text: "Turn on deletion protection for each log group.", correct: false,
        why: "Deletion protection stops accidental deletion of a log group. It does not expire old log events, so the bill keeps growing." }
    ],
    explanation: "CloudWatch Logs keeps log data indefinitely by default. Set a retention policy on each log group to delete old events automatically." },

  { id: "m09-002", topic: "cw-logs-basics", domain: 3,
    stem: "A developer deploys a Lambda function with an AWS SAM template. If the template does not create the log group, Lambda creates /aws/lambda/orders-fn on the first invocation with no retention setting. The developer must set a 14-day retention period as part of the same template, so that every environment gets the same setting. Which solution will meet these requirements?",
    options: [
      { text: "Add an AWS::Logs::LogGroup resource named /aws/lambda/orders-fn with RetentionInDays set to 14.", correct: true,
        why: "When the template creates the log group with the function's default name, the template controls its retention. Every stack gets the same 14-day setting." },
      { text: "Run aws logs put-retention-policy after each deployment.", correct: false,
        why: "A manual command is not part of the template. Environments can drift, so it fails the requirement to set retention in the same template." },
      { text: "Set the function's MaximumEventAgeInSeconds to 1,209,600.", correct: false,
        why: "MaximumEventAgeInSeconds controls how long Lambda keeps asynchronous events for retries. It has no effect on log retention." },
      { text: "Add an S3 Lifecycle configuration to the deployment artifacts bucket.", correct: false,
        why: "The artifacts bucket holds deployment packages. A lifecycle rule there does not change how long CloudWatch Logs keeps log events." }
    ],
    explanation: "A log group that Lambda creates has no retention policy. Declare the log group (with the function's default name) in the template and set RetentionInDays." },

  { id: "m09-003", topic: "cw-logs-basics", domain: 4,
    stem: "A Python Lambda function in production writes DEBUG, INFO, and ERROR log lines with the standard logging library. The code does not set a log level. Log ingestion costs are high. The operations team wants CloudWatch Logs to receive only ERROR and FATAL application logs from this function. The developer must not change the function code. Which solution will meet these requirements?",
    options: [
      { text: "Set the function log format to JSON and set the application log level to ERROR.", correct: true,
        why: "Lambda advanced logging controls filter application logs by level, with no code change. Log-level filtering needs the JSON log format." },
      { text: "Keep the Text log format and set the application log level to ERROR.", correct: false,
        why: "Log-level filtering works only with the JSON log format. With the Text format, Lambda sends all log lines, so costs do not go down." },
      { text: "Create a metric filter that matches ERROR on the log group.", correct: false,
        why: "A metric filter creates a metric from matching events. CloudWatch Logs still ingests every log line, so costs stay the same." },
      { text: "Set a retention policy of 1 day on the log group.", correct: false,
        why: "Retention reduces storage, but CloudWatch Logs still ingests DEBUG and INFO lines. The requirement to receive only ERROR and FATAL logs fails." }
    ],
    explanation: "Lambda log-level filtering (application and system levels) needs the JSON log format. Lambda then sends only logs at the selected level and less detailed levels." },

  { id: "m09-004", topic: "cw-logs-filters", domain: 4,
    stem: "An application on Amazon EC2 sends its logs to a CloudWatch Logs log group through the CloudWatch agent. The operations team wants an email when the text PaymentFailed appears more than 5 times in 5 minutes. The team wants the solution with the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Create a metric filter for PaymentFailed on the log group, and create a CloudWatch alarm on the metric that notifies an SNS topic.", correct: true,
        why: "A metric filter turns matching log events into a metric with no code. An alarm on that metric sends the SNS email when the count is above 5." },
      { text: "Create a subscription filter to a Lambda function that counts matches and calls PutMetricData.", correct: false,
        why: "This works, but it needs custom code to write, deploy, and maintain. It fails the LEAST operational overhead requirement." },
      { text: "Run a CloudWatch Logs Insights query manually every 5 minutes.", correct: false,
        why: "Manual queries are not automatic notifications and need a person to run them. This fails the requirement and adds operational effort." },
      { text: "Turn on AWS X-Ray tracing for the application.", correct: false,
        why: "X-Ray records request traces. It does not count text in log events or send an email when a count is reached." }
    ],
    explanation: "Metric filter plus metric alarm is the standard no-code way to alarm on a pattern in log events." },

  { id: "m09-005", topic: "cw-logs-filters", domain: 4,
    stem: "A developer creates a metric filter today to count Timeout messages in a log group that has 90 days of data. The developer graphs the new metric for the last 7 days, but the graph shows data only from the time the filter was created. The developer must count the Timeout messages for the previous 7 days. Which solution will meet these requirements?",
    options: [
      { text: "Run a CloudWatch Logs Insights query with a count of Timeout messages over the previous 7 days.", correct: true,
        why: "Metric filters do not process events that arrived before the filter existed. Logs Insights queries the stored log events directly, so it can count past messages." },
      { text: "Delete the metric filter and create it again with a start time 7 days ago.", correct: false,
        why: "Metric filters have no start time setting. They publish data points only for events that arrive after creation." },
      { text: "Set a default value of 0 on the metric filter.", correct: false,
        why: "The default value fills periods with no matches from now on. It does not process old events, so the past count is still missing." },
      { text: "Change the metric to high resolution.", correct: false,
        why: "Resolution controls the granularity of new data points. It does not create data points for events that arrived before the filter existed." }
    ],
    explanation: "Metric filters are not retroactive. Use CloudWatch Logs Insights to analyze log events that already exist." },

  { id: "m09-006", topic: "cw-logs-filters", domain: 1,
    stem: "A developer writes a Lambda function that a CloudWatch Logs subscription filter invokes. The function must parse each log event. Which actions must the developer take so that the subscription works and the function can read the events? (Choose two.)",
    options: [
      { text: "In the function code, base64-decode the awslogs.data field and then decompress it with gzip.", correct: true,
        why: "CloudWatch Logs sends subscription data base64-encoded and gzip-compressed. The function must decode and decompress it before it parses the events." },
      { text: "Add a resource-based policy statement to the function that allows CloudWatch Logs to invoke it.", correct: true,
        why: "CloudWatch Logs invokes the function as a service. The function's resource-based policy must allow that invocation, or the subscription cannot deliver." },
      { text: "Create a Lambda event source mapping that reads from the log group.", correct: false,
        why: "Event source mappings support sources such as SQS, Kinesis, and DynamoDB Streams. CloudWatch Logs pushes events through the subscription filter instead." },
      { text: "Add logs:GetLogEvents to the function's execution role so that it can read the events.", correct: false,
        why: "The events arrive in the invocation payload. The function does not need to read the log group, so this permission does not make the subscription work." },
      { text: "Change the source log group to the Infrequent Access log class.", correct: false,
        why: "Subscription filters are supported only for the Standard log class. The Infrequent Access class prevents the subscription instead of enabling it." }
    ],
    explanation: "A Lambda subscription destination needs permission for CloudWatch Logs to invoke it, and the code must base64-decode and gunzip awslogs.data." },

  { id: "m09-007", topic: "cw-logs-insights", domain: 4,
    stem: "Users report that a Lambda-based API is slow at some times of day. The developer needs the 99th percentile of function duration in 5-minute intervals for the last 24 hours, from the existing logs. Which CloudWatch Logs Insights query will meet these requirements?",
    options: [
      { text: "filter @type = \"REPORT\" | stats pct(@duration, 99) by bin(5m)", correct: true,
        why: "Lambda REPORT lines contain @duration. pct(@duration, 99) gives the 99th percentile, and bin(5m) groups the results into 5-minute intervals." },
      { text: "filter @type = \"REPORT\" | stats avg(@duration) by bin(5m)", correct: false,
        why: "The average hides slow outliers. It does not give the 99th percentile that the requirement asks for." },
      { text: "fields @duration | sort @duration desc | limit 1", correct: false,
        why: "This returns the single slowest invocation, not the 99th percentile, and it has no 5-minute intervals." },
      { text: "filter @type = \"REPORT\" | stats max(@maxMemoryUsed) by bin(5m)", correct: false,
        why: "This shows memory use, not duration. It does not answer the latency requirement." }
    ],
    explanation: "Use stats pct(@duration, 99) by bin(5m) on Lambda REPORT lines to find percentile latency over time." },

  { id: "m09-008", topic: "cw-logs-insights", domain: 4,
    stem: "A Lambda function sometimes runs much slower than usual. The developer suspects that the function does not have enough memory. The developer wants to confirm this from the existing logs with the LEAST effort. Which solution will meet these requirements?",
    options: [
      { text: "Run a Logs Insights query on the REPORT lines that compares max(@maxMemoryUsed) with @memorySize.", correct: true,
        why: "Each REPORT line contains Max Memory Used and Memory Size. If maximum memory used is near the configured size, the function needs more memory." },
      { text: "Create a metric filter on the word Memory and graph it.", correct: false,
        why: "A metric filter does not process past events and only counts matches. It does not compare memory used with configured memory." },
      { text: "Increase the function timeout and watch the Duration metric.", correct: false,
        why: "A longer timeout does not show memory use. It fails the requirement to confirm the cause from existing logs." },
      { text: "Turn on CloudTrail data events for the function.", correct: false,
        why: "Lambda data events record Invoke API calls. They do not contain memory usage, so they cannot confirm the cause." }
    ],
    explanation: "Lambda REPORT lines include @maxMemoryUsed and @memorySize. Compare them in Logs Insights to find memory bottlenecks." },

  { id: "m09-009", topic: "cw-logs-insights", domain: 4,
    stem: "A developer runs CloudWatch Logs Insights queries over 120 log groups for the last 30 days. The queries are slow, some do not finish, and the scan charges are high. Which actions will reduce query time and cost? (Choose two.)",
    options: [
      { text: "Narrow the time range of each query to the period of the incident.", correct: true,
        why: "Logs Insights charges by data scanned, and queries time out after 60 minutes. A shorter time range scans less data." },
      { text: "Query only the log groups that are related to the problem.", correct: true,
        why: "Fewer log groups means less data scanned. AWS recommends that you select only the necessary log groups for each query." },
      { text: "Set the retention of all log groups to Never expire.", correct: false,
        why: "Retention controls how long data is kept. Longer retention does not make queries faster or cheaper." },
      { text: "Create metric filters so that the query can use their metrics.", correct: false,
        why: "Logs Insights queries scan log events, not metric filter metrics. Metric filters also do not process past events." },
      { text: "Run the same query from the AWS CLI instead of the console.", correct: false,
        why: "The CLI and the console use the same query engine. The data scanned and the cost do not change." }
    ],
    explanation: "Logs Insights cost depends on data scanned. Use the narrowest time range and only the log groups you need." },

  { id: "m09-010", topic: "cw-logs-security", domain: 2,
    stem: "A security team requires that a log group is encrypted with a customer managed AWS KMS key. A developer creates a symmetric key in the same Region and runs aws logs associate-kms-key. The command fails with an access error about the key. Which solution will meet these requirements?",
    options: [
      { text: "Add a statement to the key policy that allows the CloudWatch Logs service principal for that Region to use the key.", correct: true,
        why: "CloudWatch Logs encrypts and decrypts the data. The key policy must allow the logs.<region>.amazonaws.com service principal, or the association fails." },
      { text: "Create an asymmetric KMS key and associate it instead.", correct: false,
        why: "CloudWatch Logs supports only symmetric KMS keys. An asymmetric key cannot encrypt the log group." },
      { text: "Turn on automatic rotation for the key.", correct: false,
        why: "Rotation changes the key material over time. It does not give CloudWatch Logs permission to use the key." },
      { text: "Create the key in another Region and associate it with the log group.", correct: false,
        why: "The CloudWatch Logs service principal must be in the same Region as the key. A key in another Region does not solve the access error." }
    ],
    explanation: "To encrypt a log group with a customer managed key, the key must be symmetric and the key policy must allow the CloudWatch Logs service principal in the same Region." },

  { id: "m09-011", topic: "cw-logs-security", domain: 2,
    stem: "Several applications in an AWS account write logs that can contain credit card numbers. The company requires that card numbers are masked in all new log events in every existing and future log group. On-call engineers must see only masked data. Auditors must be able to see the full values. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Create an account-level data protection policy that uses the credit card number managed data identifier.", correct: true,
        why: "An account-level policy applies to all existing log groups and to log groups created in the future. It masks matching data at ingestion." },
      { text: "Grant the logs:Unmask permission to the auditors only.", correct: true,
        why: "Only principals with logs:Unmask can see unmasked data. On-call engineers without it see masked values." },
      { text: "Create a data protection policy on each existing log group.", correct: false,
        why: "Log group policies do not apply to log groups that are created later. This fails the requirement for future log groups." },
      { text: "Associate a customer managed KMS key with each log group.", correct: false,
        why: "KMS encryption protects data at rest. Any user with access to the log group and key still sees the card numbers in clear text." },
      { text: "Grant the logs:Unmask permission to the on-call engineers.", correct: false,
        why: "With logs:Unmask, the on-call engineers can see full card numbers. This fails the requirement that they see only masked data." }
    ],
    explanation: "Data protection policies mask sensitive data at ingestion. An account-level policy covers all log groups, and only principals with logs:Unmask see unmasked data." },

  { id: "m09-012", topic: "cw-metrics", domain: 4,
    stem: "A Java application on Amazon EC2 instances fails with out-of-memory errors. The developer opens the AWS/EC2 namespace in CloudWatch but cannot find a memory utilization metric. The developer needs memory utilization for each instance in CloudWatch. Which solution will meet these requirements?",
    options: [
      { text: "Install the CloudWatch agent on the instances and configure it to collect memory metrics.", correct: true,
        why: "EC2 does not publish in-guest memory metrics. The CloudWatch agent collects system-level metrics such as memory and publishes them to CloudWatch." },
      { text: "Turn on detailed monitoring for the instances.", correct: false,
        why: "Detailed monitoring sends the same EC2 metrics every 1 minute instead of every 5 minutes. It does not add a memory metric." },
      { text: "Turn on AWS X-Ray tracing for the application.", correct: false,
        why: "X-Ray records request traces and latency. It does not publish instance memory utilization." },
      { text: "Create an alarm on the CPUUtilization metric.", correct: false,
        why: "CPU utilization is a different metric. It does not show memory use, so the requirement fails." }
    ],
    explanation: "AWS/EC2 has no memory or disk-space utilization metrics. Use the CloudWatch agent to collect them." },

  { id: "m09-013", topic: "cw-metrics", domain: 4,
    stem: "A team uses EC2 instances with default monitoring settings. An alarm on CPUUtilization reacts too slowly because data points arrive every 5 minutes. The team needs data points every minute with the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Turn on detailed monitoring for the instances.", correct: true,
        why: "Basic monitoring sends most EC2 metrics every 5 minutes. Detailed monitoring sends them every 1 minute with a simple setting change." },
      { text: "Create a high-resolution alarm with a 10-second period on CPUUtilization.", correct: false,
        why: "High-resolution alarm periods need a high-resolution custom metric. CPUUtilization is not a high-resolution metric, so data still arrives every 5 minutes." },
      { text: "Write a cron script on each instance that reads CPU usage and calls PutMetricData every minute.", correct: false,
        why: "This creates a custom metric, but it needs custom scripts on every instance. It fails the LEAST operational overhead requirement." },
      { text: "Set the alarm TreatMissingData setting to breaching.", correct: false,
        why: "This changes how the alarm treats missing data. It does not make EC2 send data points more often." }
    ],
    explanation: "EC2 basic monitoring uses 5-minute periods. Detailed monitoring gives 1-minute periods for a charge." },

  { id: "m09-014", topic: "cw-custom-metrics", domain: 1,
    stem: "A Lambda function processes 2 million orders each day. The developer must publish three custom business metrics (OrderValue, ItemCount, and ProcessingTime) with the dimensions Region and Channel. The solution must not add network calls to the function and must not need extra CloudWatch configuration such as filters. Which solution will meet these requirements?",
    options: [
      { text: "Write one log event for each order in CloudWatch embedded metric format (EMF) that defines the three metrics and the two dimensions.", correct: true,
        why: "CloudWatch Logs extracts EMF metrics from the log event, so the function makes no metric API call. The metric definitions are in the log event, so no filters are needed." },
      { text: "Call PutMetricData once for each order.", correct: false,
        why: "Each call is a synchronous network request that adds latency and request charges. This fails the requirement to add no network calls." },
      { text: "Write plain text log lines and create a metric filter for each metric.", correct: false,
        why: "Metric filters work, but each one is extra CloudWatch configuration to create and maintain. This fails the requirement." },
      { text: "Add the values as X-Ray annotations.", correct: false,
        why: "Annotations index traces for search. They do not create CloudWatch metrics for graphs and alarms." }
    ],
    explanation: "EMF puts metric definitions in structured log events. CloudWatch extracts the metrics, so the code makes no PutMetricData calls." },

  { id: "m09-015", topic: "cw-custom-metrics", domain: 4,
    stem: "A developer adds EMF output to a Lambda function. The JSON log events appear in CloudWatch Logs, but no metric appears in the namespace. A sample log event contains an _aws object with Timestamp and a CloudWatchMetrics directive for the metric Latency with the dimension Service. The values are inside a nested object: {\"data\": {\"Latency\": 120, \"Service\": \"cart\"}}. Which change will make CloudWatch create the metric?",
    options: [
      { text: "Move Latency and Service to the root level of the JSON object.", correct: true,
        why: "EMF target members must be members of the root node and cannot be nested objects. CloudWatch cannot find nested values, so it creates no metric." },
      { text: "Add cloudwatch:PutMetricData to the function's execution role.", correct: false,
        why: "With EMF, CloudWatch Logs extracts the metrics from the log event. The function does not call PutMetricData, so this permission does not fix the problem." },
      { text: "Set StorageResolution to 1 in the metric definition.", correct: false,
        why: "StorageResolution changes the metric to high resolution. The values are still nested, so CloudWatch still creates no metric." },
      { text: "Increase the function memory.", correct: false,
        why: "Memory does not affect how CloudWatch parses the log event. The nested values are still not found." }
    ],
    explanation: "In EMF, every metric and dimension that a directive references must be a member at the root of the JSON log event." },

  { id: "m09-016", topic: "cw-custom-metrics", domain: 1,
    stem: "An application publishes a custom metric named QueueLag with PutMetricData. The team needs an alarm that evaluates QueueLag every 10 seconds. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Publish QueueLag with StorageResolution set to 1.", correct: true,
        why: "StorageResolution 1 makes the metric high resolution, stored at 1-second granularity. Sub-minute alarm periods need a high-resolution metric." },
      { text: "Create the alarm with a period of 10 seconds.", correct: true,
        why: "A high-resolution alarm can use a period of 10 or 30 seconds on a high-resolution metric." },
      { text: "Create the alarm with a period of 1 second.", correct: false,
        why: "High-resolution alarms support periods of 10 or 30 seconds, or a multiple of 60 seconds. A 1-second alarm period is not supported." },
      { text: "Publish QueueLag with StorageResolution set to 60.", correct: false,
        why: "60 is standard resolution with 1-minute granularity. An alarm cannot evaluate it every 10 seconds." },
      { text: "Turn on detailed monitoring for the account.", correct: false,
        why: "Detailed monitoring is an EC2 instance setting for 1-minute EC2 metrics. It does not change custom metric resolution." }
    ],
    explanation: "Publish the custom metric at high resolution (StorageResolution 1), then use a high-resolution alarm with a 10-second or 30-second period." },

  { id: "m09-017", topic: "cw-alarms", domain: 4,
    stem: "A developer creates an alarm on the Errors metric of a Lambda function that runs only a few times each day. The alarm uses a 5-minute period and default settings. Most of the time the alarm shows INSUFFICIENT_DATA, and the team cannot tell if the function is healthy. The alarm must show OK when no errors occur. Which solution will meet these requirements?",
    options: [
      { text: "Set TreatMissingData to notBreaching.", correct: true,
        why: "With no invocations there are no data points. notBreaching treats missing points as good, so the alarm shows OK when no errors occur." },
      { text: "Set TreatMissingData to breaching.", correct: false,
        why: "breaching treats missing points as bad. The alarm goes to ALARM every quiet period, which gives false alarms." },
      { text: "Set TreatMissingData to ignore.", correct: false,
        why: "ignore keeps the current state. An alarm in INSUFFICIENT_DATA can stay there, so it fails the requirement to show OK." },
      { text: "Change the statistic from Sum to Average.", correct: false,
        why: "The statistic does not create data points when the function does not run. The alarm still has missing data." }
    ],
    explanation: "For a metric that reports data only when activity occurs, set TreatMissingData to notBreaching. The default, missing, leads to INSUFFICIENT_DATA when all points are missing." },

  { id: "m09-018", topic: "cw-alarms", domain: 4,
    stem: "A Lambda function is invoked directly by an application through the AWS SDK. When processing fails, the handler catches the exception and returns {\"statusCode\": 500}. The developer creates an alarm on the Lambda Errors metric, but the alarm never goes to ALARM during failures. The response format must not change. Which solution will meet these requirements?",
    options: [
      { text: "Write a structured log line for each failure, create a metric filter on it, and alarm on the new metric.", correct: true,
        why: "Errors counts only function errors, such as unhandled exceptions and timeouts. A handled response is a success to Lambda, so a custom metric from the logs is needed." },
      { text: "Create the alarm on the Throttles metric instead.", correct: false,
        why: "Throttles counts rejected invocation requests. Handled failures are not throttles, so this alarm does not detect them." },
      { text: "Lower the threshold of the Errors alarm to 0.", correct: false,
        why: "Errors stays at 0 because Lambda does not see a function error. A lower threshold still never goes to ALARM." },
      { text: "Create the alarm on the Invocations metric.", correct: false,
        why: "Invocations counts all invocations, successful or failed. It cannot separate failures from normal requests." }
    ],
    explanation: "The Lambda Errors metric counts only function errors. A handler that catches the exception and returns a response does not increase Errors." },

  { id: "m09-019", topic: "cw-alarms-advanced", domain: 4,
    stem: "An application has two CloudWatch alarms: HighErrorRate and HighLatency. During one incident, both alarms send SNS notifications, and the on-call engineer gets two pages. The team wants one page, and only when both conditions are true at the same time. Which solution will meet these requirements?",
    options: [
      { text: "Create a composite alarm with the rule ALARM(HighErrorRate) AND ALARM(HighLatency), move the SNS action to the composite alarm, and remove the actions from the two alarms.", correct: true,
        why: "A composite alarm combines the states of other alarms. With actions only on the composite alarm, the team gets one page when both are in ALARM." },
      { text: "Create an anomaly detection alarm on the error rate.", correct: false,
        why: "Anomaly detection changes how one metric is evaluated. It does not combine two alarms into one notification." },
      { text: "Set DatapointsToAlarm to 2 on both alarms.", correct: false,
        why: "This changes when each alarm goes to ALARM. Each alarm still sends its own notification, so the team still gets two pages." },
      { text: "Subscribe the on-call engineer to the SNS topic with a filter policy.", correct: false,
        why: "A filter policy filters messages by attributes. It cannot check that both alarms are in ALARM at the same time." }
    ],
    explanation: "Composite alarms reduce alarm noise. Put the action on the composite alarm and remove the actions from the child alarms." },

  { id: "m09-020", topic: "cw-alarms-advanced", domain: 2,
    stem: "A developer configures a CloudWatch alarm to invoke a remediation Lambda function directly when the alarm goes to ALARM. The alarm changes state, but the function is never invoked. The solution must follow the principle of least privilege. Which solution will meet these requirements?",
    options: [
      { text: "Add a resource-based policy to the function that allows the lambda.alarms.cloudwatch.amazonaws.com principal to invoke it, with AWS:SourceArn set to the alarm ARN.", correct: true,
        why: "CloudWatch needs permission in the function's resource-based policy to invoke it. Limiting the statement to the alarm ARN follows least privilege." },
      { text: "Add lambda:InvokeFunction for all functions to the function's execution role.", correct: false,
        why: "The execution role controls what the function can call. It does not let CloudWatch invoke the function, and the wide scope is not least privilege." },
      { text: "Add a resource-based policy that allows the principal * to invoke the function.", correct: false,
        why: "This could make the invocation work, but it lets anyone invoke the function. It fails the least privilege requirement." },
      { text: "Turn on X-Ray active tracing for the function.", correct: false,
        why: "Tracing records invocations that happen. It does not give CloudWatch permission to invoke the function." }
    ],
    explanation: "For a Lambda alarm action, the function's resource-based policy must allow lambda.alarms.cloudwatch.amazonaws.com. Limit it with AWS:SourceAccount or AWS:SourceArn." },

  { id: "m09-021", topic: "cw-alarms-advanced", domain: 4,
    stem: "An API has much more traffic during business hours than at night, and more on weekdays than on weekends. A static threshold alarm on request count gives false alarms every morning and misses drops at night. The team wants the alarm to follow the normal daily and weekly pattern with the LEAST effort. Which solution will meet these requirements?",
    options: [
      { text: "Create a CloudWatch anomaly detection alarm on the request count metric.", correct: true,
        why: "Anomaly detection models hourly, daily, and weekly patterns and trends. The alarm compares the metric to a band of expected values instead of a static threshold." },
      { text: "Create two static alarms, one for business hours and one for nights.", correct: false,
        why: "Static alarms cannot turn on and off by time of day by themselves. They need extra automation and still do not follow weekly patterns." },
      { text: "Set TreatMissingData to notBreaching.", correct: false,
        why: "This affects only missing data points. It does not change the threshold to follow traffic patterns." },
      { text: "Create a composite alarm from the static alarm.", correct: false,
        why: "A composite alarm combines alarm states. The static threshold underneath still gives the same false alarms." }
    ],
    explanation: "Anomaly detection alarms use a model of expected values that includes hourly, daily, and weekly patterns." },

  { id: "m09-022", topic: "cw-alarms-advanced", domain: 4,
    stem: "A developer creates a composite alarm that combines several application alarms. When the composite alarm goes to ALARM, it must notify the on-call team and create an operational work item for tracking. Which actions can the developer configure on the composite alarm to meet these requirements? (Choose two.)",
    options: [
      { text: "An Amazon SNS notification action.", correct: true,
        why: "Composite alarms can send Amazon SNS notifications when they change state." },
      { text: "An AWS Systems Manager OpsItem action.", correct: true,
        why: "Composite alarms can create Systems Manager OpsItems or incidents when they go to ALARM. An OpsItem is a work item for tracking." },
      { text: "An EC2 reboot action.", correct: false,
        why: "Composite alarms cannot perform EC2 actions. Put EC2 actions on a metric alarm based on an EC2 metric." },
      { text: "An EC2 Auto Scaling action.", correct: false,
        why: "Composite alarms cannot perform Auto Scaling actions. They also do not meet the requirement to notify the team or create a work item." },
      { text: "A rule expression that evaluates a raw metric value directly.", correct: false,
        why: "A composite alarm rule uses the states of other alarms, not metrics. It is also not an action." }
    ],
    explanation: "Composite alarms can notify through SNS, invoke Lambda, and create OpsItems or incidents. They cannot perform EC2 or Auto Scaling actions." },

  { id: "m09-023", topic: "cw-alarms-advanced", domain: 4,
    stem: "A team deploys an application with AWS CodeDeploy. The team wants an email each time a deployment fails. The team does not want to write or run any code. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Create an Amazon EventBridge rule for CodeDeploy Deployment State-change Notification events with the FAILURE state, and set an SNS topic with an email subscription as the target.", correct: true,
        why: "CodeDeploy sends deployment state-change events to EventBridge. A rule with an SNS target sends the email with no code." },
      { text: "Create a metric filter on the CodeDeploy agent log for the word failed.", correct: false,
        why: "The agent log is on each instance and is not in CloudWatch Logs by default. This also needs an alarm and more setup, and it can miss failures." },
      { text: "Turn on CloudTrail Insights for the account.", correct: false,
        why: "CloudTrail Insights finds unusual API call or error rates. It does not report each failed deployment." },
      { text: "Write a Lambda function that polls the CodeDeploy API every minute and publishes to SNS.", correct: false,
        why: "This needs custom code to write and run. It fails the requirement to use no code." }
    ],
    explanation: "CodeDeploy sends state-change events to EventBridge. A rule that matches FAILURE and targets SNS gives deployment notifications with no code. Developer Tools notification rules are another option." },

  { id: "m09-024", topic: "cw-alarms-advanced", domain: 4,
    stem: "A company often reaches the Amazon EC2 On-Demand vCPU quota during peak events, and new instances fail to launch. The developer must notify the operations team before usage reaches the quota. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Create a CloudWatch alarm on the EC2 vCPU usage metric in the AWS/Usage namespace with the expression m1/SERVICE_QUOTA(m1)*100, and notify an SNS topic when the value is above 80.", correct: true,
        why: "EC2 publishes usage metrics that integrate with Service Quotas. The SERVICE_QUOTA function gives the quota, so the alarm notifies at 80 percent with no code." },
      { text: "Write a scheduled Lambda function that counts running instances and compares the count with a hardcoded quota.", correct: false,
        why: "This needs custom code, and a hardcoded quota becomes wrong when the quota changes. It fails the LEAST operational overhead requirement." },
      { text: "Create a CloudTrail trail and search for RunInstances errors each day.", correct: false,
        why: "This finds failures after they occur, not before. It fails the requirement to notify before usage reaches the quota." },
      { text: "Create an alarm on the CPUUtilization metric of each instance.", correct: false,
        why: "CPU utilization measures load on one instance. It does not measure how many vCPUs the account uses compared with the quota." }
    ],
    explanation: "For services that publish usage metrics, use the SERVICE_QUOTA metric math function and alarm on usage as a percentage of the quota." },

  { id: "m09-025", topic: "cw-app-monitoring", domain: 4,
    stem: "An online store has a checkout page and a public REST API. At night there is almost no customer traffic, so failures are found only when customers arrive in the morning. The team wants to find failures at any time of day by testing the same steps that a customer takes, every 5 minutes. Which solution will meet these requirements?",
    options: [
      { text: "Create CloudWatch Synthetics canaries that run the checkout steps and API calls on a 5-minute schedule, and create alarms on the canary metrics.", correct: true,
        why: "Canaries are scripts that run on a schedule and act like a customer. They find failures even when there is no real traffic." },
      { text: "Create a CloudWatch Contributor Insights rule on the API access logs.", correct: false,
        why: "Contributor Insights analyzes log events that real traffic creates. With no traffic at night, it has nothing to analyze." },
      { text: "Create an anomaly detection alarm on the API request count.", correct: false,
        why: "Low traffic at night is normal, so the model expects it. This alarm does not test the checkout steps." },
      { text: "Turn on X-Ray active tracing for the API.", correct: false,
        why: "X-Ray traces requests that arrive. It does not create test requests when customers are not active." }
    ],
    explanation: "CloudWatch Synthetics canaries run scripts on a schedule to check endpoints and user flows, even with no customer traffic." },

  { id: "m09-026", topic: "cw-app-monitoring", domain: 4,
    stem: "A web application writes structured JSON access logs to CloudWatch Logs. Each log event contains clientIp, url, and status fields. The number of 5xx responses has increased. The developer needs to see, in real time, which client IP addresses and URLs cause the most 5xx responses. Which solution will meet these requirements?",
    options: [
      { text: "Create a CloudWatch Contributor Insights rule that uses clientIp and url as contributor keys and filters on status 5xx.", correct: true,
        why: "Contributor Insights analyzes log events in real time and shows the top-N contributors. This is the purpose of the feature." },
      { text: "Create a metric filter that counts status 5xx.", correct: false,
        why: "A metric filter gives one count of 5xx responses. It does not show which IP addresses and URLs contribute the most." },
      { text: "Create a CloudWatch Synthetics canary for the application.", correct: false,
        why: "A canary sends its own test requests. It does not analyze which real clients cause the errors." },
      { text: "Create a CloudWatch dashboard with the application's request count metric.", correct: false,
        why: "A request count graph shows totals only. It does not break down the errors by client IP and URL." }
    ],
    explanation: "Contributor Insights creates top-N contributor reports from log fields in real time, for example the IP addresses or URLs that cause the most errors." },

  { id: "m09-027", topic: "cw-app-monitoring", domain: 4,
    stem: "A team runs Java microservices on Amazon ECS. Management wants to track availability and latency for each service against a service level objective (SLO), with an automatic map of the services and their dependencies. The team does not want to write custom metric code or build dashboards by hand. Which solution will meet these requirements?",
    options: [
      { text: "Turn on CloudWatch Application Signals for the services and create SLOs in Application Signals.", correct: true,
        why: "Application Signals collects metrics and traces automatically, shows availability, latency, faults, and errors, supports SLOs, and builds an application map." },
      { text: "Publish custom availability metrics with PutMetricData and build a dashboard.", correct: false,
        why: "This needs custom metric code and a manual dashboard. It fails both requirements." },
      { text: "Create a CloudTrail trail with data events for the services.", correct: false,
        why: "CloudTrail records API activity for audit. It does not measure service availability, latency, or SLOs." },
      { text: "Turn on Container Insights for the cluster only.", correct: false,
        why: "Container Insights gives CPU, memory, and restart data for containers. It does not track SLOs or build a dependency map of service calls." }
    ],
    explanation: "CloudWatch Application Signals gives standard application metrics, SLOs, and an application map with little setup." },

  { id: "m09-028", topic: "xray-concepts", domain: 4,
    stem: "A developer instruments an order service with AWS X-Ray. Support engineers must find all traces for a given customer tier, such as gold, by using X-Ray filter expressions. Which solution will meet these requirements?",
    options: [
      { text: "Record the customer tier as an annotation on the segment.", correct: true,
        why: "Annotations are indexed key-value pairs. Filter expressions can search them, for example annotation.customer_tier = \"gold\"." },
      { text: "Record the customer tier as metadata on the segment.", correct: false,
        why: "Metadata is not indexed. Filter expressions cannot search it, so engineers cannot find the traces." },
      { text: "Write the customer tier to CloudWatch Logs.", correct: false,
        why: "Log events are not part of the X-Ray index. X-Ray filter expressions cannot search them." },
      { text: "Create a new subsegment for each customer tier.", correct: false,
        why: "Subsegments record work and timing. They are not the indexed field for searching traces by a value." }
    ],
    explanation: "Use annotations for values you search on with filter expressions. Metadata is not indexed." },

  { id: "m09-029", topic: "xray-concepts", domain: 1,
    stem: "A developer adds custom data to X-Ray segments in a payment service. The order ID must be searchable in the X-Ray console. The full JSON request body (about 10 KB, with nested objects) must be stored with the trace for debugging, but nobody searches it. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Add the order ID as an annotation.", correct: true,
        why: "Annotations are indexed for filter expressions, so the order ID becomes searchable." },
      { text: "Add the request body as metadata.", correct: true,
        why: "Metadata accepts values of any type, including objects and lists, and is stored with the segment. It is not indexed, which is acceptable here." },
      { text: "Add the request body as an annotation.", correct: false,
        why: "Annotations are simple key-value pairs, and X-Ray indexes up to 50 annotations for each trace. A nested JSON body is not a good fit." },
      { text: "Add the order ID as metadata.", correct: false,
        why: "Metadata is not indexed, so the order ID cannot be found with filter expressions." },
      { text: "Create an X-Ray group for each order ID.", correct: false,
        why: "Groups use a filter expression to collect traces. A group for each order adds cost and still needs a searchable field such as an annotation." }
    ],
    explanation: "Use an annotation for a value that you search on, such as the order ID. X-Ray indexes annotations, and they hold only simple values (string, number, or Boolean). Use metadata for debug data that nobody searches, such as a nested JSON body. Metadata accepts any type but is not indexed." },

  { id: "m09-030", topic: "xray-setup", domain: 3,
    stem: "A team deploys a Python web application to AWS Elastic Beanstalk. The application uses the X-Ray SDK. The team must send trace data to X-Ray with the LEAST operational overhead. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Turn on the XRayEnabled option in the Elastic Beanstalk environment configuration.", correct: true,
        why: "This option makes Elastic Beanstalk run the X-Ray daemon on the instances. The team does not install the daemon themselves." },
      { text: "Attach the AWSXRayDaemonWriteAccess managed policy to the environment's instance profile role.", correct: true,
        why: "The daemon uses the instance profile credentials to call PutTraceSegments and PutTelemetryRecords. Without them, uploads fail." },
      { text: "Attach the AWSXrayReadOnlyAccess managed policy to the instance profile role.", correct: false,
        why: "Read-only access lets a principal view traces. It does not allow the daemon to upload segments." },
      { text: "Set TracingConfig Mode to Active on the environment.", correct: false,
        why: "TracingConfig is a Lambda function setting. It does not apply to an Elastic Beanstalk environment." },
      { text: "Install the X-Ray daemon manually on each instance with a user data script.", correct: false,
        why: "This works, but it adds manual work on every instance. The XRayEnabled option does the same with less overhead." }
    ],
    explanation: "On Elastic Beanstalk, use the XRayEnabled option to run the daemon, and give the instance profile the AWSXRayDaemonWriteAccess policy." },

  { id: "m09-031", topic: "xray-setup", domain: 2,
    stem: "A containerized application on Amazon ECS (bridge network mode) uses the X-Ray SDK. The developer adds the X-Ray daemon as a second container in the task definition with UDP port 2000 mapped, and sets AWS_XRAY_DAEMON_ADDRESS in the application container. The daemon logs show AccessDenied errors when it sends segments. Which solution will meet these requirements while following least privilege?",
    options: [
      { text: "Attach the AWSXRayDaemonWriteAccess managed policy to the ECS task role.", correct: true,
        why: "Containers in the task, including the daemon, use the task role for AWS API calls. AWSXRayDaemonWriteAccess allows only trace upload and sampling calls." },
      { text: "Attach the AWSXRayDaemonWriteAccess managed policy to the ECS task execution role.", correct: false,
        why: "The task execution role lets ECS pull images and send container logs. The daemon does not use it, so the AccessDenied error continues." },
      { text: "Attach the AWSXrayFullAccess managed policy to the ECS task role.", correct: false,
        why: "This fixes the error, but it allows all X-Ray actions, including changing sampling rules and encryption. It fails least privilege." },
      { text: "Change the daemon port mapping to TCP port 443.", correct: false,
        why: "The SDK sends segments to the daemon on UDP port 2000. The AccessDenied error comes from missing IAM permissions, not the port." }
    ],
    explanation: "On ECS, run the daemon as a sidecar on UDP port 2000 and give the task role (not the execution role) AWSXRayDaemonWriteAccess." },

  { id: "m09-032", topic: "xray-setup", domain: 4,
    stem: "An application on Amazon EC2 uses the X-Ray SDK with the default sampling rule and reads sampling rules from the X-Ray service. The team needs to trace every POST request to /checkout for one week while it investigates a problem. Other requests must keep the default rate. The team must not redeploy the application. Which solution will meet these requirements?",
    options: [
      { text: "Create a sampling rule in X-Ray for HTTP method POST and URL path /checkout with a rate of 100 percent and a lower priority number than the default rule (evaluated first).", correct: true,
        why: "The SDK reads rules from X-Ray, so a new rule applies with no redeploy. Rules are evaluated by priority, and only matching requests use the 100 percent rate." },
      { text: "Change the default sampling rule rate to 100 percent.", correct: false,
        why: "The default rule applies to all requests that match no other rule. Every request would be traced, which fails the requirement for other requests." },
      { text: "Add a local sampling rules JSON file to the application.", correct: false,
        why: "Local rules are part of the deployed code. A change needs a redeploy, which the requirement does not allow." },
      { text: "Add an annotation to each checkout request.", correct: false,
        why: "Annotations index data on traces that are already sampled. They do not change which requests are sampled." }
    ],
    explanation: "Sampling rules in the X-Ray service change sampling without a redeploy. The rule with the lowest priority number that matches a request is applied." },

  { id: "m09-033", topic: "xray-setup", domain: 2,
    stem: "A developer turns on active tracing for a Lambda function in the console of a test account. In production, the same function is deployed with a custom execution role, and no traces appear in X-Ray. Which solution will meet these requirements?",
    options: [
      { text: "Add the xray:PutTraceSegments and xray:PutTelemetryRecords permissions to the function's execution role, for example with AWSXRayDaemonWriteAccess.", correct: true,
        why: "Lambda sends trace data with the execution role. Without these permissions, X-Ray rejects the trace data." },
      { text: "Add a resource-based policy to the function that allows xray.amazonaws.com to invoke it.", correct: false,
        why: "X-Ray does not invoke the function. The function's execution role sends the trace data, so this policy does not help." },
      { text: "Attach AWSXrayReadOnlyAccess to the execution role.", correct: false,
        why: "Read-only access allows reading traces. It does not allow the function to upload trace segments." },
      { text: "Package the X-Ray daemon in a Lambda layer.", correct: false,
        why: "Lambda runs the X-Ray daemon for you when active tracing is on. The missing permissions are still the problem." }
    ],
    explanation: "With active tracing, the Lambda execution role needs xray:PutTraceSegments and xray:PutTelemetryRecords." },

  { id: "m09-034", topic: "xray-setup", domain: 1,
    stem: "A Python web application on Amazon EC2 uses the X-Ray SDK, and the X-Ray daemon runs on the instance. Traces arrive in X-Ray, but the trace map shows only one node for the application. The application calls Amazon DynamoDB with boto3 and an external HTTP API with the requests library, but these calls do not appear. The developer must see each downstream call with its timing. Which solution will meet these requirements?",
    options: [
      { text: "Instrument the AWS SDK and HTTP clients in the code, for example with patch_all() from the X-Ray SDK for Python, so that the SDK records a subsegment for each downstream call.", correct: true,
        why: "The SDK records downstream calls only for instrumented clients. Each instrumented call becomes a subsegment, and X-Ray shows DynamoDB and the HTTP API as nodes on the trace map." },
      { text: "Add an annotation with the name of each downstream service to the segment.", correct: false,
        why: "Annotations are indexed values for search. They do not record downstream calls or their timing, so no new nodes appear." },
      { text: "Increase the sampling rate to 100 percent.", correct: false,
        why: "Sampling controls how many requests are traced. The traced requests still have no subsegments for the downstream calls." },
      { text: "Change the port that the X-Ray daemon listens on.", correct: false,
        why: "Traces already arrive, so the daemon connection works. The port does not control which calls the SDK records." },
      { text: "Turn on CloudTrail data events for the DynamoDB table.", correct: false,
        why: "CloudTrail records API calls for audit in log files. It does not add subsegments or nodes to the X-Ray trace map." }
    ],
    explanation: "To see downstream calls on the trace map, instrument the AWS SDK and HTTP clients so that the X-Ray SDK records a subsegment for each call." },

  { id: "m09-035", topic: "trail-events", domain: 2,
    stem: "An Amazon DynamoDB table was deleted two days ago. The account has no CloudTrail trail. The security team must find which IAM principal deleted the table. Which solution will meet these requirements?",
    options: [
      { text: "Search CloudTrail Event history for the DeleteTable event.", correct: true,
        why: "Event history shows the past 90 days of management events in the Region, with no trail needed. DeleteTable is a management event." },
      { text: "Create a CloudTrail trail now and search its log files.", correct: false,
        why: "A trail records events from the time you create it. It does not contain the deletion from two days ago." },
      { text: "Run a CloudWatch Logs Insights query on the application log groups.", correct: false,
        why: "Application logs show what the code wrote. They do not reliably record which IAM principal called DeleteTable." },
      { text: "Look at the DynamoDB table metrics in CloudWatch.", correct: false,
        why: "Metrics show performance data. They do not show who made an API call." }
    ],
    explanation: "CloudTrail Event history keeps 90 days of management events by default, at no charge, with no trail." },

  { id: "m09-036", topic: "trail-events", domain: 2,
    stem: "A company has a multi-Region CloudTrail trail with default settings. An auditor asks for a list of who downloaded objects from a confidential S3 bucket. The trail log files contain no GetObject events. Which solution will meet these requirements for future downloads?",
    options: [
      { text: "Add S3 data events for the confidential bucket to the trail.", correct: true,
        why: "GetObject is a data event. Trails log management events by default but not data events, so you must add them for the bucket." },
      { text: "Turn on CloudTrail Insights on the trail.", correct: false,
        why: "Insights finds unusual management API call rates or error rates. It does not record individual GetObject calls." },
      { text: "Turn on log file integrity validation.", correct: false,
        why: "Validation proves that log files were not changed. It does not add new event types to the trail." },
      { text: "Change the trail to a single-Region trail in the bucket's Region.", correct: false,
        why: "A single-Region trail still logs only management events by default. GetObject events stay missing." }
    ],
    explanation: "S3 object-level operations such as GetObject are data events. They are not logged by default and have an extra charge." },

  { id: "m09-037", topic: "trail-events", domain: 2,
    stem: "A company must keep a record of all AWS API management activity in every AWS Region, including Regions that the company enables in the future. The records must be kept for 7 years at the lowest cost. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Create a multi-Region trail that delivers log files to an S3 bucket.", correct: true,
        why: "A multi-Region trail records events in all enabled Regions and delivers them to one S3 bucket. One copy of management events has no CloudTrail charge." },
      { text: "Add an S3 Lifecycle rule that moves log files to an archive storage class and expires them after 7 years.", correct: true,
        why: "S3 Lifecycle rules archive and delete the log files automatically. This keeps the files for 7 years at low cost." },
      { text: "Use CloudTrail Event history as the record.", correct: false,
        why: "Event history keeps only 90 days of management events. It fails the 7-year requirement." },
      { text: "Create a single-Region trail in each Region that the company uses today.", correct: false,
        why: "This needs one trail for each Region and misses Regions enabled later. It fails the requirement for future Regions." },
      { text: "Add data events for all S3 buckets and Lambda functions to the trail.", correct: false,
        why: "Data events are not management activity and have extra charges. This fails the lowest cost requirement." }
    ],
    explanation: "Use a multi-Region trail to S3 for long-term records, and S3 Lifecycle rules to control storage cost and retention." },

  { id: "m09-038", topic: "trail-security", domain: 2,
    stem: "During an investigation, a security team must prove that CloudTrail log files in an S3 bucket were not changed or deleted after CloudTrail delivered them. Which solution will meet these requirements?",
    options: [
      { text: "Turn on log file integrity validation for the trail, and validate the files with the AWS CLI.", correct: true,
        why: "CloudTrail creates signed hourly digest files with SHA-256 hashes of the log files. Validation shows if a file was changed, deleted, or not changed." },
      { text: "Turn on SSE-KMS encryption for the log files.", correct: false,
        why: "Encryption protects confidentiality. It does not prove that a file was not changed or deleted." },
      { text: "Turn on S3 Versioning on the bucket.", correct: false,
        why: "Versioning keeps older object versions. It does not give a signed proof that the delivered files are unchanged." },
      { text: "Turn on CloudTrail Insights.", correct: false,
        why: "Insights detects unusual API activity. It does not check the integrity of log files." }
    ],
    explanation: "Log file integrity validation uses SHA-256 hashes and SHA-256 with RSA signed digest files to detect changed or deleted log files." },

  { id: "m09-039", topic: "trail-security", domain: 1,
    stem: "A company has a CloudTrail trail with logging turned on. When anyone deletes an S3 bucket, a Lambda function must start within seconds and receive the details of the API call, including the caller identity and the bucket name. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Create an Amazon EventBridge rule on the default event bus that matches AWS API Call via CloudTrail events for DeleteBucket, with the Lambda function as the target.", correct: true,
        why: "CloudTrail sends API call events to EventBridge. DeleteBucket is a write management event, so a rule in the default state matches it and passes the full event to the function." },
      { text: "Send the trail to CloudWatch Logs, create a metric filter for DeleteBucket, and create an alarm that invokes the function.", correct: false,
        why: "The alarm payload contains alarm data, not the API call details. The function would not receive the caller identity and bucket name." },
      { text: "Schedule the function to call LookupEvents every 5 minutes.", correct: false,
        why: "Polling adds delay and custom logic. It fails the requirement to start within seconds with the least overhead." },
      { text: "Turn on CloudTrail Insights and send Insights events to the function.", correct: false,
        why: "Insights events report unusual call rates, not each DeleteBucket call. Single deletions would not invoke the function." }
    ],
    explanation: "Use EventBridge rules on AWS API Call via CloudTrail events to react to specific API calls. A trail with logging must be on." },

  { id: "m09-040", topic: "trail-security", domain: 2,
    stem: "A security team requires that CloudTrail log files are encrypted with a KMS key that the team controls. Analysts in the same account must still be able to read the log files. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Configure the trail to use SSE-KMS with a customer managed key in the same Region as the S3 bucket, with a key policy that allows CloudTrail to use the key.", correct: true,
        why: "CloudTrail supports SSE-KMS with a customer managed key. The key must be in the bucket's Region, and the key policy must allow CloudTrail to encrypt." },
      { text: "Give the analysts decrypt permission on the KMS key, in addition to S3 read permission on the bucket.", correct: true,
        why: "With SSE-KMS, a reader needs both S3 read permission and decrypt permission on the key. Without decrypt permission, analysts cannot read the files." },
      { text: "Create the KMS key in a different Region from the bucket for isolation.", correct: false,
        why: "The KMS key must be in the same Region as the S3 bucket that receives the log files. A key in another Region cannot be used." },
      { text: "Give the analysts S3 read permission only.", correct: false,
        why: "S3 read permission alone is not enough for SSE-KMS objects. The analysts also need decrypt permission on the key." },
      { text: "Turn on log file integrity validation instead of SSE-KMS.", correct: false,
        why: "Validation proves that files were not changed. It does not encrypt the files with a key that the team controls." }
    ],
    explanation: "For SSE-KMS on CloudTrail logs, use a key in the bucket's Region that CloudTrail can use, and give readers S3 read plus KMS decrypt permissions." }

] });
