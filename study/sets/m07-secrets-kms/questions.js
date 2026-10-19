window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "m07-secrets-kms", questions: [

  { id: "m07-001", topic: "secrets-basics", domain: 1,
    stem: "An application stores database credentials in AWS Secrets Manager. A rotation completed 10 minutes ago, and some reports now fail. The developer must read the credential value that was active before the rotation so that the team can compare the two values. Which solution will meet these requirements?",
    options: [
      { text: "Call GetSecretValue with VersionStage set to AWSPREVIOUS.", correct: true,
        why: "When AWSCURRENT moves to the new version, Secrets Manager adds AWSPREVIOUS to the old version. This label returns the value that was active before the rotation." },
      { text: "Call GetSecretValue with VersionStage set to AWSPENDING.", correct: false,
        why: "AWSPENDING marks the new value during a rotation. After a successful rotation it is not on the old version, so it does not return the value from before the rotation." },
      { text: "Call GetSecretValue with no version stage.", correct: false,
        why: "With no version, Secrets Manager returns AWSCURRENT, which is the new value. It fails the requirement to read the old value." },
      { text: "Call DescribeSecret and read the SecretString field.", correct: false,
        why: "DescribeSecret returns metadata, such as VersionIdsToStages. It does not return the secret value." }
    ],
    explanation: "After rotation, AWSCURRENT is on the new version and AWSPREVIOUS is on the last known good version. Read either label with GetSecretValue and VersionStage." },

  { id: "m07-002", topic: "secrets-basics", domain: 1,
    stem: "A developer deleted a Secrets Manager secret yesterday with the default DeleteSecret settings. An application still needs the secret. The developer must make the same secret, with the same ARN, available again as quickly as possible. Which solution will meet these requirements?",
    options: [
      { text: "Call RestoreSecret on the secret.", correct: true,
        why: "The default recovery window is 30 days. RestoreSecret cancels the scheduled deletion, so the secret keeps its ARN and the application can read it again." },
      { text: "Call CreateSecret with the same name and the same value.", correct: false,
        why: "The secret still exists while it is scheduled for deletion, so the name is not free. A new secret would also get a new ARN, which fails the requirement." },
      { text: "Call GetSecretValue with VersionStage set to AWSPREVIOUS.", correct: false,
        why: "You cannot read any value of a secret that is scheduled for deletion. You must restore it first." },
      { text: "Call PutSecretValue to add a new version to the secret.", correct: false,
        why: "Secrets Manager rejects changes to a secret that is scheduled for deletion. The deletion must be canceled first." }
    ],
    explanation: "DeleteSecret uses a recovery window of 7 to 30 days (default 30). During the window you cannot read the value, and RestoreSecret cancels the deletion." },

  { id: "m07-003", topic: "secrets-rotation", domain: 2,
    stem: "A company stores the credentials of an Amazon RDS for PostgreSQL database in Secrets Manager. A security policy requires the password to change every 30 days. The company wants the LEAST operational overhead and no changes to the application code. Which solution will meet these requirements?",
    options: [
      { text: "Turn on automatic rotation for the secret with a 30-day schedule, and use the rotation function template for Amazon RDS for PostgreSQL.", correct: true,
        why: "Secrets Manager provides a rotation template for RDS. The application already reads AWSCURRENT, so it gets the new password with no code change and no manual work." },
      { text: "Store the password in a Parameter Store SecureString, and create an EventBridge rule that changes it every 30 days.", correct: false,
        why: "Parameter Store has no rotation. The team must write and maintain the code that changes the database password, which fails the least overhead requirement." },
      { text: "Create a scheduled Lambda function that calls UpdateSecret with a new random password every 30 days.", correct: false,
        why: "UpdateSecret changes only the stored value. The database password does not change, so logins fail, and the team maintains custom code." },
      { text: "Turn on automatic rotation for the AWS managed key aws/secretsmanager.", correct: false,
        why: "KMS key rotation changes the encryption key material. It does not change the database password." }
    ],
    explanation: "For RDS, Aurora, Redshift, and DocumentDB secrets, Secrets Manager provides rotation templates. Rotation updates both the secret and the database." },

  { id: "m07-004", topic: "secrets-rotation", domain: 4,
    stem: "A developer turns on rotation for a Secrets Manager secret. The rotation Lambda function runs in private subnets so that it can reach an Amazon RDS database. The subnets have no route to the internet. Every rotation fails because the function times out when it calls the Secrets Manager API. Which solutions will each meet these requirements? (Choose two.)",
    options: [
      { text: "Create an interface VPC endpoint for Secrets Manager in the VPC of the function.", correct: true,
        why: "The function cannot reach the public Secrets Manager endpoint from private subnets. A Secrets Manager VPC endpoint gives it a private network path." },
      { text: "Add a NAT gateway in a public subnet, and add a route from the private subnets to the NAT gateway.", correct: true,
        why: "A NAT gateway gives the function an outbound path to the public Secrets Manager endpoint, and the function keeps its path to the database." },
      { text: "Increase the timeout of the rotation function to 15 minutes.", correct: false,
        why: "The function has no network path to Secrets Manager. A longer timeout only makes it wait longer before it fails." },
      { text: "Move the rotation function out of the VPC.", correct: false,
        why: "Outside the VPC, the function loses its network path to the private RDS database, so the setSecret and testSecret steps fail." },
      { text: "Add secretsmanager:* to the execution role of the function.", correct: false,
        why: "A timeout is a network problem, not a permission problem. A missing permission returns an access denied error at once." }
    ],
    explanation: "A rotation function must reach both the database and Secrets Manager. In private subnets, use a Secrets Manager VPC endpoint or a NAT gateway." },

  { id: "m07-005", topic: "secrets-rotation", domain: 2,
    stem: "A payment application connects to Amazon Aurora MySQL with credentials from Secrets Manager. The application must not get authentication failures while a rotation runs. The company can store a separate secret with administrator credentials. Which solution will meet these requirements?",
    options: [
      { text: "Use the alternating users rotation strategy, with the administrator credentials in a separate secret.", correct: true,
        why: "Alternating users keeps two users. One user stays valid while the other user's password changes, so an application that reads the secret during rotation still gets working credentials." },
      { text: "Use the single user rotation strategy.", correct: false,
        why: "Single user rotation has a short time between the password change and the secret update. During this time, logins with the old value can fail." },
      { text: "Rotate the secret every 4 hours.", correct: false,
        why: "More frequent rotation creates more rotation windows. It does not remove failures during each rotation." },
      { text: "Turn off the Rotate immediately when the secret is stored option.", correct: false,
        why: "This option controls only when the first rotation starts. It does not change what happens to logins during a rotation." }
    ],
    explanation: "Alternating users rotation creates a second database user (a clone) and changes the password of each user in turn. The credentials that applications read stay valid while the other user's password changes. It needs a superuser secret, because most users cannot clone themselves." },

  { id: "m07-006", topic: "secrets-access", domain: 2,
    stem: "A secret in Account A is encrypted with the AWS managed key aws/secretsmanager. A Lambda function in Account B must read the secret. The company wants to follow AWS best practices for least privilege. Which combination of steps will meet these requirements? (Choose three.)",
    options: [
      { text: "Attach a resource-based policy to the secret that allows the Lambda execution role in Account B to call secretsmanager:GetSecretValue.", correct: true,
        why: "Cross-account access to a secret needs a resource-based policy on the secret that names the other account's principal." },
      { text: "Encrypt the secret with a customer managed key, and allow the Lambda execution role to call kms:Decrypt in the key policy.", correct: true,
        why: "You cannot use aws/secretsmanager across accounts. A customer managed key has a key policy that can allow the other account's role." },
      { text: "Attach an IAM policy to the Lambda execution role in Account B that allows secretsmanager:GetSecretValue on the secret ARN and kms:Decrypt on the key ARN.", correct: true,
        why: "Cross-account access needs permission on both sides. The identity policy in Account B must also allow the actions." },
      { text: "Add the Lambda execution role in Account B to the key policy of aws/secretsmanager.", correct: false,
        why: "You cannot change the key policy of an AWS managed key, and AWS managed keys cannot be used from another account." },
      { text: "Replicate the secret to the Region of the Lambda function in Account B.", correct: false,
        why: "Replication copies a secret to other Regions in the same account. It does not give another account access." },
      { text: "Store the secret value in an environment variable of the Lambda function.", correct: false,
        why: "Anyone who can view the function configuration can read environment variables. This fails the security requirement." }
    ],
    explanation: "Cross-account secret access needs a resource policy on the secret, a customer managed key whose key policy allows the other account, and an IAM policy in the other account." },

  { id: "m07-007", topic: "secrets-access", domain: 1,
    stem: "A Python Lambda function calls GetSecretValue on every invocation. The function receives 500 requests each second, and the Secrets Manager costs are high. The developer wants to reduce cost and latency with no new SDK code for the secret call. Which solution will meet these requirements?",
    options: [
      { text: "Add the AWS Parameters and Secrets Lambda Extension layer, and read the secret from the extension's local HTTP endpoint.", correct: true,
        why: "The extension caches secrets in the execution environment (300 seconds by default). The function makes a local HTTP call, so it calls Secrets Manager far less often." },
      { text: "Configure provisioned concurrency for the function.", correct: false,
        why: "Provisioned concurrency removes cold starts. The handler still calls GetSecretValue on every invocation, so cost does not go down." },
      { text: "Request a quota increase for GetSecretValue.", correct: false,
        why: "The GetSecretValue quota is not adjustable, and a higher quota would not reduce the number of paid API calls." },
      { text: "Move the secret into a Lambda environment variable that a deployment pipeline updates.", correct: false,
        why: "Environment variables are visible to anyone who can view the function configuration, so this fails the security practice for secrets." }
    ],
    explanation: "The Parameters and Secrets Lambda Extension caches secrets and parameters locally (default TTL 300 seconds) and needs no SDK code for the call." },

  { id: "m07-008", topic: "secrets-access", domain: 4,
    stem: "A Lambda function uses the AWS Parameters and Secrets Lambda Extension with default settings to read a database password. Secrets Manager rotates the password. For a few minutes after each rotation, some invocations fail with authentication errors, and then they succeed again. Which solution will meet these requirements?",
    options: [
      { text: "Set SECRETS_MANAGER_TTL to a lower value, and request the secret again with versionStage=AWSCURRENT when an authentication error occurs.", correct: true,
        why: "The extension caches the secret for 300 seconds by default, so warm environments use the old password. A lower TTL and a refresh on error remove the stale value sooner." },
      { text: "Increase the memory of the function.", correct: false,
        why: "Memory does not change the cache duration. Environments still use the old password until the cache expires." },
      { text: "Change the rotation schedule to rotate every 4 hours.", correct: false,
        why: "More rotations cause more periods with stale cached values. This makes the problem happen more often." },
      { text: "Set PARAMETERS_SECRETS_EXTENSION_HTTP_PORT to a different port.", correct: false,
        why: "The port only changes where the extension listens. It does not change the cache behavior." }
    ],
    explanation: "Caches can return an old value after rotation. Use a TTL that matches the rotation pattern and refresh the secret after an authentication failure." },

  { id: "m07-009", topic: "secrets-choose", domain: 1,
    stem: "An application uses a third-party API key that never changes. The key is 200 bytes. The application must store the key encrypted at rest. The company wants the MOST cost-effective solution. Which solution will meet these requirements?",
    options: [
      { text: "Store the key as a Standard tier Parameter Store SecureString parameter with the AWS managed key aws/ssm.", correct: true,
        why: "Standard parameters have no additional storage charge, and SecureString encrypts the value with KMS. No rotation is needed, so Secrets Manager features add no value." },
      { text: "Store the key in Secrets Manager.", correct: false,
        why: "Secrets Manager encrypts the key, but it costs $0.40 for each secret each month. Its main benefit is rotation, which this key does not need, so it is not the most cost-effective." },
      { text: "Store the key as an Advanced tier Parameter Store SecureString parameter.", correct: false,
        why: "Advanced parameters have a monthly charge. A 200-byte value fits in the Standard tier, so this costs more for no benefit." },
      { text: "Store the key as a Parameter Store String parameter.", correct: false,
        why: "String parameters are not encrypted with KMS. This fails the requirement to encrypt the key at rest." }
    ],
    explanation: "For a static secret at the lowest cost, use a Standard SecureString parameter. Choose Secrets Manager when you need rotation, replication, or larger values." },

  { id: "m07-010", topic: "secrets-choose", domain: 3,
    stem: "A team builds a new service. The service needs Amazon RDS credentials that rotate automatically. It also needs feature flags that the team can turn on for a small percentage of requests first and roll back automatically when a CloudWatch alarm goes off. Which combination of services will meet these requirements? (Choose two.)",
    options: [
      { text: "AWS Secrets Manager for the database credentials.", correct: true,
        why: "Secrets Manager rotates RDS credentials automatically with a rotation template or managed rotation." },
      { text: "AWS AppConfig for the feature flags.", correct: true,
        why: "AppConfig has feature flag profiles, gradual deployment strategies, and automatic rollback on CloudWatch alarms." },
      { text: "Parameter Store SecureString parameters for the database credentials.", correct: false,
        why: "Parameter Store has no built-in rotation, so it fails the automatic rotation requirement." },
      { text: "Parameter Store String parameters with labels for the feature flags.", correct: false,
        why: "When a parameter changes, all readers see the new value. Parameter Store has no gradual rollout and no alarm-based rollback." },
      { text: "Lambda environment variables for the feature flags.", correct: false,
        why: "A change to environment variables needs a function update. It has no percentage rollout and no automatic rollback." }
    ],
    explanation: "Use Secrets Manager for credentials that rotate and AppConfig for feature flags with gradual rollout and alarm-based rollback." },

  { id: "m07-011", topic: "ssm-parameters", domain: 1,
    stem: "A developer stores a temporary access token in Parameter Store. The parameter must be deleted automatically 30 days after creation, and the team must get an Amazon EventBridge event 5 days before the deletion. Which solution will meet these requirements?",
    options: [
      { text: "Create an Advanced tier parameter with an Expiration policy and an ExpirationNotification policy.", correct: true,
        why: "Parameter policies delete parameters and send EventBridge events. Policies are available only for Advanced tier parameters." },
      { text: "Create a Standard tier parameter with an Expiration policy and an ExpirationNotification policy.", correct: false,
        why: "Standard parameters do not support policies. PutParameter fails with an error that policies are only supported on the Advanced tier." },
      { text: "Create a Standard tier parameter with a NoChangeNotification policy.", correct: false,
        why: "Standard parameters do not support policies, and NoChangeNotification only sends an event. It does not delete the parameter." },
      { text: "Create a Standard tier parameter, and add an expiration date to the parameter description.", correct: false,
        why: "Parameter Store does not act on text in the description. Nothing deletes the parameter or sends an event." }
    ],
    explanation: "Expiration, ExpirationNotification, and NoChangeNotification policies need the Advanced tier. Notifications go to Amazon EventBridge." },

  { id: "m07-012", topic: "ssm-parameters", domain: 1,
    stem: "A developer must store a 6 KB JSON configuration document as one Parameter Store parameter. The value is not sensitive. The developer wants the lowest cost that meets the size requirement. Which solution will meet these requirements?",
    options: [
      { text: "Create the parameter as an Advanced tier String parameter.", correct: true,
        why: "Advanced parameters hold values up to 8 KB. The value is not sensitive, so String is enough, and Advanced is the only tier that fits 6 KB." },
      { text: "Create the parameter as a Standard tier String parameter.", correct: false,
        why: "The Standard tier maximum is 4 KB. A 6 KB value does not fit." },
      { text: "Create the parameter as a Standard tier StringList parameter.", correct: false,
        why: "The type does not change the size limit. The Standard tier maximum is still 4 KB." },
      { text: "Turn on higher throughput for Parameter Store.", correct: false,
        why: "Throughput controls requests each second, not value size. It also adds a charge for each API interaction." }
    ],
    explanation: "Standard parameters hold up to 4 KB, Advanced parameters up to 8 KB. Advanced parameters have a monthly charge." },

  { id: "m07-013", topic: "ssm-parameters", domain: 2,
    stem: "A Lambda function must read a Parameter Store SecureString parameter named /app/prod/db-password. The parameter is encrypted with a customer managed KMS key. The key policy delegates access to IAM policies. The company requires least privilege. Which combination of permissions must the execution role have? (Choose two.)",
    options: [
      { text: "ssm:GetParameter on the parameter ARN.", correct: true,
        why: "The function must have permission to call GetParameter on this parameter." },
      { text: "kms:Decrypt on the customer managed key.", correct: true,
        why: "With WithDecryption, Parameter Store calls KMS Decrypt for the caller. The caller needs kms:Decrypt on the key that encrypted the parameter." },
      { text: "kms:Encrypt on the customer managed key.", correct: false,
        why: "kms:Encrypt is needed to write a standard SecureString, not to read one. It fails the least privilege requirement." },
      { text: "kms:GenerateDataKey on the customer managed key.", correct: false,
        why: "kms:GenerateDataKey is needed to write an advanced SecureString. A read does not need it." },
      { text: "secretsmanager:GetSecretValue on all resources.", correct: false,
        why: "The value is in Parameter Store, not Secrets Manager. This permission is not needed and fails least privilege." }
    ],
    explanation: "To read a SecureString, a principal needs ssm:GetParameter and kms:Decrypt on the KMS key. Writing needs kms:Encrypt (standard) or kms:GenerateDataKey (advanced)." },

  { id: "m07-014", topic: "ssm-access", domain: 3,
    stem: "An application stores 25 configuration values under /orders/prod/ in Parameter Store, in several levels. At startup, the application must load all values for its environment with the fewest API calls. The team adds new parameters often and does not want to change code when they do. Which solution will meet these requirements?",
    options: [
      { text: "Call GetParametersByPath with the path /orders/prod/ and Recursive set to true.", correct: true,
        why: "GetParametersByPath returns all parameters under a path, and Recursive includes all lower levels. New parameters under the path are returned with no code change." },
      { text: "Call GetParameters with the list of all 25 parameter names.", correct: false,
        why: "GetParameters accepts a maximum of 10 names. The code also must change each time a parameter is added." },
      { text: "Call GetParameter one time for each parameter name.", correct: false,
        why: "This needs 25 calls and a code change for each new parameter, so it fails both requirements." },
      { text: "Call DescribeParameters with a filter on the path.", correct: false,
        why: "DescribeParameters returns metadata, not parameter values. The application still must call another API to read the values." }
    ],
    explanation: "Use parameter hierarchies and GetParametersByPath (with Recursive) to load a configuration tree. GetParameters accepts up to 10 names." },

  { id: "m07-015", topic: "ssm-access", domain: 4,
    stem: "An application on 200 Amazon EC2 instances reads the same 5 parameters from Parameter Store on every request. During peak traffic, the SDK logs ThrottlingException: Rate exceeded errors. The parameter values change about one time each week. The company wants the MOST cost-effective solution. Which solution will meet these requirements?",
    options: [
      { text: "Cache the parameter values in the application, and refresh them every few minutes.", correct: true,
        why: "The values rarely change, so a cache removes most requests. This stops the throttling with no extra charge." },
      { text: "Turn on higher throughput for Parameter Store.", correct: false,
        why: "Higher throughput raises the quota but adds a charge for each API interaction. Caching solves the problem at a lower cost." },
      { text: "Change the parameters to the Advanced tier.", correct: false,
        why: "Tier controls storage limits and policies. It does not change the request quota, and it adds a monthly charge." },
      { text: "Change the parameters from String to SecureString.", correct: false,
        why: "The parameter type does not change throughput. Each read would also call KMS, which adds requests." }
    ],
    explanation: "The default Parameter Store throughput is 40 TPS for GetParameter, GetParameters, and GetParametersByPath combined. Cache values first, then turn on higher throughput if necessary." },

  { id: "m07-016", topic: "ssm-access", domain: 3,
    stem: "Applications read the parameter /app/prod/endpoint by using the label live, as /app/prod/endpoint:live. A new value in version 8 causes errors. Version 7 was good. The team must roll back at once, with no code change and no redeployment. Which solution will meet these requirements?",
    options: [
      { text: "Move the live label from version 8 to version 7 with LabelParameterVersion.", correct: true,
        why: "Applications read the value through the label. Moving the label to version 7 makes the next read return the good value with no code change." },
      { text: "Delete version 8 of the parameter.", correct: false,
        why: "Parameter Store does not delete one version of a parameter. DeleteParameter removes the whole parameter, so all reads would fail." },
      { text: "Change the applications to read /app/prod/endpoint:7.", correct: false,
        why: "This works, but it needs a code change and a redeployment, which fails the requirement." },
      { text: "Change the parameter tier to Advanced.", correct: false,
        why: "The tier controls size and policies. It does not change which version the label points to." }
    ],
    explanation: "Parameter labels point to versions. Clients that read name:label get the version that the label points to, so moving the label is a rollback." },

  { id: "m07-017", topic: "appconfig-model", domain: 1,
    stem: "A Lambda function reads feature flags from AWS AppConfig. Today the function calls StartConfigurationSession and GetLatestConfiguration on every invocation. The developer wants to reduce API calls and latency with the LEAST code to maintain. Which solution will meet these requirements?",
    options: [
      { text: "Add the AWS AppConfig Agent Lambda extension as a layer, and read the flags from http://localhost:2772.", correct: true,
        why: "The extension caches the configuration, tracks the session tokens, and polls in the background. The function makes a local HTTP call." },
      { text: "Store the flags in Lambda environment variables, and update them with each deployment.", correct: false,
        why: "Each flag change needs a function update. This loses the AppConfig rollout and rollback features." },
      { text: "Call the GetConfiguration API instead of the AppConfig Data APIs.", correct: false,
        why: "GetConfiguration is the old, deprecated API. It does not add caching, so calls and latency do not go down." },
      { text: "Move the flags to a Secrets Manager secret, and cache them in a global variable.", correct: false,
        why: "This adds cost for each secret and custom cache code, and it loses gradual rollout of flags." }
    ],
    explanation: "The AWS AppConfig Agent Lambda extension runs on localhost:2772, caches configuration data, and polls every 45 seconds by default." },

  { id: "m07-018", topic: "appconfig-model", domain: 3,
    stem: "A team stores a freeform JSON configuration in the AWS AppConfig hosted configuration store. A bad edit once removed a required field and broke production. The team wants AppConfig to block any configuration version that does not match a schema before it reaches any target, with no custom code. Which solution will meet these requirements?",
    options: [
      { text: "Add a JSON Schema validator to the configuration profile.", correct: true,
        why: "AppConfig runs validators when a deployment starts. If the data does not match the schema, the deployment does not start, and no code is needed." },
      { text: "Add a Lambda validator to the configuration profile that checks the required field.", correct: false,
        why: "A Lambda validator also blocks bad data, but the team must write and maintain the function code. This fails the no custom code requirement." },
      { text: "Use the AppConfig.Linear20PercentEvery6Minutes deployment strategy.", correct: false,
        why: "A gradual strategy limits the impact, but the bad data still reaches the first 20 percent of targets." },
      { text: "Add a CloudWatch alarm to the environment for automatic rollback.", correct: false,
        why: "Rollback happens after the bad data reaches targets and an alarm goes off. It does not block the data before deployment." }
    ],
    explanation: "AppConfig validators (JSON Schema or Lambda) run when you start a deployment and stop invalid data. JSON Schema validators need no code." },

  { id: "m07-019", topic: "appconfig-deploy", domain: 3,
    stem: "A team deploys configuration changes with AWS AppConfig. A bad change last week raised the error rate of the application for an hour before anyone noticed. The team wants AppConfig to roll back a change automatically when the application error rate rises during the rollout or in the 30 minutes after it. Which combination of steps will meet these requirements? (Choose two.)",
    options: [
      { text: "Create a CloudWatch alarm on the error rate, and add the alarm to the AppConfig environment.", correct: true,
        why: "AppConfig watches the environment's alarms during a deployment. If an alarm goes into ALARM, AppConfig rolls back to the previous version." },
      { text: "Deploy with a deployment strategy that has a bake time of 30 minutes, such as AppConfig.Linear20PercentEvery6Minutes.", correct: true,
        why: "Bake time keeps alarm monitoring active after the change reaches all targets, which covers the 30 minutes after the rollout." },
      { text: "Deploy with the AppConfig.Linear50PercentEvery30Seconds strategy.", correct: false,
        why: "Its bake time is 1 minute, so AppConfig stops watching alarms long before the 30-minute requirement ends." },
      { text: "Use the AppConfig.AllAtOnce strategy and call StopDeployment when errors appear.", correct: false,
        why: "StopDeployment rolls back only when someone calls it, so the rollback is not automatic." },
      { text: "Add a JSON Schema validator to the configuration profile.", correct: false,
        why: "A validator checks the format before deployment. A change with the correct format can still raise the error rate, and the validator does not roll back." },
      { text: "Store the configuration in Parameter Store and use parameter labels.", correct: false,
        why: "Parameter Store has no alarm-based rollback. Someone must move the label manually." }
    ],
    explanation: "Add CloudWatch alarms to the AppConfig environment. AppConfig rolls back if an alarm goes off during the rollout or the bake time." },

  { id: "m07-020", topic: "appconfig-deploy", domain: 3,
    stem: "A company releases a new pricing configuration with AWS AppConfig to production. The company wants to follow the AWS recommendation for production: a linear rollout over 30 minutes, then 30 minutes of alarm monitoring after all targets have the change. Which deployment strategy will meet these requirements?",
    options: [
      { text: "AppConfig.Linear20PercentEvery6Minutes", correct: true,
        why: "This strategy deploys 20 percent every 6 minutes for 30 minutes and then has a 30-minute bake time. AWS recommends it for production." },
      { text: "AppConfig.AllAtOnce", correct: false,
        why: "This strategy deploys to all targets at once, not over 30 minutes, and its bake time is 10 minutes." },
      { text: "AppConfig.Linear50PercentEvery30Seconds", correct: false,
        why: "This strategy takes 1 minute with a 1-minute bake time. AWS recommends it only for tests and demonstrations." },
      { text: "AppConfig.Canary10Percent20Minutes", correct: false,
        why: "This strategy is exponential over 20 minutes with a 10-minute bake time, so it fails the linear 30-minute requirement." }
    ],
    explanation: "AppConfig.Linear20PercentEvery6Minutes: 20 percent every 6 minutes, 30 minutes total, 30-minute bake time. AWS recommends it for production." },

  { id: "m07-021", topic: "kms-keys", domain: 2,
    stem: "A company encrypts Amazon S3 objects with SSE-KMS and the AWS managed key aws/s3. A partner account must now read and decrypt these objects. The bucket policy already allows the partner. The partner gets an access denied error from KMS. Which solution will meet these requirements?",
    options: [
      { text: "Encrypt the objects with a customer managed key whose key policy allows the partner account, and give the partner IAM permission to use the key.", correct: true,
        why: "You cannot change the key policy of an AWS managed key, and it cannot be used from another account. A customer managed key can allow the partner in its key policy." },
      { text: "Edit the key policy of aws/s3 to allow the partner account.", correct: false,
        why: "AWS managed key policies are read-only. You cannot add the partner account." },
      { text: "Create a grant on aws/s3 for the partner account.", correct: false,
        why: "You cannot manage the permissions of AWS managed keys, and they cannot be shared with other accounts." },
      { text: "Turn on S3 Bucket Keys for the bucket.", correct: false,
        why: "Bucket Keys reduce KMS requests. They do not give another account permission to use the key." }
    ],
    explanation: "Only customer managed keys can be shared across accounts. AWS managed keys have fixed key policies and serve only principals in the same account through the service." },

  { id: "m07-022", topic: "kms-keys", domain: 2,
    stem: "An application in us-east-1 encrypts records on the client side before it writes them to a DynamoDB global table. During a Regional outage, the application in eu-west-1 must decrypt the replicated records with no cross-Region call to KMS and no re-encryption. Which solution will meet these requirements?",
    options: [
      { text: "Create a multi-Region primary key in us-east-1, replicate it to eu-west-1, and encrypt with the key in each Region.", correct: true,
        why: "Related multi-Region keys have the same key ID and key material. The eu-west-1 key decrypts data that the us-east-1 key encrypted, with no cross-Region call." },
      { text: "Create a separate single-Region customer managed key in each Region with the same alias.", correct: false,
        why: "An alias does not share key material. The eu-west-1 key cannot decrypt data from the us-east-1 key." },
      { text: "Use the AWS managed key aws/dynamodb in each Region.", correct: false,
        why: "The application encrypts on the client side, and you cannot use AWS managed keys directly in your own cryptographic calls." },
      { text: "Create one single-Region key in us-east-1, and call it from eu-west-1.", correct: false,
        why: "Each decrypt makes a cross-Region call, and it fails when us-east-1 is not available." }
    ],
    explanation: "Multi-Region keys share key ID and key material across Regions, so data encrypted in one Region decrypts in another with no cross-Region call." },

  { id: "m07-023", topic: "kms-envelope", domain: 2,
    stem: "An application must encrypt 50 MB files with a KMS key before it stores them in Amazon S3. The application must make as few calls to KMS as possible and must follow AWS best practices. Which solution will meet these requirements?",
    options: [
      { text: "Call GenerateDataKey, encrypt the file locally with the plaintext data key, remove the plaintext key from memory, and store the encrypted data key with the file.", correct: true,
        why: "This is envelope encryption. KMS gets one call for each file, and the data key does the bulk encryption locally." },
      { text: "Call the KMS Encrypt operation with the whole file.", correct: false,
        why: "Encrypt accepts a maximum of 4,096 bytes. A 50 MB file cannot be sent to Encrypt." },
      { text: "Split the file into 4 KB parts and call Encrypt for each part.", correct: false,
        why: "This makes about 12,800 KMS calls for each file. It fails the requirement for few KMS calls and can hit request quotas." },
      { text: "Call GenerateDataKey and store the plaintext data key with the file.", correct: false,
        why: "Anyone who can read the file can then read the key and decrypt the data. Store only the encrypted data key." }
    ],
    explanation: "KMS Encrypt handles up to 4,096 bytes. For larger data, use envelope encryption: GenerateDataKey, encrypt locally, and store the encrypted data key with the data." },

  { id: "m07-024", topic: "kms-envelope", domain: 2,
    stem: "A developer implements envelope encryption for customer documents with a symmetric KMS key. Later, any authorized service must be able to decrypt a document without a separate store for keys. Which combination of actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Store the CiphertextBlob from GenerateDataKey together with the encrypted document.", correct: true,
        why: "The encrypted data key travels with the data. A service sends it to KMS Decrypt to get the plaintext data key back, so no separate key store is needed." },
      { text: "Use the Plaintext data key from GenerateDataKey to encrypt the document locally, and then remove it from memory.", correct: true,
        why: "The plaintext data key encrypts the data outside KMS. Removing it from memory keeps it from leaking." },
      { text: "Store the Plaintext data key in a DynamoDB table next to the document ID.", correct: false,
        why: "This stores the key in a separate store, and anyone with table access can decrypt documents. It fails both requirements." },
      { text: "Call Encrypt on the KMS key with the full document content.", correct: false,
        why: "Encrypt is limited to 4,096 bytes and is not envelope encryption. Documents larger than 4 KB fail." },
      { text: "Store only the key ID of the KMS key with the document.", correct: false,
        why: "The key ID alone cannot decrypt the document. The encrypted data key is needed." }
    ],
    explanation: "In envelope encryption, encrypt locally with the plaintext data key, discard it, and store the encrypted data key with the data. Decrypt calls KMS for the data key." },

  { id: "m07-025", topic: "kms-envelope", domain: 4,
    stem: "A multi-tenant application encrypts data keys with KMS and passes the encryption context {\"tenant\":\"42\"}. A new decrypt function calls Decrypt with the same ciphertext but with no encryption context. The call fails with InvalidCiphertextException. The key policy and IAM permissions are correct. Which solution will meet these requirements?",
    options: [
      { text: "Pass the same encryption context, {\"tenant\":\"42\"}, in the Decrypt call.", correct: true,
        why: "KMS binds the encryption context to the ciphertext. Decrypt must use an exact, case-sensitive match of the context, or KMS returns InvalidCiphertextException." },
      { text: "Add the KeyId parameter to the Decrypt call.", correct: false,
        why: "For symmetric ciphertext, KMS reads the key ID from the ciphertext. Adding it does not fix the missing encryption context." },
      { text: "Add kms:Decrypt to the IAM role of the function.", correct: false,
        why: "Permissions are already correct, and a permission problem returns an access denied error, not InvalidCiphertextException." },
      { text: "Turn on automatic rotation for the KMS key.", correct: false,
        why: "Rotation keeps old key material and does not change the encryption context check. The call still fails." }
    ],
    explanation: "If you encrypt with an encryption context, you must decrypt with the exact same context. A mismatch returns InvalidCiphertextException." },

  { id: "m07-026", topic: "kms-envelope", domain: 4,
    stem: "An application uploads thousands of small objects each second to an S3 bucket that uses SSE-KMS with a customer managed key. Uploads fail during peaks, and CloudTrail shows ThrottlingException errors from KMS GenerateDataKey calls. The company wants to reduce KMS requests and cost with no application code changes. Which solution will meet these requirements?",
    options: [
      { text: "Turn on S3 Bucket Keys for the bucket.", correct: true,
        why: "S3 gets a short-lived bucket-level key from KMS and uses it to create data keys for new objects, so S3 makes far fewer calls to KMS. AWS states that this can reduce KMS request costs by up to 99 percent, with no client changes." },
      { text: "Turn on automatic rotation for the customer managed key.", correct: false,
        why: "Rotation changes key material once a period. It does not reduce the number of KMS requests." },
      { text: "Change the bucket to use the AWS managed key aws/s3.", correct: false,
        why: "Requests on AWS managed keys also count toward the account request quota, so throttling continues." },
      { text: "Create a second customer managed key and split the uploads between the two keys.", correct: false,
        why: "The symmetric cryptographic quota is shared by all keys in the account and Region, so a second key does not add capacity." }
    ],
    explanation: "KMS request quotas are shared for each account and Region, and service calls count. S3 Bucket Keys reduce SSE-KMS requests to KMS." },

  { id: "m07-027", topic: "kms-envelope", domain: 2,
    stem: "In a data pipeline, a provisioning service creates storage containers and must attach an encrypted data key to each one. A different processing service later fills the containers and encrypts the data. For security, the provisioning service must never have the plaintext data key. Which KMS operation should the provisioning service call?",
    options: [
      { text: "GenerateDataKeyWithoutPlaintext", correct: true,
        why: "This operation returns only the encrypted data key. The processing service later calls Decrypt to get the plaintext key when it encrypts the data." },
      { text: "GenerateDataKey", correct: false,
        why: "GenerateDataKey also returns the plaintext data key, so the provisioning service would have it. This fails the security requirement." },
      { text: "Encrypt", correct: false,
        why: "Encrypt encrypts data that you send. It does not create a data key." },
      { text: "GenerateRandom", correct: false,
        why: "GenerateRandom returns random bytes in plaintext, not an encrypted data key. The provisioning service would see the key." }
    ],
    explanation: "GenerateDataKeyWithoutPlaintext returns only the encrypted data key. Use it when a component prepares keys but must not see them." },

  { id: "m07-028", topic: "kms-lifecycle", domain: 2,
    stem: "A compliance rule requires that the key material of a symmetric customer managed KMS key changes every 180 days. Applications must keep using the same key ID and must still decrypt old data. The company wants the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Enable automatic key rotation on the key with a rotation period of 180 days.", correct: true,
        why: "Automatic rotation accepts a period from 90 to 2,560 days. KMS keeps the old key material, so the key ID stays the same and old data still decrypts." },
      { text: "Create a new key every 180 days and update the alias with a scheduled Lambda function.", correct: false,
        why: "This changes the key ID and needs custom code. It fails the same key ID requirement and the least overhead requirement." },
      { text: "Call RotateKeyOnDemand every 180 days from a scheduled job.", correct: false,
        why: "On-demand rotation works, but the team must build and run the schedule. Automatic rotation does the same with no extra work." },
      { text: "Enable automatic key rotation with the default settings.", correct: false,
        why: "The default rotation period is 365 days. It fails the 180-day requirement." }
    ],
    explanation: "Automatic rotation for customer managed symmetric keys is off by default. You can set RotationPeriodInDays from 90 to 2,560 (default 365)." },

  { id: "m07-029", topic: "kms-lifecycle", domain: 2,
    stem: "An administrator scheduled deletion of a customer managed KMS key 3 days ago with a 30-day waiting period. An application that decrypts old data with this key now fails. The data must not be lost. Which solution will meet these requirements?",
    options: [
      { text: "Call CancelKeyDeletion, and then enable the key.", correct: true,
        why: "A key in the Pending deletion state cannot be used, but you can cancel the deletion during the waiting period. After cancellation, enable the key to use it again." },
      { text: "Create a new KMS key and decrypt the data with it.", correct: false,
        why: "A new key has different key material. It cannot decrypt data that the old key encrypted." },
      { text: "Wait for the waiting period to end, and then restore the key.", correct: false,
        why: "After the waiting period, KMS deletes the key permanently. You cannot restore it, and the data is lost." },
      { text: "Call EnableKey without other actions.", correct: false,
        why: "A key that is pending deletion cannot be enabled. You must cancel the deletion first." }
    ],
    explanation: "ScheduleKeyDeletion sets a 7 to 30 day waiting period (default 30). During it the key is Pending deletion and unusable. CancelKeyDeletion stops the deletion." },

  { id: "m07-030", topic: "kms-lifecycle", domain: 2,
    stem: "An application signs messages with an asymmetric RSA KMS key through the alias alias/signing. A security rule requires a new signing key every year. The application code must not change. Which solution will meet these requirements?",
    options: [
      { text: "Create a new asymmetric KMS key each year, and update alias/signing to point to the new key.", correct: true,
        why: "Asymmetric keys do not support automatic or on-demand rotation. Manual rotation with an alias keeps the code the same." },
      { text: "Enable automatic key rotation on the asymmetric key.", correct: false,
        why: "Automatic rotation is supported only for symmetric encryption keys with key material from KMS. It is not available for asymmetric keys." },
      { text: "Call RotateKeyOnDemand on the asymmetric key each year.", correct: false,
        why: "On-demand rotation is not supported for asymmetric keys." },
      { text: "Schedule the key for deletion each year with a 7-day waiting period.", correct: false,
        why: "Deletion removes the key. The application cannot sign during the change, and old signatures cannot be verified with the key." }
    ],
    explanation: "Asymmetric, HMAC, and custom key store keys need manual rotation. Create a new key and move the alias so that code does not change." },

  { id: "m07-031", topic: "kms-access", domain: 2,
    stem: "An administrator creates a customer managed key with a custom key policy. The policy gives only one administrator role full access. A developer role has an IAM policy that allows kms:Decrypt on the key ARN, but its Decrypt calls fail with access denied. Which solution will meet these requirements?",
    options: [
      { text: "Add a key policy statement that allows the account principal (arn:aws:iam::<account>:root) kms:*, or that allows the developer role kms:Decrypt directly.", correct: true,
        why: "IAM policies take effect for a KMS key only when the key policy allows it. The account principal statement enables IAM policies, or the key policy can name the role directly." },
      { text: "Attach the AdministratorAccess managed policy to the developer role.", correct: false,
        why: "Any IAM permission has no effect while the key policy does not enable IAM policies for this key. The call is still denied." },
      { text: "Turn on automatic rotation for the key.", correct: false,
        why: "Rotation changes key material. It does not change who can use the key." },
      { text: "Add a resource-based policy to the developer role.", correct: false,
        why: "Role trust policies control who can assume the role. They do not give access to the KMS key." }
    ],
    explanation: "Without the key policy statement for the account principal, IAM policies that allow KMS access have no effect. The key policy is always required." },

  { id: "m07-032", topic: "kms-access", domain: 2,
    stem: "A batch job in the same account needs to use a customer managed key for GenerateDataKey and Decrypt for about one hour. Security engineers do not want to change the key policy for temporary access, and they must be able to remove the access at any time. The job must use the access immediately after it is given. Which solution will meet these requirements?",
    options: [
      { text: "Create a grant for the job role with the GenerateDataKey and Decrypt operations, and pass the grant token in the job's KMS calls. Retire or revoke the grant after the job.", correct: true,
        why: "A grant gives specific operations on one key without a key policy change, and it can be retired or revoked. The grant token lets the job use the grant before it is fully propagated." },
      { text: "Add a statement for the job role to the key policy, and remove it after the job.", correct: false,
        why: "This changes the key policy, which the security engineers do not want." },
      { text: "Create a grant for the job role, and set the grant to expire after one hour.", correct: false,
        why: "KMS grants do not expire on their own. Someone must retire or revoke the grant." },
      { text: "Give the job role the AWS managed key aws/s3 instead.", correct: false,
        why: "You cannot use AWS managed keys directly in your own code, and you cannot change their permissions." }
    ],
    explanation: "Grants give temporary, revocable access to one key without key policy changes. A new grant can take a few seconds, sometimes several minutes, to be known in all of KMS (eventual consistency). Pass the grant token from CreateGrant in each call to use the grant at once." },

  { id: "m07-033", topic: "kms-access", domain: 2,
    stem: "A Lambda function in Account B must decrypt data with a customer managed key in Account A. The function calls Decrypt and gets access denied. Which combination of steps will meet these requirements with least privilege? (Choose two.)",
    options: [
      { text: "In Account A, add a key policy statement that allows the Lambda execution role in Account B to call kms:Decrypt.", correct: true,
        why: "For cross-account use, the key policy in the owner account must allow the other account or its principal." },
      { text: "In Account B, attach an IAM policy to the execution role that allows kms:Decrypt on the key ARN in Account A.", correct: true,
        why: "The calling account must also allow the action in an identity policy. Both sides are required." },
      { text: "In Account A, attach an IAM policy that allows kms:Decrypt to a role in Account A.", correct: false,
        why: "A role in Account A is not the caller. This does not give the Account B function any access." },
      { text: "In Account B, call Decrypt with the alias name alias/data-key.", correct: false,
        why: "To use a key in another account, the caller must give the key ARN or alias ARN, not the alias name. This alone does not fix permissions either." },
      { text: "In Account A, allow kms:* for the principal * in the key policy.", correct: false,
        why: "This allows every AWS principal to use the key. It fails the least privilege requirement." }
    ],
    explanation: "Cross-account KMS access needs both the key policy in the owner account and an IAM policy in the caller's account." },

  { id: "m07-034", topic: "kms-access", domain: 2,
    stem: "A company uses one customer managed key for SSE-KMS on an S3 bucket in us-east-1. A security audit requires that principals can use the key only through Amazon S3, not by calling KMS directly. Which solution will meet these requirements?",
    options: [
      { text: "Add the kms:ViaService condition with the value s3.us-east-1.amazonaws.com to the key policy statements that allow use of the key.", correct: true,
        why: "kms:ViaService allows a request only when it comes through the named AWS service. Direct KMS calls do not match the condition." },
      { text: "Add the kms:CallerAccount condition with the company account ID.", correct: false,
        why: "kms:CallerAccount limits which account can call. Principals in that account can still call KMS directly." },
      { text: "Turn on S3 Bucket Keys.", correct: false,
        why: "Bucket Keys reduce the number of KMS requests. They do not stop direct KMS calls." },
      { text: "Turn on automatic key rotation.", correct: false,
        why: "Rotation changes key material. It does not control how principals use the key." }
    ],
    explanation: "Use the kms:ViaService condition to allow a key only through a specific AWS service endpoint, for example s3.us-east-1.amazonaws.com." },

  { id: "m07-035", topic: "acm-certs", domain: 2,
    stem: "A developer requests an ACM public certificate in eu-west-1 for www.example.com. The developer then creates an Amazon CloudFront distribution, but the certificate does not appear in the list of certificates. Which solution will meet these requirements?",
    options: [
      { text: "Request the certificate in the US East (N. Virginia) Region (us-east-1), and select it in the distribution.", correct: true,
        why: "CloudFront uses only ACM certificates in us-east-1, regardless of where the origin is." },
      { text: "Export the certificate from eu-west-1 and import it into CloudFront.", correct: false,
        why: "A standard ACM public certificate cannot be exported, so this action is not possible." },
      { text: "Wait for DNS validation to complete in eu-west-1.", correct: false,
        why: "Validation does not change the Region. CloudFront still does not show a certificate from eu-west-1." },
      { text: "Change the certificate to email validation.", correct: false,
        why: "The validation method does not affect which Region CloudFront uses." }
    ],
    explanation: "Certificates for CloudFront and API Gateway edge-optimized endpoints must be in us-east-1. Regional endpoints and load balancers use the same Region as the resource." },

  { id: "m07-036", topic: "acm-certs", domain: 2,
    stem: "A company needs one TLS certificate on an Application Load Balancer in eu-west-1. The certificate must cover example.com and every first-level subdomain, such as shop.example.com. The company wants no cost for the certificate and no manual renewal work. Which combination of actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Request an ACM public certificate in eu-west-1 with the names example.com and *.example.com.", correct: true,
        why: "A wildcard covers one subdomain level but not the apex, so the certificate needs both names. ALB certificates must be in the same Region as the load balancer." },
      { text: "Use DNS validation, and keep the CNAME records in DNS.", correct: true,
        why: "ACM renews DNS-validated certificates automatically while the certificate is in use and the CNAME record stays in place." },
      { text: "Request an ACM public certificate with only *.example.com.", correct: false,
        why: "A wildcard does not cover the apex example.com, so the certificate fails the coverage requirement." },
      { text: "Use email validation.", correct: false,
        why: "Email-validated certificates need the domain owner to approve each renewal, which is manual work." },
      { text: "Request the certificate in us-east-1.", correct: false,
        why: "Only CloudFront and edge-optimized API Gateway endpoints need us-east-1. An ALB in eu-west-1 needs a certificate in eu-west-1." }
    ],
    explanation: "Wildcards cover one level and not the apex. DNS validation gives automatic renewal. Load balancer certificates must be in the load balancer's Region." },

  { id: "m07-037", topic: "acm-certs", domain: 2,
    stem: "A company runs 40 internal microservices that call each other over mutual TLS. The services need certificates from a managed private certificate authority. Browsers do not need to trust the certificates. The company wants to avoid running its own CA software. Which solution will meet these requirements?",
    options: [
      { text: "Create a private CA in AWS Private CA, and issue the service certificates from it.", correct: true,
        why: "AWS Private CA is a managed private CA for internal certificates, such as mutual TLS, so the company runs no CA software." },
      { text: "Request ACM public certificates for each internal service name.", correct: false,
        why: "A public certificate comes from the public Amazon CA, not from a managed private CA, so it fails the requirement. Public certificates also need publicly validated domain names." },
      { text: "Run OpenSSL on an EC2 instance as the CA, and import the certificates into ACM.", correct: false,
        why: "This means the company runs and protects its own CA software, which fails the requirement." },
      { text: "Store self-signed certificates in Secrets Manager for each service.", correct: false,
        why: "Self-signed certificates have no shared CA, so each service must trust each certificate separately. There is no managed CA." }
    ],
    explanation: "AWS Private CA provides a managed private CA for internal TLS, mutual TLS, and device certificates. General-purpose mode costs $400 for each CA each month." },

  { id: "m07-038", topic: "secrets-access", domain: 2,
    stem: "A Lambda function reads a third-party license key from an environment variable. A security review requires that the value is encrypted with a customer managed KMS key on the client side, so that it does not appear in plaintext in the Lambda console or API responses. The function must still use the value. Which solution will meet these requirements?",
    options: [
      { text: "Turn on the encryption helpers for encryption in transit with a customer managed key, add code that decrypts the value, and allow kms:Decrypt on the key in the execution role.", correct: true,
        why: "The helpers encrypt the value on the client side, so Lambda stores and shows only ciphertext. The function decrypts it at run time with kms:Decrypt." },
      { text: "Do nothing, because Lambda encrypts environment variables at rest by default.", correct: false,
        why: "Default encryption at rest uses an AWS managed key, and users with access see the plaintext value in the console. It fails the client-side encryption requirement." },
      { text: "Select a customer managed key for encryption at rest only.", correct: false,
        why: "Users with kms:Decrypt on the key still see the plaintext value in the console. The value is not encrypted on the client side." },
      { text: "Turn on automatic rotation for the AWS managed key that Lambda uses.", correct: false,
        why: "You cannot change rotation for AWS managed keys, and rotation does not hide the value." }
    ],
    explanation: "Lambda always encrypts environment variables at rest. Encryption helpers add client-side encryption with a customer managed key, and the function decrypts the value in code." }

] });
