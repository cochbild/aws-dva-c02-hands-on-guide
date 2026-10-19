window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "m03-s3", questions: [

  { id: "m03-001", topic: "s3-fundamentals", domain: 4,
    stem: "An application uploads an order file to Amazon S3 with PutObject and then immediately calls GetObject on the same key. A developer added a 5-second sleep and a retry loop between the two calls, because an old design document says that S3 is eventually consistent. The team wants to remove the extra latency with the fewest code changes. Which solution will meet these requirements?",
    options: [
      { text: "Remove the sleep and the retry loop. A GetObject request that starts after a successful PutObject returns the new object.", correct: true,
        why: "S3 gives strong read-after-write consistency for PUT and DELETE in all Regions. The delay is not necessary, and removing it is the smallest change." },
      { text: "Enable S3 Versioning on the bucket and read the object by version ID.", correct: false,
        why: "Versioning keeps old versions. It does not change consistency, and it adds code and storage cost, so it fails the fewest-code-changes requirement." },
      { text: "Enable S3 Transfer Acceleration and send the GetObject request to the accelerate endpoint.", correct: false,
        why: "Transfer Acceleration speeds long-distance transfers. It does not affect consistency, and the delay in the code stays." },
      { text: "Store a copy of each order in Amazon DynamoDB and read the copy with a strongly consistent read.", correct: false,
        why: "This adds a second data store and much more code. S3 is already strongly consistent, so this fails the fewest-code-changes requirement." }
    ],
    explanation: "S3 gives strong read-after-write consistency for object PUT and DELETE requests. A read after a successful write returns the new data." },

  { id: "m03-002", topic: "s3-fundamentals", domain: 4,
    stem: "An IoT ingestion service writes about 9,000 small objects each second to one S3 bucket. All keys start with the same prefix, raw/. The service often receives HTTP 503 Slow Down errors. The developer must reduce the errors without losing data. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Spread the object keys across several prefixes, for example by adding a device or hash value after raw/.", correct: true,
        why: "S3 supports at least 3,500 PUT requests each second for each partitioned prefix, with no limit on the number of prefixes. More prefixes give more write throughput." },
      { text: "Retry failed requests with exponential backoff.", correct: true,
        why: "While S3 scales to a higher request rate, it can return 503 Slow Down. Retries with backoff complete the writes without data loss." },
      { text: "Enable S3 Transfer Acceleration on the bucket.", correct: false,
        why: "Transfer Acceleration improves long-distance transfer speed. It does not raise the request rate for a prefix, so the 503 errors continue." },
      { text: "Change the storage class of new objects to S3 One Zone-IA.", correct: false,
        why: "The storage class does not change the request rate limits for a prefix. The 503 errors continue." },
      { text: "Enable S3 Versioning on the bucket.", correct: false,
        why: "Versioning keeps old versions of objects. It does not increase the request rate, so it does not reduce the errors." }
    ],
    explanation: "A prefix is the first part of an object key, such as raw/ or raw/device-7/. S3 supports at least 3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD requests per second for each prefix. Use more prefixes for more throughput, and retry 503 errors with exponential backoff, because the errors stop when S3 finishes scaling." },

  { id: "m03-003", topic: "s3-storage-classes", domain: 1,
    stem: "A media company stores user uploads in Amazon S3. Some objects are read many times in the first week and then never again. Other objects are read again months later with no pattern. Reads must have millisecond latency. The company wants the lowest storage cost with no retrieval fees and no lifecycle rules to maintain. Which storage class will meet these requirements?",
    options: [
      { text: "S3 Intelligent-Tiering", correct: true,
        why: "Intelligent-Tiering moves each object between access tiers by its access pattern. It has millisecond access in the default tiers and no retrieval fees." },
      { text: "S3 Standard-IA", correct: false,
        why: "Standard-IA charges a retrieval fee for each GB read. Objects that are read many times in the first week make it expensive, and it fails the no-retrieval-fees requirement." },
      { text: "S3 Glacier Flexible Retrieval", correct: false,
        why: "Objects in Glacier Flexible Retrieval must be restored before a read, which takes minutes to hours. This fails the millisecond-latency requirement." },
      { text: "S3 One Zone-IA", correct: false,
        why: "One Zone-IA charges retrieval fees and stores data in one Availability Zone. It fails the no-retrieval-fees requirement." }
    ],
    explanation: "S3 Intelligent-Tiering is for unknown or changing access patterns. It moves objects between tiers automatically, with a small monitoring fee and no retrieval fees." },

  { id: "m03-004", topic: "s3-storage-classes", domain: 1,
    stem: "A bank must keep scanned loan documents for 10 years. Auditors request a document less than one time each year. When they request one, the bank has 3 days to provide it. The bank wants the lowest possible storage cost. Which solution will meet these requirements?",
    options: [
      { text: "Store the documents in S3 Glacier Deep Archive. Restore requested documents with the Bulk or Standard retrieval tier.", correct: true,
        why: "Deep Archive has the lowest storage cost. Standard retrieval completes within 12 hours and Bulk within 48 hours, both inside the 3-day limit." },
      { text: "Store the documents in S3 Glacier Instant Retrieval.", correct: false,
        why: "Glacier Instant Retrieval gives millisecond access, but its storage cost is higher than Deep Archive. It fails the lowest-cost requirement." },
      { text: "Store the documents in S3 Standard-IA.", correct: false,
        why: "Standard-IA is for data that needs millisecond access. Its storage cost is much higher than Deep Archive, so it fails the lowest-cost requirement." },
      { text: "Store the documents in S3 Glacier Flexible Retrieval and use Expedited retrieval.", correct: false,
        why: "Glacier Flexible Retrieval costs more to store than Deep Archive, and Expedited retrieval is the most expensive tier. The 3-day limit does not need it." }
    ],
    explanation: "S3 Glacier Deep Archive has the lowest storage cost. Standard retrieval finishes within 12 hours and Bulk within 48 hours. Expedited is not available for Deep Archive." },

  { id: "m03-005", topic: "s3-lifecycle", domain: 1,
    stem: "A versioning-enabled bucket receives large uploads from a web application. The storage bill grows each month. The team finds two causes: old object versions that nobody uses, and multipart uploads that clients started but never completed. Old versions must be deleted 30 days after they become noncurrent. Incomplete uploads must be removed after 7 days. Which lifecycle actions will meet these requirements? (Choose two.)",
    options: [
      { text: "A NoncurrentVersionExpiration action with NoncurrentDays set to 30.", correct: true,
        why: "NoncurrentVersionExpiration permanently deletes versions a number of days after they become noncurrent." },
      { text: "An AbortIncompleteMultipartUpload action with DaysAfterInitiation set to 7.", correct: true,
        why: "This action stops uploads that are not complete 7 days after they start and deletes their stored parts." },
      { text: "An Expiration action with Days set to 30.", correct: false,
        why: "In a versioned bucket, Expiration on current versions only adds delete markers. It does not remove the noncurrent versions, so the cost stays." },
      { text: "A Transition action that moves objects to S3 Glacier Deep Archive after 7 days.", correct: false,
        why: "A transition moves objects to a cheaper class but keeps them. The requirement is to delete old versions and remove incomplete uploads." },
      { text: "Suspend versioning on the bucket.", correct: false,
        why: "Suspending versioning stops new versions, but all existing versions stay. Incomplete uploads also stay, so neither requirement is met." }
    ],
    explanation: "Use NoncurrentVersionExpiration to delete old versions in a versioned bucket. Use AbortIncompleteMultipartUpload to delete parts of uploads that never completed." },

  { id: "m03-006", topic: "s3-lifecycle", domain: 4,
    stem: "A developer creates a new lifecycle rule that transitions all objects in the logs/ prefix to S3 Glacier Instant Retrieval 60 days after creation. After 90 days, most large log files are in Glacier Instant Retrieval, but thousands of 40 KB log files are still in S3 Standard. The developer must transition the small files too. Which solution will meet these requirements?",
    options: [
      { text: "Add an object size filter, such as ObjectSizeGreaterThan with a small value, to the lifecycle rule.", correct: true,
        why: "By default, lifecycle rules do not transition objects smaller than 128 KB. A custom size filter overrides that default." },
      { text: "Wait 90 more days, because Glacier Instant Retrieval has a 90-day minimum storage duration.", correct: false,
        why: "The 90-day minimum is a billing rule for objects already in that class. It does not stop the transition, so waiting does not move the small files." },
      { text: "Change the rule filter from a prefix to an object tag.", correct: false,
        why: "The filter type is not the cause. The 128 KB default applies to tag filters too, so the small files still do not move." },
      { text: "Change the target storage class to S3 Intelligent-Tiering.", correct: false,
        why: "The 128 KB default also blocks this transition. Also, Intelligent-Tiering does not tier objects smaller than 128 KB." }
    ],
    explanation: "Since September 2024, lifecycle rules do not transition objects smaller than 128 KB by default. Add an object size filter to allow it." },

  { id: "m03-007", topic: "s3-lifecycle", domain: 1,
    stem: "Application logs are written to an S3 bucket under the app-logs/ prefix. The logs must move to S3 Standard-IA after 30 days and to S3 Glacier Flexible Retrieval after 90 days. They must be deleted after 365 days. The solution must have the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Create one lifecycle rule with a prefix filter of app-logs/, two transition actions, and an expiration action.", correct: true,
        why: "One rule can hold several transitions and an expiration for the same set of objects. S3 runs it with no code to maintain." },
      { text: "Create a scheduled Lambda function that copies old objects to the new storage class and deletes objects older than 365 days.", correct: false,
        why: "This works, but you must write, run, and monitor the code. It fails the least-operational-overhead requirement." },
      { text: "Store the logs in S3 Intelligent-Tiering with the archive access tiers activated.", correct: false,
        why: "Intelligent-Tiering moves objects by access pattern, not on a fixed schedule, and it never deletes objects. The 365-day deletion is not met." },
      { text: "Configure S3 Replication to copy the logs to a second bucket that uses S3 Glacier Flexible Retrieval.", correct: false,
        why: "Replication makes a second copy. It does not move the originals or delete anything after 365 days." }
    ],
    explanation: "A lifecycle rule can combine transition actions and an expiration action for the objects that its filter selects." },

  { id: "m03-008", topic: "s3-lifecycle", domain: 1,
    stem: "A versioning-enabled bucket has a lifecycle rule that deletes noncurrent versions after 30 days. Users delete objects through the application, which creates delete markers. After the noncurrent versions expire, millions of delete markers with no versions remain, and LIST requests become slow. The team wants S3 to remove these delete markers automatically. Which solution will meet these requirements?",
    options: [
      { text: "Add a lifecycle rule with an Expiration action that sets ExpiredObjectDeleteMarker to true.", correct: true,
        why: "A delete marker with no noncurrent versions is an expired object delete marker. This action removes those markers." },
      { text: "Add an AbortIncompleteMultipartUpload action to the existing rule.", correct: false,
        why: "This action removes parts of incomplete multipart uploads. It does not remove delete markers." },
      { text: "Enable MFA Delete on the bucket.", correct: false,
        why: "MFA Delete adds protection against permanent deletes. It does not remove markers, and it cannot be used with lifecycle configurations." },
      { text: "Suspend versioning on the bucket.", correct: false,
        why: "Suspending versioning changes how new writes are stored. The existing delete markers stay, so LIST stays slow." }
    ],
    explanation: "Use the ExpiredObjectDeleteMarker lifecycle action to remove delete markers that have no noncurrent versions. It cannot be combined with Days in the same rule." },

  { id: "m03-009", topic: "s3-versioning", domain: 2,
    stem: "A versioning-enabled bucket stores financial records. The security team wants an extra control: a person must provide a code from an MFA device to permanently delete an object version or to change the versioning state. Which solution will meet these requirements?",
    options: [
      { text: "Use the root user credentials to run the AWS CLI put-bucket-versioning command with MFADelete=Enabled and the --mfa parameter.", correct: true,
        why: "MFA Delete covers permanent version deletes and versioning state changes. Only the bucket owner root user can enable it, through the CLI or the API." },
      { text: "Sign in to the S3 console as an IAM administrator and enable MFA Delete in the bucket properties.", correct: false,
        why: "You cannot enable MFA Delete in the console, and an IAM user cannot enable it. Only the root user can, with the CLI or the API." },
      { text: "Enable S3 Object Lock in compliance mode with a 10-year default retention.", correct: false,
        why: "Compliance mode stops all deletes for 10 years, even with MFA. The requirement is to allow deletes when the person gives an MFA code." },
      { text: "Add a lifecycle rule that keeps noncurrent versions for 10 years.", correct: false,
        why: "A lifecycle rule controls automatic actions. It does not ask for an MFA code when a person deletes a version." }
    ],
    explanation: "MFA Delete requires an MFA code to permanently delete a version or change the versioning state. Only the root user can enable it, and only with the CLI or the API." },

  { id: "m03-010", topic: "s3-versioning", domain: 2,
    stem: "A broker-dealer must store trade confirmations in WORM storage for 7 years to meet a regulation. No user, including the root user of the AWS account, may delete or overwrite a confirmation during that time. Which solution will meet these requirements?",
    options: [
      { text: "Enable S3 Object Lock on the bucket and set a default retention of 7 years in compliance mode.", correct: true,
        why: "In compliance mode, no user can delete or overwrite a locked version, including the root user, and the period cannot be shortened." },
      { text: "Enable S3 Object Lock and set a default retention of 7 years in governance mode.", correct: false,
        why: "Users with s3:BypassGovernanceRetention can delete objects in governance mode. This fails the no-user requirement." },
      { text: "Enable S3 Object Lock and place a legal hold on each object.", correct: false,
        why: "Any user with s3:PutObjectLegalHold can remove a legal hold at any time. It also has no 7-year period." },
      { text: "Enable versioning and MFA Delete on the bucket.", correct: false,
        why: "The root user can still permanently delete versions with an MFA code. This fails the requirement that no user can delete." }
    ],
    explanation: "Object Lock compliance mode stops every user, including root, from deleting or overwriting a locked version until the retention period ends." },

  { id: "m03-011", topic: "s3-versioning", domain: 2,
    stem: "A bucket uses S3 Object Lock with governance mode. A test object version was locked by mistake for 5 years. A senior administrator must delete this version now. Which actions are required for the delete request to succeed? (Choose two.)",
    options: [
      { text: "The administrator must have the s3:BypassGovernanceRetention permission.", correct: true,
        why: "Governance mode allows users with this permission to override the retention settings." },
      { text: "The delete request must include the x-amz-bypass-governance-retention:true header.", correct: true,
        why: "S3 requires this header on any request that overrides governance mode, in addition to the permission." },
      { text: "The administrator must use the root user credentials.", correct: false,
        why: "Governance mode does not need the root user. The bypass permission and the header are enough." },
      { text: "The administrator must first suspend versioning on the bucket.", correct: false,
        why: "After Object Lock is enabled, you cannot suspend versioning. This action is not possible." },
      { text: "The administrator must have the s3:PutObjectLegalHold permission.", correct: false,
        why: "This permission controls legal holds, not retention periods. It does not allow a delete under governance mode." }
    ],
    explanation: "To override governance-mode retention, a user needs s3:BypassGovernanceRetention and must send the x-amz-bypass-governance-retention:true header." },

  { id: "m03-012", topic: "s3-versioning", domain: 1,
    stem: "A user deletes report.pdf from a versioning-enabled bucket with a DELETE request that has no version ID. The user now needs the file back. The company does not want to store an extra copy of the object. Which solution will meet these requirements?",
    options: [
      { text: "Delete the delete marker of report.pdf by sending a DELETE request with the version ID of the marker.", correct: true,
        why: "The DELETE added a delete marker as the current version. Removing the marker makes the previous version current again, with no new copy." },
      { text: "Copy the previous version of report.pdf onto the same key.", correct: false,
        why: "This restores the file, but CopyObject creates a new full version. That stores an extra copy, which fails the requirement." },
      { text: "Restore the object with the RestoreObject API.", correct: false,
        why: "RestoreObject makes a temporary copy of an archived Glacier object. It does not remove a delete marker." },
      { text: "Suspend versioning on the bucket.", correct: false,
        why: "Suspending versioning does not change existing versions or delete markers. The file stays hidden." }
    ],
    explanation: "A DELETE without a version ID in a versioned bucket adds a delete marker. Delete the marker to make the previous version current again." },

  { id: "m03-013", topic: "s3-replication", domain: 1,
    stem: "A company wants to copy all objects in a bucket in us-east-1 to a new bucket in eu-west-1. The source bucket already has 2 million objects. New objects must also be copied automatically. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Enable S3 Versioning on both buckets and add a Cross-Region Replication rule to the source bucket.", correct: true,
        why: "Replication requires versioning on the source and destination buckets. The rule copies new objects automatically." },
      { text: "Run an S3 Batch Replication job for the objects that existed before the replication rule.", correct: true,
        why: "Live replication does not copy objects that existed before the rule. Batch Replication copies existing objects." },
      { text: "Rely on the replication rule to copy the existing objects within 24 hours.", correct: false,
        why: "Live replication copies only new and updated objects. The 2 million existing objects are not copied." },
      { text: "Enable S3 Transfer Acceleration on the source bucket.", correct: false,
        why: "Transfer Acceleration speeds client transfers to a bucket. It does not copy objects between buckets." },
      { text: "Enable S3 Object Lock on the destination bucket.", correct: false,
        why: "Object Lock gives WORM protection. It is required only when the source uses Object Lock, and it does not copy objects." }
    ],
    explanation: "Replication needs versioning on both buckets. Live replication copies only new objects. Use S3 Batch Replication for existing objects." },

  { id: "m03-014", topic: "s3-replication", domain: 1,
    stem: "A healthcare company replicates medical images to a bucket in a second Region for disaster recovery. A compliance rule requires that 99.99 percent of new objects arrive in the second Region within 15 minutes, backed by an SLA. Which solution will meet these requirements?",
    options: [
      { text: "Configure Cross-Region Replication with S3 Replication Time Control (S3 RTC).", correct: true,
        why: "S3 RTC replicates 99.99 percent of new objects within 15 minutes and is backed by an SLA." },
      { text: "Configure Cross-Region Replication without S3 RTC.", correct: false,
        why: "Standard replication is asynchronous with no time SLA. It fails the 15-minute SLA requirement." },
      { text: "Use an S3 event notification to invoke a Lambda function that calls CopyObject to the second Region.", correct: false,
        why: "Event delivery can take a minute or longer and has no replication SLA. It also adds code to maintain." },
      { text: "Configure Same-Region Replication to a second bucket.", correct: false,
        why: "SRR keeps the copy in the same Region. It fails the second-Region requirement." }
    ],
    explanation: "S3 Replication Time Control gives predictable replication: 99.99 percent of new objects within 15 minutes, with an SLA." },

  { id: "m03-015", topic: "s3-multipart", domain: 1,
    stem: "A Python application must upload 20 GB video files to Amazon S3. Uploads often fail near the end because of network errors, and the whole file must be sent again. The developer wants uploads that are faster and that can continue after an error. Which solution will meet these requirements?",
    options: [
      { text: "Use a multipart upload with parts uploaded in parallel, and upload only the failed parts again.", correct: true,
        why: "Multipart upload is required above 5 GB. Parallel parts are faster, and a failed part is sent again without the whole file." },
      { text: "Use one PutObject request with a longer client timeout.", correct: false,
        why: "A single PutObject request can upload a maximum of 5 GB. A 20 GB file fails, and errors still restart the upload." },
      { text: "Generate a presigned PUT URL and upload the file with one HTTP PUT request.", correct: false,
        why: "A presigned PUT is still one PutObject request, limited to 5 GB, with no recovery from a failed transfer." },
      { text: "Enable S3 Transfer Acceleration and keep the single PutObject request.", correct: false,
        why: "Transfer Acceleration can make the transfer faster, but a single PUT is still limited to 5 GB and cannot continue after an error." }
    ],
    explanation: "A single PUT allows 5 GB. Multipart upload allows large objects, parallel parts, and a retry of only the failed parts." },

  { id: "m03-016", topic: "s3-multipart", domain: 4,
    stem: "A developer writes custom code that uploads a 40 MB file in 20 parts of 2 MB each with the multipart upload API. Each UploadPart call succeeds, but CompleteMultipartUpload fails with an EntityTooSmall error. Which solution will meet these requirements?",
    options: [
      { text: "Use parts of at least 5 MiB. Only the last part can be smaller.", correct: true,
        why: "Each part except the last must be at least 5 MiB. Parts of 2 MB cause EntityTooSmall when S3 builds the object." },
      { text: "Upload the parts in part-number order, one at a time.", correct: false,
        why: "Parts can upload in any order and in parallel. Order does not cause EntityTooSmall." },
      { text: "Enable S3 Transfer Acceleration on the bucket.", correct: false,
        why: "Transfer Acceleration changes the network path. It does not change the minimum part size." },
      { text: "Add a ChecksumAlgorithm of CRC32 to each UploadPart request.", correct: false,
        why: "Checksums verify data integrity. They do not fix parts that are below the minimum size." }
    ],
    explanation: "Multipart upload parts must be 5 MiB to 5 GiB, except the last part. Smaller parts cause EntityTooSmall on CompleteMultipartUpload." },

  { id: "m03-017", topic: "s3-multipart", domain: 4,
    stem: "Customers in Asia, Europe, and South America upload large design files to one S3 bucket in us-east-1. Customers far from the Region report slow uploads. The developer must improve upload speed with the fewest changes to the application. Which solution will meet these requirements?",
    options: [
      { text: "Enable S3 Transfer Acceleration on the bucket and change the client to use the bucket's s3-accelerate endpoint.", correct: true,
        why: "Transfer Acceleration routes data through CloudFront edge locations and the AWS network. Only the endpoint changes in the client." },
      { text: "Configure Cross-Region Replication from the bucket to buckets in Asia, Europe, and South America.", correct: false,
        why: "Replication copies objects after they arrive in us-east-1. It does not make the customer upload faster." },
      { text: "Enable S3 Bucket Keys on the bucket.", correct: false,
        why: "Bucket Keys reduce KMS requests for SSE-KMS. They do not change network transfer speed." },
      { text: "Change the storage class of uploads to S3 Intelligent-Tiering.", correct: false,
        why: "The storage class affects cost and access tiers. It does not change upload speed over long distances." }
    ],
    explanation: "S3 Transfer Acceleration uses CloudFront edge locations to speed long-distance transfers. Enable it on the bucket and use the s3-accelerate endpoint." },

  { id: "m03-018", topic: "s3-presigned", domain: 2,
    stem: "A web application lets users upload profile photos from an HTML form directly to Amazon S3. Users do not have AWS credentials. The backend must make sure that each upload goes under the uploads/ prefix and is no larger than 5 MB. Which solution will meet these requirements?",
    options: [
      { text: "Have the backend generate a presigned POST with a POST policy that has a starts-with condition on the key and a content-length-range condition.", correct: true,
        why: "The signed POST policy lets the browser upload without credentials. S3 rejects uploads that break the key or size conditions." },
      { text: "Add a bucket policy that allows s3:PutObject for Principal \"*\" on uploads/*.", correct: false,
        why: "This lets anyone on the internet upload any size of file. It fails the security requirement and does not limit the size." },
      { text: "Embed the access key of an IAM user with s3:PutObject permission in the web page.", correct: false,
        why: "Anyone can read the keys from the page and use them. This fails the requirement that users do not get AWS credentials." },
      { text: "Configure a CORS rule that allows POST from the website origin.", correct: false,
        why: "CORS lets the browser make cross-origin requests. It does not authorize the upload or limit the size or key." }
    ],
    explanation: "A presigned POST uses a signed POST policy. Conditions such as starts-with and content-length-range limit what the browser can upload." },

  { id: "m03-019", topic: "s3-presigned", domain: 4,
    stem: "A Lambda function creates presigned GET URLs with ExpiresIn set to 86400 seconds and emails them to customers. Customers report that the links stop working after a few hours with an ExpiredToken error. What is the cause?",
    options: [
      { text: "The URL was signed with the temporary credentials of the Lambda execution role. The URL stops working when those credentials expire.", correct: true,
        why: "A presigned URL signed with temporary credentials cannot be valid longer than the credentials, even if ExpiresIn is longer." },
      { text: "The maximum value of ExpiresIn is 3,600 seconds.", correct: false,
        why: "With IAM user credentials and SigV4, a presigned URL can be valid for up to 7 days. The limit here comes from the temporary credentials." },
      { text: "The bucket uses SSE-S3 encryption, which does not support presigned URLs.", correct: false,
        why: "Presigned URLs work with encrypted objects. Encryption does not cause an ExpiredToken error." },
      { text: "S3 is eventually consistent, so the object is not yet visible to the URL.", correct: false,
        why: "S3 is strongly consistent, and the error is ExpiredToken, not a missing object." }
    ],
    explanation: "A presigned URL expires at its ExpiresIn time or when the signing credentials expire, whichever comes first. Role credentials are temporary." },

  { id: "m03-020", topic: "s3-presigned", domain: 2,
    stem: "A backend creates presigned PUT URLs so that a mobile app can upload invoices directly to Amazon S3. Security requires that every upload is encrypted with SSE-KMS by using a specific customer managed key and has Content-Type application/pdf. A modified client must not be able to change these settings. Which solution will meet these requirements?",
    options: [
      { text: "Include ServerSideEncryption, SSEKMSKeyId, and ContentType in the parameters when the backend creates the presigned URL.", correct: true,
        why: "These parameters become signed headers. If the client sends different values or leaves them out, S3 returns SignatureDoesNotMatch." },
      { text: "Tell the mobile app developers to add the encryption and content-type headers to each upload.", correct: false,
        why: "Nothing enforces this. A modified client can send other values, which fails the requirement." },
      { text: "Configure a CORS rule that allows only the x-amz-server-side-encryption header.", correct: false,
        why: "CORS controls browser cross-origin access. It does not apply to a mobile app and does not enforce header values." },
      { text: "Set ExpiresIn to 60 seconds.", correct: false,
        why: "A short expiry limits the time window. It does not control which encryption or content type the client sends." }
    ],
    explanation: "Parameters such as ServerSideEncryption and ContentType are signed into a presigned URL. The client must send the same values, so the backend controls them." },

  { id: "m03-021", topic: "s3-presigned", domain: 2,
    stem: "A company shares reports through S3 presigned URLs. After an incident, the security team requires two controls on the bucket: S3 must reject any presigned URL request whose signature is more than 10 minutes old, and requests must come only from the corporate public IP range. Which bucket policy statements will meet these requirements? (Choose two.)",
    options: [
      { text: "A Deny statement for s3:* with a NumericGreaterThan condition on s3:signatureAge of 600000.", correct: true,
        why: "s3:signatureAge is in milliseconds. 600,000 ms is 10 minutes, so older signatures are denied." },
      { text: "A Deny statement for s3:* with a NotIpAddress condition on aws:SourceIp set to the corporate range.", correct: true,
        why: "aws:SourceIp limits requests to the public endpoint by source IP address, including presigned URL requests." },
      { text: "A CORS rule with AllowedOrigins set to the corporate domain.", correct: false,
        why: "CORS controls browser cross-origin requests. It does not deny requests by IP address or signature age." },
      { text: "A Deny statement with a condition on aws:SourceVpce.", correct: false,
        why: "aws:SourceVpce applies to requests through a VPC endpoint. The requirement is the corporate public IP range." },
      { text: "Object Lock in governance mode on the reports.", correct: false,
        why: "Object Lock prevents deletes and overwrites. It does not control who can read the reports or how old a signature is." }
    ],
    explanation: "Use s3:signatureAge to deny old signatures and aws:SourceIp (public endpoint) or aws:SourceVpce (VPC endpoint) to limit the network path." },

  { id: "m03-022", topic: "s3-encryption", domain: 2,
    stem: "A company stores customer records in Amazon S3. Compliance requires server-side encryption, a record in AWS CloudTrail of each use of the encryption key, and the ability for the security team to control key access with a key policy and to disable the key. Which solution will meet these requirements?",
    options: [
      { text: "Use SSE-KMS with a customer managed KMS key.", correct: true,
        why: "KMS logs key use in CloudTrail. A customer managed key lets the team write the key policy and disable the key." },
      { text: "Use SSE-S3.", correct: false,
        why: "S3 manages SSE-S3 keys. The team cannot control key access with a key policy or disable the key." },
      { text: "Use SSE-KMS with the AWS managed key aws/s3.", correct: false,
        why: "AWS manages the aws/s3 key. The team cannot edit its key policy or disable it, which fails the control requirement." },
      { text: "Use SSE-C with keys stored in the application.", correct: false,
        why: "S3 does not store SSE-C keys and KMS is not used, so there is no KMS record of key use or key policy." }
    ],
    explanation: "SSE-KMS with a customer managed key gives key policy control, key disable and rotation control, and a CloudTrail record of each key use." },

  { id: "m03-023", topic: "s3-encryption", domain: 2,
    stem: "A healthcare application stores patient files in Amazon S3. A regulation requires that the files are encrypted before they leave the application servers, and that AWS never receives the plaintext. Which solution will meet these requirements?",
    options: [
      { text: "Encrypt the files in the application with the Amazon S3 Encryption Client before upload.", correct: true,
        why: "Client-side encryption encrypts data before it is sent. S3 receives only encrypted data and never sees the plaintext." },
      { text: "Use SSE-KMS with a customer managed key.", correct: false,
        why: "With SSE-KMS, S3 receives the plaintext and encrypts it on the server. This fails the requirement." },
      { text: "Use SSE-C and send the key with each request.", correct: false,
        why: "With SSE-C, S3 receives the plaintext and the key, then encrypts on the server. This fails the requirement." },
      { text: "Require HTTPS with a bucket policy that denies requests when aws:SecureTransport is false.", correct: false,
        why: "TLS protects data in transit only. S3 still receives the plaintext after TLS ends." }
    ],
    explanation: "Client-side encryption encrypts data before upload, so AWS never sees plaintext. Server-side options encrypt data after S3 receives it." },

  { id: "m03-024", topic: "s3-encryption", domain: 4,
    stem: "A legacy application on an internal network encrypts objects with SSE-C. The bucket is configured to accept SSE-C. The application sends PutObject requests to an http:// S3 endpoint with the x-amz-server-side-encryption-customer-algorithm, -key, and -key-MD5 headers. S3 rejects every request. The IAM permissions are correct. Which solution will meet these requirements?",
    options: [
      { text: "Send the SSE-C requests to the https:// endpoint.", correct: true,
        why: "S3 rejects SSE-C requests over HTTP, because the request carries the encryption key. HTTPS is required." },
      { text: "Remove the key-MD5 header from each request.", correct: false,
        why: "SSE-C requests need all three headers: algorithm, key, and key MD5. Removing one does not fix the HTTP problem and adds another error." },
      { text: "Add kms:GenerateDataKey permission for the application role.", correct: false,
        why: "SSE-C does not use AWS KMS. KMS permissions do not affect SSE-C requests." },
      { text: "Turn off Block Public Access on the bucket.", correct: false,
        why: "Block Public Access controls public access. It does not affect SSE-C, and turning it off reduces security." }
    ],
    explanation: "SSE-C requests must use HTTPS and must send the algorithm, the key, and the key MD5 headers on each PUT and GET. S3 does not store the key." },

  { id: "m03-025", topic: "s3-encryption", domain: 2,
    stem: "A security team sets two rules for a bucket. First, S3 must reject every request that does not use HTTPS. Second, objects that clients upload without any encryption header must still be encrypted with SSE-KMS and a specific customer managed key, with no client changes. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Add a bucket policy statement that denies all S3 actions when aws:SecureTransport is false.", correct: true,
        why: "aws:SecureTransport is false for HTTP requests, so S3 rejects every request that does not use TLS." },
      { text: "Set the bucket default encryption to SSE-KMS with the customer managed key.", correct: true,
        why: "Default encryption applies when the upload has no encryption header, so no client change is necessary." },
      { text: "Add a bucket policy that denies s3:PutObject when s3:x-amz-server-side-encryption-aws-kms-key-id is null.", correct: false,
        why: "This rejects uploads without the header. The clients would fail, which breaks the no-client-changes requirement." },
      { text: "Configure CORS to allow only https:// origins.", correct: false,
        why: "CORS controls browser cross-origin access. It does not reject HTTP requests from other clients." },
      { text: "Enable S3 Object Lock in compliance mode.", correct: false,
        why: "Object Lock prevents deletes and overwrites. It does not enforce HTTPS or encryption." }
    ],
    explanation: "Deny requests where aws:SecureTransport is false to require TLS. Use default bucket encryption to encrypt uploads that send no header." },

  { id: "m03-026", topic: "s3-kms", domain: 4,
    stem: "An analytics job reads and writes millions of small objects each hour in a bucket that uses SSE-KMS with a customer managed key. The job receives KMS ThrottlingException errors, and the KMS bill is high. The developer wants the LEAST effort solution with no application changes. Which solution will meet these requirements?",
    options: [
      { text: "Enable S3 Bucket Keys for SSE-KMS on the bucket.", correct: true,
        why: "A Bucket Key lets S3 create data keys with fewer calls to KMS. This can reduce KMS requests and cost by up to 99 percent with no client changes." },
      { text: "Change the bucket default encryption to DSSE-KMS.", correct: false,
        why: "DSSE-KMS adds a second layer of encryption and does not support Bucket Keys. KMS use does not go down." },
      { text: "Spread the objects across more prefixes.", correct: false,
        why: "Prefixes raise the S3 request rate limit. The throttling comes from the KMS request quota, so the errors continue." },
      { text: "Use multipart upload for all objects.", correct: false,
        why: "Multipart upload helps large objects. It does not reduce the KMS calls for millions of small objects." }
    ],
    explanation: "Each SSE-KMS request without a Bucket Key calls KMS and counts toward the KMS request quota. S3 Bucket Keys reduce these calls and the cost." },

  { id: "m03-027", topic: "s3-kms", domain: 2,
    stem: "An application role can upload small files to a bucket that uses SSE-KMS with a customer managed key. When the application uploads a 2 GB file with multipart upload, the upload fails with AccessDenied. The role has kms:GenerateDataKey on the key and s3:PutObject on the bucket. Which additional permission will meet these requirements?",
    options: [
      { text: "kms:Decrypt on the KMS key", correct: true,
        why: "A multipart upload with SSE-KMS needs kms:GenerateDataKey and kms:Decrypt on the key. S3 must decrypt and read the encrypted parts before it completes the upload." },
      { text: "kms:Encrypt on the KMS key", correct: false,
        why: "S3 uses data keys from GenerateDataKey. kms:Encrypt does not fix the multipart upload." },
      { text: "s3:PutObjectAcl on the bucket", correct: false,
        why: "This allows ACL changes. It is not related to the KMS permission that the multipart upload needs." },
      { text: "s3:BypassGovernanceRetention on the bucket", correct: false,
        why: "This permission overrides Object Lock governance mode. It does not affect SSE-KMS uploads." }
    ],
    explanation: "PutObject with SSE-KMS needs kms:GenerateDataKey. A multipart upload with SSE-KMS needs kms:GenerateDataKey and kms:Decrypt, because S3 decrypts the encrypted parts to complete the upload." },

  { id: "m03-028", topic: "s3-kms", domain: 2,
    stem: "Account A has a bucket with objects encrypted with SSE-KMS and the AWS managed key aws/s3. A role in Account B must read the objects. The role in Account B already has an IAM policy that allows s3:GetObject on the bucket and kms:Decrypt on any key. Which actions in Account A will meet these requirements? (Choose two.)",
    options: [
      { text: "Encrypt the objects with a customer managed KMS key whose key policy allows the Account B role to use kms:Decrypt.", correct: true,
        why: "Objects encrypted with aws/s3 cannot be shared across accounts, because you cannot edit the key policy of an AWS managed key. A customer managed key policy can allow another account." },
      { text: "Add a bucket policy that allows the Account B role to use s3:GetObject on the objects.", correct: true,
        why: "Cross-account access needs an allow in the resource policy of Account A and in the IAM policy of Account B." },
      { text: "Edit the key policy of the aws/s3 key to allow Account B.", correct: false,
        why: "You cannot change the key policy of an AWS managed key. Objects encrypted with aws/s3 cannot be shared across accounts." },
      { text: "Enable S3 Bucket Keys on the bucket.", correct: false,
        why: "Bucket Keys reduce KMS requests. They do not give Account B permission to the key or the bucket." },
      { text: "Change the Object Ownership setting to Object writer.", correct: false,
        why: "Object Ownership controls ACLs and object owners. It does not give another account permission to decrypt." }
    ],
    explanation: "To share SSE-KMS objects across accounts, use a customer managed key. Allow the other account in the key policy and in the bucket policy." },

  { id: "m03-029", topic: "s3-access", domain: 2,
    stem: "A partner account uploads files to a company bucket. The company account must own every uploaded object, and the company wants to manage all access with policies only, without ACLs. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Keep the Object Ownership setting at Bucket owner enforced, and allow the partner to use s3:PutObject in the bucket policy.", correct: true,
        why: "Bucket owner enforced disables ACLs, and the bucket owner owns every object. The bucket policy gives the partner write access." },
      { text: "Set Object Ownership to Bucket owner preferred, and require the bucket-owner-full-control canned ACL on each upload.", correct: false,
        why: "This setting keeps ACLs enabled and needs an ACL on every upload. It fails the no-ACLs requirement." },
      { text: "Set Object Ownership to Object writer, and have the partner grant the company full control with an object ACL.", correct: false,
        why: "With Object writer, the partner account owns the objects. This fails the ownership and no-ACLs requirements." },
      { text: "Grant the partner write access with a bucket ACL.", correct: false,
        why: "ACLs are disabled by default for new buckets, and the company wants policies only." }
    ],
    explanation: "Bucket owner enforced (the default) disables ACLs. The bucket owner owns every object, and policies control all access." },

  { id: "m03-030", topic: "s3-access", domain: 2,
    stem: "EC2 instances in private subnets with no internet access must read objects in an S3 bucket in the same Region. The bucket must deny every request that does not come through the company's VPC endpoint. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Create a gateway VPC endpoint for Amazon S3 and add it to the route tables of the private subnets.", correct: true,
        why: "A gateway endpoint lets instances reach S3 without internet access." },
      { text: "Add a bucket policy that denies requests when aws:SourceVpce does not match the endpoint ID.", correct: true,
        why: "aws:SourceVpce identifies requests that come through a specific VPC endpoint, so other requests are denied." },
      { text: "Add a bucket policy that denies requests when aws:SourceIp is not the private CIDR range of the VPC.", correct: false,
        why: "IAM does not include aws:SourceIp in requests that come through a VPC endpoint, so the condition cannot match them. Use aws:SourceVpc or aws:SourceVpce." },
      { text: "Add a NAT gateway to the private subnets.", correct: false,
        why: "A NAT gateway gives the subnets an internet path, which the requirement does not allow. Requests through it do not come from the VPC endpoint." },
      { text: "Turn on all Block Public Access settings for the bucket.", correct: false,
        why: "Block Public Access stops public access. It does not deny authenticated requests from outside the VPC endpoint." }
    ],
    explanation: "Use a gateway endpoint for S3 from private subnets. Restrict the bucket with aws:SourceVpce or aws:SourceVpc conditions, not aws:SourceIp." },

  { id: "m03-031", topic: "s3-access", domain: 2,
    stem: "A shared data bucket is used by 40 applications in several AWS accounts. Each application needs different permissions on different prefixes. The bucket policy is near the 20 KB size limit, and every change risks breaking other applications. Which solution will meet these requirements?",
    options: [
      { text: "Create one S3 access point for each application, each with its own access point policy.", correct: true,
        why: "Access points are named endpoints with their own policies. They split access management for shared datasets and avoid one large bucket policy." },
      { text: "Attach a second bucket policy to the bucket.", correct: false,
        why: "A bucket has only one bucket policy, limited to 20 KB. A second policy is not possible." },
      { text: "Enable ACLs and grant each application access with object ACLs.", correct: false,
        why: "ACLs are coarse, are disabled by default, and AWS recommends policies. This adds overhead and risk." },
      { text: "Create an S3 Object Lambda Access Point for each application.", correct: false,
        why: "Object Lambda transforms data with a function. It is not a way to manage permissions for many applications." }
    ],
    explanation: "S3 access points give each application its own endpoint and policy. They simplify access management for shared datasets." },

  { id: "m03-032", topic: "s3-website-cors", domain: 3,
    stem: "A developer deploys a public marketing site to a new S3 bucket with static website hosting enabled. When the developer saves a bucket policy that allows s3:GetObject to Principal \"*\", S3 rejects the policy with AccessDenied. The site must be served from the S3 website endpoint. Which solution will meet these requirements?",
    options: [
      { text: "Turn off the Block Public Access settings for this bucket, then save the bucket policy.", correct: true,
        why: "Block Public Access is on by default for new buckets and blocks public bucket policies. The website endpoint serves only public content." },
      { text: "Set Object Ownership to Object writer and give each object a public-read ACL.", correct: false,
        why: "Block Public Access also blocks public ACLs, and ACLs are not the recommended way to grant access. The objects stay private." },
      { text: "Add a CORS rule that allows GET from all origins.", correct: false,
        why: "CORS does not grant permission. The objects stay private, and the policy is still rejected." },
      { text: "Enable S3 Versioning on the bucket.", correct: false,
        why: "Versioning keeps old versions. It does not change public access settings." }
    ],
    explanation: "The S3 website endpoint serves only publicly readable content. Turn off Block Public Access for the bucket and add a public-read bucket policy." },

  { id: "m03-033", topic: "s3-website-cors", domain: 4,
    stem: "A single-page application is served from https://app.example.com. Its JavaScript uploads files directly to the S3 REST endpoint of a bucket with presigned PUT URLs. The browser blocks the requests with a CORS error. Which solution will meet these requirements?",
    options: [
      { text: "Add a CORS configuration to the bucket that allows the https://app.example.com origin, the PUT method, and the required headers.", correct: true,
        why: "The browser needs the bucket to allow the origin and method in a CORS rule before it sends the cross-origin request." },
      { text: "Add a bucket policy that allows public s3:PutObject.", correct: false,
        why: "The presigned URL already authorizes the upload. A public policy reduces security and does not fix the browser CORS check." },
      { text: "Enable static website hosting on the bucket.", correct: false,
        why: "Website hosting serves pages over HTTP. It does not allow cross-origin PUT requests." },
      { text: "Enable S3 Transfer Acceleration on the bucket.", correct: false,
        why: "Transfer Acceleration changes the network path. The browser still blocks the request without a CORS rule." }
    ],
    explanation: "Configure CORS on the bucket that receives browser requests from another origin. CORS does not grant permission; it only lets the browser make the request." },

  { id: "m03-034", topic: "s3-website-cors", domain: 2,
    stem: "A company serves private training videos through Amazon CloudFront from an S3 bucket. The bucket must stay private with Block Public Access on, and users must not be able to get the videos directly from S3. The objects use SSE-KMS with a customer managed key. Which solution will meet these requirements?",
    options: [
      { text: "Use an origin access control (OAC). Allow cloudfront.amazonaws.com with the distribution ARN as AWS:SourceArn in the bucket policy and in the KMS key policy.", correct: true,
        why: "OAC signs requests from CloudFront to the private bucket. The key policy statement lets CloudFront decrypt SSE-KMS objects." },
      { text: "Use a legacy origin access identity (OAI) and grant it s3:GetObject in the bucket policy.", correct: false,
        why: "OAI does not support SSE-KMS. CloudFront cannot read the encrypted videos." },
      { text: "Use the S3 website endpoint as a custom origin with OAC.", correct: false,
        why: "OAC does not work with a website endpoint, and the website endpoint serves only public content. The bucket cannot stay private." },
      { text: "Make the objects public and allow only requests with the CloudFront Referer header.", correct: false,
        why: "The objects become public, and anyone can send that header. This fails the private-bucket requirement." }
    ],
    explanation: "CloudFront OAC reads a private S3 bucket through the REST endpoint. Allow the distribution in the bucket policy, and in the key policy for SSE-KMS objects." },

  { id: "m03-035", topic: "s3-events", domain: 1,
    stem: "Each new object in a bucket must create a message in an Amazon SQS FIFO queue, so that a consumer processes uploads in order. The developer tries to add the FIFO queue as a destination in the bucket event notification configuration, and S3 rejects it. Which solution will meet these requirements?",
    options: [
      { text: "Enable Amazon EventBridge on the bucket and create a rule for Object Created events that targets the FIFO queue.", correct: true,
        why: "S3 cannot send direct notifications to a FIFO queue. EventBridge can receive S3 events and send them to a FIFO queue." },
      { text: "Send the notification to a standard SQS queue instead.", correct: false,
        why: "A standard queue does not keep strict order. This fails the ordered-processing requirement." },
      { text: "Add an s3:ObjectCreated:* notification with a suffix filter of .fifo.", correct: false,
        why: "Key filters select objects. They do not change which destination types are supported." },
      { text: "Configure the bucket to invoke a Lambda function synchronously that sends to the FIFO queue.", correct: false,
        why: "S3 invokes Lambda asynchronously, not synchronously, and asynchronous invocations do not keep the upload order. This fails the ordered-processing requirement." }
    ],
    explanation: "SQS FIFO queues are not supported as direct S3 event notification destinations. Use EventBridge to route S3 events to a FIFO queue." },

  { id: "m03-036", topic: "s3-events", domain: 4,
    stem: "An s3:ObjectCreated:* notification invokes a Lambda function that creates a thumbnail and writes it to the same bucket. After deployment, the function runs continuously, the invocation count grows quickly, and the bucket fills with thumbnails of thumbnails. Which solution will meet these requirements?",
    options: [
      { text: "Write the thumbnails to a different bucket, or limit the notification to an input prefix that the function does not write to.", correct: true,
        why: "Each thumbnail write creates a new event that invokes the function again. A separate bucket or prefix breaks the loop." },
      { text: "Set the reserved concurrency of the function to 0.", correct: false,
        why: "This stops all invocations, so no thumbnails are made for real uploads. It does not fix the design." },
      { text: "Increase the function timeout to 15 minutes.", correct: false,
        why: "The timeout does not cause the loop. Each new write still invokes the function." },
      { text: "Enable S3 Versioning on the bucket.", correct: false,
        why: "Versioning keeps old versions. Each write still creates an ObjectCreated event, so the loop continues." }
    ],
    explanation: "If a function writes to the bucket that invokes it, it can invoke itself in a loop. Use a second bucket, or filter the trigger to an input prefix." },

  { id: "m03-037", topic: "s3-events", domain: 1,
    stem: "When an image is uploaded under images/, a Lambda function must create a thumbnail and an SQS queue must receive a message for an audit service. The developer adds two s3:ObjectCreated:* notification configurations with the prefix images/, one for each destination, and S3 rejects the configuration. Which solutions will meet these requirements? (Choose two.)",
    options: [
      { text: "Send the notification to one Amazon SNS topic, and subscribe the Lambda function and the SQS queue to the topic.", correct: true,
        why: "One notification configuration goes to SNS, and SNS fans the message out to both consumers." },
      { text: "Enable Amazon EventBridge on the bucket and create rules that target the Lambda function and the SQS queue.", correct: true,
        why: "EventBridge receives all events from the bucket, and its rules can send the same event to several targets." },
      { text: "Change the prefix of one configuration to images/* to make the filters different.", correct: false,
        why: "Wildcards are not allowed in S3 notification filters. The filters still overlap." },
      { text: "Change one configuration to the s3:ObjectCreated:Put event type.", correct: false,
        why: "s3:ObjectCreated:Put is part of s3:ObjectCreated:*, so the filters still overlap. It would also miss copies and multipart uploads." },
      { text: "Increase the reserved concurrency of the Lambda function.", correct: false,
        why: "Concurrency does not affect the notification configuration, which S3 still rejects." }
    ],
    explanation: "S3 rejects overlapping prefix or suffix filters for the same event type. Use SNS fan-out or EventBridge to send one event to several consumers." },

  { id: "m03-038", topic: "s3-events", domain: 1,
    stem: "A bucket receives files from many sources. A processing function must run only for objects larger than 5 MB whose key contains /raw/ in the middle, for example tenant-7/raw/file.csv. The solution must have the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Enable Amazon EventBridge on the bucket and create a rule that matches the object size and a key pattern, with the function as the target.", correct: true,
        why: "EventBridge rules can filter on event fields such as object size and key patterns, so only matching objects invoke the function." },
      { text: "Create an S3 event notification with a prefix filter of /raw/ and a suffix filter of .csv.", correct: false,
        why: "A prefix filter matches only the start of the key, and S3 filters cannot check object size. The rule misses the requirement." },
      { text: "Invoke the function for all uploads and check the size and key in the code.", correct: false,
        why: "This works, but every upload invokes the function and you maintain the filter code. It fails the least-overhead requirement." },
      { text: "Create an S3 event notification with the prefix filter */raw/*.", correct: false,
        why: "Wildcards are not allowed in S3 notification filters, so S3 does not accept this filter." }
    ],
    explanation: "Direct S3 notifications filter only by key prefix and suffix. Use EventBridge rules for size filters and patterns in the middle of the key." },

  { id: "m03-039", topic: "s3-object-lambda", domain: 4,
    stem: "A company that already uses S3 Object Lambda redacts PII when applications call GetObject through an Object Lambda Access Point. After a code change, clients receive HTTP 500 errors. The function downloads the object from inputS3Url, redacts it, and returns the redacted text as the function return value. Which solution will meet these requirements?",
    options: [
      { text: "Call WriteGetObjectResponse with the outputRoute and outputToken values from the event, and send the redacted body in that call.", correct: true,
        why: "Object Lambda ignores the function return value. If the function ends before WriteGetObjectResponse, the caller gets HTTP 500." },
      { text: "Increase the function timeout to 15 minutes.", correct: false,
        why: "The function finishes, so the timeout is not the cause. Object Lambda also allows only 60 seconds to send the response." },
      { text: "Grant the function role s3:GetObject on the bucket.", correct: false,
        why: "The function already reads the object through the presigned inputS3Url. The missing step is WriteGetObjectResponse." },
      { text: "Turn on S3 Versioning on the bucket.", correct: false,
        why: "Versioning does not affect how Object Lambda returns data to the caller." }
    ],
    explanation: "An Object Lambda GetObject function must call WriteGetObjectResponse with the route and token from the event. Otherwise the caller gets HTTP 500." },

  { id: "m03-040", topic: "s3-object-lambda", domain: 2,
    stem: "An existing S3 Object Lambda customer creates a new transformation function for GetObject requests. The security team requires the least-privilege execution role. The function reads the original object from the inputS3Url in the event and writes logs to CloudWatch Logs. Which permission must the role have in addition to the logging permissions?",
    options: [
      { text: "s3-object-lambda:WriteGetObjectResponse", correct: true,
        why: "The function must send the transformed data back with WriteGetObjectResponse. The managed policy AmazonS3ObjectLambdaExecutionRolePolicy contains it." },
      { text: "s3:GetObject and s3:PutObject on the bucket", correct: false,
        why: "The function reads through the presigned inputS3Url and does not write to the bucket. These permissions fail least privilege." },
      { text: "s3:* on the supporting access point", correct: false,
        why: "Full access is far more than the function needs, which fails least privilege. It also does not include WriteGetObjectResponse." },
      { text: "lambda:InvokeFunction on the function itself", correct: false,
        why: "This permission belongs to the caller of the function, not to the function role. It does not send the response." }
    ],
    explanation: "An Object Lambda GetObject function needs s3-object-lambda:WriteGetObjectResponse. It reads the original object through the presigned inputS3Url." }

] });
