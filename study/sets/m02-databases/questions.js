window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "m02-databases", questions: [

  { id: "m02-001", topic: "ddb-keys", domain: 1,
    stem: "A company is designing a DynamoDB table that stores events from 2 million IoT devices. Each device sends a reading every 10 seconds. The application reads the latest readings for one device at a time. The table must spread write traffic evenly across partitions. Which primary key design will meet these requirements?",
    options: [
      { text: "Partition key deviceId and sort key readingTimestamp.", correct: true,
        why: "deviceId has very high cardinality, so writes spread across many partitions. The timestamp sort key lets one Query return the latest readings for one device." },
      { text: "Partition key readingDate (YYYY-MM-DD) and sort key deviceId.", correct: false,
        why: "All writes for one day use the same partition key value. That key becomes a hot partition, so writes do not spread evenly." },
      { text: "Partition key deviceType (five possible values) and sort key readingTimestamp.", correct: false,
        why: "Five key values concentrate traffic on very few partitions. This fails the requirement to spread writes evenly." },
      { text: "Partition key region (four possible values) and a GSI on deviceId.", correct: false,
        why: "The table key still has only four values, so table writes go to hot partitions. A GSI does not change how the base table spreads writes." }
    ],
    explanation: "Use a high-cardinality partition key so that requests spread across partitions. Put the value you sort or filter by, such as a timestamp, in the sort key." },

  { id: "m02-002", topic: "ddb-keys", domain: 4,
    stem: "A voting application writes each vote to a DynamoDB table with the partition key candidateId. During a live event, one popular candidate receives most votes. The application gets throttling errors, but CloudWatch shows that the table uses only 20% of its provisioned write capacity. The developer must remove the throttling. Which solution will meet these requirements?",
    options: [
      { text: "Add a random suffix from a fixed range (for example 1 to 20) to the partition key value, and add the shard counts together when reading totals.", correct: true,
        why: "Write sharding spreads the writes for one candidate across many partition key values. No single partition receives more than its maximum throughput." },
      { text: "Double the table's provisioned write capacity.", correct: false,
        why: "The table already has 80% unused capacity. The limit is the throughput of one partition for one hot key, so more table capacity does not remove the throttling." },
      { text: "Switch reads for the vote totals to strongly consistent reads.", correct: false,
        why: "Read consistency does not change write throughput. The writes to the hot partition key continue to throttle." },
      { text: "Add a GSI with candidateId as the partition key.", correct: false,
        why: "A GSI with the same hot key has the same concentration of writes. It adds write cost and can also throttle base table writes." }
    ],
    explanation: "Throttling with low table utilization points to a hot partition key. Write sharding (a suffix on the key) spreads the writes." },

  { id: "m02-003", topic: "ddb-keys", domain: 1,
    stem: "An application stores customer records in DynamoDB. A new feature must store a scanned contract PDF of about 3 MB with each customer record. The application must find the contract from the customer ID. The solution must be the MOST cost-effective. Which solution will meet these requirements?",
    options: [
      { text: "Store the PDF in Amazon S3, and store the S3 object key as an attribute in the customer item.", correct: true,
        why: "The maximum DynamoDB item size is 400 KB. Amazon S3 stores large objects at low cost, and the item keeps a pointer to the object." },
      { text: "Store the PDF as a Binary attribute in the customer item.", correct: false,
        why: "A 3 MB PDF is larger than the 400 KB maximum item size, so DynamoDB rejects the write." },
      { text: "Split the PDF into chunks and store them in a list attribute of the customer item.", correct: false,
        why: "The whole item, including all list elements, must be 400 KB or smaller. The 3 MB PDF still does not fit." },
      { text: "Compress the PDF with gzip and store it in a Binary attribute.", correct: false,
        why: "A scanned PDF is already compressed and stays far above 400 KB. The write fails." }
    ],
    explanation: "DynamoDB items are limited to 400 KB, including attribute names. Store large objects in Amazon S3 and keep the S3 key in the item." },

  { id: "m02-004", topic: "ddb-keys", domain: 1,
    stem: "A Node.js Lambda function processes records from a DynamoDB stream. The code reads record.dynamodb.NewImage.price and expects a number, but it receives an object such as { N: \"19.99\" }. The developer wants plain JavaScript values with the least custom code. Which solution will meet these requirements?",
    options: [
      { text: "Convert the image with the unmarshall function from @aws-sdk/util-dynamodb before using its values.", correct: true,
        why: "Stream images use the DynamoDB attribute-value format with type descriptors. unmarshall converts that format to native JavaScript values." },
      { text: "Call JSON.parse on NewImage.", correct: false,
        why: "NewImage is already a parsed object. JSON.parse does not remove the type descriptors, so price stays { N: \"19.99\" }." },
      { text: "Change the stream view type from NEW_IMAGE to NEW_AND_OLD_IMAGES.", correct: false,
        why: "The view type controls which images the record contains, not their format. Both images still use type descriptors." },
      { text: "Store price as a String attribute in the table.", correct: false,
        why: "The value then arrives as { S: \"19.99\" }, which still has a type descriptor. The code also loses numeric sorting and arithmetic." }
    ],
    explanation: "The low-level API and stream records use typed attribute values such as {\"N\": \"19.99\"}. Marshalling helpers or document clients convert them to and from native values." },

  { id: "m02-005", topic: "ddb-capacity", domain: 1,
    stem: "A table uses provisioned capacity mode. The application performs 20 strongly consistent reads each second. Each item is 7 KB. The developer must provision the minimum read capacity that serves this traffic without throttling. How many read capacity units (RCUs) will meet these requirements?",
    options: [
      { text: "40 RCUs", correct: true,
        why: "7 KB rounds up to 8 KB, which is 2 RCUs for each strongly consistent read. 20 reads × 2 RCUs = 40 RCUs." },
      { text: "20 RCUs", correct: false,
        why: "20 RCUs is the eventually consistent value (0.5 RCU for each 4 KB). Strongly consistent reads cost twice as much, so 20 RCUs throttles." },
      { text: "35 RCUs", correct: false,
        why: "This divides 7 KB by 4 KB without rounding. DynamoDB rounds each item up to the next 4 KB, so 35 RCUs is too low." },
      { text: "80 RCUs", correct: false,
        why: "80 RCUs is the transactional read value (2 RCUs for each 4 KB). It is more than the minimum for standard strongly consistent reads." }
    ],
    explanation: "One RCU is one strongly consistent read each second of up to 4 KB. Round the item size up to the next 4 KB. Eventually consistent reads cost half, transactional reads cost double." },

  { id: "m02-006", topic: "ddb-capacity", domain: 1,
    stem: "A startup is launching a new mobile application that uses a DynamoDB table. The team cannot predict the traffic. Traffic can be near zero for hours and then spike after marketing campaigns. The team wants the LEAST operational overhead for capacity management. Which solution will meet these requirements?",
    options: [
      { text: "Create the table in on-demand capacity mode.", correct: true,
        why: "On-demand mode scales automatically and charges for each request. The team does not plan or manage capacity." },
      { text: "Create the table in provisioned mode with auto scaling at 70% target utilization.", correct: false,
        why: "Auto scaling needs minimum and maximum settings and reacts over time, so sudden spikes can throttle. It has more operational overhead than on-demand mode." },
      { text: "Create the table in provisioned mode with capacity set for the expected peak.", correct: false,
        why: "The team pays for peak capacity during hours of near-zero traffic, and must still forecast the peak. This adds overhead and cost." },
      { text: "Create the table in provisioned mode and buy reserved capacity.", correct: false,
        why: "Reserved capacity is a commitment for steady, predictable use. Unpredictable traffic is the opposite case, and capacity still needs management." }
    ],
    explanation: "On-demand mode suits unknown or spiky traffic with no capacity planning. Provisioned mode with auto scaling suits steady, predictable traffic." },

  { id: "m02-007", topic: "ddb-query-scan", domain: 4,
    stem: "A table has the partition key customerId and the sort key orderDate (ISO 8601 string). A report must list one customer's orders from the last 30 days. The code uses Scan with a FilterExpression on customerId and orderDate. The report is slow and consumes a large amount of read capacity. Which solution will reduce latency and read capacity the MOST?",
    options: [
      { text: "Use Query with KeyConditionExpression customerId = :c AND orderDate >= :start.", correct: true,
        why: "Query reads only the item collection of one customer and only the sort key range that matches. Capacity depends on the matching items, not the whole table." },
      { text: "Keep the Scan and add a ProjectionExpression that returns only the needed attributes.", correct: false,
        why: "ProjectionExpression reduces the data returned, not the data read. The Scan still reads and pays for every item in the table." },
      { text: "Use a parallel Scan with four segments.", correct: false,
        why: "A parallel scan can finish faster, but it still reads every item. Read capacity does not go down, and it is consumed faster." },
      { text: "Keep the Scan and set Limit to 100.", correct: false,
        why: "Limit stops after 100 items are evaluated, so the report misses matching orders. It does not target the customer's items." }
    ],
    explanation: "Query reads one partition key value and can narrow the sort key range. FilterExpression and ProjectionExpression run after the read and do not reduce capacity." },

  { id: "m02-008", topic: "ddb-query-scan", domain: 4,
    stem: "A developer runs a Query for one partition key value. The developer expects about 5,000 items, but the response contains only part of them. The response includes a LastEvaluatedKey element. The application must get all matching items. Which solution will meet these requirements?",
    options: [
      { text: "Call Query again with ExclusiveStartKey set to the LastEvaluatedKey value, and repeat until the response has no LastEvaluatedKey.", correct: true,
        why: "A Query returns a maximum of 1 MB for each call. LastEvaluatedKey marks where the page stopped, and ExclusiveStartKey continues from that point." },
      { text: "Set ConsistentRead to true.", correct: false,
        why: "Read consistency does not change the 1 MB page size. The response is still split into pages." },
      { text: "Set the Limit parameter to 5000.", correct: false,
        why: "Limit sets the maximum number of items to evaluate. The 1 MB limit for each call still applies, so the result is still paginated." },
      { text: "Replace the Query with a Scan that filters on the partition key.", correct: false,
        why: "A Scan has the same 1 MB page limit and reads the whole table. It costs more and still needs pagination." }
    ],
    explanation: "Query and Scan return a maximum of 1 MB for each call. Use LastEvaluatedKey as ExclusiveStartKey to read the next page." },

  { id: "m02-009", topic: "ddb-query-scan", domain: 1,
    stem: "Each night, a job loads 500,000 new product items into a DynamoDB table. The load does not need to be all-or-nothing. The job must use the fewest API calls and the least write capacity, and it must not lose items when DynamoDB throttles. Which combination of actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Use BatchWriteItem with up to 25 put requests in each call.", correct: true,
        why: "BatchWriteItem writes up to 25 items in one call at the normal write cost. It reduces the number of API calls compared with single PutItem calls." },
      { text: "Resend the items that the response returns in UnprocessedItems, with exponential backoff.", correct: true,
        why: "Throttled items come back in UnprocessedItems. Retrying them with backoff makes sure that no item is lost." },
      { text: "Use TransactWriteItems with 100 Put actions in each call.", correct: false,
        why: "Transactions cost two writes for each item. The load does not need all-or-nothing behavior, so this fails the least-capacity requirement." },
      { text: "Use BatchWriteItem with UpdateItem requests so that existing items are merged.", correct: false,
        why: "BatchWriteItem supports only put and delete requests. It does not accept update requests." },
      { text: "Retry the full batch immediately when the call returns any UnprocessedItems.", correct: false,
        why: "An immediate retry of the full batch writes successful items again and uses extra capacity. It also adds load while the table throttles." }
    ],
    explanation: "BatchWriteItem writes up to 25 items (16 MB) in one call and is not atomic. Retry UnprocessedItems with exponential backoff." },

  { id: "m02-010", topic: "ddb-query-scan", domain: 4,
    stem: "A developer uses PartiQL with ExecuteStatement on an Orders table that has the partition key orderId. The statement SELECT * FROM \"Orders\" WHERE customerEmail = ? is slow and consumes most of the table's read capacity. The developer must keep using PartiQL and reduce read capacity for this lookup. Which solution will meet these requirements?",
    options: [
      { text: "Create a GSI with customerEmail as the partition key, and run the SELECT against the index (FROM \"Orders\".\"EmailIndex\") with an equality condition on customerEmail.", correct: true,
        why: "Without an equality or IN condition on the partition key, the SELECT is a full table scan. On the GSI, customerEmail is the partition key, so the statement reads only matching items." },
      { text: "Rewrite the statement as SELECT orderId, total FROM \"Orders\" WHERE customerEmail = ?.", correct: false,
        why: "Selecting fewer attributes reduces the data returned, not the data read. The statement still scans the whole table." },
      { text: "Run the same statement with BatchExecuteStatement.", correct: false,
        why: "Batching groups statements into one call. Each SELECT without a partition key condition still scans the table." },
      { text: "Add ORDER BY orderId to the statement.", correct: false,
        why: "Ordering does not add a partition key condition. The statement still runs a full table scan." }
    ],
    explanation: "A PartiQL SELECT can run a full table scan unless the WHERE clause has an equality or IN condition on the partition key. Use a table or index key that matches the lookup." },

  { id: "m02-011", topic: "ddb-indexes", domain: 1,
    stem: "A production table has the partition key userId. A new feature must look up a user by email address with low latency. The table holds 50 million items, and downtime is not acceptable. Which solution will meet these requirements?",
    options: [
      { text: "Add a global secondary index with email as the partition key, and Query the index.", correct: true,
        why: "You can add a GSI to an existing table at any time. A GSI can use a different partition key, so a Query on email is fast." },
      { text: "Add a local secondary index with email as the sort key.", correct: false,
        why: "You can create an LSI only when you create the table. An LSI also keeps userId as the partition key, so it cannot look up by email alone." },
      { text: "Use Scan with a FilterExpression on email.", correct: false,
        why: "A Scan reads all 50 million items for each lookup. It fails the low-latency requirement." },
      { text: "Use GetItem with the email value as the key.", correct: false,
        why: "GetItem needs the table's primary key (userId). Email is not part of the key, so GetItem cannot find the item." }
    ],
    explanation: "Add a GSI when you need a different partition key on an existing table. LSIs share the table's partition key and exist only from table creation." },

  { id: "m02-012", topic: "ddb-indexes", domain: 1,
    stem: "A developer is designing a new table with the partition key accountId and the sort key transactionId. The application must also query one account's transactions sorted by amount. These queries must always return the latest committed data. Which solution will meet these requirements?",
    options: [
      { text: "Create the table with a local secondary index that has accountId as the partition key and amount as the sort key. Query it with ConsistentRead set to true.", correct: true,
        why: "An LSI keeps the table's partition key, has a different sort key, and supports strongly consistent reads. The table is new, so the LSI can be created now." },
      { text: "Create a global secondary index with accountId as the partition key and amount as the sort key. Query it with ConsistentRead set to true.", correct: false,
        why: "GSIs support only eventually consistent reads. A strongly consistent read request on a GSI is rejected, so the latest-data requirement fails." },
      { text: "Query the table by accountId and sort the results by amount in the application.", correct: false,
        why: "This reads every transaction of the account for each request. It does not use an index and costs more as accounts grow." },
      { text: "Create a global secondary index with amount as the partition key.", correct: false,
        why: "A GSI on amount groups items by amount, not by account. It also gives only eventually consistent reads." }
    ],
    explanation: "Choose an LSI for a different sort key on the same partition key with strongly consistent reads. Create it with the table." },

  { id: "m02-013", topic: "ddb-indexes", domain: 4,
    stem: "A provisioned table has 1,000 WCUs and uses about 400 WCUs. The table has one GSI with 50 WCUs. After a traffic increase, PutItem calls on the table fail with ProvisionedThroughputExceededException. Which solution will resolve the errors?",
    options: [
      { text: "Increase the GSI write capacity to at least the write capacity that the table uses.", correct: true,
        why: "Each table write that affects the GSI also writes to the GSI. If the GSI lacks write capacity, DynamoDB throttles writes to the base table." },
      { text: "Increase the table's provisioned write capacity to 2,000 WCUs.", correct: false,
        why: "The table already has 600 unused WCUs. The bottleneck is the GSI, so more table capacity does not stop the throttling." },
      { text: "Change the GSI projection from ALL to KEYS_ONLY without changing its capacity.", correct: false,
        why: "You cannot change the projection of an existing GSI; you must create a new index. Even with smaller entries, 50 WCUs is far below the write rate, so throttling continues." },
      { text: "Use strongly consistent reads on the GSI.", correct: false,
        why: "GSIs do not support strongly consistent reads, and read settings do not affect write throttling." }
    ],
    explanation: "A GSI has its own capacity. When a GSI does not have enough write capacity, writes to the base table are throttled. Give the GSI at least the table's write capacity." },

  { id: "m02-014", topic: "ddb-indexes", domain: 1,
    stem: "An Orders table holds 100 million items. About 1% of orders are open. A dashboard must list all open orders with their orderTotal every minute. The solution must be the MOST cost-effective and must not read closed orders. Which combination of actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Write an openFlag attribute only on open orders, remove it when an order closes, and create a GSI with openFlag as the partition key.", correct: true,
        why: "This is a sparse index. Items without openFlag are not in the GSI, so the index holds only open orders and a Query reads nothing else." },
      { text: "Project orderTotal into the GSI with the INCLUDE projection type.", correct: true,
        why: "A GSI query cannot fetch attributes from the base table. Projecting orderTotal lets the dashboard get it from the index at low cost." },
      { text: "Use the KEYS_ONLY projection and call GetItem on the GSI for each order.", correct: false,
        why: "GetItem does not work on an index. The extra reads also add cost compared with projecting the one needed attribute." },
      { text: "Run a Scan every minute with a FilterExpression on status = OPEN.", correct: false,
        why: "The Scan reads all 100 million items each minute. It reads closed orders and is very expensive." },
      { text: "Add a local secondary index with status as the sort key.", correct: false,
        why: "You cannot add an LSI to an existing table. An LSI also requires a partition key value in each Query, so it cannot list open orders across all customers." }
    ],
    explanation: "A sparse GSI contains only items that have the index key attribute. Project the attributes that the query needs, because a GSI cannot fetch from the table." },

  { id: "m02-015", topic: "ddb-indexes", domain: 3,
    stem: "A team manages a DynamoDB table in an AWS CloudFormation template. A developer adds two new global secondary indexes to the table definition in one change, and the stack update fails. The team must add both indexes through CloudFormation with no table downtime. Which solution will meet these requirements?",
    options: [
      { text: "Add one GSI in one stack update, and add the second GSI in a later stack update after the first update completes.", correct: true,
        why: "CloudFormation can create or delete only one index on a DynamoDB table in each stack update. Two separate updates add both indexes without interruption." },
      { text: "Change the table name in the template so that CloudFormation creates a new table with both indexes.", correct: false,
        why: "A new name replaces the table. The application loses the existing data unless the team migrates it, so the no-downtime requirement fails." },
      { text: "Add both indexes as local secondary indexes instead.", correct: false,
        why: "LSIs can be created only when the table is created. They cannot be added to the existing table." },
      { text: "Add a DependsOn attribute between the two index definitions.", correct: false,
        why: "DependsOn sets the order between resources, not between indexes inside one table. The update still changes two indexes at once and fails." }
    ],
    explanation: "In CloudFormation, you can create or delete one GSI on a table in each stack update. Use separate updates for more indexes." },

  { id: "m02-016", topic: "ddb-writes", domain: 1,
    stem: "Two support agents sometimes edit the same ticket item in DynamoDB at the same time. The application reads the item, changes it, and writes it back with PutItem. One agent's changes are sometimes lost. The developer must stop lost updates without locking the item. Which solution will meet these requirements?",
    options: [
      { text: "Add a version attribute. On each write, increase the version and add a ConditionExpression that the stored version equals the version that was read. On ConditionalCheckFailedException, read the item again and retry.", correct: true,
        why: "This is optimistic locking. The second writer's condition fails because the version changed, so its stale write does not overwrite the first agent's changes." },
      { text: "Read the item with ConsistentRead set to true before each write.", correct: false,
        why: "A strongly consistent read returns the latest data at read time. Another agent can still write between the read and the PutItem, so updates are still lost." },
      { text: "Use BatchWriteItem instead of PutItem.", correct: false,
        why: "BatchWriteItem does not support conditions. It overwrites items in the same way, so lost updates continue." },
      { text: "Add a ConditionExpression attribute_not_exists(ticketId) to the PutItem call.", correct: false,
        why: "The ticket already exists, so every edit fails. This blocks all updates instead of only stale ones." }
    ],
    explanation: "Optimistic locking uses a version attribute and a condition expression. A write succeeds only when the version did not change since the read." },

  { id: "m02-017", topic: "ddb-writes", domain: 1,
    stem: "A wallet application moves credits between two user items in the same table. It must subtract from one balance and add to the other as one operation. The subtraction must happen only if the sender's balance is high enough. If any part fails, nothing must change. Which solution will meet these requirements?",
    options: [
      { text: "Use TransactWriteItems with two Update actions. Add a ConditionExpression balance >= :amount to the sender's Update.", correct: true,
        why: "A transaction applies all actions or none. The condition on the sender cancels the whole transaction if the balance is too low." },
      { text: "Call UpdateItem on the sender with a condition, then call UpdateItem on the receiver.", correct: false,
        why: "These are two separate operations. If the second call fails, the sender loses credits that the receiver never gets, so all-or-nothing fails." },
      { text: "Use BatchWriteItem with the two new items.", correct: false,
        why: "BatchWriteItem is not atomic and does not support conditions. One write can succeed while the other fails." },
      { text: "Use TransactGetItems to read both balances, then write both items with PutItem.", correct: false,
        why: "TransactGetItems only reads. The two PutItem calls are separate, can partly fail, and can overwrite concurrent changes." }
    ],
    explanation: "TransactWriteItems makes up to 100 actions all-or-nothing. Conditions on any action cancel the whole transaction." },

  { id: "m02-018", topic: "ddb-writes", domain: 4,
    stem: "A TransactWriteItems call with eight actions sometimes fails with TransactionCanceledException. The developer must find which action caused each failure and why, with the least effort. Which solution will meet these requirements?",
    options: [
      { text: "Read the CancellationReasons list in the exception. Its entries are in the same order as the actions in the request.", correct: true,
        why: "CancellationReasons gives a reason code for each item in request order, for example ConditionalCheckFailed. It shows which action failed and why." },
      { text: "Catch ConditionalCheckFailedException and log its message.", correct: false,
        why: "A transaction does not return ConditionalCheckFailedException. It returns TransactionCanceledException, so this handler never runs." },
      { text: "Enable DynamoDB Streams and inspect the records for the failed transaction.", correct: false,
        why: "A canceled transaction writes nothing, so there are no stream records to inspect." },
      { text: "Check the TransactionConflict metric in CloudWatch.", correct: false,
        why: "The metric counts failed item-level requests. It does not show which action of a specific request failed or the reason." }
    ],
    explanation: "A failed transaction returns TransactionCanceledException. CancellationReasons lists a reason for each action, in request order." },

  { id: "m02-019", topic: "ddb-streams", domain: 1,
    stem: "When a new user item is added to a Users table, the company must send a welcome email to the address in the item. Existing items are often updated, and these updates must not send email. The solution must use the LEAST custom code and the fewest function invocations. Which solution will meet these requirements?",
    options: [
      { text: "Enable a stream with NEW_IMAGE. Add a Lambda event source mapping with a filter on eventName INSERT, and send the email from the function.", correct: true,
        why: "NEW_IMAGE includes the email attribute. The filter invokes the function only for inserts, so updates do not invoke it." },
      { text: "Enable a stream with KEYS_ONLY and a Lambda trigger that sends the email.", correct: false,
        why: "KEYS_ONLY records do not contain the email attribute. The function must read the item again, and updates also invoke it." },
      { text: "Run a scheduled Lambda function every minute that scans for new items.", correct: false,
        why: "Scheduled scans read the whole table and need custom code to track new items. This fails the least-code and low-cost requirements." },
      { text: "Enable a stream with OLD_IMAGE and a Lambda trigger with a filter on eventName INSERT.", correct: false,
        why: "An insert has no old image, so the record does not contain the new user's email address." }
    ],
    explanation: "Choose the StreamViewType that holds the data you need. Use event source mapping filters to invoke Lambda only for matching records." },

  { id: "m02-020", topic: "ddb-streams", domain: 4,
    stem: "A Lambda function processes a DynamoDB stream to update a search index. The function was disabled for 30 hours during an incident. After the restart, changes from the first hours of the incident never reached the search index. The team needs a design that keeps change records for at least 7 days. Which solution will meet these requirements?",
    options: [
      { text: "Turn on Amazon Kinesis Data Streams for DynamoDB, set the Kinesis retention to 7 days, and consume the Kinesis data stream.", correct: true,
        why: "DynamoDB Streams keeps records for 24 hours, which caused the loss. Kinesis Data Streams for DynamoDB is a separate feature with configurable, longer retention." },
      { text: "Increase the DynamoDB stream retention period to 7 days.", correct: false,
        why: "DynamoDB Streams retention is fixed at 24 hours. You cannot change it." },
      { text: "Set ParallelizationFactor to 10 on the event source mapping.", correct: false,
        why: "More concurrent batches help a slow consumer catch up. They do not keep records past 24 hours while the consumer is disabled." },
      { text: "Disable and re-enable the stream to recover the missing records.", correct: false,
        why: "Re-enabling creates a new stream with a new ARN. It does not recover records that expired." }
    ],
    explanation: "DynamoDB Streams keeps records for 24 hours, fixed. For longer retention, use Kinesis Data Streams for DynamoDB." },

  { id: "m02-021", topic: "ddb-ttl-backup", domain: 4,
    stem: "A developer enabled TTL on the attribute expiresAt. The application writes expiresAt as a Number with the value of Date.now() in JavaScript (milliseconds since the epoch). After two weeks, no expired items have been deleted. Which solution will fix the problem?",
    options: [
      { text: "Store expiresAt as a Number in seconds since the epoch, for example Math.floor(Date.now() / 1000) plus the lifetime in seconds.", correct: true,
        why: "TTL reads the value as epoch seconds. A millisecond value is about 1,000 times larger, so DynamoDB sees an expiry date far in the future." },
      { text: "Store expiresAt as an ISO 8601 String.", correct: false,
        why: "The TTL process ignores items whose TTL attribute is not a Number. These items are never deleted." },
      { text: "Enable DynamoDB Streams on the table so that TTL can run.", correct: false,
        why: "TTL does not need a stream. The wrong time unit is the cause, so items still do not expire." },
      { text: "Wait longer, because TTL can take up to 30 days to delete items.", correct: false,
        why: "DynamoDB deletes expired items typically within a few days. These items are not expired yet, because the value is in milliseconds." }
    ],
    explanation: "The TTL attribute must be a Number in Unix epoch seconds. Values in milliseconds or strings never expire." },

  { id: "m02-022", topic: "ddb-ttl-backup", domain: 1,
    stem: "An application stores web sessions in DynamoDB. A session is valid for 1 hour. Expired sessions must be removed automatically without consuming write capacity. The application must never accept an expired session. Which combination of actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Enable TTL on an expiresAt attribute that holds the expiry time as a Number in epoch seconds.", correct: true,
        why: "TTL deletes expired items automatically, and TTL deletes do not use write capacity." },
      { text: "In the application, reject a session item when expiresAt is earlier than the current time, or use a filter expression on expiresAt.", correct: true,
        why: "TTL deletes items typically within a few days after expiry, and expired items still appear in reads. The application check makes sure that an expired session is never accepted." },
      { text: "Rely on TTL alone, because DynamoDB hides expired items from reads.", correct: false,
        why: "Expired items stay readable until the TTL process deletes them. This fails the requirement to never accept an expired session." },
      { text: "Run a scheduled Lambda function every 5 minutes that scans for and deletes expired sessions.", correct: false,
        why: "Scans and DeleteItem calls consume read and write capacity. This fails the requirement to remove items without write capacity." },
      { text: "Read sessions with ConsistentRead set to true.", correct: false,
        why: "Strongly consistent reads return the latest data, which still includes expired items that TTL has not deleted." }
    ],
    explanation: "TTL removes expired items at no write cost, but not immediately. Check the expiry time in reads when expired data must not be used." },

  { id: "m02-023", topic: "ddb-ttl-backup", domain: 1,
    stem: "A bad deployment at 14:05 wrote incorrect values to thousands of items in a DynamoDB table. The team found the problem at 14:40. Point-in-time recovery (PITR) is enabled with a 35-day recovery period. The team must recover the data with the LEAST data loss. Which solution will meet these requirements?",
    options: [
      { text: "Restore the table with PITR to a time just before 14:05 into a new table, then move the application or copy the correct items back.", correct: true,
        why: "PITR restores to any second in the recovery period. A PITR restore always creates a new table, so the team then switches or copies data." },
      { text: "Restore the last nightly on-demand backup over the existing table.", correct: false,
        why: "A restore creates a new table, and the nightly backup loses all valid changes since the backup. This fails the least-data-loss requirement." },
      { text: "Use PITR to restore the existing table in place to 14:04.", correct: false,
        why: "PITR cannot restore in place. It always restores to a new table." },
      { text: "Replay the DynamoDB stream records from before 14:05 to rebuild the items.", correct: false,
        why: "Streams contain changes from the last 24 hours only, and building the old state from changes needs custom code. PITR does this directly." }
    ],
    explanation: "PITR restores to any second in a 1 to 35 day recovery period, always into a new table." },

  { id: "m02-024", topic: "ddb-security", domain: 2,
    stem: "A mobile game uses Amazon Cognito identity pools to give players temporary AWS credentials. Player data is in a DynamoDB table with the partition key playerId, which stores each player's Cognito identity ID. Each player must read and write only their own items. The solution must be the MOST secure. Which solution will meet these requirements?",
    options: [
      { text: "Attach an IAM policy to the authenticated role that allows GetItem, Query, PutItem, and UpdateItem on the table with the condition ForAllValues:StringEquals dynamodb:LeadingKeys = ${cognito-identity.amazonaws.com:sub}.", correct: true,
        why: "dynamodb:LeadingKeys limits access to items whose partition key equals the caller's identity ID. IAM enforces the rule for each request." },
      { text: "Allow full table access in the role, and filter items by playerId in the mobile app code.", correct: false,
        why: "The credentials still allow access to all items. A modified app can read other players' data, so this is not secure." },
      { text: "Allow Scan on the table with a dynamodb:LeadingKeys condition.", correct: false,
        why: "A Scan returns all items, whatever the leading key. Per-user policies should not allow Scan." },
      { text: "Create a separate DynamoDB table for each player.", correct: false,
        why: "Millions of tables exceed the table quota and add large management overhead. Fine-grained IAM conditions solve this with one table." }
    ],
    explanation: "Use the dynamodb:LeadingKeys condition key with an identity policy variable to restrict users to items with their own partition key." },

  { id: "m02-025", topic: "ddb-security", domain: 2,
    stem: "A compliance team requires that the company controls the key policy of the key that encrypts a DynamoDB table, controls key rotation, and audits each use of the key in AWS CloudTrail. The application code must not change. Which solution will meet these requirements?",
    options: [
      { text: "Change the table encryption to a customer managed key in AWS KMS.", correct: true,
        why: "A customer managed key is in the company's account. The company controls the key policy and rotation, and CloudTrail logs the key use." },
      { text: "Keep the default AWS owned key.", correct: false,
        why: "DynamoDB owns that key. The company cannot see it, control its policy, or audit its use." },
      { text: "Use the AWS managed key aws/dynamodb.", correct: false,
        why: "AWS manages the key policy and rotation of an AWS managed key. This fails the requirement to control the key policy and rotation." },
      { text: "Encrypt each attribute in the application with the AWS Database Encryption SDK before writing.", correct: false,
        why: "Client-side encryption needs code changes. This fails the requirement that the application code must not change." }
    ],
    explanation: "DynamoDB always encrypts at rest. Use a customer managed KMS key when you must control the key policy and rotation and audit key use." },

  { id: "m02-026", topic: "ddb-security", domain: 2,
    stem: "A Lambda function runs in private subnets that have no NAT gateway and no internet access. The function must read and write one DynamoDB table. The security team requires no internet path and least-privilege permissions. Which combination of actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Create a gateway VPC endpoint for DynamoDB and associate it with the route tables of the private subnets.", correct: true,
        why: "A gateway endpoint routes DynamoDB traffic inside the AWS network. The function reaches DynamoDB with no internet path." },
      { text: "Give the execution role only the needed DynamoDB actions on that table's ARN.", correct: true,
        why: "This grants only the actions and the resource that the function needs, which is least privilege." },
      { text: "Add a NAT gateway and route the private subnets to it.", correct: false,
        why: "A NAT gateway sends traffic to the public DynamoDB endpoint over an internet path. This fails the no-internet requirement." },
      { text: "Attach the AmazonDynamoDBFullAccess managed policy to the execution role.", correct: false,
        why: "This policy allows all DynamoDB actions on all tables. It fails the least-privilege requirement." },
      { text: "Store an IAM user's access keys in encrypted environment variables.", correct: false,
        why: "Long-lived access keys are less secure than the role's temporary credentials. They also do not give a network path." }
    ],
    explanation: "Use a DynamoDB gateway endpoint for private access without a NAT gateway, and an execution role scoped to the needed actions and table." },

  { id: "m02-027", topic: "ddb-dax", domain: 4,
    stem: "A real-time bidding application reads the same DynamoDB items thousands of times each second. Reads can be eventually consistent. The application needs microsecond read latency and must reduce read capacity costs with the fewest code changes. Which solution will meet these requirements?",
    options: [
      { text: "Create a DynamoDB Accelerator (DAX) cluster and change the application to use the DAX client.", correct: true,
        why: "DAX serves eventually consistent reads from memory in microseconds. It is API-compatible with DynamoDB, so code changes are small, and cache hits do not use table RCUs." },
      { text: "Add an ElastiCache for Valkey cluster and write lazy loading code for each read.", correct: false,
        why: "ElastiCache can be fast, but the developer must write and maintain the caching logic. This fails the fewest-code-changes requirement." },
      { text: "Switch the table to on-demand capacity mode.", correct: false,
        why: "On-demand mode changes billing and scaling, not latency. Reads stay in single-digit milliseconds." },
      { text: "Use strongly consistent reads.", correct: false,
        why: "Strongly consistent reads cost twice as much and do not reduce latency to microseconds." }
    ],
    explanation: "DAX gives microsecond eventually consistent reads for DynamoDB with few code changes, and it offloads repeated reads from the table." },

  { id: "m02-028", topic: "ddb-dax", domain: 4,
    stem: "An application reads and writes a DynamoDB table through DAX with default settings. After the application puts a new item, a repeated Query for that partition key does not show the new item for several minutes. One screen must always show new items at once. The other screens can stay on DAX. Which solution will meet these requirements with the LEAST change?",
    options: [
      { text: "Set ConsistentRead to true on the Query for that screen.", correct: true,
        why: "DAX passes strongly consistent reads to DynamoDB and does not cache them. That screen gets the latest data, and other reads still use the cache." },
      { text: "Increase the TTL of the DAX item cache.", correct: false,
        why: "The stale result comes from the query cache, not the item cache. A longer TTL keeps stale results for longer." },
      { text: "Write new items directly to DynamoDB instead of through DAX.", correct: false,
        why: "Writes outside DAX do not update the cache at all. The cached Query result stays stale." },
      { text: "Add ReturnValues set to ALL_NEW to the PutItem call.", correct: false,
        why: "ReturnValues changes only the PutItem response. It does not update or clear the DAX query cache." }
    ],
    explanation: "Writes through DAX update the item cache but do not clear the query cache. Strongly consistent reads go to DynamoDB and are not cached." },

  { id: "m02-029", topic: "ddb-dax", domain: 1,
    stem: "A team is choosing which applications to put behind a DynamoDB Accelerator (DAX) cluster. Which two applications should keep reading directly from DynamoDB? (Choose two.)",
    options: [
      { text: "A ledger service where every read must return the latest committed balance.", correct: true,
        why: "This service needs strongly consistent reads. DAX passes them to DynamoDB without caching, so DAX adds no benefit." },
      { text: "A nightly import that writes millions of items and rarely reads them.", correct: true,
        why: "The workload is write-heavy with few repeated reads, so a cache gives it no benefit. Writing through DAX adds latency and fills the cache with data that nobody reads, so the import should keep using DynamoDB directly." },
      { text: "A product page that reads the same popular items during a flash sale.", correct: false,
        why: "Repeated reads of hot keys are an ideal DAX case. DAX serves them from memory and protects the table." },
      { text: "A game leaderboard read thousands of times each second, where a few seconds of delay is acceptable.", correct: false,
        why: "Read-heavy access that accepts eventual consistency is a good fit for DAX." },
      { text: "A trading screen that needs microsecond reads of eventually consistent data.", correct: false,
        why: "Microsecond reads of eventually consistent data are the main purpose of DAX." }
    ],
    explanation: "DAX is not a good fit for strongly consistent reads, write-heavy workloads, or workloads with few repeated reads." },

  { id: "m02-030", topic: "rds-ha", domain: 1,
    stem: "A company runs an Amazon RDS for MySQL DB instance. Analysts run long reporting queries during business hours, and these queries slow down the transactional application. The reports can use data that is a few seconds old. The solution must not change the primary DB instance class. Which solution will meet these requirements?",
    options: [
      { text: "Create a read replica and point the reporting tool to the replica endpoint.", correct: true,
        why: "A read replica is updated asynchronously and serves read traffic. The reports move off the primary, and a few seconds of lag is acceptable." },
      { text: "Enable a Multi-AZ DB instance deployment and point the reporting tool to the standby.", correct: false,
        why: "The standby in a Multi-AZ DB instance deployment cannot serve read traffic. It exists only for failover." },
      { text: "Restore a snapshot to a new instance each morning for reporting.", correct: false,
        why: "The restored data is up to a day old. This fails the requirement of data that is only a few seconds old." },
      { text: "Increase the backup retention period to 35 days.", correct: false,
        why: "Backup retention controls point-in-time restore. It does not move any query load off the primary." }
    ],
    explanation: "Read replicas use asynchronous replication and serve reads. A Multi-AZ standby is synchronous and is for failover only." },

  { id: "m02-031", topic: "rds-ha", domain: 1,
    stem: "An application connects to an Aurora MySQL cluster with one writer and three Aurora Replicas. It sends writes to the instance endpoint of the current writer. After a failover, all writes fail. Read traffic must also spread across the replicas. Which combination of actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Send writes to the cluster (writer) endpoint.", correct: true,
        why: "The cluster endpoint always points to the current primary instance. After a failover, it follows the new writer." },
      { text: "Send reads to the reader endpoint.", correct: true,
        why: "The reader endpoint balances connections across the Aurora Replicas, so reads spread without custom logic." },
      { text: "Send writes to the reader endpoint.", correct: false,
        why: "The reader endpoint connects to read-only replicas. Writes through it fail." },
      { text: "Keep the instance endpoints and add retry logic that tries each instance in turn.", correct: false,
        why: "Instance endpoints do not follow failover. This needs custom discovery code that the cluster and reader endpoints already provide." },
      { text: "Convert the replicas to Aurora Serverless v2.", correct: false,
        why: "Serverless v2 changes how capacity scales. It does not change which endpoint the application uses." }
    ],
    explanation: "Use the Aurora cluster endpoint for writes and the reader endpoint for reads. Both follow failover. Instance endpoints do not." },

  { id: "m02-032", topic: "rds-access", domain: 2,
    stem: "An application on Amazon EC2 connects to an Amazon RDS for PostgreSQL database. The security team requires that no database password is stored in the application, in configuration files, or in a secret store. Credentials must be short-lived. Which solution will meet these requirements?",
    options: [
      { text: "Enable IAM database authentication. The application uses the instance role to generate an authentication token and connects over SSL/TLS.", correct: true,
        why: "The token is signed with the role's credentials and is valid for 15 minutes. No password is stored anywhere." },
      { text: "Store the password in AWS Secrets Manager with automatic rotation.", correct: false,
        why: "Rotation helps, but a database password is still stored in a secret store. This fails the stated requirement." },
      { text: "Store the password in an encrypted SSM Parameter Store SecureString.", correct: false,
        why: "The password is still a long-lived secret in a store. It is not short-lived." },
      { text: "Use the RDS Data API from the application.", correct: false,
        why: "The Data API is for Aurora clusters and uses database credentials in a Secrets Manager secret. It does not apply to RDS for PostgreSQL without a stored secret." }
    ],
    explanation: "IAM database authentication (MariaDB, MySQL, PostgreSQL) replaces the password with a 15-minute token generated from IAM credentials." },

  { id: "m02-033", topic: "rds-access", domain: 4,
    stem: "Hundreds of concurrent Lambda functions connect to an Amazon RDS for MySQL database. During traffic spikes, the database reaches its maximum connections and new connections fail. The developer must fix this with minimal code changes and must keep the database instance size. Which solution will meet these requirements?",
    options: [
      { text: "Create an RDS Proxy for the database and change the functions to connect to the proxy endpoint.", correct: true,
        why: "RDS Proxy pools and shares database connections. Many functions use a small number of database connections, and the code changes only the endpoint." },
      { text: "Create a read replica and send all connections to it.", correct: false,
        why: "A read replica accepts only reads, so writes fail. The replica also has its own connection limit." },
      { text: "Increase the Lambda function timeout.", correct: false,
        why: "A longer timeout can keep connections open longer. It does not reduce the number of connections." },
      { text: "Enable Multi-AZ on the DB instance.", correct: false,
        why: "Multi-AZ adds a standby for failover. The standby does not accept connections, so the connection limit stays the same." }
    ],
    explanation: "RDS Proxy pools connections for many short-lived clients such as Lambda functions and keeps connections during failover." },

  { id: "m02-034", topic: "rds-access", domain: 2,
    stem: "An existing Amazon RDS for MySQL DB instance was created without encryption at rest. A new policy requires encryption at rest with an AWS KMS key. Which solution will meet these requirements?",
    options: [
      { text: "Take a snapshot, copy the snapshot with encryption turned on, and restore a new DB instance from the encrypted copy.", correct: true,
        why: "You cannot encrypt an existing unencrypted instance in place. An encrypted copy of a snapshot can be restored as an encrypted instance." },
      { text: "Modify the DB instance and turn on storage encryption.", correct: false,
        why: "Encryption at rest can be set only when you create a DB instance. A modify operation cannot add it." },
      { text: "Create an encrypted read replica of the unencrypted instance and promote it.", correct: false,
        why: "RDS does not allow an encrypted read replica of an unencrypted DB instance." },
      { text: "Require SSL/TLS for all client connections.", correct: false,
        why: "SSL/TLS encrypts data in transit, not data at rest. The storage stays unencrypted." }
    ],
    explanation: "Set RDS encryption at creation. To encrypt an existing instance, copy a snapshot with encryption and restore from the copy." },

  { id: "m02-035", topic: "rds-access", domain: 2,
    stem: "A Lambda function must run SQL statements on an Aurora Serverless v2 cluster. The function must not be attached to a VPC, must not manage database connections, and must not contain database credentials. Which combination of actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Enable the RDS Data API on the cluster, and call ExecuteStatement with the cluster ARN and the ARN of a Secrets Manager secret.", correct: true,
        why: "The Data API is an HTTPS endpoint. The function needs no VPC attachment, no driver, and no connection management." },
      { text: "Store the database credentials in AWS Secrets Manager, and allow the execution role to use the Data API and read that secret.", correct: true,
        why: "The Data API reads the credentials from Secrets Manager. The role grants access, so the function contains no credentials." },
      { text: "Attach the function to the VPC and use a MySQL driver with a connection pool.", correct: false,
        why: "This needs VPC attachment and connection management. Both fail the stated requirements." },
      { text: "Put the database password in an encrypted environment variable.", correct: false,
        why: "The function then contains the credentials. This fails the no-credentials requirement." },
      { text: "Generate an IAM database authentication token and connect with a MySQL driver.", correct: false,
        why: "A driver connection needs network access to the cluster in the VPC and connection management. This fails two requirements." }
    ],
    explanation: "The RDS Data API runs SQL over HTTPS with credentials from Secrets Manager. The caller needs no VPC configuration or connection pool." },

  { id: "m02-036", topic: "cache-strategies", domain: 1,
    stem: "An online store caches product prices in ElastiCache with lazy loading and a 24-hour TTL. After a price change in the database, customers see the old price for hours. Updated prices must appear in the cache as soon as the database changes. Which solution will meet these requirements?",
    options: [
      { text: "Add write-through: when the application updates a price in the database, it also writes the new price to the cache.", correct: true,
        why: "Write-through updates the cache on every database write, so cached data is never stale after an update." },
      { text: "Increase the TTL to 7 days.", correct: false,
        why: "A longer TTL keeps stale prices in the cache for longer. This makes the problem worse." },
      { text: "Change the engine from Valkey to Memcached.", correct: false,
        why: "The engine does not change when the application updates the cache. Prices stay stale with lazy loading." },
      { text: "Add a read replica to the cache cluster.", correct: false,
        why: "Replicas copy the stale value. They add read capacity but do not refresh the data." }
    ],
    explanation: "Lazy loading can serve stale data until the TTL ends. Write-through updates the cache on each database write." },

  { id: "m02-037", topic: "cache-strategies", domain: 1,
    stem: "A developer adds a cache in front of an Amazon RDS database for a catalog with 10 million products. Users read only a small part of the catalog. The cache must hold only data that users request. Cached data can be up to 5 minutes old. Which combination of actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Use lazy loading: on a cache miss, read from the database and write the result to the cache.", correct: true,
        why: "Lazy loading adds data to the cache only when a user requests it. The cache does not fill with unread products." },
      { text: "Set a TTL of 300 seconds on each cached item.", correct: true,
        why: "The TTL expires items after 5 minutes. The next read loads fresh data, so data is never more than 5 minutes old." },
      { text: "Use write-through for every product write, with no TTL.", correct: false,
        why: "Write-through caches every written product, most of which are never read. This fails the requirement to cache only requested data." },
      { text: "Load all 10 million products into the cache at startup.", correct: false,
        why: "This caches the whole catalog, not only the requested data, and wastes memory." },
      { text: "Cache items with no TTL and rely on memory eviction.", correct: false,
        why: "Without a TTL, an item can stay stale for an unlimited time. This fails the 5-minute requirement." }
    ],
    explanation: "Lazy loading caches only requested data. A TTL limits how stale cached data can become." },

  { id: "m02-038", topic: "cache-engines", domain: 1,
    stem: "A gaming company keeps player data in Amazon Aurora. It needs a cache in front of Aurora that maintains a real-time leaderboard ranked by score. The cache must replicate across Availability Zones with automatic failover. If the cache is lost, the company can rebuild it from Aurora. Which solution will meet these requirements?",
    options: [
      { text: "Amazon ElastiCache for Valkey with replicas and automatic failover, using a sorted set for the leaderboard.", correct: true,
        why: "Valkey and Redis OSS support sorted sets for ranking, replication, and automatic failover. ElastiCache is designed as a cache in front of a primary database." },
      { text: "Amazon ElastiCache for Memcached.", correct: false,
        why: "Memcached supports only simple data types and has no replication or automatic failover. It fails the leaderboard and failover requirements." },
      { text: "DynamoDB Accelerator (DAX).", correct: false,
        why: "DAX caches only DynamoDB. It cannot cache data from Aurora." },
      { text: "Amazon MemoryDB as the cache in front of Aurora.", correct: false,
        why: "MemoryDB is designed as a durable primary database. The company already has Aurora as the primary database and only needs a cache." }
    ],
    explanation: "Use ElastiCache for Valkey or Redis OSS for caches that need data structures such as sorted sets, replication, and failover." },

  { id: "m02-039", topic: "cache-engines", domain: 1,
    stem: "A company is building a shopping cart service. The developers want Redis-compatible data structures and microsecond reads. The service will have no other database, so a node failure must not lose acknowledged writes. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Amazon MemoryDB.", correct: true,
        why: "MemoryDB is a Redis-compatible primary database. It stores each write in a Multi-AZ transactional log before it acknowledges the write." },
      { text: "Amazon ElastiCache for Memcached with several nodes.", correct: false,
        why: "Memcached has no replication or persistence. A node failure loses its data." },
      { text: "Amazon ElastiCache for Valkey with lazy loading from Amazon S3.", correct: false,
        why: "A cache with a separate store adds application logic to manage two systems. It fails the least-overhead requirement for a single durable database." },
      { text: "DynamoDB Accelerator (DAX) with no DynamoDB table.", correct: false,
        why: "DAX is a cache that requires DynamoDB tables. It cannot run as a database by itself, and it is not Redis-compatible." }
    ],
    explanation: "MemoryDB is a durable, Redis-compatible primary database. ElastiCache is primarily a cache in front of another database." },

  { id: "m02-040", topic: "cache-engines", domain: 2,
    stem: "A Lambda function connects to a node-based ElastiCache for Valkey 8.0 replication group. The security team forbids long-lived passwords for the cache and requires the connection to use the function's IAM role. Which combination of actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Enable in-transit encryption (TLS) on the replication group.", correct: true,
        why: "IAM authentication for ElastiCache requires in-transit encryption." },
      { text: "Create an ElastiCache user with IAM authentication mode, add it to the user group, and allow elasticache:Connect for that user and cache in the execution role.", correct: true,
        why: "The function generates a short-lived IAM authentication token from its role credentials. The token is valid for 15 minutes, so no long-lived password exists." },
      { text: "Set an AUTH token and store it in AWS Secrets Manager.", correct: false,
        why: "An AUTH token is a long-lived shared password, even when it is stored in Secrets Manager. This fails the security requirement." },
      { text: "Allow inbound traffic from the function's security group only, with no authentication.", correct: false,
        why: "Security groups control the network path. They do not authenticate the caller with its IAM role." },
      { text: "Switch the engine to Memcached.", correct: false,
        why: "IAM authentication is for Valkey 7.2 or later and Redis OSS 7.0 or later, not Memcached." }
    ],
    explanation: "ElastiCache IAM authentication needs TLS, an IAM-enabled user, and elasticache:Connect. Tokens are valid for 15 minutes." }

] });
