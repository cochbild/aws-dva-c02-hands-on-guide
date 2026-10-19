window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "m05-messaging", questions: [

  { id: "m05-001", topic: "sqs-queue-types", domain: 1,
    stem: "An order service sends order events to a queue. Events for the same customer must be processed in the order they were sent. Events for different customers must be processed in parallel by several consumers. Which solution will meet these requirements?",
    options: [
      { text: "Use an SQS FIFO queue, and set MessageGroupId to the customer ID on each message.", correct: true,
        why: "A FIFO queue keeps strict order inside each message group. Different groups are delivered in parallel, so different customers are processed at the same time." },
      { text: "Use an SQS FIFO queue, and set the same MessageGroupId on all messages.", correct: false,
        why: "One message group keeps one global order. Consumers cannot process different customers in parallel, which fails the parallel requirement." },
      { text: "Use an SQS standard queue, and add a sequence number attribute to each message.", correct: false,
        why: "A standard queue gives only best-effort order and can deliver duplicates. An attribute does not make SQS deliver in order, so the order requirement fails." },
      { text: "Use an SNS standard topic with one SQS standard queue subscribed for each consumer.", correct: false,
        why: "Standard topics and queues give best-effort order. Each consumer also gets every event, so the work is not divided and order is not guaranteed." }
    ],
    explanation: "In an SQS FIFO queue, MessageGroupId is the unit of order. Use a key such as the customer ID to keep order for each customer and process different customers in parallel." },

  { id: "m05-002", topic: "sqs-queue-types", domain: 1,
    stem: "A producer sends payment messages to an SQS FIFO queue. Each message body includes the order ID and the time the message was created. When the producer times out, it sends the same payment again, so the body has a new timestamp. Each payment must be processed only one time. Which solution will meet these requirements?",
    options: [
      { text: "Set MessageDeduplicationId to the order ID when the producer sends each message.", correct: true,
        why: "SQS drops a message with the same deduplication ID in the 5-minute interval. The order ID stays the same on a retry, so the repeat is removed." },
      { text: "Turn on content-based deduplication for the queue.", correct: false,
        why: "Content-based deduplication hashes the message body. The new timestamp makes each body different, so the repeated payment is not removed." },
      { text: "Turn on long polling with a wait time of 20 seconds.", correct: false,
        why: "Long polling reduces empty receives. It does not remove repeated messages, so the payment can be processed two times." },
      { text: "Increase the visibility timeout of the queue to 12 hours.", correct: false,
        why: "The visibility timeout hides a received message from other consumers. It does not stop the producer from adding a second copy of the payment." }
    ],
    explanation: "Content-based deduplication uses a SHA-256 hash of the body only. When bodies differ but are the same logical message, send an explicit MessageDeduplicationId." },

  { id: "m05-003", topic: "sqs-queue-types", domain: 3,
    stem: "A developer adds an AWS::SQS::Queue resource to an AWS CloudFormation template. The resource sets FifoQueue to true and QueueName to orders-queue. The stack deployment fails for this resource. The queue must stay a FIFO queue. Which solution will meet these requirements?",
    options: [
      { text: "Change QueueName to orders-queue.fifo.", correct: true,
        why: "The name of a FIFO queue must end with the .fifo suffix. With the correct name, CloudFormation can create the FIFO queue." },
      { text: "Set ContentBasedDeduplication to true.", correct: false,
        why: "Content-based deduplication is optional for a FIFO queue. It does not fix the invalid queue name, so the deployment still fails." },
      { text: "Remove FifoQueue so that the template creates the queue with default settings.", correct: false,
        why: "The default queue type is standard. This fails the requirement that the queue stays a FIFO queue." },
      { text: "Add a RedrivePolicy that points to a FIFO dead-letter queue.", correct: false,
        why: "A dead-letter queue is optional. It does not change the queue name, so the deployment still fails." }
    ],
    explanation: "An SQS FIFO queue name must end in .fifo. A standard queue can use any valid name." },

  { id: "m05-004", topic: "sqs-queue-types", domain: 4,
    stem: "An application sends messages one at a time to an SQS FIFO queue. All messages use the MessageGroupId value orders. The producer gets throttled at about 300 SendMessage calls each second, and consumers process only one message at a time. Messages for the same order ID must stay in order. Which actions will increase throughput and meet these requirements? (Choose two.)",
    options: [
      { text: "Set MessageGroupId to the order ID instead of a single fixed value.", correct: true,
        why: "Each order becomes its own message group. Consumers can process different orders in parallel, and order is kept for each order ID." },
      { text: "Send messages with SendMessageBatch in batches of up to 10 messages.", correct: true,
        why: "Without high throughput mode, a FIFO queue allows 300 API calls each second for each action. Batches of 10 raise this to 3,000 messages each second." },
      { text: "Change the queue to an SQS standard queue.", correct: false,
        why: "A standard queue has nearly unlimited throughput but only best-effort order. This fails the requirement to keep order for each order ID." },
      { text: "Increase the visibility timeout of the queue.", correct: false,
        why: "A longer visibility timeout hides in-flight messages for longer. It does not raise the send limit or allow more parallel processing." },
      { text: "Set a delay of 5 seconds on the queue.", correct: false,
        why: "A delay holds new messages before they become visible. It reduces speed and does not increase throughput." }
    ],
    explanation: "FIFO throughput (without high throughput mode) is 300 transactions each second for each API action, or 3,000 messages each second with batches of 10. Parallel processing comes from many message group IDs." },

  { id: "m05-005", topic: "sqs-visibility-polling", domain: 4,
    stem: "Consumers on Amazon EC2 call ReceiveMessage in a loop on an SQS standard queue. Most calls return no messages, and the SQS request cost is high. The developer wants to reduce cost with the fewest code changes. Which solution will meet these requirements?",
    options: [
      { text: "Set the ReceiveMessageWaitTimeSeconds attribute of the queue to 20.", correct: true,
        why: "This turns on long polling for all receives. SQS waits up to 20 seconds for a message, so there are far fewer empty responses and billable requests. No code change is needed." },
      { text: "Set MaxNumberOfMessages to 10 in each ReceiveMessage call.", correct: false,
        why: "This returns up to 10 messages when messages exist. When the queue is empty, each short poll still returns an empty response, so cost stays high." },
      { text: "Set a delay of 15 minutes on the queue.", correct: false,
        why: "A delay hides new messages for 15 minutes. Consumers still poll the queue and get empty responses, and processing becomes slower." },
      { text: "Increase the visibility timeout of the queue to 5 minutes.", correct: false,
        why: "The visibility timeout applies after a message is received. It does not change the number of empty receives." }
    ],
    explanation: "Short polling is the default and can return empty responses. Long polling (wait time 1 to 20 seconds) reduces empty and false empty responses and lowers cost." },

  { id: "m05-006", topic: "sqs-visibility-polling", domain: 4,
    stem: "A worker on Amazon EC2 processes video jobs from an SQS queue. A job takes from 1 minute to 40 minutes. The queue visibility timeout is 2 minutes, and long jobs are often processed by two workers. If a worker crashes, another worker must pick up the job within a few minutes. Which solution will meet these requirements?",
    options: [
      { text: "While a job runs, call ChangeMessageVisibility every minute to extend the visibility timeout of the message.", correct: true,
        why: "A heartbeat keeps the message hidden while the worker is alive. If the worker crashes, the heartbeat stops and the message becomes visible again within a few minutes." },
      { text: "Set the visibility timeout of the queue to 12 hours.", correct: false,
        why: "This stops the duplicates, but after a crash the job stays hidden for up to 12 hours. It fails the requirement to retry within a few minutes." },
      { text: "Set a delay of 15 minutes on the queue.", correct: false,
        why: "A delay hides a message before the first receive. It does not keep a message hidden while a worker processes it, so duplicates continue." },
      { text: "Turn on long polling with a wait time of 20 seconds.", correct: false,
        why: "Long polling reduces empty receives. It does not change how long a received message stays hidden, so duplicates continue." }
    ],
    explanation: "Use ChangeMessageVisibility as a heartbeat for long or variable tasks. The 12-hour maximum counts from the first receive." },

  { id: "m05-007", topic: "sqs-visibility-polling", domain: 1,
    stem: "A Java application must send JSON documents of up to 5 MB to other components through Amazon SQS. The developer wants to use SQS and keep the code simple. Which solution will meet these requirements?",
    options: [
      { text: "Use the Amazon SQS Extended Client Library for Java to store each payload in Amazon S3 and send a reference in the message.", correct: true,
        why: "The SQS message size limit is 1 MiB. The Extended Client Library stores payloads up to 2 GB in Amazon S3 and handles the reference for you." },
      { text: "Set the MaximumMessageSize attribute of the queue to 5 MB.", correct: false,
        why: "The maximum message size for SQS is 1 MiB. The attribute cannot be set to 5 MB." },
      { text: "Send the documents in a SendMessageBatch request.", correct: false,
        why: "A batch holds up to 10 messages, and each message still has the 1 MiB limit. A 5 MB document still does not fit." },
      { text: "Use an SQS FIFO queue instead of a standard queue.", correct: false,
        why: "FIFO queues have the same 1 MiB message size limit. The documents still do not fit." }
    ],
    explanation: "SQS messages can be up to 1 MiB. For larger payloads, use the Extended Client Library (Java or Python), which stores the payload in Amazon S3." },

  { id: "m05-008", topic: "kinesis-streams", domain: 4,
    stem: "A Lambda function processes records from a provisioned Kinesis data stream with 4 shards through an event source mapping. The function finishes each batch without errors, but the IteratorAge metric keeps growing during peak hours. Records must be processed before they expire, and the order of records for each partition key must be kept. Which solution will meet these requirements with the LEAST effort?",
    options: [
      { text: "Increase the ParallelizationFactor of the event source mapping.", correct: true,
        why: "More concurrent batches for each shard let the function keep up with the stream. Lambda still keeps the order for each partition key." },
      { text: "Increase the retention period of the stream.", correct: false,
        why: "Longer retention gives more time before records expire, but the function still falls further behind. IteratorAge keeps growing." },
      { text: "Turn on BisectBatchOnFunctionError for the event source mapping.", correct: false,
        why: "Bisect splits a batch only after a function error. There are no errors, so processing speed does not change." },
      { text: "Set the reserved concurrency of the function to 4.", correct: false,
        why: "This limits the function to 4 concurrent invocations, one for each shard. It cannot add processing capacity, so the backlog continues." }
    ],
    explanation: "IteratorAge shows how far a consumer is behind the stream. For a Lambda consumer, increase ParallelizationFactor (1 to 10), add shards, or make the function faster. ParallelizationFactor is the number of batches that Lambda processes at the same time from each shard." },

  { id: "m05-009", topic: "sqs-dlq-redrive", domain: 3,
    stem: "A CloudFormation template defines an SQS standard queue named orders. A developer adds a RedrivePolicy to orders that points to an existing queue named orders-dlq.fifo, with maxReceiveCount set to 5. The stack update fails. Which solution will meet these requirements?",
    options: [
      { text: "Create a standard queue for the dead-letter queue, and point the RedrivePolicy to it.", correct: true,
        why: "The dead-letter queue type must match the source queue type. A standard source queue needs a standard dead-letter queue." },
      { text: "Set maxReceiveCount to 0.", correct: false,
        why: "The valid range of maxReceiveCount is 1 to 1,000. The type mismatch also stays, so the update still fails." },
      { text: "Move the RedrivePolicy from the orders queue to the orders-dlq.fifo queue.", correct: false,
        why: "The redrive policy belongs on the source queue. Putting it on the dead-letter queue does not send failed orders messages anywhere." },
      { text: "Add a redrive allow policy with allowAll to the orders-dlq.fifo queue.", correct: false,
        why: "allowAll is already the default. It does not change the queue type, so a FIFO queue still cannot be the DLQ of a standard queue." }
    ],
    explanation: "A FIFO queue can use only a FIFO dead-letter queue, and a standard queue can use only a standard dead-letter queue. Set the redrive policy on the source queue." },

  { id: "m05-010", topic: "sqs-dlq-redrive", domain: 1,
    stem: "A bug in a consumer sent 50,000 messages to the dead-letter queue of an SQS standard queue. The developer has deployed a fix. The messages must go back to the original source queue for processing with the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Start a dead-letter queue redrive (StartMessageMoveTask) from the dead-letter queue without a destination ARN.", correct: true,
        why: "A message move task moves the messages from the DLQ. With no destination, it sends them back to their original source queue. No code is needed." },
      { text: "Write a Lambda function that receives from the dead-letter queue, sends each message to the source queue, and deletes it.", correct: false,
        why: "This works, but you must write, deploy, and run code. It fails the least operational overhead requirement." },
      { text: "Increase maxReceiveCount in the redrive policy of the source queue.", correct: false,
        why: "maxReceiveCount affects messages in the source queue only. It does not move messages that are already in the DLQ." },
      { text: "Remove the redrive policy from the source queue.", correct: false,
        why: "This stops new moves to the DLQ. The 50,000 messages stay in the DLQ and are not processed." }
    ],
    explanation: "DLQ redrive (StartMessageMoveTask) moves messages from a DLQ back to the source queue or to another queue. The source must be a DLQ of other SQS queues." },

  { id: "m05-011", topic: "sqs-dlq-redrive", domain: 4,
    stem: "An SQS standard queue has a 4-day retention period and a dead-letter queue that also has a 4-day retention period. Messages often wait 3 days in the source queue before they move to the dead-letter queue. They disappear from the dead-letter queue after about 1 day. The team must keep failed messages for at least 7 days and must be notified when a message arrives in the dead-letter queue. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Set the retention period of the dead-letter queue to 14 days.", correct: true,
        why: "For standard queues, a moved message keeps its original enqueue timestamp. 14 days of retention leaves at least 7 days in the DLQ after a 3-day wait in the source queue." },
      { text: "Create a CloudWatch alarm on the ApproximateNumberOfMessagesVisible metric of the dead-letter queue, with a threshold of 1.", correct: true,
        why: "This metric counts all messages that are available in the DLQ, including messages that SQS moved there. The alarm notifies the team." },
      { text: "Create a CloudWatch alarm on the NumberOfMessagesSent metric of the dead-letter queue.", correct: false,
        why: "Messages that SQS moves to a DLQ after failed processing are not counted in NumberOfMessagesSent. The team would not be notified." },
      { text: "Set the retention period of the source queue to 14 days.", correct: false,
        why: "The DLQ expires a message based on the DLQ retention period and the original enqueue time. With a 4-day DLQ retention, messages still disappear early." },
      { text: "Change both queues to FIFO queues.", correct: false,
        why: "This changes order and deduplication behavior and needs a new queue type. It does not add a notification, so it fails one requirement." }
    ],
    explanation: "In standard queues, a message keeps its original enqueue timestamp in the DLQ. Set the DLQ retention longer than the source retention, and alarm on ApproximateNumberOfMessagesVisible." },

  { id: "m05-012", topic: "sqs-security", domain: 2,
    stem: "A developer subscribes an SQS queue to an SNS topic in the same account. The subscription is confirmed, but no messages arrive in the queue. The queue is not encrypted. Only this topic must be able to send messages to the queue. Which solution will meet these requirements?",
    options: [
      { text: "Add a statement to the queue policy that allows the sns.amazonaws.com principal to call sqs:SendMessage, with an aws:SourceArn condition set to the topic ARN.", correct: true,
        why: "SNS needs permission in the queue policy to send messages. The aws:SourceArn condition limits access to this one topic." },
      { text: "Add sns:Publish permission to the IAM role of the queue consumer.", correct: false,
        why: "The consumer role controls what the consumer can do. It does not give SNS permission to send messages to the queue." },
      { text: "Add a statement to the topic policy that allows the queue to call sns:Subscribe.", correct: false,
        why: "The subscription already exists. The missing permission is sqs:SendMessage on the queue, so messages still do not arrive." },
      { text: "Add a queue policy that allows sqs:SendMessage for the principal \"*\" with no conditions.", correct: false,
        why: "This lets SNS deliver, but any principal can then send messages to the queue. It fails the requirement that only this topic can send." }
    ],
    explanation: "For SNS to SQS delivery, the queue policy must allow sns.amazonaws.com to call sqs:SendMessage. Use aws:SourceArn to limit it to the topic." },

  { id: "m05-013", topic: "sqs-security", domain: 2,
    stem: "An SQS queue uses SSE-KMS with the AWS managed key aws/sqs. A developer subscribes the queue to an SNS topic and adds a correct queue policy, but messages do not arrive. Messages in the queue must stay encrypted with AWS KMS. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Create a customer managed KMS key and configure the queue to use it.", correct: true,
        why: "You cannot change the key policy of the AWS managed key aws/sqs. A customer managed key has a key policy that you control." },
      { text: "Add a statement to the key policy of the customer managed key that allows sns.amazonaws.com to use kms:GenerateDataKey* and kms:Decrypt.", correct: true,
        why: "SNS must use the queue key to send encrypted messages. These are the actions that SNS needs on the key." },
      { text: "Edit the key policy of aws/sqs to allow sns.amazonaws.com.", correct: false,
        why: "AWS managed key policies cannot be changed. This action is not possible." },
      { text: "Turn off server-side encryption on the queue.", correct: false,
        why: "Delivery would work, but messages would not be encrypted with AWS KMS. This fails the encryption requirement." },
      { text: "Turn on raw message delivery for the subscription.", correct: false,
        why: "Raw message delivery removes the SNS JSON envelope. It does not give SNS permission to use the KMS key." }
    ],
    explanation: "To deliver to an encrypted queue, SNS needs kms:GenerateDataKey* and kms:Decrypt on the queue key. Use a customer managed key, because you cannot edit the aws/sqs key policy." },

  { id: "m05-014", topic: "sqs-security", domain: 2,
    stem: "A Lambda function uses an event source mapping to read from an SQS queue. The queue uses SSE-KMS with a customer managed key that has the default key policy. The function execution role has the AWSLambdaSQSQueueExecutionRole managed policy. The event source mapping shows a KMS access denied error. The solution must follow least privilege. Which solution will meet these requirements?",
    options: [
      { text: "Add kms:Decrypt permission for the queue key to the function execution role.", correct: true,
        why: "Lambda must decrypt the messages that it receives from an encrypted queue. kms:Decrypt on that one key is the permission that is missing." },
      { text: "Add kms:* permission for all keys to the function execution role.", correct: false,
        why: "This fixes the error but gives far more access than needed. It fails the least privilege requirement." },
      { text: "Add sqs:SendMessage permission to the function execution role.", correct: false,
        why: "The function receives messages; it does not send them. The KMS error continues." },
      { text: "Add a queue policy that allows the lambda.amazonaws.com principal to call sqs:ReceiveMessage.", correct: false,
        why: "The event source mapping uses the execution role for SQS access. The KMS permission is still missing, so the error continues." }
    ],
    explanation: "A Lambda function that reads an SSE-KMS queue needs kms:Decrypt on the queue key in its execution role, in addition to the SQS permissions." },

  { id: "m05-015", topic: "sns-fanout-filtering", domain: 1,
    stem: "An order application already publishes each new order to an SNS topic. Three teams (billing, shipping, analytics) must each get every order. Each team processes orders at its own speed, and orders must not be lost if a team's service is down for a few hours. The publisher code must not change. Which solution will meet these requirements?",
    options: [
      { text: "Create an SQS queue for each team and subscribe each queue to the SNS topic.", correct: true,
        why: "SNS sends a copy to each queue. Each queue stores the orders until that team's consumers pull them, at their own speed." },
      { text: "Subscribe one SQS queue to the topic and let all three teams read from that queue.", correct: false,
        why: "Consumers of one queue compete for messages. Each order goes to only one team, which fails the requirement that every team gets every order." },
      { text: "Subscribe each team's HTTPS endpoint directly to the topic.", correct: false,
        why: "SNS does not store messages for consumers. HTTPS retries have a maximum total time of 3,600 seconds, so orders can be lost after hours of downtime." },
      { text: "Change the application to send each order to an EventBridge bus with three rule targets.", correct: false,
        why: "This changes the publisher code, which fails the requirement. The targets would also need queues to store orders." }
    ],
    explanation: "SNS to SQS fan-out gives each consumer its own durable queue. SNS does not store messages, so queues give persistence and independent processing speed." },

  { id: "m05-016", topic: "sns-fanout-filtering", domain: 4,
    stem: "A publisher sends JSON messages to an SNS topic with no message attributes. The body contains a field named eventType. An SQS subscriber needs only messages where eventType is refund. The publisher code must not change, and the subscriber must not receive other messages. Which solution will meet these requirements?",
    options: [
      { text: "Set FilterPolicyScope to MessageBody on the subscription, and add a filter policy that matches eventType equal to refund.", correct: true,
        why: "With the MessageBody scope, SNS applies the filter policy to the JSON body. SNS does not deliver other messages to the queue." },
      { text: "Add a filter policy on the subscription that matches eventType equal to refund, and keep the default filter policy scope.", correct: false,
        why: "The default scope is MessageAttributes. The messages have no attributes, so no message matches and the subscriber gets nothing." },
      { text: "Add a filter policy on the SNS topic.", correct: false,
        why: "SNS filter policies are set on subscriptions, not on topics." },
      { text: "Subscribe a Lambda function that checks eventType and forwards refund messages to the queue.", correct: false,
        why: "This works but adds custom code to build and run. A subscription filter policy does the same with no code." }
    ],
    explanation: "A filter policy belongs to a subscription. FilterPolicyScope is MessageAttributes by default; set MessageBody to filter on fields in a JSON body." },

  { id: "m05-017", topic: "sns-fanout-filtering", domain: 4,
    stem: "An SNS topic sends all orders to an SQS queue. Each order is published with a numeric message attribute named amount. A consumer on Amazon ECS reads the queue. The consumer must receive only orders with amount greater than 100, and the consumer code must not parse the SNS JSON envelope. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Add a filter policy to the SQS subscription with \"amount\": [{\"numeric\": [\">\", 100]}].", correct: true,
        why: "A numeric filter on the message attribute stops SNS from delivering orders of 100 or less to this subscription." },
      { text: "Turn on raw message delivery for the SQS subscription.", correct: true,
        why: "Raw message delivery sends only the message body to the queue, without the SNS JSON envelope." },
      { text: "Add filter criteria for amount greater than 100 to a Lambda event source mapping on the queue.", correct: false,
        why: "Event source mapping filters apply only when Lambda reads the queue. The consumer runs on Amazon ECS, so SNS still delivers every order to it." },
      { text: "Add a condition on the amount attribute to the SQS queue policy.", correct: false,
        why: "A queue policy controls who can call SQS actions. It cannot filter messages by attribute value." },
      { text: "Change the topic to a FIFO topic.", correct: false,
        why: "A FIFO topic adds order and deduplication. It does not filter by amount or remove the envelope." }
    ],
    explanation: "Subscription filter policies support numeric conditions on message attributes. Raw message delivery removes the SNS envelope for SQS, HTTP/S, and Firehose subscriptions." },

  { id: "m05-018", topic: "sns-delivery", domain: 1,
    stem: "An SNS standard topic delivers messages to a partner HTTPS endpoint. The endpoint is sometimes down for several hours. Messages that SNS cannot deliver must be kept so the team can send them again later. Which solution will meet these requirements?",
    options: [
      { text: "Attach a redrive policy to the HTTPS subscription that points to an SQS standard queue as a dead-letter queue.", correct: true,
        why: "When retries end, SNS moves undeliverable messages to the subscription DLQ instead of discarding them. The team can read them later." },
      { text: "Set a custom HTTPS delivery policy that retries for 24 hours.", correct: false,
        why: "The total retry time for an HTTP/S delivery policy is a maximum of 3,600 seconds. Messages are still discarded after retries end." },
      { text: "Attach a dead-letter queue to the SNS topic.", correct: false,
        why: "SNS dead-letter queues are attached to subscriptions, not topics, because delivery happens for each subscription." },
      { text: "Turn on message archiving on the topic.", correct: false,
        why: "Message archiving and replay is a feature of FIFO topics. This is a standard topic, so the feature is not available." }
    ],
    explanation: "When the delivery policy is exhausted, SNS discards the message unless the subscription has a DLQ. The DLQ is an SQS queue in the same account and Region." },

  { id: "m05-019", topic: "sns-delivery", domain: 1,
    stem: "A company publishes stock price updates to an SNS FIFO topic. A Lambda function must process the updates for each stock in order. Which solution will meet these requirements?",
    options: [
      { text: "Subscribe an SQS FIFO queue to the topic, and configure the queue as the event source for the Lambda function.", correct: true,
        why: "FIFO topics deliver only to SQS queues. An SQS FIFO queue keeps order for each message group, and Lambda processes each group in order." },
      { text: "Subscribe the Lambda function directly to the FIFO topic.", correct: false,
        why: "FIFO topics cannot deliver to Lambda functions. The subscription is not allowed." },
      { text: "Change to an SNS standard topic, and subscribe the Lambda function to it.", correct: false,
        why: "A standard topic gives only best-effort order. This fails the requirement to process each stock in order." },
      { text: "Subscribe an HTTPS endpoint that invokes the Lambda function through a function URL.", correct: false,
        why: "FIFO topics cannot deliver to HTTPS endpoints. The subscription is not allowed." }
    ],
    explanation: "SNS FIFO topics deliver only to SQS queues (FIFO or standard). To process with Lambda, put a queue between the topic and the function." },

  { id: "m05-020", topic: "sns-delivery", domain: 1,
    stem: "A team uses an SNS FIFO topic for account events. The billing service needs the events in strict order with no duplicates. The analytics service can accept duplicates and best-effort order, and it must cost as little as possible. Which subscription endpoints will meet these requirements? (Choose two.)",
    options: [
      { text: "An SQS FIFO queue for the billing service", correct: true,
        why: "A FIFO queue subscribed to a FIFO topic keeps strict order for each message group and deduplication." },
      { text: "An SQS standard queue for the analytics service", correct: true,
        why: "FIFO topics can deliver to standard queues. A standard queue gives best-effort order at a lower cost than a FIFO queue." },
      { text: "A Lambda function for the analytics service", correct: false,
        why: "FIFO topics cannot deliver to Lambda functions. The subscription fails." },
      { text: "An Amazon Data Firehose stream for the analytics service", correct: false,
        why: "FIFO topics deliver only to SQS queues. A Firehose subscription is not allowed." },
      { text: "An HTTPS endpoint for the billing service", correct: false,
        why: "FIFO topics cannot deliver to customer managed endpoints such as HTTPS. The subscription fails." }
    ],
    explanation: "SNS FIFO topics deliver to SQS FIFO queues and SQS standard queues only. They cannot deliver to Lambda, HTTP/S, email, SMS, mobile push, or Firehose." },

  { id: "m05-021", topic: "eb-rules-patterns", domain: 1,
    stem: "A developer must run a Lambda function every time an Amazon EC2 instance in the account changes to the stopped state. The solution must not need code that polls EC2. Which solution will meet these requirements?",
    options: [
      { text: "Create an EventBridge rule on the default event bus with a pattern for EC2 Instance State-change Notification events where state is stopped, and set the function as the target.", correct: true,
        why: "AWS services send their events to the default event bus. The rule matches the stopped state and invokes the function with no polling." },
      { text: "Create an EventBridge rule with the same pattern on a new custom event bus.", correct: false,
        why: "AWS service events go to the default bus. A custom bus receives only events that applications send to it, so the rule never matches." },
      { text: "Create an EventBridge Scheduler schedule that invokes the function every minute to check the instance states.", correct: false,
        why: "The function would poll EC2 every minute. This fails the requirement not to poll." },
      { text: "Create an SQS queue and configure EC2 to send state changes to the queue.", correct: false,
        why: "EC2 does not send state changes directly to an SQS queue. The function is never invoked." }
    ],
    explanation: "The default event bus in each account and Region receives AWS service events. Rules on that bus react to them." },

  { id: "m05-022", topic: "sqs-visibility-polling", domain: 1,
    stem: "A Lambda function processes JSON messages from an SQS standard queue in batches of 10. Only messages where the body field type is order need processing; other messages must not invoke the function. When one message in a batch fails, the successful messages in the batch are processed again. The developer wants the fewest changes. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Add filter criteria to the event source mapping that match type equal to order in the message body.", correct: true,
        why: "Lambda evaluates the filter before it invokes the function. For SQS, Lambda deletes messages that do not match, so the function is not invoked for them." },
      { text: "Set FunctionResponseTypes to ReportBatchItemFailures, and return the IDs of failed messages in batchItemFailures.", correct: true,
        why: "With a partial batch response, only the listed messages return to the queue. Successful messages are not processed again." },
      { text: "Add an if statement at the start of the handler that returns when type is not order.", correct: false,
        why: "The function is still invoked for every message. This fails the requirement that other messages must not invoke the function." },
      { text: "Set the batch size to 1.", correct: false,
        why: "This stops repeat processing, but it adds many more invocations and does not filter messages. It fails the filter requirement." },
      { text: "Increase the visibility timeout of the queue to 6 times the function timeout.", correct: false,
        why: "This prevents duplicates caused by a short timeout. A failed batch still returns all its messages to the queue." }
    ],
    explanation: "Event source mapping filter criteria stop unneeded invocations (Lambda deletes non-matching messages from the queue). ReportBatchItemFailures returns only the failed messages to the queue." },

  { id: "m05-023", topic: "eb-rules-patterns", domain: 2,
    stem: "A developer uses the AWS CLI to create an EventBridge rule with a Lambda function as the target. Events match the rule, but the function is never invoked. The FailedInvocations metric for the rule increases. Which solutions will each meet these requirements with least privilege? (Choose two.)",
    options: [
      { text: "Add a resource-based policy statement to the function that allows the events.amazonaws.com principal to call lambda:InvokeFunction, with the rule ARN as the source ARN.", correct: true,
        why: "With no execution role on the target, EventBridge uses the function resource policy. This statement allows only this rule to invoke the function." },
      { text: "Configure an IAM role on the rule target that EventBridge can assume and that allows lambda:InvokeFunction on the function.", correct: true,
        why: "EventBridge can use an execution role for Lambda targets. A role limited to this function gives the needed permission." },
      { text: "Add events:PutEvents permission to the function execution role.", correct: false,
        why: "The execution role controls what the function can do. It does not let EventBridge invoke the function." },
      { text: "Add lambda:InvokeFunction permission to the function execution role.", correct: false,
        why: "The function's own role does not authorize EventBridge as the caller. The invocation still fails." },
      { text: "Move the rule to the default event bus.", correct: false,
        why: "The bus does not change the permission problem. The function is still not allowed to be invoked by EventBridge." }
    ],
    explanation: "For Lambda, SNS, and SQS targets, EventBridge uses either a resource-based policy on the target or an IAM execution role on the target. The console creates these for you; the CLI does not." },

  { id: "m05-024", topic: "eb-delivery-archive", domain: 4,
    stem: "An EventBridge rule sends events to an API destination. The partner API was down for 2 days, and events from that period were lost. The team must keep only the events that fail delivery, so that it can inspect and resend them. Which solution will meet these requirements?",
    options: [
      { text: "Configure a dead-letter queue (an SQS standard queue) on the rule target.", correct: true,
        why: "EventBridge retries for up to 24 hours by default, then drops the event. With a DLQ, failed events go to the queue instead." },
      { text: "Set the target retry policy to a maximum event age of 3 days.", correct: false,
        why: "The maximum event age for retries is 24 hours. Events older than that are still dropped without a DLQ." },
      { text: "Create an archive of all events on the bus.", correct: false,
        why: "An archive stores every matched event, not only failed ones. It does not identify which events failed, so it does not meet the requirement." },
      { text: "Add a second target that sends every event to CloudWatch Logs.", correct: false,
        why: "This logs every event, not only the failed ones. The team cannot tell which events failed delivery." }
    ],
    explanation: "EventBridge retries a target for 24 hours and up to 185 times by default. After that, it drops the event unless the target has a DLQ." },

  { id: "m05-025", topic: "eb-delivery-archive", domain: 1,
    stem: "Applications send events to a custom EventBridge bus. After a bug fix, developers want to process the events from the past 30 days again through the same rules. They want the LEAST custom code. Which solution will meet these requirements?",
    options: [
      { text: "Create an archive on the bus with a retention of at least 30 days, and start a replay for the required time range when needed.", correct: true,
        why: "An archive stores the events, and a replay sends them back to the source bus, where the rules process them again. No custom code is needed." },
      { text: "Add an SQS queue as a target and set its retention to 30 days.", correct: false,
        why: "The maximum SQS retention is 14 days. You also need code to read the queue and send the events again." },
      { text: "Add a CloudWatch Logs target, and write a script that reads the logs and calls PutEvents.", correct: false,
        why: "This needs a custom script to resend events. It fails the least custom code requirement." },
      { text: "Increase the retry policy of each target to 30 days.", correct: false,
        why: "Retries apply only to failed deliveries, and the maximum is 24 hours. Successful events are not processed again." }
    ],
    explanation: "EventBridge archives keep events (for a number of days or indefinitely). A replay sends them back to the source bus only." },

  { id: "m05-026", topic: "eb-delivery-archive", domain: 2,
    stem: "A company has a central security account and many member accounts in AWS Organizations. Security events from every member account must go to a custom event bus in the central account. No long-term credentials can be used. Which solution will meet these requirements?",
    options: [
      { text: "Add a resource-based policy to the central bus that allows events from the organization. In each member account, create a rule that targets the central bus ARN and uses an IAM role.", correct: true,
        why: "The receiver bus policy allows the organization to send events. Rules in the member accounts forward events, and new cross-account bus targets need an IAM role." },
      { text: "Create an IAM user in the central account, and store its access keys in each member account to call PutEvents.", correct: false,
        why: "Access keys are long-term credentials, which the requirement does not allow." },
      { text: "In the central account, create rules that target the event buses in the member accounts.", correct: false,
        why: "This sends events from the central account to the members. It is the wrong direction." },
      { text: "Create an archive in each member account and replay the events to the central bus.", correct: false,
        why: "A replay can send events only to the source bus of the archive. It cannot send them to a bus in another account." }
    ],
    explanation: "For cross-account events, add a resource-based policy on the receiving bus, and create rules in the sender accounts that target the receiving bus ARN with an IAM role." },

  { id: "m05-027", topic: "eb-scheduler-pipes", domain: 1,
    stem: "An application must send a reminder 72 hours after each user signs up. There are millions of users. Each reminder runs one time. The solution must use managed services and need the least custom code. Which solution will meet these requirements?",
    options: [
      { text: "At sign-up, create an EventBridge Scheduler one-time schedule with an at() expression for 72 hours later that invokes the reminder target. Delete the schedule after it runs.", correct: true,
        why: "One-time schedules run a target one time at the given date and time, at large scale. Completed one-time schedules still count against the quota, so delete them." },
      { text: "Send a message to an SQS queue with DelaySeconds set to 72 hours.", correct: false,
        why: "The maximum SQS delay is 15 minutes. A 72-hour delay is not possible." },
      { text: "Create an EventBridge scheduled rule with a cron expression for each user.", correct: false,
        why: "Scheduled rules are a legacy feature, and the default quota is 300 rules for each bus. Millions of rules are not possible." },
      { text: "Invoke a Lambda function that waits 72 hours and then sends the reminder.", correct: false,
        why: "The maximum Lambda timeout is 15 minutes. The function cannot wait 72 hours." }
    ],
    explanation: "EventBridge Scheduler supports one-time schedules (at expressions), rate and cron schedules, time zones, and very large numbers of schedules." },

  { id: "m05-028", topic: "eb-scheduler-pipes", domain: 2,
    stem: "A developer creates an EventBridge Scheduler schedule with the AWS CLI. The target is the SQS SendMessage templated target. Each invocation fails with an access denied error. Which solution will meet these requirements with least privilege?",
    options: [
      { text: "Create an IAM role that trusts scheduler.amazonaws.com and allows sqs:SendMessage on the queue, and set it as the schedule execution role.", correct: true,
        why: "Scheduler assumes the execution role to call the target. The role needs the target action, limited to the one queue." },
      { text: "Add a queue policy that allows the events.amazonaws.com principal to call sqs:SendMessage.", correct: false,
        why: "Scheduler uses its execution role, not a queue policy for events.amazonaws.com. The access denied error continues." },
      { text: "Attach the AdministratorAccess policy to the IAM user who created the schedule.", correct: false,
        why: "Scheduler does not use the creator's credentials when it invokes the target. This also fails least privilege." },
      { text: "Add sqs:SendMessage permission to a role that trusts lambda.amazonaws.com.", correct: false,
        why: "Scheduler cannot assume a role that trusts only the Lambda service. The schedule still fails." }
    ],
    explanation: "Every EventBridge Scheduler schedule uses an execution role. The role trusts scheduler.amazonaws.com and allows the target action." },

  { id: "m05-029", topic: "kinesis-streams", domain: 4,
    stem: "IoT devices write records to a provisioned Kinesis data stream with 10 shards. The partition key is the device type, and there are only 3 device types. One shard returns ProvisionedThroughputExceededException, while other shards are almost idle. Records must not be lost. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Change the partition key to the device ID, which has many distinct values.", correct: true,
        why: "A key with many values spreads records across all shards. This removes the hot shard." },
      { text: "Catch ProvisionedThroughputExceededException in the producer and retry with exponential backoff.", correct: true,
        why: "Throttled records are not written. A retry with backoff writes them later, so records are not lost." },
      { text: "Add 10 more shards to the stream.", correct: false,
        why: "Each device type still maps to one shard. The hot shard stays throttled, and the cost goes up." },
      { text: "Register an enhanced fan-out consumer.", correct: false,
        why: "Enhanced fan-out adds read throughput for consumers. The throttling is on writes, so it continues." },
      { text: "Increase the stream retention period to 7 days.", correct: false,
        why: "Retention controls how long stored records stay. It does not change write capacity for a shard." }
    ],
    explanation: "The partition key decides the shard. A key with few distinct values sends most records to a few shards, which become hot shards: they pass their write limit and throttle while other shards are idle. Use a key with many values, and retry throttled writes with exponential backoff." },

  { id: "m05-030", topic: "kinesis-streams", domain: 4,
    stem: "Five applications read every record from the same Kinesis data stream with GetRecords. As traffic grows, the consumers get read throttling errors and latency increases. Each application must get its own read throughput that other consumers do not affect. Which solution will meet these requirements?",
    options: [
      { text: "Register each application as an enhanced fan-out consumer and read with SubscribeToShard.", correct: true,
        why: "Each enhanced fan-out consumer gets its own 2 MB/s for each shard, pushed over HTTP/2. Other consumers do not affect it." },
      { text: "Increase the stream retention period.", correct: false,
        why: "Retention controls how long records stay. It does not change read throughput." },
      { text: "Make each application call GetRecords more often.", correct: false,
        why: "Each shard allows 5 GetRecords calls each second, shared by all consumers. More calls cause more throttling." },
      { text: "Replace the stream with an Amazon Data Firehose stream.", correct: false,
        why: "Firehose delivers to managed destinations. It does not support five custom applications that read the same records." }
    ],
    explanation: "Shared-throughput consumers share 2 MB/s and 5 GetRecords calls each second for each shard. Enhanced fan-out gives each registered consumer a dedicated 2 MB/s for each shard." },

  { id: "m05-031", topic: "kinesis-streams", domain: 1,
    stem: "A company collects clickstream events. Three applications must read the same events. Events for each user session must be processed in order. The applications must be able to reprocess events from up to 7 days ago. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Write the events to a Kinesis data stream with the session ID as the partition key.", correct: true,
        why: "Records with the same partition key go to the same shard in order. Many applications can read the same stream." },
      { text: "Set the stream retention period to 168 hours.", correct: true,
        why: "The default retention is 24 hours. 168 hours (7 days) keeps the records so that applications can read them again." },
      { text: "Write the events to an Amazon Data Firehose stream that delivers to Amazon S3.", correct: false,
        why: "Firehose does not store records for consumers and has no replay. Applications cannot read events again from the stream." },
      { text: "Write the events to an SQS FIFO queue with the session ID as the message group ID.", correct: false,
        why: "A consumer deletes each message after processing, so three applications cannot each read every event. Deleted messages cannot be replayed." },
      { text: "Keep the default stream retention period.", correct: false,
        why: "The default retention is 24 hours. Events older than 1 day cannot be reprocessed." }
    ],
    explanation: "Kinesis Data Streams keeps order for each partition key, supports many consumers, and keeps records for 24 hours by default (up to 365 days) for replay." },

  { id: "m05-032", topic: "kinesis-streams", domain: 2,
    stem: "A Kinesis data stream holds payment data. The data must be encrypted at rest with a key that the security team controls, and key use must be logged in AWS CloudTrail. The solution must need the fewest code changes. Which solution will meet these requirements?",
    options: [
      { text: "Turn on server-side encryption for the stream with a customer managed KMS key. Give producers kms:GenerateDataKey and consumers kms:Decrypt on the key.", correct: true,
        why: "Kinesis encrypts records at rest with the KMS key, and KMS logs key use in CloudTrail. Only IAM changes are needed, not code changes." },
      { text: "Encrypt each record in the producer with the AWS Encryption SDK, and decrypt it in each consumer.", correct: false,
        why: "This works but needs code changes in every producer and consumer. It fails the fewest code changes requirement." },
      { text: "Require HTTPS for all calls to the stream.", correct: false,
        why: "HTTPS protects data in transit. It does not encrypt records at rest." },
      { text: "Turn on server-side encryption for the stream with the AWS managed key aws/kinesis.", correct: false,
        why: "The security team cannot control the policy of an AWS managed key. This fails the requirement for a key that the team controls." }
    ],
    explanation: "Kinesis server-side encryption uses AWS KMS keys. With a customer managed key, you control the key policy, and producers and consumers need permission to use the key." },

  { id: "m05-033", topic: "kinesis-firehose", domain: 1,
    stem: "A web application sends JSON clickstream events. The events must be stored in Amazon S3 in Apache Parquet format for Amazon Athena queries. The team wants the LEAST operational overhead and no consumer code. Which solution will meet these requirements?",
    options: [
      { text: "Send the events to an Amazon Data Firehose stream with record format conversion to Parquet, using an AWS Glue table for the schema, and deliver to Amazon S3.", correct: true,
        why: "Firehose converts JSON to Parquet with a Glue table schema and delivers to S3. It is fully managed and needs no consumer code." },
      { text: "Send the events to a Kinesis data stream, and write a Lambda consumer that converts batches to Parquet and writes them to Amazon S3.", correct: false,
        why: "This needs consumer code and stream capacity management. It fails the least operational overhead and no consumer code requirements." },
      { text: "Send the events to an SQS queue, and run an application on Amazon EC2 that writes Parquet files to Amazon S3.", correct: false,
        why: "You must write and run consumer code on servers. This fails both requirements." },
      { text: "Send the events to a Firehose stream that delivers JSON to Amazon S3 with GZIP compression.", correct: false,
        why: "GZIP compresses the JSON files, but they stay in JSON format. This fails the Parquet requirement." }
    ],
    explanation: "Data Firehose can convert JSON to Apache Parquet or ORC with an AWS Glue table, and deliver to Amazon S3 with no consumer code." },

  { id: "m05-034", topic: "kinesis-firehose", domain: 1,
    stem: "A Firehose stream uses a Lambda function to transform records before delivery to Amazon S3. Records that come from test devices must not be delivered and must not be treated as errors. Which solution will meet these requirements?",
    options: [
      { text: "Return each test record with its original recordId and result set to Dropped.", correct: true,
        why: "Dropped tells Firehose that the function removed the record on purpose. Firehose counts it as successfully processed and does not deliver it." },
      { text: "Return each test record with result set to ProcessingFailed.", correct: false,
        why: "ProcessingFailed marks the record as unsuccessful. Firehose writes it to the processing-failed folder, so it is treated as an error." },
      { text: "Leave the test records out of the function response.", correct: false,
        why: "Each input record must come back with the same recordId. A missing record is a transformation failure, so it is treated as an error." },
      { text: "Return each test record with result set to Ok and an empty data field.", correct: false,
        why: "Ok tells Firehose to deliver the record. Firehose still delivers a record for each test record." }
    ],
    explanation: "A Firehose transformation function returns recordId, result, and base64 data for every record. result is Ok, Dropped, or ProcessingFailed." },

  { id: "m05-035", topic: "kinesis-firehose", domain: 4,
    stem: "A Firehose stream delivers application logs to Amazon S3 with the default buffering hints. New log data appears in S3 about 5 minutes after it is sent. The team needs the data in S3 within a few seconds and wants to keep using Firehose. The stream does not use dynamic partitioning. Which solution will meet these requirements?",
    options: [
      { text: "Set the buffer interval hint to 0 seconds.", correct: true,
        why: "The default S3 buffer interval is 300 seconds. A zero buffering interval makes Firehose deliver within a few seconds." },
      { text: "Set the buffer size hint to 128 MiB.", correct: false,
        why: "A larger buffer makes Firehose wait for more data before delivery. Latency stays the same or increases." },
      { text: "Add shards to the Firehose stream.", correct: false,
        why: "Firehose has no shards to manage. Buffering, not capacity, causes the delay." },
      { text: "Turn on dynamic partitioning.", correct: false,
        why: "Dynamic partitioning changes S3 prefixes. Zero buffering is not available with dynamic partitioning, so it does not reduce latency." }
    ],
    explanation: "Firehose delivers when the buffer size or the buffer interval is reached first. For S3, the interval range is 0 to 900 seconds (default 300). An interval under 60 seconds adds S3 PUT cost." },

  { id: "m05-036", topic: "appsync-api", domain: 1,
    stem: "A chat application uses an AWS AppSync GraphQL API. Clients create messages with the createMessage mutation. Other clients must receive new messages in real time. The team wants the least custom code. Which solution will meet these requirements?",
    options: [
      { text: "Add a subscription field with @aws_subscribe(mutations: [\"createMessage\"]) to the schema, and have clients subscribe to it.", correct: true,
        why: "AppSync triggers the subscription when the mutation runs and pushes the result to subscribed clients over WebSockets. No server code is needed." },
      { text: "Have clients run a query every 2 seconds to check for new messages.", correct: false,
        why: "Polling adds delay and many requests. It is not real time and adds client code." },
      { text: "Write new messages directly to the DynamoDB table, and use the table as the subscription source.", correct: false,
        why: "AppSync subscriptions are triggered by mutations. Direct writes to the table do not trigger a subscription." },
      { text: "Publish each message to an SNS topic with an email subscription for each user.", correct: false,
        why: "Email is not real-time delivery to the application. It fails the real-time requirement." }
    ],
    explanation: "AppSync subscriptions are triggered by mutations that you list in @aws_subscribe. AppSync pushes the data to clients over WebSockets." },

  { id: "m05-037", topic: "appsync-api", domain: 4,
    stem: "An AppSync API has a getProduct query with a direct DynamoDB resolver. The query is called thousands of times each minute, and product data changes a few times each day. The team wants lower latency and fewer DynamoDB reads. After an updateProduct mutation, the next getProduct call must return the new data. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Turn on per-resolver caching for getProduct with context.arguments.id as the caching key and a TTL of 3,600 seconds.", correct: true,
        why: "Cached results are returned without a DynamoDB read until the TTL ends. This lowers latency and read cost." },
      { text: "Call extensions.evictFromApiCache for the product ID in the updateProduct resolver.", correct: true,
        why: "Eviction removes the stale entry when the product changes. The next getProduct call reads the new data." },
      { text: "Set the cache TTL to 86,400 seconds.", correct: false,
        why: "The maximum AppSync cache TTL is 3,600 seconds. A 24-hour TTL is not possible." },
      { text: "Put an Amazon CloudFront distribution in front of the API to cache GraphQL responses.", correct: false,
        why: "GraphQL requests are POST requests, and CloudFront does not cache POST responses. DynamoDB reads do not go down." },
      { text: "Turn on full request caching and do not change the mutation.", correct: false,
        why: "Results stay cached until the TTL ends. After an update, getProduct can return old data, which fails the freshness requirement." }
    ],
    explanation: "AppSync per-resolver caching uses a TTL (maximum 3,600 seconds) and caching keys. Use evictFromApiCache in a mutation to remove stale entries." },

  { id: "m05-038", topic: "appsync-auth", domain: 2,
    stem: "A mobile app uses an AWS AppSync API. Guests who are not signed in must be able to run the listProducts query. Only signed-in users from an Amazon Cognito user pool can run mutations. The app must not contain a long-term secret, and guest access must be controlled by an IAM policy. Which solution will meet these requirements?",
    options: [
      { text: "Set Cognito user pools as the default authorization mode, and add AWS_IAM as an additional mode. Use a Cognito identity pool for guest credentials, and mark listProducts with @aws_iam.", correct: true,
        why: "Guests get temporary AWS credentials from the identity pool, limited by the IAM policy of the unauthenticated role. Mutations use the default user pool mode." },
      { text: "Set API_KEY as the only authorization mode, and put the API key in the app.", correct: false,
        why: "An API key is a long-term value in the app and does not identify users. Anyone with the key can run mutations." },
      { text: "Set Cognito user pools as the only authorization mode.", correct: false,
        why: "Every request then needs a signed-in user token. Guests cannot run listProducts." },
      { text: "Add an AWS_LAMBDA authorizer that always returns isAuthorized true.", correct: false,
        why: "This lets every request through, including mutations from guests. Access is not controlled by an IAM policy." }
    ],
    explanation: "AppSync supports a default authorization mode plus additional modes. Directives such as @aws_iam and @aws_cognito_user_pools set the mode for each type or field." },

  { id: "m05-039", topic: "appsync-auth", domain: 2,
    stem: "An AppSync API uses Amazon Cognito user pools as its only authorization mode. Only users in the Admins group may run the deletePost mutation. All signed-in users may run the other operations. The team does not want to change resolver code. Which solution will meet these requirements?",
    options: [
      { text: "Add @aws_auth(cognito_groups: [\"Admins\"]) to the deletePost field in the schema.", correct: true,
        why: "With Cognito user pools as the only mode, @aws_auth limits a field to the listed groups from the user token. No resolver code changes." },
      { text: "Create a separate API key for administrators.", correct: false,
        why: "An API key does not identify a user or group. The API also does not use API key mode." },
      { text: "Attach an IAM policy that allows appsync:GraphQL on deletePost to an IAM role, and assign the role to the Admins group in the user pool.", correct: false,
        why: "With user pool authorization, AppSync checks the user pool token, not IAM policies. The group role does not limit access to deletePost." },
      { text: "Add a check of ctx.identity.groups to the deletePost resolver.", correct: false,
        why: "This works but changes resolver code, which fails the requirement." }
    ],
    explanation: "With Cognito user pools as the only mode, use @aws_auth(cognito_groups: [...]). With additional modes, use @aws_cognito_user_pools(cognito_groups: [...])." },

  { id: "m05-040", topic: "eb-delivery-archive", domain: 3,
    stem: "A team stores EventBridge rules in AWS CloudFormation templates. A rule was deployed with a wrong event pattern, and no events matched in production. The team wants an automated check in the CI pipeline that fails the build when a pattern does not match sample events, before deployment. Which solution will meet these requirements?",
    options: [
      { text: "In the pipeline, call the EventBridge TestEventPattern API with each pattern and its sample events, and fail the build when Result is false.", correct: true,
        why: "TestEventPattern checks a sample event against a pattern without a deployed rule. The pipeline can stop the deployment before a wrong pattern reaches production." },
      { text: "Create an archive on the production bus, and replay events after each deployment.", correct: false,
        why: "Replay runs after deployment and needs the rule to be in production. It does not stop a wrong pattern before deployment." },
      { text: "Add a CloudWatch alarm on the MatchedEvents metric of the rule.", correct: false,
        why: "The alarm finds the problem only after deployment, when production events fail to match. It does not check the pattern in the build." },
      { text: "Add a dead-letter queue to each rule target.", correct: false,
        why: "A DLQ captures events that match but fail delivery. Events that do not match the pattern never reach the target or the DLQ." }
    ],
    explanation: "Use TestEventPattern to test event patterns in unit tests or CI. Use a test listener rule, and archive and replay, to test event flows after deployment." }

] });
