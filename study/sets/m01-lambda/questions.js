window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "m01-lambda", questions: [

  { id: "m01-001", topic: "lambda-lifecycle", domain: 1,
    stem: "A Python Lambda function queries an Amazon RDS for MySQL database. The function opens a new database connection inside the handler on every invocation. The database is near its connection limit. The developer wants to reduce the number of new connections with the fewest code changes. Which solution will meet these requirements?",
    options: [
      { text: "Move the code that opens the connection outside the handler, and check that the connection is still open before each use.", correct: true,
        why: "Code outside the handler runs one time for each execution environment. Warm invocations use the same connection again, so the function opens far fewer connections with a small code change." },
      { text: "Increase the function memory to 3,008 MB.", correct: false,
        why: "More memory gives more CPU. It does not change how many connections the code opens, so it fails the requirement to reduce new connections." },
      { text: "Store the open connection in an environment variable.", correct: false,
        why: "Environment variables are strings that you set at deployment. They cannot hold an open connection object, so the connection count does not go down." },
      { text: "Set the function timeout to 900 seconds so that each execution environment stays active longer.", correct: false,
        why: "The timeout limits the duration of one invocation. It does not keep environments alive or reuse connections, so it fails the requirement." }
    ],
    explanation: "Code outside the handler runs one time for each execution environment. Put SDK clients and database connections there so that warm invocations use them again." },

  { id: "m01-002", topic: "lambda-lifecycle", domain: 1,
    stem: "A Lambda function downloads a 300 MB machine learning model from Amazon S3 at the start of every invocation. The download adds about 2 seconds to each request. The model changes one time each month. The developer wants to reduce request latency at the lowest cost. Which solution will meet these requirements?",
    options: [
      { text: "Download the model to /tmp only when the file is not already there, so that later invocations in the same execution environment use the saved file.", correct: true,
        why: "The /tmp content stays while the execution environment is frozen. Warm invocations skip the download, and the default 512 MB of /tmp holds the model at no extra cost." },
      { text: "Store the model in an environment variable.", correct: false,
        why: "All environment variables together are limited to 4 KB. A 300 MB model does not fit, so this cannot reduce latency." },
      { text: "Configure provisioned concurrency for the function and keep the download in the handler.", correct: false,
        why: "Provisioned concurrency removes Init latency, but the handler still downloads the model on every request. It also adds cost, so it fails the lowest-cost requirement." },
      { text: "Increase the function timeout to 15 minutes.", correct: false,
        why: "A longer timeout lets the function run longer. It does not remove the download, so latency does not go down." }
    ],
    explanation: "Global variables and /tmp content stay in a frozen execution environment. Use them as a cache that warm invocations use again." },

  { id: "m01-003", topic: "lambda-lifecycle", domain: 4,
    stem: "An API uses Amazon API Gateway and a Lambda function. Users report that some requests take about 4 seconds, and most take 200 ms. In CloudWatch Logs, only the slow requests have an Init Duration value in the REPORT line. The developer needs consistently low latency for all requests during business hours. Which solution will meet these requirements?",
    options: [
      { text: "Configure provisioned concurrency on a function alias, and configure API Gateway to invoke that alias.", correct: true,
        why: "Init Duration shows cold starts. Provisioned concurrency keeps execution environments initialized, so requests do not wait for Init." },
      { text: "Increase the function timeout.", correct: false,
        why: "The timeout does not cause the delay. A longer timeout does not remove cold starts, so latency stays inconsistent." },
      { text: "Configure reserved concurrency equal to the peak concurrency.", correct: false,
        why: "Reserved concurrency limits and reserves capacity, but Lambda does not initialize those environments in advance. Cold starts continue." },
      { text: "Increase the ephemeral storage to 10,240 MB.", correct: false,
        why: "The size of /tmp does not change Init time. Cold starts continue, so latency stays inconsistent." }
    ],
    explanation: "Init Duration appears in the REPORT line only after a cold start. Provisioned concurrency keeps initialized environments ready and removes cold-start latency." },

  { id: "m01-004", topic: "lambda-limits", domain: 1,
    stem: "A company runs a nightly job that transforms data files. The job takes about 40 minutes. The company wants to run the job on serverless services. A developer plans to put the job in a Lambda function. Which solution will meet these requirements?",
    options: [
      { text: "Split the job into steps that each finish in less than 15 minutes, and use AWS Step Functions to run the steps.", correct: true,
        why: "One Lambda invocation can run for a maximum of 900 seconds. Smaller steps fit this limit, and Step Functions is a serverless way to run them in order." },
      { text: "Set the function timeout to 2,400 seconds.", correct: false,
        why: "The maximum function timeout is 900 seconds (15 minutes). Lambda does not accept 2,400 seconds, so the job cannot run in one invocation." },
      { text: "Request a Service Quotas increase for the function timeout.", correct: false,
        why: "The function timeout is a fixed limit that you cannot increase. The 40-minute job still does not fit in one invocation." },
      { text: "Invoke the function asynchronously so that the timeout does not apply.", correct: false,
        why: "The timeout applies to every invocation type. An asynchronous invocation also stops at 900 seconds." }
    ],
    explanation: "The maximum Lambda timeout is 900 seconds (15 minutes), and you cannot increase it. Split longer work into steps, for example with AWS Step Functions." },

  { id: "m01-005", topic: "lambda-limits", domain: 3,
    stem: "A developer builds a Python Lambda function. The .zip deployment package is 120 MB zipped and 230 MB unzipped. The developer uploads the .zip file directly with the AWS CLI, and the upload fails. The function must stay a .zip function. Which solution will meet these requirements?",
    options: [
      { text: "Upload the .zip file to an Amazon S3 bucket, and update the function code from the S3 object.", correct: true,
        why: "A direct upload is limited to 50 MB zipped. An upload through Amazon S3 can be larger, and the 230 MB unzipped size is below the 250 MB limit." },
      { text: "Split the dependencies into six Lambda layers.", correct: false,
        why: "A function can use a maximum of 5 layers. Six layers are not allowed, so this does not solve the problem." },
      { text: "Rebuild the function as a container image.", correct: false,
        why: "A container image allows 10 GB, but the requirement is to keep the .zip package type. You also cannot change the package type of an existing function." },
      { text: "Increase the ephemeral storage of the function to 10,240 MB.", correct: false,
        why: "Ephemeral storage is the /tmp space at run time. It does not change the deployment package size limits." }
    ],
    explanation: "A .zip package that you upload directly is limited to 50 MB zipped. Upload larger packages through Amazon S3. The unzipped limit is 250 MB, including layers." },

  { id: "m01-006", topic: "lambda-invocation", domain: 1,
    stem: "An application uses the AWS SDK to start a Lambda function. The application must not wait for the function to finish. Lambda must retry the function automatically if the function returns an error. Which solution will meet these requirements?",
    options: [
      { text: "Call the Invoke API with InvocationType set to Event.", correct: true,
        why: "Event is an asynchronous invocation. Lambda queues the event, returns HTTP 202 at once, and retries function errors two times by default." },
      { text: "Call the Invoke API with InvocationType set to RequestResponse.", correct: false,
        why: "RequestResponse is synchronous. The application waits for the result, and Lambda does not retry errors, so both requirements fail." },
      { text: "Call the Invoke API with InvocationType set to DryRun.", correct: false,
        why: "DryRun only checks the parameters and the permission to invoke. The function does not run." },
      { text: "Create an event source mapping from the application to the function.", correct: false,
        why: "An event source mapping polls a supported source such as a queue or a stream. It cannot receive calls from application code." }
    ],
    explanation: "Set InvocationType to Event for an asynchronous invocation. Lambda returns HTTP 202, queues the event, and retries function errors." },

  { id: "m01-007", topic: "lambda-invocation", domain: 1,
    stem: "Amazon EventBridge invokes a Lambda function asynchronously to send price alerts to customers. An alert that is more than 15 minutes old has no value. If the function returns an error, Lambda must not run the same alert again, because a retry can send a duplicate message. Which actions should the developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "Set MaximumEventAgeInSeconds to 900 in the asynchronous invocation configuration.", correct: true,
        why: "Lambda discards events that are older than the maximum event age. 900 seconds is 15 minutes." },
      { text: "Set MaximumRetryAttempts to 0 in the asynchronous invocation configuration.", correct: true,
        why: "With 0 retry attempts, Lambda does not run an event again after a function error, so no duplicate alert is sent." },
      { text: "Set the function timeout to 900 seconds.", correct: false,
        why: "The timeout limits the run time of one invocation. It does not discard events that wait in the queue for more than 15 minutes." },
      { text: "Set the reserved concurrency of the function to 0.", correct: false,
        why: "Reserved concurrency of 0 stops all invocations. No alerts are sent at all, which fails the purpose of the function." },
      { text: "Turn on BisectBatchOnFunctionError for the function.", correct: false,
        why: "BisectBatchOnFunctionError is a setting for stream event source mappings. It does not control asynchronous retries or event age." }
    ],
    explanation: "For asynchronous invocations, MaximumRetryAttempts (0 to 2) controls retries after function errors, and MaximumEventAgeInSeconds (up to 6 hours) discards old events." },

  { id: "m01-008", topic: "lambda-invocation", domain: 1,
    stem: "An Amazon S3 bucket sends object-created events to a Lambda function. The function adds one item to an Amazon DynamoDB billing table for each new object. The finance team finds a small number of duplicate items for the same object. The function logs show no errors. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Make the function idempotent. Use a DynamoDB conditional write that uses the object key and version as the item key.", correct: true,
        why: "Asynchronous delivery is at least once, so the same event can arrive more than one time without errors. A conditional write ignores the repeated event." },
      { text: "Set MaximumRetryAttempts to 0 for the function.", correct: false,
        why: "The logs show no errors, so retries after errors do not cause the duplicates. The queue can deliver an event twice even without errors." },
      { text: "Set the reserved concurrency of the function to 1.", correct: false,
        why: "One concurrent execution does not stop duplicate delivery. It only reduces throughput, so duplicates continue." },
      { text: "Replace the event notification with an S3 Lifecycle rule that invokes the function.", correct: false,
        why: "S3 Lifecycle rules transition or expire objects. They do not invoke Lambda functions." }
    ],
    explanation: "Lambda can deliver the same asynchronous event more than one time, even with no errors. Make the function code idempotent." },

  { id: "m01-009", topic: "lambda-destinations", domain: 1,
    stem: "Amazon S3 invokes a Lambda function asynchronously. When the function succeeds, its result must go to an Amazon EventBridge event bus so that other teams can use it. The developer must not add code that calls EventBridge. Which solution will meet these requirements?",
    options: [
      { text: "Configure an on-success destination that is the EventBridge event bus.", correct: true,
        why: "An on-success destination sends a record with the function response for each successful asynchronous invocation. No code change is needed." },
      { text: "Configure a dead-letter queue that is the EventBridge event bus.", correct: false,
        why: "A dead-letter queue receives only failed events, and it supports only an SQS queue or an SNS topic." },
      { text: "Configure an on-failure destination that is the EventBridge event bus.", correct: false,
        why: "An on-failure destination receives records only for failed invocations. Successful results do not go to the event bus." },
      { text: "Create an event source mapping from the EventBridge event bus to the function.", correct: false,
        why: "This connects the bus as an input to the function, not as an output. Event source mappings also do not support EventBridge as a source." }
    ],
    explanation: "Destinations route asynchronous invocation records. On-success sends the result of successful invocations without extra code." },

  { id: "m01-010", topic: "lambda-destinations", domain: 1,
    stem: "Amazon SNS invokes a Lambda function asynchronously. When an event fails after all retries, the operations team needs one record in an Amazon SQS standard queue. The record must contain the original event, the error message, and the number of attempts. Which solution will meet these requirements?",
    options: [
      { text: "Configure an on-failure destination that is the SQS queue.", correct: true,
        why: "The on-failure record contains the request payload, the response with the error, and approximateInvokeCount. It has all the required data in one record." },
      { text: "Configure the SQS queue as the dead-letter queue of the function.", correct: false,
        why: "A dead-letter queue receives the original event with RequestID, ErrorCode, and ErrorMessage attributes. It does not include the number of attempts." },
      { text: "Configure an on-success destination that is the SQS queue.", correct: false,
        why: "An on-success destination receives records only for successful invocations. Failed events do not go to the queue." },
      { text: "Change the queue to an SQS FIFO queue and configure it as the on-failure destination.", correct: false,
        why: "Lambda does not support FIFO queues as destinations. Delivery fails, so the team gets no records." }
    ],
    explanation: "An on-failure destination record includes the request, the response or error, and the attempt count. A dead-letter queue includes only the event and a few attributes." },

  { id: "m01-011", topic: "lambda-destinations", domain: 4,
    stem: "A developer configures an Amazon SQS standard queue as the on-failure destination for an asynchronously invoked Lambda function. The queue is not encrypted. Failed events do not arrive in the queue, and the DestinationDeliveryFailures metric for the function increases. Which solution will resolve this issue?",
    options: [
      { text: "Add the sqs:SendMessage permission for the queue to the function execution role.", correct: true,
        why: "Lambda uses the execution role to write records to a destination. Without sqs:SendMessage, delivery fails and DestinationDeliveryFailures increases." },
      { text: "Add a statement to the function resource-based policy that allows sqs.amazonaws.com to invoke the function.", correct: false,
        why: "A resource-based policy controls who can invoke the function. The problem is that the function cannot write to the queue." },
      { text: "Increase MaximumRetryAttempts to 2.", correct: false,
        why: "More retries happen before delivery. Delivery to the queue still fails because of the missing permission." },
      { text: "Change the destination to an SQS FIFO queue.", correct: false,
        why: "Lambda does not support FIFO queues as destinations. This change also causes delivery failures." }
    ],
    explanation: "The execution role must allow the write to the destination (for SQS, sqs:SendMessage). Failed deliveries increase the DestinationDeliveryFailures metric." },

  { id: "m01-012", topic: "lambda-esm", domain: 4,
    stem: "A Lambda function processes messages from an Amazon SQS standard queue through an event source mapping. The function timeout is 60 seconds, and the queue visibility timeout is 60 seconds. Under high load, some messages are processed two times. Which change follows AWS recommendations and reduces the duplicate processing?",
    options: [
      { text: "Set the queue visibility timeout to at least 360 seconds.", correct: true,
        why: "AWS recommends a visibility timeout of at least 6 times the function timeout. Messages then stay hidden while Lambda processes and retries a batch." },
      { text: "Set the function timeout to 120 seconds.", correct: false,
        why: "The function timeout must not be more than the visibility timeout. Lambda returns an error for this configuration, and the ratio gets worse." },
      { text: "Set maxReceiveCount on the queue redrive policy to 1.", correct: false,
        why: "Messages move to the dead-letter queue after one receive. Messages that could succeed on a retry are not processed, and the cause of duplicates stays." },
      { text: "Turn on content-based deduplication on the queue.", correct: false,
        why: "Content-based deduplication is a feature of FIFO queues only. This queue is a standard queue." }
    ],
    explanation: "Set the SQS visibility timeout to at least 6 times the function timeout (plus the batch window). A short visibility timeout makes messages visible again while they are still in progress." },

  { id: "m01-013", topic: "lambda-esm", domain: 1,
    stem: "A Lambda function processes batches of 10 messages from an Amazon SQS standard queue. When one message in a batch fails, all 10 messages return to the queue, and the successful messages are processed again. Messages that fail five times must move to a separate queue for review. Which actions should the developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "Turn on ReportBatchItemFailures for the event source mapping, and return the IDs of failed messages in batchItemFailures.", correct: true,
        why: "With a partial batch response, only the failed messages become visible again. Successful messages are deleted and not processed again." },
      { text: "Configure a redrive policy on the source queue with a dead-letter queue and a maxReceiveCount of 5.", correct: true,
        why: "For an SQS event source, the source queue moves a message to its dead-letter queue after the maximum number of receives." },
      { text: "Configure an on-failure destination in the asynchronous invocation configuration of the function.", correct: false,
        why: "Asynchronous invocation settings do not apply to messages from an SQS event source mapping. Failed messages do not move to the separate queue." },
      { text: "Turn on BisectBatchOnFunctionError for the event source mapping.", correct: false,
        why: "BisectBatchOnFunctionError is for Kinesis and DynamoDB Streams sources. It does not stop the reprocessing of successful SQS messages." },
      { text: "Configure a dead-letter queue on the Lambda function.", correct: false,
        why: "A function dead-letter queue applies to asynchronous invocations. For an SQS source, configure the dead-letter queue on the source queue." }
    ],
    explanation: "For SQS sources, use ReportBatchItemFailures to return only the failed messages, and use a redrive policy on the source queue to move repeated failures to a dead-letter queue." },

  { id: "m01-014", topic: "lambda-esm", domain: 4,
    stem: "A Lambda function processes records from an Amazon Kinesis data stream. One malformed record makes the function throw an error. Since then, the IteratorAge metric keeps increasing, and no new records from that shard are processed. The developer must continue to process the other records and must keep information about the failed batch for later review. Which actions should the developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "Turn on BisectBatchOnFunctionError, and set MaximumRetryAttempts to a small number on the event source mapping.", correct: true,
        why: "Lambda splits the failed batch to isolate the bad record, and the retry limit stops the endless retries that block the shard." },
      { text: "Configure an on-failure destination, such as an SQS queue, on the event source mapping.", correct: true,
        why: "When Lambda stops retrying, it sends information about the failed batch to the on-failure destination for later review." },
      { text: "Increase the function timeout to 900 seconds.", correct: false,
        why: "The record fails because it is malformed, not because of time. The shard stays blocked." },
      { text: "Configure a redrive policy with a dead-letter queue on the Kinesis data stream.", correct: false,
        why: "Kinesis data streams do not have redrive policies. Redrive policies are a feature of SQS queues." },
      { text: "Increase the batch size to 10,000 records.", correct: false,
        why: "A bigger batch still contains the bad record. The batch still fails, and more good records wait behind it." }
    ],
    explanation: "By default, a stream batch is retried until the records expire, which blocks the shard. Use BisectBatchOnFunctionError, a retry or age limit, and an on-failure destination." },

  { id: "m01-015", topic: "lambda-esm", domain: 1,
    stem: "Three Amazon SQS queues use event source mappings to invoke one Lambda function. The function has a reserved concurrency of 100. When one queue has a large backlog, messages from the other two queues wait a long time. Each queue must use a maximum of 30 concurrent invocations. Which solution will meet these requirements?",
    options: [
      { text: "Set the maximum concurrency of each SQS event source mapping to 30.", correct: true,
        why: "Maximum concurrency limits the concurrent invocations of one event source. Each queue gets at most 30, and the total of 90 fits within the reserved concurrency of 100." },
      { text: "Set the reserved concurrency of the function to 30.", correct: false,
        why: "Reserved concurrency limits the whole function to 30. All three queues share the 30, so one queue can still use all of it." },
      { text: "Set the batch size of each event source mapping to 30.", correct: false,
        why: "Batch size controls how many messages each invocation gets. It does not limit the number of concurrent invocations for each queue." },
      { text: "Configure provisioned concurrency of 30 for the function.", correct: false,
        why: "Provisioned concurrency initializes environments in advance. It does not limit how much concurrency one queue uses." }
    ],
    explanation: "SQS event source mappings have a maximum concurrency setting (2 to 1,000) for each queue. It is separate from reserved concurrency, which applies to the whole function." },

  { id: "m01-016", topic: "lambda-concurrency", domain: 1,
    stem: "A Lambda function writes to an Amazon RDS database that accepts a maximum of 50 concurrent connections. Each invocation opens one connection. During traffic spikes, the database rejects connections. The developer must stop the function from using more than 50 connections at the same time without changing code. Which solution will meet these requirements?",
    options: [
      { text: "Set the reserved concurrency of the function to 50.", correct: true,
        why: "Reserved concurrency is a maximum for the function. At most 50 invocations run at the same time, so at most 50 connections open." },
      { text: "Set the provisioned concurrency of the function alias to 50.", correct: false,
        why: "Provisioned concurrency is not a maximum. When traffic goes above 50, extra requests use on-demand concurrency and open more connections." },
      { text: "Reduce the function timeout to 5 seconds.", correct: false,
        why: "A shorter timeout does not limit the number of concurrent invocations. A spike can still open more than 50 connections." },
      { text: "Request an increase of the account concurrency quota.", correct: false,
        why: "A higher quota allows more concurrent invocations, which opens more connections, not fewer." }
    ],
    explanation: "Reserved concurrency sets a maximum number of concurrent executions for a function. Use it to protect a downstream system with limited capacity." },

  { id: "m01-017", topic: "lambda-concurrency", domain: 4,
    stem: "An account runs many Lambda functions in one Region with the default concurrency quota. During a marketing event, a payment function that Amazon API Gateway invokes returns HTTP 429 errors. At the same time, a batch function in the same account runs with very high concurrency. The payment function must always be able to scale to 200 concurrent executions at the lowest cost. Which solution will meet these requirements?",
    options: [
      { text: "Set the reserved concurrency of the payment function to 200.", correct: true,
        why: "Reserved concurrency keeps 200 executions for the payment function only, so other functions cannot use them. Reserved concurrency has no extra charge." },
      { text: "Configure provisioned concurrency of 200 on an alias of the payment function.", correct: false,
        why: "Provisioned concurrency also sets aside capacity, but you pay for it even when it is idle. It fails the lowest-cost requirement." },
      { text: "Increase the memory of the payment function.", correct: false,
        why: "Memory does not change how much of the shared concurrency pool the payment function can get. The 429 errors continue." },
      { text: "Set MaximumRetryAttempts to 0 on the batch function.", correct: false,
        why: "Retry settings do not limit the concurrency of the batch function. It can still use the shared pool." }
    ],
    explanation: "A 429 TooManyRequestsException means the function cannot get concurrency. Reserved concurrency guarantees capacity for a critical function at no extra charge." },

  { id: "m01-018", topic: "lambda-concurrency", domain: 4,
    stem: "A Lambda function behind Amazon API Gateway gets a sharp rise in traffic every weekday from 9:00 AM to 10:00 AM. During that hour, some customers see slow responses because of cold starts. The developer wants to remove these cold starts and does not want to pay for initialized capacity at other times. Which solution will meet these requirements?",
    options: [
      { text: "Configure provisioned concurrency on a function alias, and use Application Auto Scaling scheduled actions to increase it before 9:00 AM and remove it after 10:00 AM.", correct: true,
        why: "Provisioned concurrency removes cold starts, and scheduled scaling pays for it only during the busy hour." },
      { text: "Set reserved concurrency for the function before 9:00 AM.", correct: false,
        why: "Reserved concurrency does not initialize environments in advance. Cold starts continue." },
      { text: "Configure provisioned concurrency on the $LATEST version.", correct: false,
        why: "Lambda does not allow provisioned concurrency on $LATEST. You must use a published version or an alias." },
      { text: "Keep a fixed provisioned concurrency on the alias for 24 hours each day.", correct: false,
        why: "Fixed provisioned concurrency removes cold starts, but you pay for it all day. It fails the requirement to not pay at other times." }
    ],
    explanation: "Provisioned concurrency removes cold starts at extra cost. Use Application Auto Scaling (scheduled or target tracking) to change it with demand." },

  { id: "m01-019", topic: "lambda-concurrency", domain: 1,
    stem: "Amazon API Gateway invokes a Lambda function by its unqualified ARN. The developer tries to add provisioned concurrency to the function, and the request fails. All API traffic must use the provisioned concurrency. Which actions should the developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "Publish a version, create an alias that points to it, and configure provisioned concurrency on the alias.", correct: true,
        why: "Provisioned concurrency is allowed only on a published version or an alias. An unqualified ARN invokes $LATEST, which cannot have provisioned concurrency." },
      { text: "Update the API Gateway integration to invoke the alias ARN.", correct: true,
        why: "Only invocations of the alias use its provisioned concurrency. API Gateway must call the alias, not the unqualified ARN." },
      { text: "Configure provisioned concurrency with the qualifier $LATEST.", correct: false,
        why: "Lambda does not allow provisioned concurrency on $LATEST. The request fails again." },
      { text: "Set the reserved concurrency of the function to 0 before you add provisioned concurrency.", correct: false,
        why: "Reserved concurrency of 0 stops all invocations. Provisioned concurrency cannot be more than reserved concurrency, so this also blocks the setup." },
      { text: "Turn on SnapStart together with provisioned concurrency on the function.", correct: false,
        why: "SnapStart does not support provisioned concurrency. It does not fix the request that failed." }
    ],
    explanation: "Configure provisioned concurrency on a published version or an alias, never on $LATEST. Callers must invoke that version or alias to use it." },

  { id: "m01-020", topic: "lambda-versions", domain: 3,
    stem: "A team deploys a Lambda function with an AWS SAM template. Each new release must get 10 percent of traffic for 10 minutes, and then all traffic. If a CloudWatch error alarm goes off during the deployment, traffic must return to the previous version automatically. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Add AutoPublishAlias and a DeploymentPreference with Type Canary10Percent10Minutes and the alarm in Alarms.", correct: true,
        why: "SAM uses CodeDeploy to shift 10 percent of traffic, then the rest after 10 minutes. CodeDeploy rolls back when a listed alarm goes off." },
      { text: "Add AutoPublishAlias and a DeploymentPreference with Type Linear10PercentEvery10Minutes and the alarm in Alarms.", correct: false,
        why: "Linear shifts 10 percent every 10 minutes, so full traffic takes 100 minutes. It fails the requirement to shift all traffic after 10 minutes." },
      { text: "Run update-alias with a 10 percent routing weight, wait 10 minutes, and then run update-alias to move all traffic.", correct: false,
        why: "This is manual work, and nothing rolls back automatically when the alarm goes off. It fails the least overhead and automatic rollback requirements." },
      { text: "Add AutoPublishAlias and a DeploymentPreference with Type AllAtOnce.", correct: false,
        why: "AllAtOnce moves all traffic at the same time. It fails the requirement to send only 10 percent first." }
    ],
    explanation: "SAM AutoPublishAlias with DeploymentPreference uses CodeDeploy to shift alias traffic. Canary shifts in two steps, linear in equal steps, and alarms trigger rollback." },

  { id: "m01-021", topic: "lambda-versions", domain: 3,
    stem: "A developer runs the update-alias command to send 10 percent of the traffic of the live alias to a second function version. Lambda rejects the request. Which conditions could cause Lambda to reject the weighted alias configuration? (Choose two.)",
    options: [
      { text: "The additional version is $LATEST.", correct: true,
        why: "Both versions in a weighted alias must be published versions. An alias cannot route to $LATEST." },
      { text: "The two versions use different execution roles.", correct: true,
        why: "Both versions in a weighted alias must have the same execution role." },
      { text: "The two versions have different memory settings.", correct: false,
        why: "Memory can be different between the versions. It is not a requirement for weighted aliases." },
      { text: "The two versions have different environment variable values.", correct: false,
        why: "Environment variables can be different between the versions. It is not a requirement for weighted aliases." },
      { text: "The two versions have different timeout settings.", correct: false,
        why: "The timeout can be different between the versions. It is not a requirement for weighted aliases." }
    ],
    explanation: "A weighted alias points to a maximum of two published versions. Both must have the same execution role and the same dead-letter queue configuration." },

  { id: "m01-022", topic: "lambda-versions", domain: 4,
    stem: "A weighted alias sends 20 percent of traffic to version 6 and 80 percent to version 5 of a Lambda function. The Errors metric for the alias increases. The developer must find out which version causes the errors. Which solution will meet these requirements?",
    options: [
      { text: "View the alias Errors metric in CloudWatch, split by the ExecutedVersion dimension.", correct: true,
        why: "For alias invocations, the ExecutedVersion dimension shows metrics for each version that ran, so the errors are visible for each version." },
      { text: "View the CloudWatch metrics for $LATEST.", correct: false,
        why: "Requests through the alias run versions 5 and 6, not $LATEST. The $LATEST metrics do not show these errors." },
      { text: "View the alias configuration in the Lambda console.", correct: false,
        why: "The alias configuration shows the routing weights. It does not show which version returned errors." },
      { text: "Change the X-Ray sampling rate for the function to 100 percent.", correct: false,
        why: "You cannot change the X-Ray sampling rate for Lambda functions. The change is not possible." }
    ],
    explanation: "With a weighted alias, use the ExecutedVersion metric dimension, the version in the START log line, or the x-amz-executed-version response header to find the version that ran." },

  { id: "m01-023", topic: "lambda-versions", domain: 3,
    stem: "A team uses AWS SAM and AWS CodeDeploy for gradual Lambda deployments. Before any production traffic moves to a new version, the team must run integration tests against that version. If the tests fail, the deployment must stop. Which solution will meet these requirements?",
    options: [
      { text: "Add a PreTraffic hook function to the DeploymentPreference. The function runs the tests and reports success or failure to CodeDeploy.", correct: true,
        why: "CodeDeploy runs the PreTraffic hook before any traffic shifts. A failure report stops the deployment." },
      { text: "Add a PostTraffic hook function to the DeploymentPreference.", correct: false,
        why: "The PostTraffic hook runs after traffic shifting completes. Production traffic already reaches the new version, so it fails the requirement." },
      { text: "Add a CloudWatch alarm to the Alarms list of the DeploymentPreference.", correct: false,
        why: "An alarm reacts to metrics while traffic shifts. It does not run tests before the new version gets traffic." },
      { text: "Configure an on-success destination that invokes a test function.", correct: false,
        why: "Destinations send records of asynchronous invocations. They do not control CodeDeploy traffic shifting." }
    ],
    explanation: "In a SAM DeploymentPreference, the PreTraffic hook runs before traffic shifts, and the PostTraffic hook runs after. Each hook reports success or failure to CodeDeploy." },

  { id: "m01-024", topic: "lambda-packaging", domain: 3,
    stem: "Five Python Lambda functions, deployed as .zip archives, use the same internal library. The team must update the library in one place, and each deployment package must stay small. Which solution will meet these requirements?",
    options: [
      { text: "Publish the library as a Lambda layer, and add the layer version to each function.", correct: true,
        why: "A layer shares dependencies between functions. You update the library in one layer, and the function packages do not contain it." },
      { text: "Copy the library into the deployment package of each function.", correct: false,
        why: "Each package gets bigger, and the team must update the library in five places." },
      { text: "Store the library code in an environment variable.", correct: false,
        why: "Environment variables are limited to 4 KB in total, and they are not a way to load a code library." },
      { text: "Store the library in the /tmp directory of one function.", correct: false,
        why: "Each execution environment has its own /tmp. Other functions cannot read it, and the content does not persist." }
    ],
    explanation: "Layers are .zip archives that Lambda extracts to /opt. Use them to share libraries between .zip functions. A function can use up to 5 layers." },

  { id: "m01-025", topic: "lambda-packaging", domain: 3,
    stem: "A Lambda function is deployed as a container image. The function must use a monitoring library that another team publishes as a Lambda layer. When the developer tries to add the layer to the function, the update fails. Which solution will meet these requirements?",
    options: [
      { text: "Add the library to the container image in the Dockerfile, and deploy the new image.", correct: true,
        why: "Container image functions do not support layers. You put dependencies in the image itself." },
      { text: "Remove other layers so that the function uses fewer than 5 layers.", correct: false,
        why: "The layer count does not cause the failure. Container image functions cannot use layers at all." },
      { text: "Reference the layer by an alias instead of a version number.", correct: false,
        why: "Functions refer to an exact layer version ARN. This does not change the fact that container image functions cannot use layers." },
      { text: "Change the package type of the existing function to .zip, and then add the layer.", correct: false,
        why: "You cannot change the package type of an existing function. You must create a new function." }
    ],
    explanation: "Layers work only with .zip functions. For a container image function, build all dependencies into the image." },

  { id: "m01-026", topic: "lambda-packaging", domain: 3,
    stem: "A developer uses AWS SAM. Before deployment, the developer wants to run a function on the local computer with a saved Amazon S3 event JSON file. Which command will meet this requirement?",
    options: [
      { text: "sam local invoke with the -e option and the event file", correct: true,
        why: "sam local invoke runs the function locally in a container, and -e passes the saved event file to it." },
      { text: "sam deploy --guided", correct: false,
        why: "sam deploy sends the application to AWS. It does not run the function on the local computer." },
      { text: "sam sync", correct: false,
        why: "sam sync sends changes to a stack in AWS. It does not run the function locally." },
      { text: "sam logs", correct: false,
        why: "sam logs gets log output from a function that is deployed in AWS. It does not run the function." }
    ],
    explanation: "Use sam local invoke -e event.json to test a function locally with a test event. Use sam local start-api to run a local API." },

  { id: "m01-027", topic: "lambda-packaging", domain: 3,
    stem: "A developer deploys an AWS SAM template with the aws cloudformation deploy command. The template has an AWS::Serverless::Function resource with no Role property. The deployment fails with a RequiresCapabilities error. Which values must the developer add to the --capabilities option? (Choose two.)",
    options: [
      { text: "CAPABILITY_IAM", correct: true,
        why: "SAM creates an IAM execution role for the function. CloudFormation requires this capability to create IAM resources." },
      { text: "CAPABILITY_AUTO_EXPAND", correct: true,
        why: "The SAM transform is a macro. CloudFormation requires this capability to expand it." },
      { text: "--no-execute-changeset", correct: false,
        why: "This option creates a change set without running it. It does not acknowledge any capability, so the error stays." },
      { text: "--force-upload", correct: false,
        why: "This option uploads artifacts again. It does not acknowledge any capability, so the error stays." },
      { text: "--disable-rollback", correct: false,
        why: "This option keeps resources after a failure. It does not acknowledge any capability, so the error stays." }
    ],
    explanation: "A SAM template deployed through CloudFormation needs CAPABILITY_AUTO_EXPAND for the transform and CAPABILITY_IAM when SAM creates a role." },

  { id: "m01-028", topic: "lambda-security", domain: 2,
    stem: "A developer must allow one Amazon S3 bucket in the same account to invoke a Lambda function when objects are created. The permission must follow the principle of least privilege. Which solution will meet these requirements?",
    options: [
      { text: "Add a statement to the function resource-based policy that allows s3.amazonaws.com the lambda:InvokeFunction action, with an aws:SourceArn condition for the bucket.", correct: true,
        why: "A resource-based policy controls who can invoke the function. The SourceArn condition limits the permission to the one bucket." },
      { text: "Add s3:* permissions to the function execution role.", correct: false,
        why: "The execution role controls what the function can do. It does not give Amazon S3 permission to invoke the function." },
      { text: "Attach the AWSLambdaBasicExecutionRole managed policy to the execution role.", correct: false,
        why: "This policy lets the function write logs. It does not let Amazon S3 invoke the function." },
      { text: "Add a statement to the function resource-based policy that allows Principal \"*\" the lambda:InvokeFunction action.", correct: false,
        why: "Any principal could then invoke the function. It fails the least privilege requirement." }
    ],
    explanation: "Services such as Amazon S3 and Amazon SNS need permission in the function resource-based policy. Limit it with aws:SourceArn or aws:SourceAccount." },

  { id: "m01-029", topic: "lambda-security", domain: 2,
    stem: "A Lambda function connects to an Amazon RDS database. The database password must be stored encrypted, must rotate automatically every 30 days, and must be read at run time. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Store the password in AWS Secrets Manager with automatic rotation. Read it at run time with GetSecretValue, and allow the execution role to read the secret.", correct: true,
        why: "Secrets Manager stores secrets encrypted and has built-in rotation for Amazon RDS. The function reads the current value at run time." },
      { text: "Store the password in an environment variable that is encrypted with a customer managed AWS KMS key.", correct: false,
        why: "The value is encrypted, but nothing rotates the password automatically. It fails the rotation requirement." },
      { text: "Put the password in a configuration file in a Lambda layer.", correct: false,
        why: "The password is not stored encrypted and does not rotate. Each change also needs a new layer version." },
      { text: "Store the password in an Amazon S3 object with server-side encryption, and write a scheduled script to change it.", correct: false,
        why: "You must build and run the rotation yourself. It fails the least operational overhead requirement." }
    ],
    explanation: "AWS recommends AWS Secrets Manager for database credentials. It encrypts secrets and rotates them automatically." },

  { id: "m01-030", topic: "lambda-security", domain: 2,
    stem: "A Lambda function reads an API key from an environment variable. Security policy requires that the value is encrypted with a customer managed AWS KMS key before Lambda stores it, so that the plaintext value does not appear in the Lambda console. Which actions should the developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "Turn on the encryption helpers for encryption in transit, and encrypt the variable with the customer managed key.", correct: true,
        why: "Encryption helpers encrypt the value on the client side before Lambda stores it. The console then shows only the encrypted value." },
      { text: "Add code that calls the AWS KMS Decrypt operation, and allow kms:Decrypt on the key in the execution role.", correct: true,
        why: "The function receives the encrypted value. The code must decrypt it, and the execution role needs permission to use the key." },
      { text: "Select the customer managed key only for encryption at rest.", correct: false,
        why: "Encryption at rest is server-side. Users with access to the key still see the plaintext value in the console, so it fails the requirement." },
      { text: "Add kms:Decrypt to the function resource-based policy.", correct: false,
        why: "The resource-based policy controls who can invoke the function. The function uses its execution role to call AWS KMS." },
      { text: "Store the value in the reserved environment variable AWS_SECRET_ACCESS_KEY.", correct: false,
        why: "Lambda reserves this key and you cannot set it. It also does not encrypt the value." }
    ],
    explanation: "Lambda always encrypts environment variables at rest. For client-side encryption, use the encryption helpers, decrypt in code, and allow kms:Decrypt in the execution role." },

  { id: "m01-031", topic: "lambda-security", domain: 2,
    stem: "A service in the same AWS account must call a Lambda function over HTTPS. Only IAM principals in the account can be allowed to call it. The team does not need API features such as usage plans or request validation, and wants the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Create a function URL with AuthType AWS_IAM. Allow lambda:InvokeFunctionUrl and lambda:InvokeFunction for the calling role, and sign requests with SigV4.", correct: true,
        why: "A function URL gives a built-in HTTPS endpoint. AWS_IAM authentication allows only signed requests from principals with permission." },
      { text: "Create a function URL with AuthType NONE.", correct: false,
        why: "AuthType NONE allows public, unauthenticated access. It fails the requirement to allow only IAM principals." },
      { text: "Create an Amazon API Gateway REST API with IAM authorization and a Lambda integration.", correct: false,
        why: "This meets the security requirement, but you must create and manage an API, stages, and deployments. It fails the least overhead requirement." },
      { text: "Attach the function to a VPC and allow the calling service in a security group.", correct: false,
        why: "A VPC attachment does not create an HTTPS endpoint for the function, and security groups do not check IAM identity." }
    ],
    explanation: "A function URL is a dedicated HTTPS endpoint. With AuthType AWS_IAM, callers sign requests and need lambda:InvokeFunctionUrl and lambda:InvokeFunction." },

  { id: "m01-032", topic: "lambda-vpc", domain: 1,
    stem: "A Lambda function is attached to private subnets in a VPC to reach an Amazon RDS instance. The function must also call a third-party HTTPS API on the internet. The calls to the API time out. Which solution will meet these requirements?",
    options: [
      { text: "Create a NAT gateway in a public subnet, and add a route from the private subnets to the NAT gateway for internet traffic.", correct: true,
        why: "A function in a VPC can reach the internet only through the VPC. A NAT gateway gives the private subnets outbound internet access." },
      { text: "Move the function to a public subnet of the same VPC.", correct: false,
        why: "A public subnet does not give a Lambda function internet access or a public IP address. The calls still time out." },
      { text: "Create a gateway VPC endpoint for the third-party API.", correct: false,
        why: "Gateway endpoints support only Amazon S3 and DynamoDB. They cannot reach a third-party API." },
      { text: "Increase the function timeout to 900 seconds.", correct: false,
        why: "The calls fail because there is no route to the internet. More time does not create a route." }
    ],
    explanation: "When a function is attached to a VPC, it reaches only what the VPC can reach. For internet access, route private subnets to a NAT gateway." },

  { id: "m01-033", topic: "lambda-vpc", domain: 1,
    stem: "A Lambda function runs in private subnets so that it can reach a private Amazon ElastiCache cluster. The function must also write items to an Amazon DynamoDB table. Company policy forbids traffic through the internet, and the team wants the lowest cost. Which solution will meet these requirements?",
    options: [
      { text: "Create a gateway VPC endpoint for DynamoDB, and add it to the route tables of the private subnets.", correct: true,
        why: "A gateway endpoint sends DynamoDB traffic over the AWS network without the internet, and it has no extra charge." },
      { text: "Create a NAT gateway and route DynamoDB traffic through it.", correct: false,
        why: "Traffic goes to the public DynamoDB endpoint through the internet path, and the NAT gateway has hourly charges. It fails both requirements." },
      { text: "Create an interface VPC endpoint for DynamoDB.", correct: false,
        why: "This keeps traffic private, but interface endpoints have hourly and data charges. The gateway endpoint costs less." },
      { text: "Remove the VPC configuration from the function.", correct: false,
        why: "The function then cannot reach the private ElastiCache cluster. It fails the requirement to stay in the VPC." }
    ],
    explanation: "Use VPC endpoints to reach AWS services from a VPC function without the internet. Gateway endpoints exist for Amazon S3 and DynamoDB." },

  { id: "m01-034", topic: "lambda-vpc", domain: 2,
    stem: "A developer updates an existing Lambda function to attach it to a VPC. The update fails with an error that the execution role does not have permission to call ec2:CreateNetworkInterface. Which solution will resolve the error and follow the principle of least privilege?",
    options: [
      { text: "Attach the AWSLambdaVPCAccessExecutionRole managed policy to the function execution role.", correct: true,
        why: "This policy contains only the EC2 network interface permissions that Lambda needs to connect the function to the VPC." },
      { text: "Add ec2:CreateNetworkInterface to the function resource-based policy.", correct: false,
        why: "The resource-based policy controls who can invoke the function. Lambda uses the execution role to create network interfaces." },
      { text: "Attach the AmazonEC2FullAccess managed policy to the function execution role.", correct: false,
        why: "This fixes the error but gives the function code full EC2 access. It fails the least privilege requirement." },
      { text: "Add ec2:CreateNetworkInterface to the IAM policy of the developer.", correct: false,
        why: "The error is about the execution role. Lambda uses that role, not the permissions of the developer, to create the network interfaces." }
    ],
    explanation: "A VPC function needs EC2 network interface permissions in its execution role. The AWSLambdaVPCAccessExecutionRole managed policy contains them." },

  { id: "m01-035", topic: "lambda-observability", domain: 4,
    stem: "A Lambda function is managed with AWS CloudFormation and has no tracing. A developer must see a service map and the latency of each AWS SDK call that the function makes to downstream services. Which actions should the developer take to meet these requirements? (Choose three.)",
    options: [
      { text: "Set TracingConfig Mode to Active on the function.", correct: true,
        why: "Active tracing makes Lambda send trace segments for sampled invocations to X-Ray, which builds the service map." },
      { text: "Allow xray:PutTraceSegments and xray:PutTelemetryRecords in the execution role, for example with AWSXRayDaemonWriteAccess.", correct: true,
        why: "The function needs these permissions to send trace data. CloudFormation does not add them automatically." },
      { text: "Instrument the AWS SDK clients in the code with the X-Ray SDK or AWS Distro for OpenTelemetry.", correct: true,
        why: "Instrumented clients record a subsegment for each downstream call, which shows the latency of each SDK call." },
      { text: "Set the X-Ray sampling rate of the function to 100 percent.", correct: false,
        why: "You cannot change the X-Ray sampling rate for Lambda functions, and sampling does not add subsegments for SDK calls." },
      { text: "Add a resource-based policy that allows xray.amazonaws.com to invoke the function.", correct: false,
        why: "X-Ray does not invoke the function. The function sends data to X-Ray with its execution role." },
      { text: "Change the log format of the function to JSON.", correct: false,
        why: "The log format changes CloudWatch Logs output. It does not create traces or a service map." }
    ],
    explanation: "For X-Ray, turn on active tracing, give the execution role X-Ray write permissions, and instrument SDK clients to record subsegments for downstream calls." },

  { id: "m01-036", topic: "lambda-observability", domain: 4,
    stem: "A developer uses AWS X-Ray with a Lambda function. The developer must find all traces for a specific customer ID with a filter expression in the console. Which solution will meet these requirements?",
    options: [
      { text: "Record the customer ID as an annotation in a subsegment.", correct: true,
        why: "X-Ray indexes annotations for filter expressions, so you can search traces by customer ID." },
      { text: "Record the customer ID as metadata in a subsegment.", correct: false,
        why: "X-Ray does not index metadata. You cannot use it in a filter expression." },
      { text: "Write the customer ID to the function log with a print statement.", correct: false,
        why: "Log output goes to CloudWatch Logs. It does not make traces searchable in X-Ray." },
      { text: "Add the customer ID as an environment variable.", correct: false,
        why: "An environment variable is the same for every invocation. It cannot identify the customer of each request." }
    ],
    explanation: "X-Ray annotations are indexed key-value pairs for filter expressions. Metadata is stored with the trace but is not indexed." },

  { id: "m01-037", topic: "lambda-observability", domain: 4,
    stem: "A Node.js Lambda function writes many DEBUG and INFO messages with console methods. CloudWatch Logs costs are high. The team wants Lambda to send only ERROR and FATAL application logs to CloudWatch Logs, without code changes. Which solution will meet these requirements?",
    options: [
      { text: "Set the function log format to JSON, and set the application log level to ERROR.", correct: true,
        why: "With JSON format, Lambda filters application logs by level. ERROR sends ERROR and FATAL messages only." },
      { text: "Keep the Text log format, and set the application log level to ERROR.", correct: false,
        why: "Log-level filtering needs the JSON log format. With Text format, Lambda does not filter by level." },
      { text: "Set the system log level to WARN.", correct: false,
        why: "The system log level filters the logs that Lambda creates, not the logs from the function code." },
      { text: "Set the log group retention to 1 day.", correct: false,
        why: "Retention deletes old logs. Lambda still sends all DEBUG and INFO messages, so it fails the requirement." }
    ],
    explanation: "Advanced logging controls filter logs by level only when the log format is JSON. Application levels are TRACE to FATAL, and system levels are DEBUG, INFO, and WARN." },

  { id: "m01-038", topic: "lambda-performance", domain: 4,
    stem: "A Java 21 Lambda function behind Amazon API Gateway has cold starts of about 6 seconds because of framework initialization. Traffic is not predictable. The team wants to reduce cold-start latency at the lowest cost. The function invocations can go through a published version or alias. Which solution will meet these requirements?",
    options: [
      { text: "Turn on SnapStart, publish a version, and invoke the function through that version or an alias.", correct: true,
        why: "SnapStart starts environments from a snapshot taken at publish time. It has no extra cost for Java runtimes." },
      { text: "Configure provisioned concurrency for the expected peak.", correct: false,
        why: "Provisioned concurrency removes cold starts, but you pay for it all the time. With unpredictable traffic, it fails the lowest-cost requirement." },
      { text: "Increase the function timeout.", correct: false,
        why: "A longer timeout does not make Init faster. Cold starts stay at 6 seconds." },
      { text: "Increase the ephemeral storage to 10,240 MB.", correct: false,
        why: "The size of /tmp does not change Init time. SnapStart also does not support ephemeral storage above 512 MB." }
    ],
    explanation: "SnapStart reduces cold starts for Java 11+, Python 3.12+, and .NET 8+. It works on published versions and aliases, with no extra cost for Java." },

  { id: "m01-039", topic: "lambda-performance", domain: 4,
    stem: "A CPU-bound image processing Lambda function has 512 MB of memory and runs for 8 seconds. The developer must find the memory setting with the lowest cost for each invocation that keeps the duration under 3 seconds. Which approach will meet these requirements?",
    options: [
      { text: "Run the function with several memory settings, measure duration and cost (for example, with AWS Lambda Power Tuning), and choose the lowest-cost setting under 3 seconds.", correct: true,
        why: "CPU increases with memory, so duration and cost change with each setting. A test shows the cheapest setting that meets the 3-second goal." },
      { text: "Set the memory to 128 MB to lower the price for each millisecond.", correct: false,
        why: "Less memory also gives less CPU. The CPU-bound function runs longer and fails the 3-second requirement." },
      { text: "Set the function CPU to 4 vCPUs in the function configuration.", correct: false,
        why: "Lambda has no CPU setting. CPU is set only through memory." },
      { text: "Configure provisioned concurrency for the function.", correct: false,
        why: "Provisioned concurrency removes cold starts only. It does not make CPU-bound processing faster, and it adds cost." }
    ],
    explanation: "Lambda allocates CPU in proportion to memory (one vCPU at 1,769 MB). Test several memory sizes to find the best mix of duration and cost." },

  { id: "m01-040", topic: "lambda-performance", domain: 1,
    stem: "A Python 3.13 Lambda function uses SnapStart. The initialization code creates a random seed that the function uses to make unique order IDs. After SnapStart was turned on, the team finds duplicate order IDs from different execution environments. Which solution will meet these requirements?",
    options: [
      { text: "Create the random seed after restore, in the handler or in an after-restore runtime hook.", correct: true,
        why: "Every environment restored from the same snapshot has the same Init state. A seed made after restore is different in each environment." },
      { text: "Increase the function memory.", correct: false,
        why: "Memory does not change the snapshot content. The seed stays the same in every restored environment." },
      { text: "Configure provisioned concurrency together with SnapStart.", correct: false,
        why: "SnapStart does not support provisioned concurrency, so this configuration is not possible." },
      { text: "Publish a new function version every hour.", correct: false,
        why: "All environments restored from each new snapshot still share one seed. Duplicates continue." }
    ],
    explanation: "With SnapStart, content made during Init is the same in every restored environment. Generate unique values after restore." }

] });
