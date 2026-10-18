window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "g-dev-practices", questions: [

  { id: "gdev-001", topic: "dev-sdk-retries", domain: 1,
    stem: "Thousands of IoT devices call an API at the same time after a short network outage. Each device retries a failed request after exactly 2 seconds. The retries arrive together and fail again. The developer must reduce the load spikes from retries. Which solution will meet these requirements?",
    options: [
      { text: "Retry with exponential backoff and add a random jitter to each wait.", correct: true,
        why: "Exponential backoff makes each wait longer, and jitter spreads the retries of many clients over time. The synchronized spikes stop." },
      { text: "Retry with exponential backoff and the same wait times on every device.", correct: false,
        why: "Without jitter, all devices that failed at the same moment still retry at the same moment. The load spikes continue." },
      { text: "Retry immediately in a loop until the request succeeds.", correct: false,
        why: "Immediate retries send more traffic at the worst time. This increases the load spikes instead of reducing them." },
      { text: "Increase the request timeout on each device to 60 seconds.", correct: false,
        why: "A longer timeout does not change when the retries start. The devices still retry together, so the spikes continue." }
    ],
    explanation: "Exponential backoff with jitter spreads retries from many clients. Without jitter, clients that fail together also retry together." },

  { id: "gdev-002", topic: "dev-sdk-retries", domain: 1,
    stem: "A Python application on Amazon EC2 uses the AWS SDK, configured for the standard retry mode. Calls to a downstream AWS service sometimes fail after three attempts during short throttling periods. The developer wants the SDK to make up to five attempts. The developer must not change the application code. Which solution will meet these requirements?",
    options: [
      { text: "Set the AWS_MAX_ATTEMPTS environment variable to 5 for the application.", correct: true,
        why: "AWS_MAX_ATTEMPTS sets the total number of attempts, including the first request. The SDK reads it at startup, so no code change is necessary." },
      { text: "Set the AWS_RETRY_MODE environment variable to adaptive.", correct: false,
        why: "Adaptive mode adds client-side rate limiting, but it does not change the number of attempts. The requirement for five attempts is not met." },
      { text: "Wrap each SDK call in a loop that retries the call two more times.", correct: false,
        why: "A retry loop is a code change, which the requirement does not allow." },
      { text: "Set the AWS_MAX_ATTEMPTS environment variable to 1.", correct: false,
        why: "A value of 1 means one attempt and no retries. This turns retries off, which is the opposite of the requirement." }
    ],
    explanation: "Max attempts counts the first request and the retries. Set it with AWS_MAX_ATTEMPTS, max_attempts in ~/.aws/config, or client configuration, without other code changes." },

  { id: "gdev-003", topic: "dev-sdk-retries", domain: 1,
    stem: "A batch job uses one SDK client to write millions of items to one Amazon DynamoDB table with provisioned capacity. The job often gets throttling errors. The developer wants the SDK to slow down the rate of all requests automatically when throttling occurs. Which solution will meet these requirements?",
    options: [
      { text: "Configure the SDK client to use the adaptive retry mode.", correct: true,
        why: "Adaptive mode adds a client-side rate limiter. After throttling responses, it delays new requests too, not only retries, so the client slows down automatically." },
      { text: "Configure the SDK client to use the standard retry mode.", correct: false,
        why: "Standard mode backs off retries, but it never delays the first attempt of a new request. The job does not slow its overall request rate." },
      { text: "Configure the SDK client to use the legacy retry mode.", correct: false,
        why: "Legacy mode is the older behavior of each SDK and has no client-side rate limiter. It does not slow down new requests." },
      { text: "Set max attempts to 1 for the SDK client.", correct: false,
        why: "A value of 1 turns off retries. Throttled writes fail at once, and the request rate does not slow down." }
    ],
    explanation: "Adaptive retry mode is standard mode plus a client-side rate limiter. It suits a client that sends to one resource and gets frequent throttling." },

  { id: "gdev-004", topic: "dev-sdk-retries", domain: 4,
    stem: "A developer reviews CloudWatch logs for an application that uses the AWS SDK with default retry settings. The developer wants to know which errors the SDK already retries automatically, so the application code does not need extra retry logic for them. Which errors will the SDK retry automatically? (Choose two.)",
    options: [
      { text: "A ThrottlingException from the service.", correct: true,
        why: "ThrottlingException is a throttling error. The SDK retries throttling errors with backoff." },
      { text: "An HTTP 503 Service Unavailable response.", correct: true,
        why: "HTTP 500, 502, 503, and 504 responses are transient errors. The SDK retries them." },
      { text: "An AccessDeniedException from the service.", correct: false,
        why: "AccessDeniedException is a client error. A retry gets the same result, so the SDK returns it at once. The fix is a permission change." },
      { text: "A ValidationException from the service.", correct: false,
        why: "ValidationException means that the request is not valid. The SDK does not retry it, because the request must change first." },
      { text: "A ConditionalCheckFailedException from DynamoDB.", correct: false,
        why: "A failed condition is an expected result of the request. The SDK does not retry it, because a retry gets the same result." }
    ],
    explanation: "The SDK retries transient errors (timeouts, HTTP 500, 502, 503, 504) and throttling errors. It returns other client errors at once." },

  { id: "gdev-005", topic: "dev-sdk-retries", domain: 1,
    stem: "A latency-sensitive service calls an AWS API through the AWS SDK. If a call fails, the service must return an error to its caller at once and use a cached value. The SDK must not retry the call. Which solution will meet these requirements?",
    options: [
      { text: "Set max attempts to 1 in the SDK client configuration.", correct: true,
        why: "Max attempts includes the first request. A value of 1 means one attempt and no retries, so the error returns at once." },
      { text: "Set the retry mode to adaptive in the SDK client configuration.", correct: false,
        why: "Adaptive mode still retries, and it can also delay requests. This adds latency, which fails the requirement." },
      { text: "Set the retry mode to legacy in the SDK client configuration.", correct: false,
        why: "Legacy mode still retries failed requests. The error does not return at once." },
      { text: "Set max attempts to 3 in the SDK client configuration.", correct: false,
        why: "A value of 3 means one request and up to two retries. The SDK still retries, which fails the requirement." }
    ],
    explanation: "Max attempts counts the first request. Set it to 1 to turn off SDK retries for a fail-fast design." },

  { id: "gdev-006", topic: "dev-sdk-errors", domain: 4,
    stem: "An application calls the Lambda Invoke API synchronously through the AWS SDK. During traffic peaks, some calls fail with TooManyRequestsException and HTTP status code 429. The developer must handle these errors without losing requests. Which solution will meet these requirements?",
    options: [
      { text: "Keep SDK retries turned on, and retry the failed calls with exponential backoff.", correct: true,
        why: "TooManyRequestsException is a throttling error. A retry after a wait can succeed when concurrency is free again, so no request is lost." },
      { text: "Log the error and discard the request.", correct: false,
        why: "Throttling is temporary. Discarding the request loses it, which fails the requirement." },
      { text: "Retry each failed call immediately in a tight loop.", correct: false,
        why: "Immediate retries add load while the function is throttled. They are likely to fail again and make the throttling worse." },
      { text: "Add the lambda:InvokeFunction permission to the caller's IAM policy.", correct: false,
        why: "A missing permission causes an access denied error, not HTTP 429. The caller already has permission, so this changes nothing." }
    ],
    explanation: "HTTP 429 and TooManyRequestsException mean throttling. Retry with exponential backoff, and raise the concurrency if throttling continues." },

  { id: "gdev-007", topic: "dev-sdk-errors", domain: 1,
    stem: "A Lambda function records each payment with a DynamoDB PutItem call that has the condition attribute_not_exists(paymentId). When the same message is delivered a second time, the call fails with ConditionalCheckFailedException, and the function reports an error. The developer must stop the false errors and keep only one record for each payment. Which solution will meet these requirements?",
    options: [
      { text: "Catch ConditionalCheckFailedException in the function and treat it as a successful duplicate.", correct: true,
        why: "The failed condition shows that the payment is already recorded. Handling it as a duplicate removes the false error and keeps one record." },
      { text: "Retry the PutItem call with exponential backoff when ConditionalCheckFailedException occurs.", correct: false,
        why: "The condition stays false, so every retry fails the same way. The false errors continue." },
      { text: "Replace PutItem with a TransactWriteItems call that has the same condition.", correct: false,
        why: "The condition is still false for the duplicate, so the transaction is canceled and the function still reports an error." },
      { text: "Increase the write capacity of the table.", correct: false,
        why: "ConditionalCheckFailedException is not a capacity error. More capacity does not change the result of the condition." }
    ],
    explanation: "ConditionalCheckFailedException means that the condition expression was false. It is not retryable. In an idempotent write, it means \"already done\"." },

  { id: "gdev-008", topic: "dev-sdk-errors", domain: 2,
    stem: "A Lambda function calls Amazon SQS SendMessage. Every call fails with AccessDeniedException. A developer suggests that the team increase the SDK max attempts to 10. The team must fix the problem in the MOST secure way. Which solution will meet these requirements?",
    options: [
      { text: "Add an IAM policy statement that allows sqs:SendMessage on the queue ARN to the function's execution role.", correct: true,
        why: "AccessDeniedException means that the role lacks permission. A statement for one action on one queue fixes the error with least privilege." },
      { text: "Increase the SDK max attempts to 10.", correct: false,
        why: "Access denied is not a temporary error. Every retry fails the same way, so this does not fix the problem." },
      { text: "Attach the AmazonSQSFullAccess managed policy to the execution role.", correct: false,
        why: "This fixes the error but allows all SQS actions on all queues. It is not the most secure solution." },
      { text: "Store the access keys of an IAM user with SQS permissions in the function's environment variables.", correct: false,
        why: "Long-term keys in environment variables can leak and need manual rotation. The execution role is the secure way to give permissions." }
    ],
    explanation: "Access denied errors are not retryable. Fix them with a least-privilege permission on the execution role." },

  { id: "gdev-009", topic: "dev-sdk-errors", domain: 1,
    stem: "A function adds a ledger entry with a DynamoDB UpdateItem call that increments a balance. The call returns HTTP 500 InternalServerError. The developer knows that the write might have succeeded. The balance must not be incremented two times. Which solution will meet these requirements?",
    options: [
      { text: "Retry the UpdateItem call with a condition expression that checks that this transaction ID is not already applied.", correct: true,
        why: "A 500 on a single-item write can mean success or failure. The condition makes the retry safe, so the balance changes only one time." },
      { text: "Retry the same UpdateItem call immediately without a condition.", correct: false,
        why: "If the first write succeeded, an unconditional retry increments the balance a second time." },
      { text: "Treat the HTTP 500 as a permanent failure and return an error to the user.", correct: false,
        why: "A 500 is transient and the write might have succeeded. The user sees a failure for a write that can be complete, and the record can be wrong." },
      { text: "Switch the SDK client to the adaptive retry mode.", correct: false,
        why: "Adaptive mode changes the request rate. It does not prevent a retried increment from being applied two times." }
    ],
    explanation: "A 500 on a single-item DynamoDB write can mean that the write succeeded. Read the item or use a condition expression before you retry." },

  { id: "gdev-010", topic: "dev-sdk-pagination", domain: 4,
    stem: "A Lambda function counts the objects in an Amazon S3 bucket with one ListObjectsV2 call. The bucket has 4,200 objects, but the function always reports 1,000. Which solution will fix this defect?",
    options: [
      { text: "Use the SDK paginator for ListObjectsV2, or repeat the call with the ContinuationToken until IsTruncated is false.", correct: true,
        why: "ListObjectsV2 returns one page of up to 1,000 keys. Following the continuation token reads all pages and counts every object." },
      { text: "Increase the function timeout.", correct: false,
        why: "The function does not time out. It reads only the first page, so a longer timeout does not change the count." },
      { text: "Increase the function memory.", correct: false,
        why: "Memory does not change the number of keys in one response. The code still reads only one page." },
      { text: "Add the s3:ListBucket permission to the execution role.", correct: false,
        why: "The call already succeeds, so the permission exists. The defect is the missing pagination." }
    ],
    explanation: "List APIs return one page at a time. Follow the token (NextToken, ContinuationToken, LastEvaluatedKey) or use an SDK paginator." },

  { id: "gdev-011", topic: "dev-sdk-pagination", domain: 1,
    stem: "A developer runs aws s3api list-objects on a bucket with millions of objects. The command fails with a timeout error. The developer still needs the complete list in the output. Which solution will meet these requirements?",
    options: [
      { text: "Add the --page-size option with a smaller value.", correct: true,
        why: "--page-size makes each API call ask for fewer items, so each call is less likely to time out. The CLI still returns the full list." },
      { text: "Add the --max-items option.", correct: false,
        why: "--max-items limits the items in the output. The developer does not get the complete list." },
      { text: "Add the --no-paginate option.", correct: false,
        why: "--no-paginate makes only one call and returns only the first page. The list is not complete." },
      { text: "Add a --query expression that selects only the Key field.", correct: false,
        why: "--query filters on the client after the full response arrives. The API calls stay the same size, so the timeout continues." }
    ],
    explanation: "--page-size changes the number of items in each API call, not the output. Use it when CLI list calls time out." },

  { id: "gdev-012", topic: "dev-sdk-pagination", domain: 1,
    stem: "A data loader uses the low-level DynamoDB client to call BatchWriteItem. The calls return HTTP 200, but some items are missing from the table. The response contains entries in UnprocessedItems. Which actions should the developer take to load all items reliably? (Choose two.)",
    options: [
      { text: "Send a new BatchWriteItem request that contains only the items from UnprocessedItems.", correct: true,
        why: "UnprocessedItems lists the writes that did not complete. Resending only those items completes the load without repeating finished writes." },
      { text: "Wait with exponential backoff before each retry of the unprocessed items.", correct: true,
        why: "Unprocessed items are usually caused by throttling. An immediate retry is likely to be throttled again; backoff gives capacity time to recover." },
      { text: "Resend the complete original batch immediately.", correct: false,
        why: "An immediate retry is likely to be throttled again, and it repeats writes that already succeeded." },
      { text: "Ignore UnprocessedItems because HTTP 200 means that all writes succeeded.", correct: false,
        why: "A batch call can partly fail and still return HTTP 200. Ignoring UnprocessedItems loses data." },
      { text: "Replace BatchWriteItem with a Scan operation.", correct: false,
        why: "Scan reads items. It cannot write the missing items." }
    ],
    explanation: "Batch calls can partly fail. Retry only UnprocessedItems (or UnprocessedKeys for BatchGetItem) with exponential backoff." },

  { id: "gdev-013", topic: "dev-sdk-pagination", domain: 1,
    stem: "A developer writes a script that uses the AWS CLI to process IAM users in groups of 100. Each run must print 100 users, and the next run must continue where the last run stopped. Which options should the developer use? (Choose two.)",
    options: [
      { text: "--max-items 100", correct: true,
        why: "--max-items prints 100 items and returns a NextToken when more items exist." },
      { text: "--starting-token with the NextToken value from the previous run", correct: true,
        why: "--starting-token continues the list from the NextToken of the previous command." },
      { text: "--page-size 100 without other pagination options", correct: false,
        why: "--page-size changes only the size of each API call. The CLI still prints all users, not 100." },
      { text: "--no-paginate", correct: false,
        why: "--no-paginate returns only the first page and gives no way to continue on the next run." },
      { text: "--query 'Users[0:100]'", correct: false,
        why: "The query selects the first 100 users every time. The next run cannot continue from the last position." }
    ],
    explanation: "Use --max-items to limit the output and --starting-token with the returned NextToken to continue." },

  { id: "gdev-014", topic: "dev-idempotency", domain: 1,
    stem: "A Lambda function processes orders from an Amazon SQS standard queue and charges the customer's card. Sometimes a customer is charged two times for one order. The team must keep the standard queue and prevent duplicate charges. Which solution will meet these requirements?",
    options: [
      { text: "Use the order ID as an idempotency key. Before charging, write the key to a DynamoDB table with a condition that it does not already exist.", correct: true,
        why: "SQS standard queues deliver at least once. The conditional write lets only the first delivery of an order charge the card." },
      { text: "Increase the visibility timeout of the queue.", correct: false,
        why: "A longer visibility timeout reduces some repeats, but a standard queue can still deliver a message more than one time. Duplicates are not prevented." },
      { text: "Set maxReceiveCount to 1 on the redrive policy.", correct: false,
        why: "This sends messages to the dead-letter queue after one failed receive. It does not stop a duplicate delivery from charging again, and it can lose orders." },
      { text: "Turn on long polling for the queue.", correct: false,
        why: "Long polling reduces empty responses. It does not change at-least-once delivery, so duplicates continue." }
    ],
    explanation: "SQS standard queues, asynchronous Lambda invocations, and EventBridge deliver at least once. Make the handler idempotent with a key and a conditional write." },

  { id: "gdev-015", topic: "dev-idempotency", domain: 1,
    stem: "A Python Lambda function behind Amazon API Gateway creates bookings. Clients retry when they get a timeout, and some bookings are created two times. The developer must make the function idempotent with the LEAST custom code. Which solution will meet these requirements?",
    options: [
      { text: "Use the Powertools for AWS Lambda idempotency utility with a DynamoDB persistence table, and select the client's request ID as the idempotency key.", correct: true,
        why: "The utility stores each key and returns the saved result for a repeated request. It needs only a decorator and configuration." },
      { text: "Write a custom cache in Amazon ElastiCache that stores request IDs and results.", correct: false,
        why: "This can work, but it needs a cluster and custom code. It does not meet the least custom code requirement." },
      { text: "Set the reserved concurrency of the function to 1.", correct: false,
        why: "One concurrent execution still processes each retried request. Duplicate bookings continue." },
      { text: "Set the asynchronous MaximumRetryAttempts of the function to 0.", correct: false,
        why: "API Gateway invokes the function synchronously, and the retries come from the clients. This setting does not affect them." }
    ],
    explanation: "The Powertools idempotency utility stores records in DynamoDB and returns the saved result for repeated events, with little code." },

  { id: "gdev-016", topic: "dev-idempotency", domain: 1,
    stem: "A deployment script calls the Amazon EC2 RunInstances API. Sometimes the call times out, and the script cannot tell whether the instance was launched. The script must retry safely and must never launch a second instance for one request. Which solution will meet these requirements?",
    options: [
      { text: "Generate a unique ClientToken for each logical request, and send the same ClientToken on every retry.", correct: true,
        why: "RunInstances is idempotent with a client token. A retry with the same token and parameters does not launch another instance." },
      { text: "Retry RunInstances with the DryRun parameter set to true.", correct: false,
        why: "DryRun only checks permissions and launches nothing. It does not complete the launch or tell if the first call succeeded." },
      { text: "Retry RunInstances without a client token after 30 seconds.", correct: false,
        why: "Without a token, EC2 treats each retry as a new request. A second instance can launch." },
      { text: "Terminate all instances with the same tag, then call RunInstances again.", correct: false,
        why: "This can stop running instances and still does not make the call idempotent. It fails the safe retry requirement." }
    ],
    explanation: "EC2 RunInstances takes a ClientToken. The same token with the same parameters completes the request no more than one time." },

  { id: "gdev-017", topic: "dev-idempotency", domain: 1,
    stem: "A function uses the Powertools for AWS Lambda idempotency utility with default settings. A partner system sometimes resends the same event up to 12 hours later. The repeated events must not run the function code again. Which solution will meet these requirements?",
    options: [
      { text: "Set expires_after_seconds in the idempotency configuration to 43,200 or more.", correct: true,
        why: "Records expire after 3,600 seconds by default. A 12-hour window needs at least 43,200 seconds, so repeated events find the record." },
      { text: "Turn on use_local_cache in the idempotency configuration.", correct: false,
        why: "The local cache is in one execution environment only, and it does not extend the record expiration. Events after 1 hour run again." },
      { text: "Change event_key_jmespath to use the whole event.", correct: false,
        why: "The key selection does not change how long records stay valid. Records still expire after 1 hour." },
      { text: "Increase the function timeout to 15 minutes.", correct: false,
        why: "The timeout limits one invocation. It does not change the idempotency record expiration." }
    ],
    explanation: "The idempotency utility expires records after 1 hour (3,600 seconds) by default. Set expires_after_seconds for a longer duplicate window." },

  { id: "gdev-018", topic: "dev-resilience", domain: 1,
    stem: "An order service calls a third-party shipping API. Sometimes the API is down for an hour. During these outages, the service keeps retrying, threads wait, and order requests become slow. The service must fail fast while the API is down and start calling it again automatically when it recovers. Which solution will meet these requirements?",
    options: [
      { text: "Put a circuit breaker in front of the API calls.", correct: true,
        why: "After repeated failures, the breaker opens and calls fail at once. Later it lets a test call through and closes when the API works again." },
      { text: "Increase the number of retries for each call to 20.", correct: false,
        why: "More retries make each request wait longer during an outage. This fails the fail-fast requirement." },
      { text: "Increase the HTTP timeout for the API call to 5 minutes.", correct: false,
        why: "A longer timeout makes threads wait longer. Requests become slower, not faster." },
      { text: "Send failed calls to a dead-letter queue.", correct: false,
        why: "A dead-letter queue stores failed work. It does not stop new calls to the failing API, so requests still wait." }
    ],
    explanation: "A circuit breaker opens after repeated failures, fails calls at once, and tests the dependency later (half-open) before it closes again." },

  { id: "gdev-019", topic: "dev-resilience", domain: 1,
    stem: "A Lambda function with a 60-second timeout calls an external HTTP API. Sometimes the connection hangs, and the function times out without logging an error. Short network failures are common. The function must log a clear error and must survive short failures. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Set a timeout on the HTTP client that is much shorter than the function timeout.", correct: true,
        why: "The call fails while the function still runs, so the code can log the error and react." },
      { text: "Retry failed calls a limited number of times with exponential backoff and jitter.", correct: true,
        why: "Limited retries with backoff and jitter handle short failures without endless waiting." },
      { text: "Increase the function timeout to 900 seconds.", correct: false,
        why: "A hung connection then waits even longer. The function still ends without a clear error." },
      { text: "Retry failed calls without a limit until they succeed.", correct: false,
        why: "Endless retries can run until the function times out, so no clear error is logged." },
      { text: "Configure provisioned concurrency for the function.", correct: false,
        why: "Provisioned concurrency removes cold starts. It does not change hung connections or network failures." }
    ],
    explanation: "Set a timeout on every network call, shorter than the function timeout, and retry transient failures a limited number of times with backoff and jitter." },

  { id: "gdev-020", topic: "dev-resilience", domain: 1,
    stem: "An AWS Step Functions Standard workflow has a Task state that invokes a Lambda function. The function sometimes fails with a transient error. The developer must retry the step up to 3 times with growing waits. The developer must not change the function code. Which solution will meet these requirements?",
    options: [
      { text: "Add a Retry field to the Task state with MaxAttempts set to 3 and a BackoffRate greater than 1.", correct: true,
        why: "The Retry field retries the state with growing intervals. No function code changes." },
      { text: "Add a retry loop inside the Lambda function.", correct: false,
        why: "This changes the function code, which the requirement does not allow." },
      { text: "Set MaximumRetryAttempts in the function's asynchronous invocation configuration.", correct: false,
        why: "This setting applies to asynchronous invocations. The workflow waits for the function result, so the setting does not retry the step." },
      { text: "Configure a dead-letter queue for the function.", correct: false,
        why: "A dead-letter queue stores failed asynchronous events. It does not retry the workflow step." }
    ],
    explanation: "Use the Step Functions Retry field (IntervalSeconds, MaxAttempts, BackoffRate) for steps in a workflow, and SDK retry settings for single calls." },

  { id: "gdev-021", topic: "dev-cli-cloudshell", domain: 2,
    stem: "A company uses AWS IAM Identity Center for workforce access. A new developer must run AWS CLI commands from a laptop. Security policy forbids long-term access keys. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Run aws configure sso to create a profile that uses IAM Identity Center.", correct: true,
        why: "This stores the IAM Identity Center settings for the profile in the config file. It stores no long-term keys." },
      { text: "Run aws sso login to get short-term credentials for the profile.", correct: true,
        why: "aws sso login signs the developer in and gets short-term credentials, so no long-term keys are stored." },
      { text: "Run aws configure and enter the access key of an IAM user.", correct: false,
        why: "IAM user access keys are long-term credentials. The security policy forbids them." },
      { text: "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables with keys of an IAM user.", correct: false,
        why: "These are still long-term keys, only in another location. The policy forbids them." },
      { text: "Create access keys for the root user and store them in the credentials file.", correct: false,
        why: "Root user keys are long-term and have full access. This breaks the policy and security best practice." }
    ],
    explanation: "On a developer machine, use IAM Identity Center: aws configure sso one time, then aws sso login for short-term credentials." },

  { id: "gdev-022", topic: "dev-cli-cloudshell", domain: 2,
    stem: "An application on Amazon EC2 uses the instance profile role through an old version of the AWS SDK. The security team requires that the instance accept only IMDSv2 requests to reduce the risk of SSRF attacks. The application must keep working. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Upgrade the application to an SDK version that supports IMDSv2.", correct: true,
        why: "Old SDK versions use IMDSv1 only. After the instance requires IMDSv2, they cannot get role credentials." },
      { text: "Set the instance metadata option HttpTokens to required.", correct: true,
        why: "This makes the instance reject IMDSv1 requests. Requests without a valid token get 401 Unauthorized." },
      { text: "Turn off the instance metadata service on the instance.", correct: false,
        why: "The SDK gets the instance profile credentials from the metadata service. The application stops working." },
      { text: "Store IAM user access keys in the application configuration file.", correct: false,
        why: "Long-term keys on the instance are less secure than role credentials. This fails the security goal." },
      { text: "Increase the metadata response hop limit to 64.", correct: false,
        why: "The hop limit controls how far the token response can travel. It does not require IMDSv2, and a large value weakens protection." }
    ],
    explanation: "IMDSv2 needs a session token from a PUT request. Require it with HttpTokens=required, and use a current SDK, which supports IMDSv2." },

  { id: "gdev-023", topic: "dev-cli-cloudshell", domain: 2,
    stem: "A developer must confirm that a new IAM role can launch Amazon EC2 instances of a specific type. The check must not launch any instance or create cost. Which solution will meet these requirements?",
    options: [
      { text: "Run aws ec2 run-instances with the --dry-run option while using the role.", correct: true,
        why: "--dry-run checks permissions without a launch. It returns DryRunOperation if the action is allowed and UnauthorizedOperation if not." },
      { text: "Run aws ec2 run-instances with --max-items 0.", correct: false,
        why: "--max-items is a pagination option for list output. It does not stop a launch or check permissions." },
      { text: "Run aws ec2 run-instances with --query to filter the output.", correct: false,
        why: "--query filters the output on the client after the call. The instance still launches and creates cost." },
      { text: "Launch the instance and terminate it at once.", correct: false,
        why: "This launches an instance and can create cost, which fails the requirement." }
    ],
    explanation: "EC2 --dry-run (DryRun) checks the permission for an action without making a change." },

  { id: "gdev-024", topic: "dev-cli-cloudshell", domain: 1,
    stem: "A script runs aws ec2 describe-instances in an account with thousands of instances. The script needs only the running instances in one Availability Zone. The developer wants to reduce the amount of data that comes back over the network. Which solution will meet these requirements?",
    options: [
      { text: "Use the --filters option with the instance-state-name and availability-zone filters.", correct: true,
        why: "--filters is a server-side filter. The service returns only matching instances, so less data comes over the network." },
      { text: "Use the --query option with a JMESPath expression that selects the matching instances.", correct: false,
        why: "--query runs on the client after the full response arrives. All instance data still comes over the network." },
      { text: "Use the --output text option.", correct: false,
        why: "The output format changes only how the result looks. The amount of returned data stays the same." },
      { text: "Use the --no-paginate option.", correct: false,
        why: "--no-paginate returns only the first page, which can miss matching instances. It does not filter by state or zone." }
    ],
    explanation: "Server-side filters (--filter, --filters, --filter-expression) reduce returned data. --query filters on the client after the response arrives." },

  { id: "gdev-025", topic: "dev-cli-cloudshell", domain: 2,
    stem: "An administrator must sometimes run AWS CLI commands from a shared workstation in a branch office. The company forbids AWS credentials or tools on that workstation. The administrator can sign in to the AWS Management Console. Which solution meets these requirements and is the MOST secure?",
    options: [
      { text: "Use AWS CloudShell from the console.", correct: true,
        why: "CloudShell runs in the browser with the AWS CLI pre-installed and uses the console user's credentials. Nothing is stored on the workstation." },
      { text: "Install the AWS CLI on the workstation and configure IAM user access keys.", correct: false,
        why: "This installs tools and stores long-term keys on the shared workstation, which the company forbids." },
      { text: "Launch an Amazon EC2 instance and store IAM user access keys on it for CLI use.", correct: false,
        why: "Long-term keys on an instance are not secure, and the instance needs more setup and management." },
      { text: "Store IAM user access keys in a text file on a USB drive and use them on the workstation.", correct: false,
        why: "This still puts long-term credentials on the workstation and can leak the keys. It fails the security requirement." }
    ],
    explanation: "AWS CloudShell is a browser-based shell that uses the console sign-in credentials, with 1 GB of persistent home storage in each Region." },

  { id: "gdev-026", topic: "dev-cli-cloudshell", domain: 2,
    stem: "During a code review, a team finds that a Lambda function creates its DynamoDB client with an access key ID and secret access key written in the source code. The team must remove the keys and give the function the same access in the MOST secure way. Which solution will meet these requirements?",
    options: [
      { text: "Remove the keys from the code, create the client without credentials, and grant the needed DynamoDB actions to the function's execution role.", correct: true,
        why: "The SDK default credential chain gets short-term credentials of the execution role. No keys are stored anywhere." },
      { text: "Move the keys to encrypted environment variables of the function.", correct: false,
        why: "The keys are still long-term credentials that can leak and need rotation. The execution role is more secure." },
      { text: "Move the keys to a configuration file in the deployment package.", correct: false,
        why: "Anyone who can read the package can read the keys. This is not more secure than code." },
      { text: "Keep the keys in code and rotate them every 90 days.", correct: false,
        why: "Rotation reduces the risk window but the keys stay in the source code. The requirement is to remove them." }
    ],
    explanation: "Never put access keys in code. On AWS compute, create the SDK client without keys and let the default credential chain use the role." },

  { id: "gdev-027", topic: "dev-unit-testing", domain: 1,
    stem: "A developer writes unit tests for a Python Lambda function that reads from Amazon DynamoDB. The tests run in a CI pipeline that has no AWS credentials. The tests must be fast and must not call AWS. Which solution will meet these requirements?",
    options: [
      { text: "Pass the DynamoDB client into the business logic as a parameter, and replace it in tests with a stub, for example from moto or the botocore Stubber.", correct: true,
        why: "With an injected client, the test controls every response. The tests run fast without credentials or AWS calls." },
      { text: "Run the tests against the production DynamoDB table with read-only credentials.", correct: false,
        why: "This calls AWS and needs credentials, which the requirements do not allow. It can also affect production." },
      { text: "Deploy the function with sam deploy and test it with sam remote invoke.", correct: false,
        why: "These are integration tests against deployed resources. They call AWS and need credentials." },
      { text: "Increase the function timeout so that the tests do not fail on slow calls.", correct: false,
        why: "The tests still call AWS. A timeout change does not remove the dependency." }
    ],
    explanation: "Keep logic out of the handler, inject SDK clients, and replace them with mocks or stubs in unit tests." },

  { id: "gdev-028", topic: "dev-unit-testing", domain: 3,
    stem: "A developer must test a Lambda function that processes Amazon SQS messages on a laptop before deployment. The developer needs a realistic SQS event payload and wants to run the function locally with it. Which AWS SAM CLI commands should the developer use? (Choose two.)",
    options: [
      { text: "sam local generate-event sqs receive-message", correct: true,
        why: "This prints a sample SQS event in the correct shape. The developer can save it to a file and edit it." },
      { text: "sam local invoke with the -e option and the saved event file", correct: true,
        why: "sam local invoke runs the function locally in a container with the given event, before any deployment." },
      { text: "sam remote invoke", correct: false,
        why: "sam remote invoke works only with resources that are already deployed. The test must happen before deployment." },
      { text: "sam deploy --guided", correct: false,
        why: "This deploys the application to AWS. It does not create a test event or run a local test." },
      { text: "sam validate", correct: false,
        why: "sam validate checks the template. It does not create an event or run the function." }
    ],
    explanation: "sam local generate-event makes sample event payloads. sam local invoke -e runs the function locally with an event file." },

  { id: "gdev-029", topic: "dev-unit-testing", domain: 3,
    stem: "Several developers in the same AWS account test one Lambda function in the console. Each developer creates the same complex test event by hand. The team wants one test event that all developers can use, with the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Save the event as a shareable test event in the Lambda console.", correct: true,
        why: "Users in the same account can use a shareable test event. No extra storage or process is necessary." },
      { text: "Save the event as a private test event in the Lambda console.", correct: false,
        why: "Only the user who created a private test event can use it. The other developers cannot." },
      { text: "Store the event in an Amazon S3 bucket and ask each developer to copy it into the console.", correct: false,
        why: "This works but adds manual steps for every developer. It is more overhead than a shareable event." },
      { text: "Store the event in an AWS Systems Manager Parameter Store parameter.", correct: false,
        why: "The console test feature does not read events from Parameter Store. Developers must still copy it by hand." }
    ],
    explanation: "Lambda shareable test events are available to users in the same account. Private test events are visible only to their creator." },

  { id: "gdev-030", topic: "dev-integration-testing", domain: 3,
    stem: "A front-end team needs a REST API endpoint that returns a fixed JSON response so they can build the user interface. The backend Lambda function will not be ready for three weeks. The solution must not need any backend compute. Which solution will meet these requirements?",
    options: [
      { text: "Create the method in Amazon API Gateway with a mock integration, and set the response in the integration response mapping template.", correct: true,
        why: "A mock integration returns a response from API Gateway itself. No backend is called." },
      { text: "Create the method with a Lambda proxy integration to a placeholder function.", correct: false,
        why: "This needs a Lambda function as backend compute, which the requirement does not allow." },
      { text: "Create the method with an HTTP proxy integration to a server on Amazon EC2.", correct: false,
        why: "This needs a server as backend compute, which the requirement does not allow." },
      { text: "Use the API Gateway console Test feature for the front-end team.", correct: false,
        why: "The Test feature runs the configured integration from the console. It gives the front-end team no endpoint to call." }
    ],
    explanation: "An API Gateway mock integration (REST API) returns a response without a backend. Use it to unblock teams before the backend is ready." },

  { id: "gdev-031", topic: "dev-integration-testing", domain: 3,
    stem: "A team runs consumers on an Amazon EventBridge custom event bus. If a consumer has a bug, the team wants to fix it and then send the events from the affected time window through the fixed consumer again. The solution must use EventBridge features and the least custom code. Which actions should the team take? (Choose two.)",
    options: [
      { text: "Create an archive on the event bus now, before any incident happens.", correct: true,
        why: "An archive keeps the events from the bus. Only archived events can be replayed, so the archive must exist before the events arrive." },
      { text: "After the fix, start a replay from the archive to the same event bus for the affected time window.", correct: true,
        why: "A replay sends archived events from a time window back to the source bus, where the fixed consumer processes them." },
      { text: "Start a replay from the archive to a different event bus in another account.", correct: false,
        why: "Archived events can be replayed only to the source event bus." },
      { text: "Use the EventBridge schema registry to resend the events.", correct: false,
        why: "The schema registry stores event structures. It does not store or resend event data." },
      { text: "Turn on CloudTrail data events and resend the events from the log.", correct: false,
        why: "This adds a manual and complex process. EventBridge archive and replay does this directly." }
    ],
    explanation: "EventBridge archive and replay: an archive keeps events from one bus, and a replay sends them again to the same bus. Replayed events have a replay-name field." },

  { id: "gdev-032", topic: "dev-integration-testing", domain: 3,
    stem: "A developer changes the InputPath, Parameters, and ResultPath fields of one Task state in a large AWS Step Functions workflow. The developer wants to see the data after each processing step for that one state. The developer does not want to deploy the state machine or run the whole workflow. Which solution will meet these requirements?",
    options: [
      { text: "Call the TestState API with the state definition and the inspection level set to DEBUG.", correct: true,
        why: "TestState runs one state without a deployed state machine. DEBUG shows the data after InputPath, Parameters, ResultSelector, and ResultPath." },
      { text: "Call the TestState API with the inspection level set to TRACE.", correct: false,
        why: "TRACE is only for HTTP Task states. Step Functions returns an error for other state types." },
      { text: "Update the state machine and start an execution with a test input.", correct: false,
        why: "This deploys the change and runs the whole workflow, which the developer does not want." },
      { text: "Use sam remote invoke on the state machine.", correct: false,
        why: "sam remote invoke starts an execution of a deployed state machine. It runs the whole workflow." }
    ],
    explanation: "The Step Functions TestState API tests one state in isolation. DEBUG shows input and output processing; TRACE is for HTTP Tasks." },

  { id: "gdev-033", topic: "dev-integration-testing", domain: 3,
    stem: "An integration test sends an event to an Amazon EventBridge bus. A rule invokes a Lambda function asynchronously, and the function writes a result item to a DynamoDB table. The test must reliably confirm that the item was written. Which solution will meet these requirements?",
    options: [
      { text: "After PutEvents, poll the DynamoDB table for the item until it appears or until a timeout ends the test with a failure.", correct: true,
        why: "The flow is asynchronous, so the result comes later. Polling with a timeout checks the real result without depending on exact timing." },
      { text: "Check that the PutEvents response has FailedEntryCount equal to 0.", correct: false,
        why: "This shows only that EventBridge accepted the event. It does not confirm that the function wrote the item." },
      { text: "Wait exactly 1 second after PutEvents, then read the item one time.", correct: false,
        why: "Asynchronous processing time varies. A fixed short wait makes the test fail at random." },
      { text: "Invoke the Lambda function synchronously from the test instead of sending the event.", correct: false,
        why: "This skips the EventBridge rule, so the test no longer checks the event-driven path." }
    ],
    explanation: "In event-driven tests, send the event, then poll the result store with a timeout. Do not rely on the send response or fixed waits." },

  { id: "gdev-034", topic: "dev-debugging", domain: 4,
    stem: "An Amazon API Gateway REST API uses a Lambda proxy integration. Clients get 502 Bad Gateway. The function logs show that each invocation completes without errors and returns the string \"OK\". Which solution will fix the problem?",
    options: [
      { text: "Change the function to return an object with a statusCode field and a string body field.", correct: true,
        why: "A Lambda proxy integration requires output in the proxy format. Any other format makes API Gateway return 502." },
      { text: "Increase the function timeout.", correct: false,
        why: "The function completes without errors, so it does not time out. The response format causes the 502." },
      { text: "Add the lambda:InvokeFunction permission for API Gateway to the function's resource-based policy.", correct: false,
        why: "The logs show that API Gateway already invokes the function. The permission is not the problem." },
      { text: "Turn on API caching for the stage.", correct: false,
        why: "Caching stores valid responses. It does not fix a response that API Gateway cannot read." }
    ],
    explanation: "With a Lambda proxy integration, the function must return statusCode, optional headers, and body. A different format gives 502 Bad Gateway." },

  { id: "gdev-035", topic: "dev-debugging", domain: 4,
    stem: "A function works in the test account in us-east-1. After deployment to eu-west-1, every call to a DynamoDB table named orders-prod fails with ResourceNotFoundException. The table exists in eu-west-1. The function code creates the client with region_name='us-east-1'. Which solution will fix the problem?",
    options: [
      { text: "Remove the hardcoded Region so that the client uses the Region of the function, or read it from configuration.", correct: true,
        why: "The client sends requests to us-east-1, where the table does not exist. The Region of the function is eu-west-1." },
      { text: "Add dynamodb:* permissions to the execution role.", correct: false,
        why: "A missing permission gives an access denied error, not ResourceNotFoundException. The client calls the wrong Region." },
      { text: "Retry the call with exponential backoff.", correct: false,
        why: "ResourceNotFoundException is not retryable. Every retry goes to the wrong Region and fails." },
      { text: "Increase the read capacity of the table.", correct: false,
        why: "Capacity problems give throttling errors. The table is not found because of the Region." }
    ],
    explanation: "ResourceNotFoundException for a resource that exists often means the wrong Region, name, or ARN in the client configuration." },

  { id: "gdev-036", topic: "dev-debugging", domain: 4,
    stem: "A Lambda function runs in private subnets of a VPC. The subnets have no NAT gateway. Every call from the function to Amazon DynamoDB times out. The function must reach DynamoDB without access to the internet. Which solution will meet these requirements?",
    options: [
      { text: "Create a gateway VPC endpoint for DynamoDB and add it to the route tables of the private subnets.", correct: true,
        why: "A gateway endpoint gives a private route to DynamoDB from the VPC. No internet path is necessary." },
      { text: "Increase the function timeout to 900 seconds.", correct: false,
        why: "The function has no network route to DynamoDB. A longer timeout only makes it wait longer." },
      { text: "Add the AmazonDynamoDBFullAccess policy to the execution role.", correct: false,
        why: "A missing permission gives access denied errors, not timeouts. The problem is the network route." },
      { text: "Move the function to public subnets with an internet gateway.", correct: false,
        why: "A Lambda function in a VPC does not get a public IP address, so this does not give internet access. It also fails the no-internet requirement." }
    ],
    explanation: "A Lambda function in a VPC needs a NAT gateway or a VPC endpoint to reach AWS services. Timeouts on every call point to a missing route." },

  { id: "gdev-037", topic: "dev-amazon-q", domain: 3,
    stem: "A team has a Java service in Visual Studio Code with few unit tests. The team lead wants to generate unit tests for the existing classes, review them as a diff, and add them to the project with the LEAST manual effort. Which solution will meet these requirements?",
    options: [
      { text: "Use Amazon Q Developer in the IDE to generate unit tests for the classes.", correct: true,
        why: "Amazon Q Developer unit test generation creates tests for existing code, and the developer reviews and accepts the changes in the IDE." },
      { text: "Use Amazon Q Developer code transformation on the project.", correct: false,
        why: "Transformation upgrades language or framework versions. It does not generate unit tests." },
      { text: "Use sam local generate-event to create the tests.", correct: false,
        why: "This creates sample event payloads, not unit test code." },
      { text: "Use Amazon Q Developer documentation generation.", correct: false,
        why: "Documentation generation writes READMEs and other documentation. It does not create tests." }
    ],
    explanation: "Amazon Q Developer can generate unit tests for existing code in the IDE (formerly the /test command)." },

  { id: "gdev-038", topic: "dev-amazon-q", domain: 2,
    stem: "A company wants developers to find hardcoded passwords, SQL injection risks, and insecure infrastructure as code settings in their code in the IDE before they commit it. Which solution will meet these requirements?",
    options: [
      { text: "Use Amazon Q Developer code reviews in the IDE.", correct: true,
        why: "Amazon Q code reviews run SAST scanning, secrets detection, and infrastructure as code checks on local code in the IDE." },
      { text: "Use Amazon Q Developer inline suggestions.", correct: false,
        why: "Inline suggestions complete code while you type. They do not scan the code for secrets and vulnerabilities." },
      { text: "Use AWS Secrets Manager automatic rotation.", correct: false,
        why: "Rotation changes secrets that are already in Secrets Manager. It does not find hardcoded passwords in source code." },
      { text: "Use Amazon Inspector Lambda code scanning.", correct: false,
        why: "Amazon Inspector scans code that is already deployed to Lambda. It does not check code in the IDE before commit." }
    ],
    explanation: "Amazon Q Developer code reviews (formerly /review) find security vulnerabilities, secrets, IaC issues, and code quality issues in the IDE." },

  { id: "gdev-039", topic: "dev-amazon-q", domain: 1,
    stem: "A company's legal team requires a record of license information for any accepted Amazon Q Developer code suggestion that is similar to open-source code. Which solution will meet these requirements?",
    options: [
      { text: "Keep code references turned on, and use the Amazon Q code reference log in the IDE.", correct: true,
        why: "Code references show the license and source repository of similar open-source code. The reference log lists accepted suggestions with references." },
      { text: "Turn off code references in the IDE settings.", correct: false,
        why: "With code references off, the developer does not see the license information. No record is made." },
      { text: "Use Amazon Q Developer code reviews to scan the code for licenses.", correct: false,
        why: "Code reviews look for security and quality issues. They do not record license information for suggestions." },
      { text: "Use Diagnose with Amazon Q in the AWS Management Console.", correct: false,
        why: "This feature explains console errors. It does not track suggestions in the IDE." }
    ],
    explanation: "Amazon Q code references show license and repository information for suggestions similar to open-source code, and the reference log keeps a list." },

  { id: "gdev-040", topic: "dev-amazon-q", domain: 1,
    stem: "A team maintains a Java 8 application. The team must upgrade the application to a newer Java version and update its dependencies with the LEAST manual work. The team uses an IDE with Amazon Q Developer. Which solution will meet these requirements?",
    options: [
      { text: "Use the Amazon Q Developer code transformation feature for a Java version upgrade.", correct: true,
        why: "Amazon Q transformation performs Java language and dependency version upgrades and shows changes to review and apply." },
      { text: "Use Amazon Q Developer inline suggestions while editing each file by hand.", correct: false,
        why: "Inline suggestions help line by line. The team still changes each file manually, which fails the least manual work requirement." },
      { text: "Use Amazon Q Developer unit test generation.", correct: false,
        why: "Unit test generation creates tests. It does not upgrade the Java version." },
      { text: "Use Amazon Q Developer code reviews.", correct: false,
        why: "Code reviews find issues but do not perform the version upgrade." }
    ],
    explanation: "Amazon Q Developer code transformation performs language and OS-level upgrades, for example Java version and dependency upgrades." }

] });
