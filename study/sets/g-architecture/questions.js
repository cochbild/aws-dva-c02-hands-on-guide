window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "g-architecture", questions: [

  { id: "garch-001", topic: "arch-event-driven", domain: 1,
    stem: "An order service publishes an event for each new order. Three teams (billing, shipping, and analytics) must each process every order. Each team processes at a different speed, and a team must not lose orders when its consumer is down for up to one day. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Publish each order to an Amazon SNS topic. Subscribe one Amazon SQS queue for each team, and let each team consume from its own queue.", correct: true,
        why: "SNS fans out one copy of each message to every subscribed queue. Each queue keeps its copy until that team reads it, so each team gets every order at its own speed." },
      { text: "Send each order to one Amazon SQS standard queue, and let all three teams poll the same queue.", correct: false,
        why: "Consumers of one queue compete for messages. Each message goes to only one consumer, so the requirement that each team processes every order fails." },
      { text: "Publish each order to an Amazon SNS topic with an HTTPS subscription for each team's service.", correct: false,
        why: "An HTTPS subscription pushes the message to the endpoint. The message is not stored for the team to read later, so a consumer that is down can lose orders." },
      { text: "Make the order service call each team's API directly and retry when a call fails.", correct: false,
        why: "Direct calls couple the producer to every consumer. The producer must handle each outage and change for each new team, which adds operational overhead." }
    ],
    explanation: "SNS to SQS fanout gives each consumer its own durable copy of every message. Each consumer reads at its own speed." },

  { id: "garch-002", topic: "arch-event-driven", domain: 2,
    stem: "A developer subscribes an Amazon SQS queue to an Amazon SNS topic in the same account. Publish calls to the topic succeed, but no messages arrive in the queue. The queue must accept messages only from this one topic. Which solution will meet these requirements in the MOST secure way?",
    options: [
      { text: "Add a statement to the queue policy that allows the sns.amazonaws.com service principal to perform sqs:SendMessage, with an aws:SourceArn condition that equals the topic ARN.", correct: true,
        why: "SNS needs permission on the queue to send messages. The aws:SourceArn condition limits that permission to this one topic." },
      { text: "Add a statement to the queue policy that allows Principal \"*\" to perform sqs:SendMessage.", correct: false,
        why: "This lets any principal send to the queue. It fails the requirement to accept messages only from the one topic." },
      { text: "Attach an IAM policy that allows sqs:SendMessage to the IAM role of the application that publishes to the topic.", correct: false,
        why: "SNS, not the publisher, sends the message to the queue. The publisher's role does not give SNS permission on the queue." },
      { text: "Allow the sns.amazonaws.com service principal to perform sqs:SendMessage in the queue policy with no condition.", correct: false,
        why: "Delivery works, but any SNS topic can then send to the queue. It is less secure than a policy with the aws:SourceArn condition." }
    ],
    explanation: "For SNS to SQS fanout, the queue policy must allow sns.amazonaws.com to do sqs:SendMessage, because SNS, not the publisher, sends to the queue. Use aws:SourceArn to limit it to one topic. Without the condition, any SNS topic can send to the queue." },

  { id: "garch-003", topic: "arch-event-driven", domain: 1,
    stem: "An application emits JSON events for orders. Events with \"region\": \"EU\" in the event body must go to one AWS Lambda function, and events with a \"priority\": \"high\" field must go to an AWS Step Functions state machine. Other teams will add new consumers later. The producer must not change when consumers are added. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Publish the events to an Amazon EventBridge event bus. Create one rule for each consumer, with an event pattern that matches the needed fields.", correct: true,
        why: "EventBridge rules match on any field in the event and route to many target types, including Lambda and Step Functions. New consumers add new rules with no producer change." },
      { text: "Send the events to an Amazon SQS queue, and write a Lambda function that reads the queue and calls each consumer.", correct: false,
        why: "The router function is custom code that must change for every new consumer. This adds operational overhead." },
      { text: "Have the producer call the Lambda function and the state machine directly based on the event fields.", correct: false,
        why: "The producer then knows every consumer. It must change each time a consumer is added, which fails the requirement." },
      { text: "Write the events to an Amazon DynamoDB table, and let each consumer scan the table every minute.", correct: false,
        why: "Polling a table is custom code with delay and read cost. It is not a managed event router, so overhead is higher." }
    ],
    explanation: "EventBridge routes events by content with event patterns. Producers publish to the bus and do not know the consumers." },

  { id: "garch-004", topic: "arch-event-driven", domain: 4,
    stem: "An Amazon SNS topic receives all inventory events. A Lambda function is subscribed to the topic, but it needs only events where the message attribute eventType is \"OutOfStock\". The function discards about 95% of the messages that it receives, and the Lambda cost is high. Which solution will reduce the cost with the fewest code changes?",
    options: [
      { text: "Add a subscription filter policy that matches eventType equal to \"OutOfStock\" on the Lambda subscription.", correct: true,
        why: "SNS checks the filter policy before delivery. The function is invoked only for matching messages, so invocations and cost go down with no code change." },
      { text: "Increase the function memory so that it discards messages faster.", correct: false,
        why: "The function is still invoked for every message. The number of invocations does not change, so the main cost stays." },
      { text: "Configure reserved concurrency of 1 on the function.", correct: false,
        why: "Reserved concurrency limits parallel runs. SNS still delivers every message, so the function still processes the same number of events." },
      { text: "Create a second SNS topic, and change the producer to publish OutOfStock events to it.", correct: false,
        why: "This works, but it changes the producer. A filter policy gets the same result with no code change." }
    ],
    explanation: "SNS subscription filter policies deliver only matching messages to a subscriber. They act on message attributes or on the message body." },

  { id: "garch-005", topic: "arch-event-driven", domain: 1,
    stem: "A company is moving from a design where the checkout service calls the email, loyalty, and fraud services directly. A failure in any one of these services now makes checkout fail. The company wants checkout to succeed when a downstream service is down, and new services must be able to react to checkouts without a change to the checkout service. Which actions should a developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "Make the checkout service publish a CheckoutCompleted event to an Amazon EventBridge event bus and return to the user.", correct: true,
        why: "The checkout service publishes one event and does not wait for downstream services. A downstream outage no longer fails checkout." },
      { text: "Create an EventBridge rule for each downstream service that matches CheckoutCompleted events and targets that service.", correct: true,
        why: "Each consumer has its own rule. New services add a rule, and the checkout service does not change." },
      { text: "Add retries with exponential backoff to each direct call from the checkout service.", correct: false,
        why: "Retries help with short errors, but checkout still waits for and depends on each service. A long outage still fails checkout." },
      { text: "Wrap the three calls in one AWS Step Functions Express workflow that checkout invokes synchronously.", correct: false,
        why: "Checkout still waits for all three services and still must change the workflow for each new service. Both requirements fail." },
      { text: "Put the three downstream services behind one Application Load Balancer.", correct: false,
        why: "A load balancer spreads requests across targets of one service. It does not decouple checkout from the services or let new consumers subscribe." }
    ],
    explanation: "Publish an event and let each consumer subscribe with its own rule. The producer does not wait for consumers and does not change when consumers are added." },

  { id: "garch-006", topic: "arch-event-driven", domain: 1,
    stem: "An Amazon EventBridge rule on the default event bus matches \"Object Created\" events from an Amazon S3 bucket. The rule already has 5 targets. A team must add 2 more targets for the same events. Which solution will meet these requirements?",
    options: [
      { text: "Create a second rule with the same event pattern, and add the 2 new targets to it.", correct: true,
        why: "One rule can have a maximum of 5 targets. A second rule with the same pattern sends the same events to more targets." },
      { text: "Request a Service Quotas increase for targets for each rule.", correct: false,
        why: "The limit of 5 targets for each rule is not adjustable. The request cannot add the targets." },
      { text: "Add an input transformer to the rule.", correct: false,
        why: "An input transformer changes the event content for a target. It does not raise the number of targets on the rule." },
      { text: "Turn on archive for the event bus, and replay the events to the new targets.", correct: false,
        why: "Replay sends past events to rules again. It does not add targets to a rule for new events." }
    ],
    explanation: "An EventBridge rule can have up to 5 targets, and this quota is not adjustable. Use more rules with the same pattern, or a fanout target such as an SNS topic." },

  { id: "garch-007", topic: "arch-event-driven", domain: 2,
    stem: "A company has 20 AWS accounts in one organization in AWS Organizations. Each account emits application events to its default Amazon EventBridge event bus. A security team wants all these events on one event bus in a central account. Only accounts in the organization must be able to send events to the central bus. Which solution will meet these requirements?",
    options: [
      { text: "Add a resource-based policy to the central event bus that allows events:PutEvents for the organization ID. In each account, create a rule that targets the central event bus ARN with an IAM role.", correct: true,
        why: "The receiver bus policy controls which accounts can send events. Rules in sender accounts forward events to the central bus, and new cross-account bus targets need an IAM role." },
      { text: "Add a resource-based policy to the central event bus that allows events:PutEvents for Principal \"*\".", correct: false,
        why: "This lets any AWS account send events to the bus. It fails the requirement that only accounts in the organization can send." },
      { text: "Create an IAM user in the central account, and store its access keys in each account so that applications call PutEvents on the central bus.", correct: false,
        why: "Long-term access keys shared across 20 accounts are not secure. The requirement is met more safely with a bus policy and rules." },
      { text: "Turn on AWS CloudTrail in each account, and deliver the trails to an S3 bucket in the central account.", correct: false,
        why: "CloudTrail records AWS API calls. It does not deliver the application events to a central event bus." }
    ],
    explanation: "For cross-account EventBridge, the receiver bus needs a resource-based policy for the sender accounts or organization. Sender rules target the receiver bus ARN." },

  { id: "garch-008", topic: "arch-microservices", domain: 1,
    stem: "A company splits a monolith into an orders microservice and an inventory microservice. Both services read and write the same Amazon RDS table. A schema change by the inventory team broke the orders service. The teams want to change their data models without breaking each other. Which actions should the developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "Give each service its own data store that only that service reads and writes.", correct: true,
        why: "Database per service removes the shared schema. One team can change its tables without breaking the other service." },
      { text: "Make the inventory service publish events (for example, StockChanged) that the orders service consumes, or expose the data through an API.", correct: true,
        why: "Other services get the data through a defined contract (events or an API), not through the tables. The internal schema can change behind the contract." },
      { text: "Add an RDS read replica for the orders service.", correct: false,
        why: "A read replica copies the same schema. A schema change still breaks the orders service." },
      { text: "Create a database view that both teams must approve before any change.", correct: false,
        why: "The teams still share one database and must agree on every change. They cannot change their data models independently." },
      { text: "Move the shared table to Amazon DynamoDB and keep both services on it.", correct: false,
        why: "The services still share one table and one data model. The coupling stays, only the database engine changes." }
    ],
    explanation: "Each microservice owns its data. Other services use its API or its events, not its tables." },

  { id: "garch-009", topic: "arch-microservices", domain: 3,
    stem: "A team runs a monolithic application. The search feature changes many times each day, but every change requires a deployment of the whole application, and each deployment takes 90 minutes of testing. The team wants to release search changes without deploying other features. Which solution will meet these requirements?",
    options: [
      { text: "Move search into a separate service with its own code repository, pipeline, and deployment, and call it through an API.", correct: true,
        why: "A separate microservice deploys on its own. Search changes then release without a deployment of the other features." },
      { text: "Increase the size of the instances that run the monolith.", correct: false,
        why: "Larger instances do not change the deployment unit. Every search change still deploys the whole application." },
      { text: "Use a blue/green deployment for the monolith.", correct: false,
        why: "Blue/green reduces deployment risk and downtime, but it still deploys the whole application for each change." },
      { text: "Add more stages to the existing pipeline for the monolith.", correct: false,
        why: "More stages make the pipeline longer. The whole application is still one deployment unit." }
    ],
    explanation: "Microservices deploy and scale independently. A monolith deploys as one unit for every change." },

  { id: "garch-010", topic: "arch-microservices", domain: 4,
    stem: "A request passes through Amazon API Gateway, then three microservices that run on AWS Lambda and Amazon ECS. Some requests take 8 seconds. Each service writes its own logs, and the team cannot tell which service causes the delay. Which solution will meet these requirements with the LEAST effort?",
    options: [
      { text: "Turn on AWS X-Ray tracing in API Gateway and Lambda, instrument the ECS services with the X-Ray SDK or AWS Distro for OpenTelemetry, and use the trace map to find the slow segment.", correct: true,
        why: "Distributed tracing follows one request across all services. The traces show the time spent in each service and downstream call." },
      { text: "Increase the timeout of each Lambda function.", correct: false,
        why: "A longer timeout does not show where time is spent. The slow service stays unknown." },
      { text: "Turn on API Gateway caching for the API.", correct: false,
        why: "Caching can hide latency for repeated requests. It does not find which service causes the delay." },
      { text: "Export all logs to Amazon S3 and correlate them by timestamp with Amazon Athena.", correct: false,
        why: "Timestamp matching across services is manual and error-prone. It is more effort than tracing." }
    ],
    explanation: "In microservices, one request crosses many services. Use distributed tracing such as AWS X-Ray to find the slow part." },

  { id: "garch-011", topic: "arch-orchestration", domain: 1,
    stem: "A loan application process has five steps across different services. A manager must approve loans above a limit, which can take up to 2 days. The operations team needs one place to see the current step of each application and the error, if any. Which solution will meet these requirements?",
    options: [
      { text: "Use an AWS Step Functions Standard workflow. Use a task with the .waitForTaskToken pattern for the approval step.", correct: true,
        why: "Step Functions is a central orchestrator with execution history for each run. Standard workflows run up to 1 year and support the callback pattern for human approval." },
      { text: "Use an AWS Step Functions Express workflow with a Wait state for the approval.", correct: false,
        why: "Express workflows run a maximum of 5 minutes and do not support the callback pattern. A 2-day approval does not fit." },
      { text: "Make each service publish an event to Amazon EventBridge when its step completes, and let the next service react.", correct: false,
        why: "Choreography spreads the flow across services. There is no one place that shows the current step of each application." },
      { text: "Chain AWS Lambda functions so that each function invokes the next one asynchronously.", correct: false,
        why: "No component shows the state of each application. One function also cannot wait 2 days for approval, because the timeout is 15 minutes for standard functions." }
    ],
    explanation: "Orchestration with Step Functions gives central visibility. Standard workflows support long waits and human approval with task tokens." },

  { id: "garch-012", topic: "arch-orchestration", domain: 1,
    stem: "An order workflow reserves inventory, charges the customer's card, and then books shipping. Each step calls a different microservice with its own database. If booking shipping fails, the company must refund the card and release the inventory. Which solution will meet these requirements?",
    options: [
      { text: "Implement a saga in AWS Step Functions. On a shipping failure, run compensating steps that refund the payment and then release the inventory.", correct: true,
        why: "A saga uses local transactions and undoes completed steps with compensating transactions. Step Functions can route a failure to the compensation states." },
      { text: "Use one database transaction that spans the three service databases.", correct: false,
        why: "Each service has its own database. One ACID transaction cannot span them, so this design is not possible." },
      { text: "Configure Retry on the shipping step with unlimited attempts.", correct: false,
        why: "Retries do not undo the earlier steps. If shipping keeps failing, the card stays charged and the inventory stays reserved." },
      { text: "Send failed orders to an Amazon SQS dead-letter queue for later review.", correct: false,
        why: "A dead-letter queue keeps the failed message. It does not refund the card or release the inventory." }
    ],
    explanation: "A saga keeps data consistent across services. When a step fails, compensating transactions undo the steps that already completed." },

  { id: "garch-013", topic: "arch-orchestration", domain: 1,
    stem: "An IoT application receives about 50,000 sensor events each second. Each event goes through three short transformation steps that finish in less than 2 seconds. The steps are idempotent. The company wants a managed workflow service at the LOWEST cost. Which solution will meet these requirements?",
    options: [
      { text: "Use AWS Step Functions Express workflows.", correct: true,
        why: "Express workflows are made for high-volume, short event processing. They are priced by executions, duration, and memory, and their at-least-once semantics fit idempotent steps." },
      { text: "Use AWS Step Functions Standard workflows.", correct: false,
        why: "Standard workflows are priced for each state transition and have lower throughput limits. They cost more for this volume of short runs." },
      { text: "Use AWS Step Functions Standard workflows with a Distributed Map state for each event.", correct: false,
        why: "Distributed Map runs large parallel batches inside one Standard execution. It does not lower the cost of many short independent runs." },
      { text: "Run the three steps in a long-running Amazon EC2 application.", correct: false,
        why: "EC2 is not a managed workflow service. The team must manage the servers and the workflow logic." }
    ],
    explanation: "Express workflows suit high-volume, short, idempotent work and run up to 5 minutes. Standard workflows suit long, exactly-once work." },

  { id: "garch-014", topic: "arch-orchestration", domain: 1,
    stem: "A payment workflow waits for an external fraud check service. The fraud service sends its result back up to 3 days later. The payment step must never run twice for the same order. Which actions should a developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "Use an AWS Step Functions Standard workflow.", correct: true,
        why: "Standard workflows run up to 1 year with exactly-once execution. This suits a 3-day wait and a non-idempotent payment step." },
      { text: "Use the .waitForTaskToken service integration pattern, and have the fraud result call SendTaskSuccess or SendTaskFailure with the token.", correct: true,
        why: "The callback pattern pauses the workflow until the external service returns the token. The workflow uses no compute while it waits." },
      { text: "Use an AWS Step Functions Express workflow.", correct: false,
        why: "Express workflows run a maximum of 5 minutes and do not support the callback pattern. Asynchronous Express is also at least once." },
      { text: "Use an AWS Lambda function that polls the fraud service in a loop until the result arrives.", correct: false,
        why: "A Lambda function can run a maximum of 15 minutes for standard functions. It cannot wait 3 days." },
      { text: "Put the order in an Amazon SQS delay queue until the fraud check completes.", correct: false,
        why: "The maximum delay is 15 minutes. A delay queue also does not know when the fraud result arrives." }
    ],
    explanation: "Use Standard workflows for long, exactly-once work. Use .waitForTaskToken to wait for a callback from an external system." },

  { id: "garch-015", topic: "arch-orchestration", domain: 1,
    stem: "A saga refunds a payment as a compensating step. During a network problem, Step Functions retried the refund step, and one customer received two refunds. The developer must make sure that a retry cannot refund twice, with the fewest changes. Which solution will meet these requirements?",
    options: [
      { text: "Make the refund step idempotent. Pass a unique refund ID, and record it with a conditional write so that a repeated request does nothing.", correct: true,
        why: "Saga participants must be idempotent because steps can run again. A conditional write on the refund ID stops the second refund." },
      { text: "Remove the Retry field from the refund step.", correct: false,
        why: "Without retries, a short network error leaves the payment not refunded. The compensation can fail, so data stays inconsistent." },
      { text: "Change the workflow to an Express workflow.", correct: false,
        why: "Asynchronous Express workflows are at least once. They can run steps more than one time, so the problem can get worse." },
      { text: "Increase the timeout of the refund task.", correct: false,
        why: "A longer timeout can reduce some retries, but it does not stop a repeated request from refunding again." }
    ],
    explanation: "Steps in a saga, including compensating steps, can run more than one time. Make each step idempotent." },

  { id: "garch-016", topic: "arch-coupling-sync", domain: 1,
    stem: "A web application writes customer survey answers directly to an Amazon RDS database. During marketing campaigns, traffic increases 20 times for a few minutes, and the database runs out of connections. Answers can be saved up to 10 minutes after submission. Which solution will meet these requirements in the MOST cost-effective way?",
    options: [
      { text: "Send each answer to an Amazon SQS queue, and use a consumer that writes to the database at a rate the database supports.", correct: true,
        why: "The queue absorbs the spike (load leveling). The consumer writes at a steady rate, and the 10-minute delay is acceptable." },
      { text: "Increase the database instance size to handle the peak.", correct: false,
        why: "A large instance for a few minutes of peak costs more all the time. The tight coupling between the web tier and the database stays." },
      { text: "Add an RDS read replica.", correct: false,
        why: "A read replica serves reads. The problem is writes during a spike, so a replica does not help." },
      { text: "Cache the answers in Amazon ElastiCache and never write them to the database.", correct: false,
        why: "The answers must be saved in the database. A cache is not the system of record." }
    ],
    explanation: "A queue between producer and consumer levels the load. The consumer processes at a rate that the backend can support." },

  { id: "garch-017", topic: "arch-coupling-sync", domain: 1,
    stem: "An order service calls a shipping service synchronously through an HTTP API. When the shipping service is down, customers cannot place orders. The business wants customers to place orders during a shipping outage, and shipping must process each order when it recovers. Which solution will meet these requirements?",
    options: [
      { text: "Have the order service send a message for each order to an Amazon SQS queue. The shipping service reads from the queue.", correct: true,
        why: "The queue decouples the services. Orders succeed while shipping is down, and the messages wait in the queue until shipping reads them." },
      { text: "Add retries with exponential backoff to the HTTP call.", correct: false,
        why: "Retries help with short errors. During a long outage, the order call still fails, so customers cannot place orders." },
      { text: "Put the shipping service behind an Application Load Balancer.", correct: false,
        why: "A load balancer spreads requests across healthy targets. If the whole service is down, the synchronous call still fails." },
      { text: "Increase the HTTP client timeout to 60 seconds.", correct: false,
        why: "A longer timeout makes customers wait longer. It does not let orders succeed while shipping is down." }
    ],
    explanation: "Loose coupling through a queue lets each side fail on its own. The producer continues, and the consumer catches up later." },

  { id: "garch-018", topic: "arch-coupling-sync", domain: 1,
    stem: "A client calls an edge-optimized Amazon API Gateway REST API that starts a report job in AWS Lambda. The job takes 3 to 6 minutes. The client gets a timeout error after about 29 seconds. The client must not keep a connection open while the report runs. Which solution will meet these requirements?",
    options: [
      { text: "Have the API send the job to an Amazon SQS queue (or start a Step Functions execution), return a job ID at once, and let the client check a status endpoint later.", correct: true,
        why: "The API returns quickly, so the integration timeout does not apply to the long work. The client checks the result later without a long open connection." },
      { text: "Increase the Lambda function timeout to 15 minutes.", correct: false,
        why: "API Gateway still ends the request at the integration timeout. The client also must keep the connection open, which fails the requirement." },
      { text: "Request a Service Quotas increase for the integration timeout of the API.", correct: false,
        why: "Edge-optimized APIs cannot raise the 29-second integration timeout. The client would also keep a connection open for minutes." },
      { text: "Turn on API Gateway caching for the API stage.", correct: false,
        why: "Caching serves repeated responses. The first request for each report still times out." }
    ],
    explanation: "For long work behind an API, use an asynchronous pattern. Accept the request, queue the work, return an ID, and let the client check status." },

  { id: "garch-019", topic: "arch-coupling-sync", domain: 1,
    stem: "A producer sends payment events to a consumer. The producer must not wait for the consumer. If the consumer is down, messages must stay available for up to 7 days. Messages that fail processing five times must go to a separate place for review, and must not block other messages. Which actions should the developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "Send the events to an Amazon SQS queue with a message retention period of 7 days.", correct: true,
        why: "The producer sends and continues. SQS keeps messages for up to 14 days, so 7 days is a valid setting." },
      { text: "Configure a dead-letter queue with a redrive policy that has maxReceiveCount set to 5.", correct: true,
        why: "After 5 receives without a delete, SQS moves the message to the dead-letter queue. Other messages continue to flow." },
      { text: "Set the message retention period to 21 days.", correct: false,
        why: "The maximum SQS retention period is 14 days. SQS does not accept 21 days." },
      { text: "Invoke the consumer Lambda function synchronously from the producer.", correct: false,
        why: "A synchronous call makes the producer wait, and the call fails when the consumer is down. Both requirements fail." },
      { text: "Set the queue visibility timeout to 12 hours.", correct: false,
        why: "The visibility timeout hides a message while a consumer processes it. It does not move failed messages to a separate place." }
    ],
    explanation: "SQS decouples producer and consumer and keeps messages up to 14 days. A dead-letter queue isolates messages that fail many times." },

  { id: "garch-020", topic: "arch-coupling-sync", domain: 4,
    stem: "A producer sends JSON documents to an Amazon SQS queue. Some documents are 5 MB, and SendMessage fails for them. The developer must keep SQS between the producer and the consumer. Which solution will meet these requirements?",
    options: [
      { text: "Store each large document in Amazon S3, and send a message that contains a reference to the S3 object (for example, with the SQS extended client library).", correct: true,
        why: "The SQS maximum message size is 1 MiB. A reference to an S3 object keeps the message small, and the consumer reads the document from S3." },
      { text: "Set the queue MaximumMessageSize attribute to 5 MB.", correct: false,
        why: "The maximum SQS message size is 1 MiB. The attribute cannot be set to 5 MB." },
      { text: "Change the queue to a FIFO queue.", correct: false,
        why: "FIFO queues have the same maximum message size. The 5 MB documents still fail." },
      { text: "Turn on server-side encryption (SSE-SQS) for the queue.", correct: false,
        why: "Encryption protects the data at rest. It does not change the 1 MiB maximum message size, so the 5 MB documents still fail." }
    ],
    explanation: "The SQS maximum message size is 1 MiB. For larger payloads, store the data in S3 and send a reference in the message." },

  { id: "garch-021", topic: "arch-coupling-sync", domain: 1,
    stem: "During checkout, a web application must show the final price, which includes a discount from a pricing service. The user must see the price before the order is submitted. The pricing service usually answers in 100 ms. Which integration will meet these requirements?",
    options: [
      { text: "Call the pricing service synchronously through an API (for example, Amazon API Gateway and AWS Lambda) and wait for the response.", correct: true,
        why: "The application needs the answer now to show the price. A synchronous request-response call fits this need." },
      { text: "Send a message to an Amazon SQS queue that the pricing service reads.", correct: false,
        why: "A queue is asynchronous. The application does not get the price back in the same request, so it cannot show it before submission." },
      { text: "Publish a PriceRequested event to Amazon EventBridge.", correct: false,
        why: "EventBridge delivers events asynchronously and does not return a response to the publisher. The price is not available for the page." },
      { text: "Invoke the pricing Lambda function with InvocationType set to Event.", correct: false,
        why: "An Event invocation returns HTTP 202 with no result. The application does not receive the price." }
    ],
    explanation: "Use synchronous calls when the caller needs the result now. Use asynchronous patterns when the caller can continue without the result." },

  { id: "garch-022", topic: "arch-stateless", domain: 1,
    stem: "A web application runs on Amazon EC2 instances in an Auto Scaling group behind an Application Load Balancer. The application stores user sessions in instance memory. When the group scales in, some users are logged out. The company wants sessions to survive scale-in and instance failure. Which solution will meet these requirements?",
    options: [
      { text: "Store the session data in Amazon ElastiCache, and make the instances stateless.", correct: true,
        why: "An external session store keeps sessions when an instance ends. Any instance can serve any request." },
      { text: "Turn on sticky sessions on the target group.", correct: false,
        why: "Sticky sessions keep a user on one instance. When that instance ends, its in-memory sessions are still lost." },
      { text: "Turn on scale-in protection for all instances.", correct: false,
        why: "Scale-in protection stops the group from scaling in. It does not protect sessions from instance failure and defeats elastic scaling." },
      { text: "Store sessions on the instance store volume of each instance.", correct: false,
        why: "Instance store data is lost when the instance stops or terminates. Sessions are still lost." }
    ],
    explanation: "Stateless compute keeps no session data. Store sessions in an external store such as ElastiCache or DynamoDB." },

  { id: "garch-023", topic: "arch-stateless", domain: 1,
    stem: "A legacy Java application keeps shopping carts in server memory. The company moves it to three EC2 instances behind an Application Load Balancer. Users report that items disappear from their carts. The team cannot change the application code this month and needs a fix now. Which solution will meet these requirements?",
    options: [
      { text: "Turn on sticky sessions (duration-based stickiness) on the target group.", correct: true,
        why: "Sticky sessions send each user's requests to the same instance, so the in-memory cart stays available. No code change is needed." },
      { text: "Store the carts in Amazon DynamoDB.", correct: false,
        why: "This is the better long-term design, but it needs a code change. It fails the requirement of no code change this month." },
      { text: "Change the target group routing algorithm to least outstanding requests.", correct: false,
        why: "This algorithm still sends a user's requests to different instances. Carts still disappear." },
      { text: "Increase the deregistration delay on the target group.", correct: false,
        why: "The deregistration delay lets in-flight requests finish on a target that is removed. It does not keep a user on one instance." }
    ],
    explanation: "Sticky sessions let a stateful application work behind a load balancer with no code change. An external session store is the better design." },

  { id: "garch-024", topic: "arch-stateless", domain: 1,
    stem: "A Lambda function counts API requests in a global variable and writes the total to a log. The total in the log is much lower than the real number of requests and sometimes goes back to zero. The developer needs an accurate total across all invocations. Which solution will meet these requirements?",
    options: [
      { text: "Store the counter in an Amazon DynamoDB item, and increase it with an UpdateItem call that uses an ADD update expression.", correct: true,
        why: "Each execution environment has its own memory, and Lambda can end an environment at any time. An atomic counter in DynamoDB is shared and durable. The ADD expression changes the value on the server, so parallel updates do not overwrite each other." },
      { text: "Store the counter in a file in /tmp.", correct: false,
        why: "Each execution environment has its own /tmp. The counts are still split across environments and lost when an environment ends." },
      { text: "Configure provisioned concurrency so that environments stay initialized.", correct: false,
        why: "There are still several environments, each with its own variable. The total is still split and is not durable." },
      { text: "Store the counter in an environment variable and update it in the handler.", correct: false,
        why: "A change to an environment variable in code affects only that one environment. It is not shared and is not saved." }
    ],
    explanation: "Lambda execution environments do not share memory, and they are not durable. Keep shared state in an external store." },

  { id: "garch-025", topic: "arch-stateless", domain: 1,
    stem: "A developer designs a web tier on Amazon ECS with AWS Fargate. The service must scale out and in freely. A user's session must last 24 hours, survive a task failure, and be deleted automatically after it expires. Which actions should the developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "Store session data in an Amazon DynamoDB table, keyed by session ID.", correct: true,
        why: "DynamoDB is durable and shared by all tasks. Any task can read the session, so a task failure does not lose it." },
      { text: "Set an expiration timestamp attribute on each session item, and turn on DynamoDB Time to Live (TTL) for that attribute.", correct: true,
        why: "TTL deletes expired items automatically. No cleanup code or job is needed." },
      { text: "Store session data in the task's ephemeral storage.", correct: false,
        why: "Task storage is lost when the task stops. Sessions do not survive a task failure." },
      { text: "Turn on sticky sessions on the load balancer target group, and keep sessions in task memory.", correct: false,
        why: "When a task fails, its in-memory sessions are lost. Stickiness also makes scaling less even." },
      { text: "Store session data in an Amazon SQS queue.", correct: false,
        why: "A queue is not a key-value store. A task cannot read one session by ID when it needs it." }
    ],
    explanation: "Keep compute stateless and store sessions in a shared, durable store. DynamoDB TTL removes expired sessions automatically." },

  { id: "garch-026", topic: "arch-caching-layers", domain: 4,
    stem: "An Amazon API Gateway REST API has a GET /catalog method backed by a Lambda function. The catalog changes once each day, and all users get the same response. The API gets 2,000 requests each second, and the Lambda cost is high. The team wants to reduce Lambda invocations with no code change. Which solution will meet these requirements?",
    options: [
      { text: "Provision an API cache on the stage and turn on caching for GET /catalog with a TTL of 3,600 seconds.", correct: true,
        why: "API Gateway serves cached responses without calling Lambda. 3,600 seconds is the maximum TTL, and the setting needs no code change." },
      { text: "Turn on caching for GET /catalog with a TTL of 86,400 seconds.", correct: false,
        why: "The maximum API Gateway cache TTL is 3,600 seconds. A 24-hour TTL is not allowed." },
      { text: "Configure provisioned concurrency on the Lambda function.", correct: false,
        why: "Provisioned concurrency reduces cold starts and adds cost. Every request still invokes the function." },
      { text: "Cache the catalog in a global variable in the Lambda function.", correct: false,
        why: "This needs a code change, and every request still invokes the function. Lambda invocations do not go down." }
    ],
    explanation: "The API Gateway cache (REST APIs) serves responses for each stage. The default TTL is 300 seconds and the maximum is 3,600 seconds." },

  { id: "garch-027", topic: "arch-caching-layers", domain: 2,
    stem: "An Amazon API Gateway REST API has caching turned on. Admin users must be able to force a fresh response by sending the Cache-Control: max-age=0 header. Other users must not be able to invalidate cache entries. Which solution will meet these requirements?",
    options: [
      { text: "Turn on Require authorization for cache invalidation, and allow execute-api:InvalidateCache only in the IAM policy for admin users.", correct: true,
        why: "With required authorization, only callers with execute-api:InvalidateCache can invalidate entries. Admins get the permission, and other users do not." },
      { text: "Leave the cache settings at their defaults, and tell other users not to send the header.", correct: false,
        why: "Without required authorization, any client can invalidate the cache with the header. The requirement is not enforced." },
      { text: "Flush the stage cache each time an admin needs fresh data.", correct: false,
        why: "Flushing removes all entries for all users and needs console or CLI access. It is not a header-based refresh for admins only." },
      { text: "Set the cache TTL to 0 seconds.", correct: false,
        why: "TTL 0 turns caching off for everyone. The cache no longer reduces backend calls." }
    ],
    explanation: "Clients invalidate an API Gateway cache entry with Cache-Control: max-age=0. Require the execute-api:InvalidateCache permission to control who can do it." },

  { id: "garch-028", topic: "arch-caching-layers", domain: 4,
    stem: "A gaming application reads player profiles from an Amazon DynamoDB table with GetItem. Reads are 50 times more frequent than writes, and the team needs microsecond read latency. The team wants the fewest changes to the data access code. Eventually consistent reads are acceptable. Which solution will meet these requirements?",
    options: [
      { text: "Create a DynamoDB Accelerator (DAX) cluster and change the application to use the DAX client.", correct: true,
        why: "DAX is an in-memory cache for DynamoDB with microsecond reads. The DAX client uses the same API calls, so code changes are small." },
      { text: "Create an Amazon ElastiCache cluster and add lazy loading code for each read.", correct: false,
        why: "This can work, but it needs new cache logic in the code. It fails the requirement of the fewest code changes." },
      { text: "Increase the read capacity of the table.", correct: false,
        why: "More capacity prevents throttling. It does not give microsecond latency." },
      { text: "Add a global secondary index on the player ID.", correct: false,
        why: "An index gives another access pattern. It does not reduce read latency to microseconds." }
    ],
    explanation: "DAX is a write-through cache for DynamoDB that gives microsecond reads with the same API. Use it for read-heavy, eventually consistent access." },

  { id: "garch-029", topic: "arch-caching-layers", domain: 4,
    stem: "A team added DynamoDB Accelerator (DAX) in front of a DynamoDB table and changed the application to use the DAX client. Read latency did not improve. The code sets ConsistentRead to true on every GetItem call. The business confirms that data up to a few seconds old is acceptable. Which solution will improve read latency?",
    options: [
      { text: "Remove ConsistentRead=true so that the application uses eventually consistent reads through DAX.", correct: true,
        why: "DAX passes strongly consistent reads to DynamoDB and does not cache them. Eventually consistent reads can come from the DAX cache." },
      { text: "Increase the item cache TTL on the DAX cluster.", correct: false,
        why: "Strongly consistent reads never use the cache, so a longer TTL does not change their latency." },
      { text: "Add more nodes to the DAX cluster.", correct: false,
        why: "More nodes add read capacity, but strongly consistent reads still go to DynamoDB. Latency does not improve." },
      { text: "Use TransactGetItems instead of GetItem.", correct: false,
        why: "DAX also passes TransactGetItems to DynamoDB without caching. Latency does not improve." }
    ],
    explanation: "DAX serves only eventually consistent reads from its cache. Strongly consistent and transactional reads go to DynamoDB." },

  { id: "garch-030", topic: "arch-caching-layers", domain: 1,
    stem: "An application caches product prices from Amazon RDS in Amazon ElastiCache with lazy loading and no TTL. Prices change through the application. After a price change, users see the old price for hours. Users must see a new price immediately after a change, and products that nobody views must not stay in the cache forever. Which actions should the developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "When the application writes a new price to the database, also write the new price to the cache (write-through).", correct: true,
        why: "Write-through updates the cache at the same time as the database. Users see the new price at once." },
      { text: "Set a TTL on each cache entry.", correct: true,
        why: "An entry that nobody reads expires when its TTL ends. A TTL also limits how stale any entry can get." },
      { text: "Increase the size of the ElastiCache nodes.", correct: false,
        why: "Larger nodes hold more data. They do not refresh stale prices or remove unused entries." },
      { text: "Put DynamoDB Accelerator (DAX) in front of the RDS database.", correct: false,
        why: "DAX works only with DynamoDB. It cannot cache an RDS database." },
      { text: "Turn on Multi-AZ for the ElastiCache cluster.", correct: false,
        why: "Multi-AZ improves availability. It does not change how fresh the cached data is." }
    ],
    explanation: "Write-through keeps the cache current after writes. A TTL removes entries that nobody reads and limits how stale data can get." },

  { id: "garch-031", topic: "arch-storage-options", domain: 1,
    stem: "Several AWS Lambda functions must read and write the same set of 20 GB model files with standard file system operations. Changes by one function must be visible to the others, and the files must persist. Which solution will meet these requirements?",
    options: [
      { text: "Create an Amazon EFS file system and an access point, connect the functions to the VPC, and mount the file system under /mnt/.", correct: true,
        why: "EFS is a shared, persistent NFS file system that many functions can mount at the same time. Lambda mounts it through an access point." },
      { text: "Set ephemeral storage to 10,240 MB and copy the files to /tmp.", correct: false,
        why: "Each execution environment has its own /tmp, and the data is lost when the environment ends. 20 GB also does not fit." },
      { text: "Attach an Amazon EBS volume to the functions.", correct: false,
        why: "Lambda cannot attach EBS volumes. EBS attaches to EC2 instances in the same Availability Zone." },
      { text: "Package the files in a Lambda layer.", correct: false,
        why: "Layers are read-only and limited to 250 MB unzipped with the function. The functions cannot write to them or share changes." }
    ],
    explanation: "Use Amazon EFS when many compute resources need a shared, persistent file system. Lambda mounts EFS through an access point in a VPC." },

  { id: "garch-032", topic: "arch-storage-options", domain: 2,
    stem: "A Lambda function must read report files from the /reports directory of an Amazon EFS file system. The file system also holds other teams' data. The file system has a file system policy, so IAM permissions apply. The function must not write data or see other directories. Which solution will meet these requirements in the MOST secure way?",
    options: [
      { text: "Create an EFS access point with /reports as its root directory, mount the function through it, and give the execution role elasticfilesystem:ClientMount only.", correct: true,
        why: "The access point limits the function to /reports. ClientMount without ClientWrite gives read-only access, which is least privilege." },
      { text: "Attach the AmazonElasticFileSystemClientReadWriteAccess managed policy to the execution role and mount the file system root.", correct: false,
        why: "This policy includes ClientWrite, and the root mount shows all directories. Both requirements fail." },
      { text: "Allow inbound NFS (port 2049) from 0.0.0.0/0 on the mount target security group.", correct: false,
        why: "Open network access does not limit the directory or the write permission. It also exposes the file system more widely." },
      { text: "Mount the file system root and check the path in the function code before each read.", correct: false,
        why: "Code checks do not enforce access. The function still has access to all directories and to writes." }
    ],
    explanation: "EFS access points limit a client to one directory and POSIX identity. ClientWrite is not needed for read-only access." },

  { id: "garch-033", topic: "arch-storage-options", domain: 1,
    stem: "An application runs on an EC2 instance in us-east-1a with data on an Amazon EBS volume. The team must start a new instance in us-east-1b with a copy of that data. Which solution will meet these requirements?",
    options: [
      { text: "Create a snapshot of the volume, create a new volume from the snapshot in us-east-1b, and attach it to the new instance.", correct: true,
        why: "An EBS volume can attach only to an instance in its own Availability Zone. A snapshot can create a new volume in another Availability Zone." },
      { text: "Detach the volume and attach it to the new instance in us-east-1b.", correct: false,
        why: "The volume and the instance must be in the same Availability Zone. The attach fails." },
      { text: "Turn on Multi-Attach for the volume and attach it to both instances.", correct: false,
        why: "Multi-Attach works only for instances in the same Availability Zone, and only for io1 and io2 volumes." },
      { text: "Copy the data to the instance store of the new instance.", correct: false,
        why: "There is no direct path from the old volume to the new instance store, and instance store data is lost when the instance stops." }
    ],
    explanation: "EBS volumes live in one Availability Zone. Use a snapshot to create a copy of the volume in another Availability Zone." },

  { id: "garch-034", topic: "arch-storage-options", domain: 4,
    stem: "An application on EC2 writes order files to a disk. After a maintenance stop and start of the instance, the files are gone. The team will also add two more instances in other Availability Zones, and all instances must read and write the same files. The data must survive the loss of one Availability Zone. Which solution will meet these requirements?",
    options: [
      { text: "Store the files on an Amazon EFS Regional file system that all instances mount.", correct: true,
        why: "The lost files were on instance store. An EFS Regional file system stores data across Availability Zones, and all instances can share it." },
      { text: "Store the files on an EBS io2 volume with Multi-Attach.", correct: false,
        why: "Multi-Attach works only in one Availability Zone. Instances in other zones cannot attach, and the data lives in one zone." },
      { text: "Store the files on an Amazon EFS One Zone file system.", correct: false,
        why: "One Zone stores data in one Availability Zone. Data can be lost if that zone fails, so the requirement fails." },
      { text: "Use an instance type with a larger instance store volume.", correct: false,
        why: "Instance store data is lost on stop, hibernate, or terminate, and it cannot be shared across instances." }
    ],
    explanation: "Instance store data does not survive a stop. EFS Regional file systems are shared and store data across Availability Zones." },

  { id: "garch-035", topic: "arch-purpose-built-data", domain: 1,
    stem: "Product data is stored in an Amazon DynamoDB table. Users must search product descriptions by keywords, with relevance ranking and support for misspellings. Search results can be a few seconds behind the table. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Use the DynamoDB zero-ETL integration with Amazon OpenSearch Service, and send search queries to OpenSearch Service.", correct: true,
        why: "OpenSearch Service provides full-text search with relevance and fuzzy matching. The zero-ETL integration copies changes from the table with no custom code." },
      { text: "Run a Scan on the table with a contains filter on the description.", correct: false,
        why: "A Scan reads the whole table, which is slow and costly. A contains filter gives no relevance ranking or misspelling support." },
      { text: "Create a global secondary index on the description attribute.", correct: false,
        why: "An index supports key lookups on the exact value. It does not support keyword search or relevance." },
      { text: "Export the table to Amazon S3 each hour and query it with Amazon Athena.", correct: false,
        why: "Athena runs SQL, not relevance-ranked full-text search. Hourly exports also lag far more than a few seconds." }
    ],
    explanation: "Use OpenSearch Service for full-text search. The DynamoDB zero-ETL integration keeps an OpenSearch index in sync with no custom code." },

  { id: "garch-036", topic: "arch-purpose-built-data", domain: 1,
    stem: "A developer sets up the DynamoDB zero-ETL integration with Amazon OpenSearch Service. The pipeline must load all existing items first and then copy new changes in near real time. Which settings must the developer turn on for the table? (Choose two.)",
    options: [
      { text: "Point-in-time recovery (PITR).", correct: true,
        why: "The integration loads the first snapshot with DynamoDB export to Amazon S3, and export needs PITR." },
      { text: "DynamoDB Streams with the new and old images view type.", correct: true,
        why: "After the snapshot, the integration copies changes from DynamoDB Streams. It needs the new and old images option." },
      { text: "DynamoDB Streams with the KEYS_ONLY view type.", correct: false,
        why: "KEYS_ONLY records do not contain item data. The integration needs the new and old images view type." },
      { text: "DynamoDB Accelerator (DAX) on the table.", correct: false,
        why: "DAX is a read cache for applications. The integration does not use it." },
      { text: "Higher provisioned read capacity for the table.", correct: false,
        why: "The integration does not use the table's read or write throughput, so more read capacity is not needed." }
    ],
    explanation: "The DynamoDB plugin for OpenSearch Ingestion uses export to S3 (needs PITR) for the snapshot and DynamoDB Streams (new and old images) for changes." },

  { id: "garch-037", topic: "arch-purpose-built-data", domain: 4,
    stem: "A company stores 3 years of application logs in Amazon S3 as uncompressed JSON files. Analysts query the logs with Amazon Athena, and most queries filter on one day and read 3 of 40 fields. Athena costs are high. Which actions will reduce the cost? (Choose two.)",
    options: [
      { text: "Partition the data by date in the S3 prefix (for example, dt=2026-10-18/) and filter on the partition column in queries.", correct: true,
        why: "With a partition in the WHERE clause, Athena scans only that partition. Less data scanned means lower cost." },
      { text: "Convert the files to a compressed columnar format such as Apache Parquet.", correct: true,
        why: "Athena reads only the needed columns from columnar files, and compression makes the files smaller. Both reduce data scanned." },
      { text: "Move older log files to S3 Glacier Flexible Retrieval.", correct: false,
        why: "Athena does not read objects in Glacier Flexible Retrieval unless they are restored. The queries miss that data, which fails the analysts' need." },
      { text: "Raise the per-query data scanned limit in the Athena workgroup.", correct: false,
        why: "A higher limit lets queries scan more data. It does not reduce the amount scanned or the cost." },
      { text: "Convert the JSON files to uncompressed CSV files.", correct: false,
        why: "CSV is a row format. Athena still reads every column of each row, so the data scanned does not go down much." }
    ],
    explanation: "Athena charges for data scanned. Partitioning and compressed columnar formats reduce the data each query scans." },

  { id: "garch-038", topic: "arch-purpose-built-data", domain: 1,
    stem: "A team needs to run SQL queries a few times each week on application logs that are already in Amazon S3. The team does not want to manage servers or load the data into a database. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Define a table over the S3 data and query it with Amazon Athena.", correct: true,
        why: "Athena is serverless and queries data in place in S3 with standard SQL. There are no servers and no data load." },
      { text: "Load the logs into an Amazon RDS for PostgreSQL database each night and query it.", correct: false,
        why: "The team must run a database and a load job. This fails the requirement to not load the data into a database." },
      { text: "Create an Amazon OpenSearch Service domain and index the logs.", correct: false,
        why: "OpenSearch Service needs a domain and an ingestion process. It adds overhead for a few SQL queries each week." },
      { text: "Load the logs into an Amazon DynamoDB table and use Scan operations.", correct: false,
        why: "This loads the data into a database, and DynamoDB does not run ad hoc SQL analytics well." }
    ],
    explanation: "Athena runs serverless SQL on data in S3. Use it for occasional queries with no infrastructure." },

  { id: "garch-039", topic: "arch-purpose-built-data", domain: 4,
    stem: "A company gives many analysts access to Amazon Athena. One analyst ran a query without a filter that scanned 40 TB of data. The company wants Athena to stop any single query that scans more than 1 TB. Which solution will meet these requirements?",
    options: [
      { text: "Set a per-query data usage control (data scanned limit) of 1 TB in the analysts' Athena workgroup.", correct: true,
        why: "Athena cancels any query in the workgroup that scans more than the per-query limit." },
      { text: "Create a workgroup data usage alert of 1 TB each day with an Amazon SNS notification.", correct: false,
        why: "Workgroup-wide alerts send notifications on total usage. They do not cancel a single query." },
      { text: "Create an AWS Budgets alert for Athena costs.", correct: false,
        why: "A budget alert notifies after costs build up. It does not stop a query while it runs." },
      { text: "Add an S3 Lifecycle rule that deletes log files older than 30 days.", correct: false,
        why: "Less data can lower some costs, but a query on the remaining data can still scan more than 1 TB." }
    ],
    explanation: "An Athena workgroup per-query data usage control cancels queries that scan more than the limit. Workgroup-wide limits only send alerts." }

] });
