window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "m06-step-functions", questions: [

  { id: "m06-001", topic: "sfn-orchestration", domain: 1,
    stem: "A company processes orders with four Lambda functions: validate, reserve stock, charge, and ship. Today each function invokes the next one directly and contains its own retry code. The team wants one place that controls the order of the steps, retries failed steps, and shows the status of each order visually. The solution must have the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Create an AWS Step Functions state machine that calls the four functions in Task states, with Retry and Catch fields on each Task.", correct: true,
        why: "Step Functions is a managed orchestrator. It controls the order, retries with Retry fields, and shows each execution in a graph view, with no servers to manage." },
      { text: "Publish an event to an Amazon SNS topic after each step, and subscribe the next function to the topic.", correct: false,
        why: "This is choreography. No central component controls the order or shows the status of an order, so it fails the visibility requirement." },
      { text: "Put an Amazon SQS queue between each pair of functions, and keep the retry code in each function.", correct: false,
        why: "Queues decouple the functions, but there is still no central control or visual status, and the custom retry code stays." },
      { text: "Run a coordinator application on an Amazon EC2 instance that calls the functions in order and stores the status in Amazon DynamoDB.", correct: false,
        why: "This works, but the team must write, patch, and scale the coordinator. It fails the least operational overhead requirement." }
    ],
    explanation: "Step Functions is the AWS orchestration service. A central state machine controls step order, retries, and error paths, and it shows each execution visually." },

  { id: "m06-002", topic: "sfn-orchestration", domain: 1,
    stem: "A mobile app sends a quote request to an Amazon API Gateway HTTP API. A workflow of three short steps calculates the quote in about 2 seconds. The app must receive the calculated quote in the HTTP response of the same request. Which solution will meet these requirements?",
    options: [
      { text: "Create an Express state machine, and use the StepFunctions-StartSyncExecution integration subtype in the HTTP API.", correct: true,
        why: "StartSyncExecution runs a synchronous Express workflow. API Gateway waits for the workflow and returns its result in the HTTP response." },
      { text: "Create a Standard state machine, and use the StepFunctions-StartExecution integration subtype in the HTTP API.", correct: false,
        why: "StartExecution returns an execution ARN at once. The app does not get the quote in the same response." },
      { text: "Create a Standard state machine, and use the StepFunctions-StartSyncExecution integration subtype in the HTTP API.", correct: false,
        why: "StartSyncExecution supports Express workflows only. A Standard state machine returns StateMachineTypeNotSupported." },
      { text: "Create an asynchronous Express state machine that an Amazon EventBridge rule starts when API Gateway receives the request.", correct: false,
        why: "An asynchronous start does not return the workflow result to the caller, so the app does not get the quote in the response." }
    ],
    explanation: "StartSyncExecution works only with Express workflows. It waits for the execution and returns the output, so an API can return the workflow result." },

  { id: "m06-003", topic: "sfn-orchestration", domain: 1,
    stem: "A travel booking workflow reserves a flight, then reserves a hotel, then charges the customer. Each step calls a different microservice with its own database. If the charge step fails, the workflow must cancel the hotel reservation and then the flight reservation. Which solution will meet these requirements?",
    options: [
      { text: "Add a Catch field to the charge Task that goes to a cancel-hotel Task, then to a cancel-flight Task, then to a Fail state.", correct: true,
        why: "This is the saga pattern. The Catch sends the failure to compensating steps that undo the earlier steps in reverse order." },
      { text: "Add a Retry field to the charge Task with MaxAttempts set to 10.", correct: false,
        why: "Retries try the charge again. If the charge still fails, the reservations stay in place, so the requirement to cancel them fails." },
      { text: "Put the three steps in a Parallel state so that they succeed or fail together.", correct: false,
        why: "A Parallel state does not roll back branches that already completed. The flight and hotel reservations stay in place after a failure." },
      { text: "Redrive the execution after the charge step fails.", correct: false,
        why: "Redrive runs the failed charge step again. It does not cancel the earlier reservations." }
    ],
    explanation: "The saga pattern uses compensating steps to undo earlier local transactions after a failure. In Step Functions, a Catch sends the error to the compensating steps." },

  { id: "m06-004", topic: "sfn-states", domain: 1,
    stem: "A Choice state routes orders by the field $.region. Some executions fail with States.NoChoiceMatched when an order has a region that no rule matches. The team wants these orders to go to a ManualReview state instead. Which solution will meet these requirements?",
    options: [
      { text: "Add a Default field with the value ManualReview to the Choice state.", correct: true,
        why: "Step Functions uses Default when no Choice rule matches. The unmatched orders go to ManualReview and the execution does not fail." },
      { text: "Add a Catch field for States.NoChoiceMatched to the Choice state, with Next set to ManualReview.", correct: false,
        why: "Choice states do not support Catch. Only Task, Parallel, and Map states have Retry and Catch fields." },
      { text: "Add \"End\": true to the Choice state.", correct: false,
        why: "Choice states do not support the End field. This does not send orders to ManualReview." },
      { text: "Add a Retry field with MaxAttempts set to 3 to the Choice state.", correct: false,
        why: "Choice states do not support Retry. A retry would also give the same result for the same input." }
    ],
    explanation: "A Choice state with no matching rule and no Default fails with States.NoChoiceMatched. Add Default to handle all other input." },

  { id: "m06-005", topic: "sfn-states", domain: 1,
    stem: "A subscription workflow must pause until the end of a free trial. Each execution input contains the trial end date in the field $.trialEnd as an ISO 8601 timestamp. The trial can last up to 30 days. The company must not pay for compute while the workflow waits. Which solution will meet these requirements?",
    options: [
      { text: "Use a Wait state with TimestampPath set to $.trialEnd in a Standard workflow.", correct: true,
        why: "TimestampPath reads the date from the input. A Standard execution can run for up to 1 year, and no compute runs during a Wait state." },
      { text: "Use a Wait state with TimestampPath set to $.trialEnd in an Express workflow.", correct: false,
        why: "An Express execution can run for a maximum of 5 minutes, so it cannot wait 30 days." },
      { text: "Use a Wait state with Seconds set to 2592000 in a Standard workflow.", correct: false,
        why: "Seconds is a fixed value in the definition. Each trial has its own end date, so a fixed wait does not end at the correct time." },
      { text: "Invoke a Lambda function that sleeps until the trial end date.", correct: false,
        why: "A Lambda function can run for a maximum of 15 minutes, and the company pays for the sleeping time." }
    ],
    explanation: "A Wait state can pause until a timestamp from the input (TimestampPath). Long waits need a Standard workflow, which can run for up to 1 year." },

  { id: "m06-006", topic: "sfn-dataflow", domain: 1,
    stem: "A Task state invokes a validation Lambda function. The next state needs the original order data from the state input and the validation result. Today the state output contains only the validation result. Which change will meet these requirements?",
    options: [
      { text: "Set \"ResultPath\": \"$.validation\" on the Task state.", correct: true,
        why: "ResultPath with a path adds the result to the state input under validation. The output has the original order data and the result." },
      { text: "Set \"ResultPath\": null on the Task state.", correct: false,
        why: "ResultPath null discards the result. The output has only the original input, so the next state does not get the validation result." },
      { text: "Set \"OutputPath\": \"$.validation\" on the Task state.", correct: false,
        why: "OutputPath only filters the output. With the default ResultPath, the result already replaced the input, so the order data is gone." },
      { text: "Set \"InputPath\": \"$.validation\" on the Task state.", correct: false,
        why: "InputPath selects part of the input before the task runs. It does not combine the result with the input." }
    ],
    explanation: "ResultPath controls where the result goes. The default $ replaces the input, a path such as $.validation adds the result to the input, and null discards the result." },

  { id: "m06-007", topic: "sfn-dataflow", domain: 1,
    stem: "A Task state uses the resource arn:aws:states:::lambda:invoke. The next state expects the function output as its input, but it receives an object with ExecutedVersion, StatusCode, SdkHttpMetadata, and Payload fields. The developer wants the fewest changes to the definition. Which solution will meet these requirements?",
    options: [
      { text: "Add \"OutputPath\": \"$.Payload\" to the Task state.", correct: true,
        why: "The optimized Lambda integration puts the function output in Payload. OutputPath selects only that part for the next state." },
      { text: "Add \"InputPath\": \"$.Payload\" to the Task state.", correct: false,
        why: "InputPath applies to the state input before the function runs. It does not remove the metadata from the result." },
      { text: "Add \"ResultPath\": \"$.Payload\" to the Task state.", correct: false,
        why: "This puts the whole invoke result, metadata included, under a Payload field in the input. The next state still gets the metadata." },
      { text: "Change the function code to return a smaller object.", correct: false,
        why: "Step Functions still wraps the function output in the invoke metadata. The next state still receives the metadata fields." }
    ],
    explanation: "The optimized lambda:invoke integration returns invoke metadata with the function output in Payload. Select $.Payload with OutputPath or ResultSelector." },

  { id: "m06-008", topic: "sfn-dataflow", domain: 1,
    stem: "A Task state calls a payment API. The request must contain the order ID from the state input field $.order.id and a new unique request ID for each call. The developer must not add a Lambda function. Which entries in the Parameters field will meet these requirements? (Choose two.)",
    options: [
      { text: "\"orderId.$\": \"$.order.id\"", correct: true,
        why: "A key that ends in .$ tells Step Functions to evaluate the value as a path, so the request gets the order ID from the input." },
      { text: "\"requestId.$\": \"States.UUID()\"", correct: true,
        why: "States.UUID is an intrinsic function that returns a new v4 UUID. It needs the .$ suffix on the key and no Lambda function." },
      { text: "\"orderId\": \"$.order.id\"", correct: false,
        why: "Without the .$ suffix, the value is the literal string \"$.order.id\", not the order ID." },
      { text: "\"requestId\": \"States.UUID()\"", correct: false,
        why: "Without the .$ suffix, Step Functions does not run the intrinsic function. The value is the literal text." },
      { text: "\"requestId.$\": \"$$.Execution.Id\"", correct: false,
        why: "The execution ID is the same for every call in the execution, for example after a retry. It fails the new ID for each call requirement." }
    ],
    explanation: "In Parameters, a key that ends in .$ takes a path or an intrinsic function. States.UUID() makes a unique ID without a Lambda function." },

  { id: "m06-009", topic: "sfn-dataflow", domain: 4,
    stem: "A workflow fails with the error States.DataLimitExceeded. A Lambda function in the workflow returns a report of about 600 KB, and the next state needs the report. Which solution will meet these requirements?",
    options: [
      { text: "Change the function to write the report to Amazon S3 and return only the bucket and key. The next state reads the object.", correct: true,
        why: "State input and output are limited to 256 KiB. Passing an S3 reference keeps the payload small and gives the next state the data." },
      { text: "Request a Service Quotas increase for the payload size.", correct: false,
        why: "The 256 KiB payload size is a hard quota. AWS does not increase it." },
      { text: "Add a Catch field with States.ALL to the Task state.", correct: false,
        why: "States.ALL does not catch States.DataLimitExceeded. A catcher also would not give the next state the report." },
      { text: "Change the state machine to an Express workflow.", correct: false,
        why: "Express workflows have the same 256 KiB payload quota, and you cannot change the type of an existing state machine." }
    ],
    explanation: "Step Functions limits state input and output to 256 KiB. Store large data in Amazon S3 and pass a reference." },

  { id: "m06-010", topic: "sfn-dataflow", domain: 1,
    stem: "In a workflow, step 1 gets a customer profile from an API. Step 5 needs the customer tier from that profile. Steps 2, 3, and 4 do not need the profile, and their outputs replace their inputs. The developer wants a solution that does not pass the profile through steps 2, 3, and 4. Which solution will meet these requirements?",
    options: [
      { text: "In step 1, use the Assign field to store the tier in a workflow variable. In step 5, refer to the variable.", correct: true,
        why: "A variable set with Assign is available to all later states in the same scope. Step 5 reads it without changes to steps 2 to 4." },
      { text: "In step 1, use ResultPath to add the profile to the state output.", correct: false,
        why: "State output goes only to the next state. Steps 2 to 4 replace their input, so the profile does not reach step 5 without changes to those steps." },
      { text: "In step 5, use InputPath to select the tier from the output of step 1.", correct: false,
        why: "InputPath selects from the input of step 5, which is the output of step 4. It cannot read the output of step 1." },
      { text: "In step 5, read the tier from $$.Execution.Input.", correct: false,
        why: "$$.Execution.Input is the original execution input. The tier comes from the API call in step 1, so it is not there." }
    ],
    explanation: "Workflow variables (the Assign field) store data for any later state. State output passes only to the very next state." },

  { id: "m06-011", topic: "sfn-workflow-types", domain: 1,
    stem: "An IoT platform receives about 50,000 sensor messages each second. For each message, a workflow of four steps transforms the data and writes it to Amazon DynamoDB with PutItem. Each workflow finishes in less than 1 second. The steps are idempotent. The solution must be the MOST cost-effective. Which solution will meet these requirements?",
    options: [
      { text: "Use an Express workflow.", correct: true,
        why: "Express workflows are for high-volume, short, idempotent work. They are priced by executions, duration, and memory, which costs less here than per-transition pricing." },
      { text: "Use a Standard workflow.", correct: false,
        why: "Standard workflows are priced by state transitions. At this volume, the cost is much higher, so it fails the cost requirement." },
      { text: "Use a Standard workflow with a Distributed Map state that processes each message as a child execution.", correct: false,
        why: "This adds a Standard parent and transitions for each message. It costs more and does not fit a stream of single messages." },
      { text: "Use a Standard workflow with an activity worker on Amazon EC2 for each step.", correct: false,
        why: "Activities add servers to run and keep per-transition pricing. This fails the cost requirement." }
    ],
    explanation: "Express workflows suit high-volume, short (5 minutes or less), idempotent event processing. Standard workflows suit long, durable, auditable work." },

  { id: "m06-012", topic: "sfn-workflow-types", domain: 1,
    stem: "A payment workflow charges a customer card and then waits up to 3 days for a fraud team to approve large orders. The charge step must never run more than one time for an order unless a retry is configured. Which solution will meet these requirements?",
    options: [
      { text: "Use a Standard workflow.", correct: true,
        why: "Standard workflows use an exactly-once model and can run for up to 1 year, so they fit a non-idempotent charge and a 3-day wait." },
      { text: "Use an asynchronous Express workflow.", correct: false,
        why: "Asynchronous Express is at-least-once, so the charge could run twice. It also stops after 5 minutes." },
      { text: "Use a synchronous Express workflow.", correct: false,
        why: "Synchronous Express executions run for a maximum of 5 minutes, so the 3-day wait is not possible." },
      { text: "Use one Lambda function with the maximum timeout that charges the card and waits for approval.", correct: false,
        why: "The maximum Lambda timeout is 15 minutes. The function cannot wait 3 days." }
    ],
    explanation: "Standard workflows have exactly-once execution and a 1-year maximum. Asynchronous Express is at-least-once and synchronous Express is at-most-once, both with a 5-minute maximum." },

  { id: "m06-013", topic: "sfn-workflow-types", domain: 1,
    stem: "A team wants to move a Standard workflow to an Express workflow to reduce cost. Every execution finishes in less than 2 minutes, and all steps are idempotent. Which parts of the current workflow will prevent the move? (Choose two.)",
    options: [
      { text: "A Task state that uses sqs:sendMessage.waitForTaskToken for a manager approval.", correct: true,
        why: "Express workflows support only the Request Response pattern. The callback pattern (.waitForTaskToken) is not supported." },
      { text: "A Task state that uses glue:startJobRun.sync to wait for an AWS Glue job.", correct: true,
        why: "Express workflows do not support the Run a Job (.sync) pattern." },
      { text: "A Retry field with BackoffRate and JitterStrategy on a Task state.", correct: false,
        why: "Retry and its fields work in both workflow types. This does not prevent the move." },
      { text: "A Parallel state with three branches.", correct: false,
        why: "Parallel states work in Express workflows. This does not prevent the move." },
      { text: "A Task state that uses the optimized dynamodb:putItem integration.", correct: false,
        why: "This is a Request Response integration, which Express workflows support." }
    ],
    explanation: "Express workflows support only Request Response integrations. They do not support .sync, .waitForTaskToken, activities, or Distributed Map." },

  { id: "m06-014", topic: "sfn-workflow-types", domain: 4,
    stem: "A developer created an Express state machine with AWS CloudFormation. Some executions failed yesterday. The developer cannot find any history for these executions in the Step Functions console. The developer must be able to see the input and errors of future failed executions. Which solution will meet these requirements?",
    options: [
      { text: "Configure a LoggingConfiguration on the state machine that sends logs to a CloudWatch Logs log group, with includeExecutionData set to true.", correct: true,
        why: "Express workflows do not keep execution history in Step Functions. CloudWatch Logs logging records the events, and includeExecutionData adds the input." },
      { text: "Call the GetExecutionHistory API for the failed executions.", correct: false,
        why: "GetExecutionHistory is not available for Express workflows." },
      { text: "Create an Amazon EventBridge rule for Step Functions Execution Status Change events.", correct: false,
        why: "Only Standard workflows send Execution Status Change events to EventBridge." },
      { text: "Call the DescribeExecution API for the failed executions.", correct: false,
        why: "DescribeExecution is not available for Express workflows, so it cannot show the input and errors." }
    ],
    explanation: "Express workflows keep no history in Step Functions. Enable CloudWatch Logs on the state machine. CloudFormation and the API do not enable logging by default." },

  { id: "m06-015", topic: "sfn-workflow-types", domain: 1,
    stem: "A web application starts a Standard workflow for each order with the StartExecution API. When a network timeout occurs, the application retries the call. The company must not start two workflow runs for the same order. Which solution will meet these requirements with the fewest code changes?",
    options: [
      { text: "Set the execution name to the order ID in each StartExecution call.", correct: true,
        why: "For Standard workflows, a StartExecution call with the name of a running execution returns the same response and does not start a second run. If that execution already closed, the call fails with ExecutionAlreadyExists. Either way, no second run starts." },
      { text: "Set the execution name to a new random UUID in each StartExecution call.", correct: false,
        why: "Each retry gets a different name, so Step Functions starts a second execution for the same order." },
      { text: "Change the state machine to an Express workflow and set the execution name to the order ID.", correct: false,
        why: "Express workflows do not manage idempotency. The same name can start concurrent executions. The type also cannot change." },
      { text: "Add a Retry field with MaxAttempts set to 0 to the first Task state.", correct: false,
        why: "Retry controls errors inside an execution. It does not stop the application from starting a second execution." }
    ],
    explanation: "Standard workflows return an idempotent response when you start an execution with the name of a running execution. Use a business ID as the execution name." },

  { id: "m06-016", topic: "sfn-errors", domain: 1,
    stem: "A Task state calls a third-party API that sometimes returns a transient error named ApiBusy. Many executions run at the same time. The developer must retry ApiBusy up to 5 times with exponential backoff that starts at 2 seconds. No single wait can be longer than 30 seconds. The retries from different executions must not happen at the same moment. Which Retry configuration will meet these requirements?",
    options: [
      { text: "ErrorEquals [\"ApiBusy\"], IntervalSeconds 2, MaxAttempts 5, BackoffRate 2, MaxDelaySeconds 30, JitterStrategy FULL.", correct: true,
        why: "BackoffRate 2 gives exponential waits from 2 seconds, MaxDelaySeconds caps each wait at 30 seconds, and FULL jitter randomizes the waits." },
      { text: "ErrorEquals [\"ApiBusy\"], IntervalSeconds 2, MaxAttempts 5, BackoffRate 2, MaxDelaySeconds 30.", correct: false,
        why: "The default JitterStrategy is NONE. All executions retry at the same moments, so it fails the requirement to spread the retries." },
      { text: "ErrorEquals [\"ApiBusy\"], IntervalSeconds 2, MaxAttempts 5, BackoffRate 1, JitterStrategy FULL.", correct: false,
        why: "BackoffRate 1 keeps the same interval for each retry. This is not exponential backoff." },
      { text: "A Catch field for ApiBusy that goes to a Wait state of 2 seconds and then back to the Task state.", correct: false,
        why: "This loop has a fixed wait, no attempt limit, and no jitter. It fails the backoff and attempt requirements." }
    ],
    explanation: "Retry fields: IntervalSeconds (default 1), MaxAttempts (default 3), BackoffRate (default 2.0), MaxDelaySeconds (no default limit), and JitterStrategy (default NONE). FULL jitter spreads retries." },

  { id: "m06-017", topic: "sfn-errors", domain: 4,
    stem: "A Task state has a catcher with ErrorEquals [\"States.ALL\"] and Next set to NotifyFailure. The NotifyFailure state must include the order ID from the original state input in its message. During tests, NotifyFailure receives only the Error and Cause fields. Which change will meet these requirements?",
    options: [
      { text: "Add \"ResultPath\": \"$.error\" to the catcher.", correct: true,
        why: "With ResultPath in the catcher, Step Functions adds the error output to the original input. NotifyFailure gets the order ID and the error." },
      { text: "Add \"InputPath\": \"$.orderId\" to the NotifyFailure state.", correct: false,
        why: "The input of NotifyFailure already contains only the error output. The order ID is not there for InputPath to select." },
      { text: "Add \"OutputPath\": \"$\" to the Task state.", correct: false,
        why: "OutputPath applies to the successful output of the Task. It does not change the data that the catcher sends." },
      { text: "Change ErrorEquals in the catcher to [\"States.TaskFailed\"].", correct: false,
        why: "This changes which errors match. The error output still replaces the input, so the order ID is still lost." }
    ],
    explanation: "Without ResultPath, a catcher sends only the error output. Use ResultPath such as $.error to keep the original input and add the error." },

  { id: "m06-018", topic: "sfn-errors", domain: 4,
    stem: "A Task state has a catcher with ErrorEquals [\"States.ALL\"]. Some executions still fail at this state without going to the catcher's Next state. Which errors can cause this behavior? (Choose two.)",
    options: [
      { text: "States.Runtime, for example because OutputPath is applied to a null payload.", correct: true,
        why: "States.ALL does not catch States.Runtime. This error is not retriable and always fails the execution." },
      { text: "States.DataLimitExceeded, because the task output is larger than 256 KiB.", correct: true,
        why: "States.ALL does not catch States.DataLimitExceeded. You must name it explicitly in ErrorEquals to catch it." },
      { text: "States.Timeout, because the task ran longer than TimeoutSeconds.", correct: false,
        why: "States.ALL catches States.Timeout. The execution would go to the catcher's Next state." },
      { text: "States.TaskFailed, because the Lambda function threw an exception.", correct: false,
        why: "States.ALL catches task failures. The execution would go to the catcher's Next state." },
      { text: "States.Permissions, because the execution role does not allow the action.", correct: false,
        why: "States.ALL catches States.Permissions. The execution would go to the catcher's Next state." },
      { text: "Lambda.ServiceException, because Lambda had a transient service error.", correct: false,
        why: "States.ALL catches Lambda service errors. The execution would go to the catcher's Next state." }
    ],
    explanation: "States.ALL matches all error names except States.Runtime and States.DataLimitExceeded. Name States.DataLimitExceeded explicitly to catch it. States.Runtime cannot be caught." },

  { id: "m06-019", topic: "sfn-errors", domain: 1,
    stem: "A Task state invokes a Lambda function. The function sometimes fails with Lambda.ServiceException or Lambda.SdkClientException. It also throws InvalidOrderError when the order data is wrong. The workflow must retry only the transient Lambda service errors and must send InvalidOrderError to a RejectOrder state at once. Which solution will meet these requirements?",
    options: [
      { text: "Add a retrier for Lambda.ServiceException, Lambda.AWSLambdaException, and Lambda.SdkClientException, and a catcher for InvalidOrderError with Next set to RejectOrder.", correct: true,
        why: "The retrier matches only the transient service errors. InvalidOrderError matches no retrier, so the catcher sends it to RejectOrder at once." },
      { text: "Add a retrier for States.ALL, and a catcher for InvalidOrderError with Next set to RejectOrder.", correct: false,
        why: "States.ALL also matches InvalidOrderError, so the workflow retries bad orders before it rejects them. This fails the at once requirement." },
      { text: "Add a retrier for States.TaskFailed, and a catcher for InvalidOrderError with Next set to RejectOrder.", correct: false,
        why: "States.TaskFailed matches every error except States.Timeout, including InvalidOrderError. Bad orders are retried first." },
      { text: "Add only a catcher for States.ALL with Next set to RejectOrder.", correct: false,
        why: "There is no retry, so transient Lambda service errors also reject the order. This fails the retry requirement." }
    ],
    explanation: "Retry transient Lambda service exceptions (Lambda.ServiceException, Lambda.AWSLambdaException, Lambda.SdkClientException). Catch business errors by name so they are not retried." },

  { id: "m06-020", topic: "sfn-timeouts", domain: 4,
    stem: "A Standard workflow sends a job to an external worker with a task token and waits for the callback. A normal job takes up to 2 hours. Last week a worker crashed, and the execution stayed in the RUNNING state for days. The workflow must fail within 10 minutes when a worker stops, but it must not fail normal 2-hour jobs. Which solution will meet these requirements?",
    options: [
      { text: "Set HeartbeatSeconds to 600 and TimeoutSeconds to 9000 on the Task state. Change the worker to call SendTaskHeartbeat every few minutes.", correct: true,
        why: "A missed heartbeat fails the task within 10 minutes when the worker stops. The longer TimeoutSeconds lets normal 2-hour jobs complete." },
      { text: "Set TimeoutSeconds to 600 on the Task state.", correct: false,
        why: "This fails every job that takes longer than 10 minutes, including normal 2-hour jobs." },
      { text: "Keep the default timeout of the Task state.", correct: false,
        why: "The default TimeoutSeconds is 99,999,999 seconds. The execution stays open until the 1-year limit, which is the current problem." },
      { text: "Add a retrier for States.Timeout with MaxAttempts set to 3.", correct: false,
        why: "No timeout is set, so States.Timeout never occurs. The execution still waits for days." }
    ],
    explanation: "Set TimeoutSeconds for the total time and a smaller HeartbeatSeconds to detect a stopped worker. The worker calls SendTaskHeartbeat to show progress." },

  { id: "m06-021", topic: "sfn-timeouts", domain: 4,
    stem: "A Standard workflow uses a Choice state and a Task state in a loop to process pages of results from an API. A large customer has about 9,000 pages. These executions fail near the end, and the execution history shows about 25,000 events. Which solution will meet these requirements?",
    options: [
      { text: "After a set number of pages, start a new execution of the state machine from a Task state, and pass the next page token as input.", correct: true,
        why: "A Standard execution has a hard quota of 25,000 history events. A new execution starts with an empty history and continues the work." },
      { text: "Request a Service Quotas increase for the execution history size.", correct: false,
        why: "The 25,000-event history quota is a hard quota. AWS does not increase it." },
      { text: "Set a larger TimeoutSeconds value at the top level of the state machine.", correct: false,
        why: "The executions do not time out. They fail because the history reaches 25,000 events." },
      { text: "Add a retrier for States.ALL to the Task state.", correct: false,
        why: "Retries add more history events. The execution reaches the quota sooner." }
    ],
    explanation: "Standard executions fail at 25,000 history events. Continue the work in a new execution, or use a Distributed Map, where each child execution has its own history." },

  { id: "m06-022", topic: "sfn-timeouts", domain: 4,
    stem: "An Express state machine converts uploaded video files. Most executions finish in 2 minutes, but large files take about 8 minutes. The executions for large files fail with States.Timeout. All files must finish converting, and the workflow definition must stay the same. Which solution will meet these requirements?",
    options: [
      { text: "Create a new Standard state machine with the same definition, and start the conversions on it.", correct: true,
        why: "Express executions stop at 5 minutes. A Standard execution can run for up to 1 year, and the workflow type of a state machine cannot change." },
      { text: "Call UpdateStateMachine to change the type of the existing state machine to STANDARD.", correct: false,
        why: "The workflow type is immutable after you create the state machine." },
      { text: "Set TimeoutSeconds to 600 at the top level of the Express state machine.", correct: false,
        why: "The 5-minute maximum for Express executions is a hard quota. A larger TimeoutSeconds value does not extend it." },
      { text: "Request a Service Quotas increase for the Express execution duration.", correct: false,
        why: "The maximum execution time is a hard quota that AWS does not increase." }
    ],
    explanation: "Express executions run for a maximum of 5 minutes. For longer work, use a Standard workflow. You cannot change the type of an existing state machine." },

  { id: "m06-023", topic: "sfn-parallel-map", domain: 1,
    stem: "A company stores a 4 GB CSV file with 2 million rows in Amazon S3. A workflow must call a Lambda function for each row, with about 1,000 rows in process at the same time. Which configuration will meet these requirements? (Choose two.)",
    options: [
      { text: "Use a Map state in DISTRIBUTED mode with an ItemReader that reads the CSV file from Amazon S3.", correct: true,
        why: "A Distributed Map reads large S3 datasets with ItemReader and runs each item in a child execution with its own history." },
      { text: "Set MaxConcurrency to 1000 on the Map state.", correct: true,
        why: "In Distributed mode, MaxConcurrency sets the number of parallel child executions. Up to 10,000 are possible." },
      { text: "Use a Map state in INLINE mode with MaxConcurrency set to 1000.", correct: false,
        why: "Inline mode supports a maximum of 40 concurrent iterations. Its history also counts toward the 25,000-event quota." },
      { text: "Pass the CSV content in the execution input and use ItemsPath to select the rows.", correct: false,
        why: "Execution input is limited to 256 KiB. A 4 GB file does not fit." },
      { text: "Use a Parallel state with one branch for each group of rows.", correct: false,
        why: "Parallel branches are fixed in the definition. They cannot scale to the number of rows in a file." }
    ],
    explanation: "Use a Distributed Map for large S3 datasets, more than 40 concurrent iterations, or histories that would pass 25,000 events. It supports up to 10,000 parallel child executions." },

  { id: "m06-024", topic: "sfn-parallel-map", domain: 1,
    stem: "A Distributed Map processes 100,000 product records. A few records have bad data, and their child executions fail. The job must continue if up to 5 percent of the records fail. The results of all child executions must be saved as files for later analysis. Which configuration will meet these requirements? (Choose two.)",
    options: [
      { text: "Set ToleratedFailurePercentage to 5 on the Map state.", correct: true,
        why: "The Map Run fails only when more than 5 percent of the items fail. Below that, the job continues." },
      { text: "Configure a ResultWriter that writes the results to an Amazon S3 location.", correct: true,
        why: "ResultWriter exports the child execution results, such as input, output, and status, to files in Amazon S3." },
      { text: "Set MaxConcurrency to 5 on the Map state.", correct: false,
        why: "MaxConcurrency limits parallel child executions. It does not let items fail." },
      { text: "Add a Catch field with States.ALL to the Map state.", correct: false,
        why: "The catcher runs after the Map state fails. With the default threshold of 0, one failed item still fails the Map Run." },
      { text: "Configure an ItemBatcher on the Map state.", correct: false,
        why: "ItemBatcher groups items into batches for each child execution. It does not tolerate failures or save results." }
    ],
    explanation: "ToleratedFailurePercentage or ToleratedFailureCount lets a Distributed Map continue when some items fail (default 0). ResultWriter writes results to Amazon S3." },

  { id: "m06-025", topic: "sfn-parallel-map", domain: 2,
    stem: "A developer adds a Distributed Map state to the state machine OrderBatch. The execution role can already invoke the Lambda function that processes each item. When the Map state runs, it cannot start any child executions because of an access error. The developer must fix the error with the least privilege. Which solution will meet these requirements?",
    options: [
      { text: "Add states:StartExecution on the OrderBatch state machine ARN, and states:DescribeExecution on its executions, to the execution role.", correct: true,
        why: "A Distributed Map starts child executions of the same state machine. The execution role needs these actions on that state machine only." },
      { text: "Add states:StartExecution on all resources (\"*\") to the execution role.", correct: false,
        why: "This fixes the error, but it lets the role start any state machine in the account. It fails the least privilege requirement." },
      { text: "Add states:StartExecution on the OrderBatch state machine ARN to the IAM role of the user who starts the parent execution.", correct: false,
        why: "Step Functions starts the child executions with the execution role, not with the caller's role. The error stays." },
      { text: "Add lambda:InvokeFunction on all functions to the execution role.", correct: false,
        why: "The role can already invoke the function. The missing permission is for starting child executions." }
    ],
    explanation: "Distributed Map runs each item as a child execution. The execution role needs states:StartExecution on its own state machine (and states:DescribeExecution)." },

  { id: "m06-026", topic: "sfn-integrations", domain: 1,
    stem: "A Standard workflow must start an AWS Glue job and continue to the next state only after the job completes. The developer wants the LEAST amount of workflow logic and no polling code. Which solution will meet these requirements?",
    options: [
      { text: "Use a Task state with the resource arn:aws:states:::glue:startJobRun.sync.", correct: true,
        why: "The .sync pattern starts the job and waits for the job to complete before the workflow moves on, with no polling states." },
      { text: "Use a Task state with the resource arn:aws:states:::glue:startJobRun.", correct: false,
        why: "Request Response moves on after the API returns. The next state runs while the job is still running." },
      { text: "Use a Task state with the resource arn:aws:states:::glue:startJobRun.waitForTaskToken.", correct: false,
        why: "The AWS Glue optimized integration does not support the callback pattern. Glue also would not return a task token." },
      { text: "Start the job, then use a Wait state, a GetJobRun task, and a Choice state in a loop until the job completes.", correct: false,
        why: "This works, but it adds polling states and transitions. It fails the least workflow logic requirement." }
    ],
    explanation: "The Run a Job (.sync) pattern waits for jobs such as AWS Glue, AWS Batch, Amazon ECS, and nested Step Functions executions to complete." },

  { id: "m06-027", topic: "sfn-integrations", domain: 1,
    stem: "An expense workflow must pause until a manager approves or rejects the expense. The approval can take several days. A Lambda function sends an email with approve and reject links. The workflow must continue as soon as the manager chooses a link. Which solution will meet these requirements?",
    options: [
      { text: "Use a Task state with lambda:invoke.waitForTaskToken that passes $$.Task.Token to the function. The link handler calls SendTaskSuccess or SendTaskFailure with the token.", correct: true,
        why: "The callback pattern pauses the Standard workflow until a call returns the task token. The workflow continues as soon as the manager chooses a link." },
      { text: "Use a Wait state of 1 hour and a Choice state in a loop that checks an approval table in Amazon DynamoDB.", correct: false,
        why: "The workflow continues only at the next check, up to 1 hour late. It fails the as soon as requirement and adds transitions." },
      { text: "Use a Task state with lambda:invoke.sync.", correct: false,
        why: "Lambda does not support the .sync pattern. The function returns after it sends the email, not after the approval." },
      { text: "Use an Express workflow with an activity that the link handler completes.", correct: false,
        why: "Express workflows do not support activities and run for a maximum of 5 minutes." }
    ],
    explanation: "Use .waitForTaskToken for human approval. Pass $$.Task.Token in the payload. The receiver calls SendTaskSuccess or SendTaskFailure with the token." },

  { id: "m06-028", topic: "sfn-integrations", domain: 2,
    stem: "A Standard workflow sends a message to an Amazon SQS queue with sqs:sendMessage.waitForTaskToken. A worker Lambda function in the same account reads the message, does the work, and must resume the paused workflow. The solution must follow the principle of least privilege. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Add \"TaskToken.$\": \"$$.Task.Token\" to the message body in the Parameters field.", correct: true,
        why: "Step Functions does not add the token for you. The definition must put the token from the Context object in the message." },
      { text: "Allow states:SendTaskSuccess and states:SendTaskFailure in the worker function's execution role.", correct: true,
        why: "The worker must call these APIs with the token to resume the workflow. It needs only these two actions." },
      { text: "Allow states:* in the worker function's execution role.", correct: false,
        why: "This lets the worker start, stop, and delete state machines. It fails the least privilege requirement." },
      { text: "Have the worker call StopExecution when the work is done.", correct: false,
        why: "StopExecution aborts the execution. It does not resume the workflow with a result." },
      { text: "Give the worker function the state machine's execution role.", correct: false,
        why: "The execution role has permissions for all steps of the workflow. Sharing it gives the worker more access than it needs." }
    ],
    explanation: "For a callback, pass $$.Task.Token in the payload. The receiver needs only states:SendTaskSuccess and states:SendTaskFailure (and states:SendTaskHeartbeat if it sends heartbeats)." },

  { id: "m06-029", topic: "sfn-integrations", domain: 1,
    stem: "A step in a Standard workflow must run on a server in the company's data center. The firewall blocks all inbound connections from the internet, but outbound HTTPS is allowed. The company does not want to add other AWS services for this step. Which solution will meet these requirements?",
    options: [
      { text: "Create a Step Functions activity. The on-premises worker calls GetActivityTask, does the work, and calls SendTaskSuccess or SendTaskFailure.", correct: true,
        why: "An activity worker polls Step Functions with outbound HTTPS calls only. No inbound connection and no other AWS service is needed." },
      { text: "Use an HTTP Task that sends the job to an endpoint on the on-premises server.", correct: false,
        why: "The HTTP Task makes an inbound call to the server, which the firewall blocks." },
      { text: "Use a Task state with lambda:invoke that sends the job to the on-premises server.", correct: false,
        why: "The function must call the server, which the firewall blocks. It also adds another AWS service." },
      { text: "Use an Express workflow with an activity.", correct: false,
        why: "Express workflows do not support activities." }
    ],
    explanation: "Activities let workers that you host anywhere poll for work with GetActivityTask. Activities are supported only in Standard workflows." },

  { id: "m06-030", topic: "sfn-security", domain: 2,
    stem: "A Task state invokes a Lambda function with FunctionName set to arn:aws:lambda:us-east-1:111122223333:function:pricing:prod. The execution role allows lambda:InvokeFunction on arn:aws:lambda:us-east-1:111122223333:function:pricing. The task fails with an access denied error. The fix must follow the principle of least privilege. Which solution will meet these requirements?",
    options: [
      { text: "Change the policy resource to arn:aws:lambda:us-east-1:111122223333:function:pricing:prod.", correct: true,
        why: "An unqualified function ARN does not allow the invocation of an alias. The resource must include the qualifier, here only the prod alias." },
      { text: "Change the policy resource to \"*\".", correct: false,
        why: "This allows the role to invoke every function in the account. It fails the least privilege requirement." },
      { text: "Add states:StartExecution to the execution role.", correct: false,
        why: "states:StartExecution starts state machines. It does not allow the Lambda invocation." },
      { text: "Add lambda:InvokeFunction for the function to the IAM user who starts the execution.", correct: false,
        why: "Step Functions invokes the function with the execution role, not with the caller's permissions." }
    ],
    explanation: "When FunctionName has a version or alias, the execution role policy must include that qualifier (or :*). The unqualified ARN gives access denied." },

  { id: "m06-031", topic: "sfn-security", domain: 2,
    stem: "A state machine in account A must invoke a Lambda function in account B. The security team in account B does not allow resource-based policies on its functions. The solution must not store long-term credentials. Which solution will meet these requirements?",
    options: [
      { text: "Create a role in account B that allows lambda:InvokeFunction and trusts the execution role. Set the Task state's Credentials field to that role ARN.", correct: true,
        why: "The Credentials field makes the execution role assume the target role before it calls the resource. This uses temporary credentials." },
      { text: "Store access keys for an IAM user in account B in the execution input, and pass them to the function call.", correct: false,
        why: "These are long-term credentials, and the input shows in the execution history and logs." },
      { text: "Add a resource-based policy to the function in account B that allows the execution role.", correct: false,
        why: "The security team in account B does not allow resource-based policies on its functions." },
      { text: "Have the function in account B call SendTaskSuccess with a task token from account A.", correct: false,
        why: "Task tokens work only from principals in the same AWS account. This also does not invoke the function." }
    ],
    explanation: "Use the Task state Credentials field with a role in the other account. The execution role assumes the role and calls the resource with temporary credentials." },

  { id: "m06-032", topic: "sfn-security", domain: 2,
    stem: "A healthcare company must encrypt the state machine definition and execution history of a Standard workflow with an encryption key that the company controls, rotates, and audits. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Configure the state machine encryption with a symmetric customer managed AWS KMS key.", correct: true,
        why: "Step Functions supports a customer managed key as a second layer of encryption for the definition and execution history." },
      { text: "Allow kms:Decrypt and kms:GenerateDataKey on the key for the state machine's execution role.", correct: true,
        why: "Standard executions with a customer managed key need these two actions in the execution role." },
      { text: "Keep the default encryption with an AWS owned key.", correct: false,
        why: "The company cannot control, rotate, or audit an AWS owned key. It fails the control requirement." },
      { text: "Configure the state machine encryption with an asymmetric customer managed AWS KMS key.", correct: false,
        why: "Step Functions supports only symmetric customer managed keys." },
      { text: "Allow kms:Encrypt on the key for the IAM user who calls StartExecution.", correct: false,
        why: "StartExecution needs no KMS permission from the caller. The execution role needs the KMS permissions." }
    ],
    explanation: "Step Functions always encrypts at rest with an AWS owned key. Add a symmetric customer managed key for control. The execution role needs kms:Decrypt and kms:GenerateDataKey." },

  { id: "m06-033", topic: "sfn-security", domain: 2,
    stem: "An Express workflow processes loan applications that contain personal data. The team must keep a record of failed executions in CloudWatch Logs. The logs must not contain the input or output data of the executions. Which logging configuration will meet these requirements?",
    options: [
      { text: "Log level ERROR with includeExecutionData set to false.", correct: true,
        why: "ERROR logs the failure events. With includeExecutionData false, the logs do not contain the input, output, or variables." },
      { text: "Log level ALL with includeExecutionData set to true.", correct: false,
        why: "This logs all events with the input and output data. It fails the requirement to keep personal data out of the logs." },
      { text: "Log level ERROR with includeExecutionData set to true.", correct: false,
        why: "The error events would contain execution data. It fails the requirement to keep personal data out of the logs." },
      { text: "Log level OFF.", correct: false,
        why: "No events are logged. It fails the requirement to keep a record of failed executions." }
    ],
    explanation: "Log levels are ALL, ERROR, FATAL, and OFF. includeExecutionData controls whether logs contain input, output, and variables." },

  { id: "m06-034", topic: "sfn-security", domain: 2,
    stem: "A developer configures an Amazon API Gateway REST API method with an AWS service integration that calls the Step Functions StartExecution action for a Standard state machine. Requests fail with an authorization error. The fix must follow the principle of least privilege. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Create an IAM role that API Gateway can assume and that allows states:StartExecution on the state machine ARN.", correct: true,
        why: "An AWS service integration calls Step Functions with an IAM role. The role needs only StartExecution on this state machine." },
      { text: "Set that role as the execution role (credentials) of the API Gateway integration.", correct: true,
        why: "API Gateway uses the integration credentials role to sign the StartExecution call." },
      { text: "Add states:StartExecution to the state machine's execution role.", correct: false,
        why: "The execution role is what the state machine uses to call other services. API Gateway does not use it to start executions." },
      { text: "Add a Lambda resource-based policy that allows apigateway.amazonaws.com.", correct: false,
        why: "No Lambda function is involved in this integration, so the policy does not fix the error." },
      { text: "Change the integration action to StartSyncExecution.", correct: false,
        why: "StartSyncExecution supports only Express workflows, and it does not fix the missing permission." }
    ],
    explanation: "API Gateway AWS service integrations need an IAM role that allows the target action. The caller's permission is separate from the state machine's execution role." },

  { id: "m06-035", topic: "sfn-observability", domain: 4,
    stem: "A Standard workflow has 10 steps. An execution failed at step 7 because a downstream service was down. Steps 1 to 6 took 3 hours and must not run again. The service is now working, and the state machine definition has not changed. The execution failed 2 days ago. Which solution will meet these requirements?",
    options: [
      { text: "Call RedriveExecution for the failed execution.", correct: true,
        why: "Redrive restarts a failed Standard execution from the failed step with the same input. Successful steps do not run again. The redrive period is 14 days." },
      { text: "Call StartExecution with the same input as the failed execution.", correct: false,
        why: "A new execution starts at step 1, so steps 1 to 6 run again." },
      { text: "Add a retrier with MaxAttempts set to 10 to step 7, then wait for the execution to continue.", correct: false,
        why: "A definition change does not affect a closed execution. The failed execution does not continue." },
      { text: "Call SendTaskSuccess for step 7 with the task token from the execution history.", correct: false,
        why: "SendTaskSuccess works only for a task that is waiting for a callback. The execution is already closed." }
    ],
    explanation: "Redrive continues a failed, aborted, or timed-out Standard execution from the unsuccessful step, within 14 days, with the same definition and input." },

  { id: "m06-036", topic: "sfn-observability", domain: 4,
    stem: "An operations team must get an email when any execution of a Standard state machine fails or times out. The solution must have the LEAST operational overhead and must not change the state machine definition. Which solution will meet these requirements?",
    options: [
      { text: "Create an Amazon EventBridge rule for source aws.states, detail type Step Functions Execution Status Change, and status FAILED or TIMED_OUT, with an Amazon SNS topic as the target.", correct: true,
        why: "Standard workflows send status change events to EventBridge automatically. The rule matches failures and timeouts and notifies through SNS." },
      { text: "Schedule a Lambda function every minute that calls ListExecutions and emails new failures.", correct: false,
        why: "This adds code and a schedule to maintain. It fails the least operational overhead requirement." },
      { text: "Add a catcher with States.ALL to every Task state that publishes to an SNS topic.", correct: false,
        why: "This changes the definition. It also misses execution timeouts and errors that States.ALL does not catch." },
      { text: "Enable X-Ray tracing on the state machine and create a sampling rule for failed requests.", correct: false,
        why: "X-Ray sampling selects which requests to trace. It does not send notifications." }
    ],
    explanation: "Standard workflows send Execution Status Change events to the EventBridge default bus. Match the status in a rule to notify or react." },

  { id: "m06-037", topic: "sfn-observability", domain: 4,
    stem: "A developer enabled AWS X-Ray tracing on an existing state machine that uses an existing IAM execution role. Executions succeed, but no traces for the state machine appear in X-Ray. Which actions should the developer take to fix the problem? (Choose two.)",
    options: [
      { text: "Add xray:PutTraceSegments, xray:PutTelemetryRecords, xray:GetSamplingRules, and xray:GetSamplingTargets to the execution role.", correct: true,
        why: "When you enable tracing with an existing role, you must add the X-Ray write permissions to that role." },
      { text: "Check that the X-Ray sampling rules allow the state machine's requests to be sampled.", correct: true,
        why: "X-Ray records only sampled requests. A sampling rule that samples nothing gives no traces." },
      { text: "Set the state machine log level to ALL.", correct: false,
        why: "Log levels control CloudWatch Logs. They do not send trace data to X-Ray." },
      { text: "Install the X-Ray daemon on the Step Functions service.", correct: false,
        why: "Step Functions is a managed service. It sends traces itself, and you cannot install software on it." },
      { text: "Change the state machine to an Express workflow.", correct: false,
        why: "X-Ray tracing works with Standard and Express workflows. The type does not cause the problem." }
    ],
    explanation: "For X-Ray, enable tracing and give the execution role the X-Ray write permissions. Also check the sampling rules and that new IAM changes have taken effect." },

  { id: "m06-038", topic: "sfn-deploy", domain: 3,
    stem: "A team deploys a state machine with AWS SAM. For each release, the team wants to send 10 percent of executions to the new version first, then all executions after 10 minutes. The deployment must roll back automatically if a CloudWatch alarm goes into the ALARM state. Which solution will meet these requirements?",
    options: [
      { text: "Set AutoPublishAlias on the state machine, and set DeploymentPreference with Type CANARY, Percentage 10, Interval 10, and the alarm in Alarms.", correct: true,
        why: "CANARY shifts a small percentage first and the rest after the interval. CloudFormation rolls back if a listed alarm goes into ALARM." },
      { text: "Set AutoPublishAlias, and set DeploymentPreference with Type LINEAR, Percentage 10, Interval 10, and the alarm in Alarms.", correct: false,
        why: "LINEAR shifts 10 percent every 10 minutes, so all traffic moves after about 100 minutes, not after one 10-minute step." },
      { text: "Set AutoPublishAlias, and set DeploymentPreference with Type ALL_AT_ONCE and the alarm in Alarms.", correct: false,
        why: "ALL_AT_ONCE sends 100 percent of executions to the new version at once. It fails the 10 percent first requirement." },
      { text: "Create an alias with a routing configuration of 90 and 10 percent, and change the weights by hand after 10 minutes.", correct: false,
        why: "This splits traffic, but nothing rolls back automatically when the alarm goes into ALARM." }
    ],
    explanation: "State machine aliases support gradual deployment with DeploymentPreference types CANARY, LINEAR, and ALL_AT_ONCE, with CloudWatch alarm rollback." },

  { id: "m06-039", topic: "sfn-deploy", domain: 3,
    stem: "A developer keeps a state machine definition in the file statemachine/order.asl.json and deploys it with AWS SAM. The definition must use the ARNs of a Lambda function and a DynamoDB table that the same SAM template creates. The ARNs must not be hardcoded, and the workflow must not add states to look them up. Which solution will meet these requirements?",
    options: [
      { text: "Use ${OrderFunctionArn} and ${OrdersTable} placeholders in the file, and map them in DefinitionSubstitutions with !GetAtt and !Ref.", correct: true,
        why: "DefinitionUri loads the file, and DefinitionSubstitutions replaces the placeholders with values from the template at deployment time." },
      { text: "Write !GetAtt OrderFunction.Arn directly in the order.asl.json file.", correct: false,
        why: "CloudFormation does not process intrinsic functions inside the definition file. The text stays as written." },
      { text: "Pass the ARNs in the execution input for every execution.", correct: false,
        why: "Every caller must know and send the ARNs. The values are not set from the template at deployment time." },
      { text: "Store the ARNs in Parameter Store and read them with an aws-sdk:ssm:getParameter Task at the start of each execution.", correct: false,
        why: "This adds a state to look up the ARNs in every execution. It fails the requirement to add no states." }
    ],
    explanation: "Use DefinitionSubstitutions in AWS SAM or CloudFormation to put resource ARNs from the template into ${...} placeholders in the definition." },

  { id: "m06-040", topic: "sfn-deploy", domain: 3,
    stem: "A developer changes the InputPath, Parameters, and ResultPath fields of one Task state. Before the developer deploys the change, the developer wants to run only this state with a sample input and see the data after each processing step. The developer does not want to create or update a state machine. Which solution will meet these requirements?",
    options: [
      { text: "Call the TestState API with the state definition, the sample input, and inspectionLevel set to DEBUG.", correct: true,
        why: "TestState runs one state without a state machine. DEBUG returns the data after InputPath, Parameters, ResultSelector, and ResultPath." },
      { text: "Call the TestState API with the state definition, the sample input, and inspectionLevel set to INFO.", correct: false,
        why: "INFO shows only the final output or the error. It does not show the data after each processing step." },
      { text: "Call the TestState API with inspectionLevel set to TRACE.", correct: false,
        why: "TRACE is only for HTTP Tasks. Step Functions returns an error for other state types." },
      { text: "Publish a new state machine version and start an execution with the sample input.", correct: false,
        why: "This updates the state machine, which the developer does not want to do." }
    ],
    explanation: "The TestState API runs one state without a deployed state machine. Inspection levels are INFO (default), DEBUG (data processing steps), and TRACE (HTTP Tasks)." }

] });
