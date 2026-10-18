window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "g-app-security", questions: [

  { id: "appsec-001", topic: "appsec-data-classification", domain: 2,
    stem: "A clinic application stores these fields for each visit: patient name, health insurance member ID, diagnosis code, the color theme that the user chose in the app, and a daily count of visits for each city with no patient details. A developer must apply the strictest controls to protected health information (PHI). Which data is PHI?",
    options: [
      { text: "The patient name together with the health insurance member ID and the diagnosis code.", correct: true,
        why: "PHI is health data that is linked to a person. A diagnosis and an insurance member ID tied to a named patient are PHI." },
      { text: "The color theme that the user chose in the app.", correct: false,
        why: "A display preference is not health data. It does not need the strictest PHI controls." },
      { text: "The daily count of visits for each city.", correct: false,
        why: "An aggregate count with no patient details does not identify a person, so it is not PHI." },
      { text: "Only the patient name, because health data without a name is never sensitive.", correct: false,
        why: "A name alone is PII, not PHI. The diagnosis and insurance ID are the health data that make the record PHI." }
    ],
    explanation: "PHI is health information linked to an individual, for example a diagnosis or an insurance member ID tied to a patient. PII identifies a person without health data." },

  { id: "appsec-002", topic: "appsec-data-classification", domain: 2,
    stem: "A sign-up flow asks customers for their date of birth and passport number. The only business need is to confirm one time that the customer is at least 18 years old. The company wants to reduce the risk of exposing this data with the least operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Check the age during sign-up, store only a flag that shows the check passed, and do not store the date of birth or the passport number.", correct: true,
        why: "Data that the application does not store cannot leak. Data minimization removes the risk with no keys or policies to manage." },
      { text: "Store both fields in DynamoDB and encrypt them with a customer managed AWS KMS key.", correct: false,
        why: "Encryption protects the stored data, but the data is still kept and the key adds work. It does not give the least overhead or the lowest risk." },
      { text: "Store both fields in a separate DynamoDB table that only one IAM role can read.", correct: false,
        why: "Restricted access helps, but the sensitive data is still stored and must still be protected. It fails the least-overhead requirement." },
      { text: "Store both fields, and turn on a CloudWatch Logs data protection policy for the application log group.", correct: false,
        why: "A data protection policy masks data in logs only. The database still keeps the passport number, so the main risk stays." }
    ],
    explanation: "Collect and keep only the data that the application needs. Not storing a sensitive field is the simplest and strongest control." },

  { id: "appsec-003", topic: "appsec-data-classification", domain: 2,
    stem: "A company classifies application logs that can contain customer PII as Confidential. The policy for Confidential logs says that the company must delete them after 30 days. The logs are in an Amazon CloudWatch Logs log group. Which solution will meet these requirements with the least operational overhead?",
    options: [
      { text: "Set the retention setting of the log group to 30 days.", correct: true,
        why: "CloudWatch Logs deletes log events older than the retention period automatically. It is one setting on the log group." },
      { text: "Create an Amazon S3 Lifecycle rule that expires objects after 30 days.", correct: false,
        why: "S3 Lifecycle rules act on S3 objects. The logs are in CloudWatch Logs, so the rule does not delete them." },
      { text: "Add a data protection policy to the log group.", correct: false,
        why: "A data protection policy masks sensitive data. It does not delete log events, so it fails the 30-day deletion rule." },
      { text: "Turn on DynamoDB Time to Live with a 30-day attribute.", correct: false,
        why: "DynamoDB TTL deletes items from a DynamoDB table. It does not apply to CloudWatch Logs." }
    ],
    explanation: "Use the classification to set retention. For CloudWatch Logs, the log group retention setting deletes old events automatically." },

  { id: "appsec-004", topic: "appsec-sanitize-mask", domain: 2,
    stem: "A Lambda function writes log lines that sometimes contain credit card numbers to an Amazon CloudWatch Logs log group. The security team must be able to see the full numbers during investigations. Developers must still read the logs to debug, but they must not see the card numbers. Which solution will meet these requirements with the least operational overhead?",
    options: [
      { text: "Create a data protection policy on the log group that uses the credit card number data identifier, and grant logs:Unmask only to the security team role.", correct: true,
        why: "The policy masks card numbers for everyone. Only principals with logs:Unmask see the original values, and developers still read the rest of each log line." },
      { text: "Associate a customer managed AWS KMS key with the log group, and give kms:Decrypt only to the security team role.", correct: false,
        why: "The key controls who can read the log data at all. Developers would lose access to the whole log, so they could not debug." },
      { text: "Create a metric filter that matches card number patterns.", correct: false,
        why: "A metric filter counts matching events. It does not hide the numbers, so developers still see them." },
      { text: "Create a subscription filter that sends events to a Lambda function that removes card numbers and writes the result to a second log group.", correct: false,
        why: "The original log group still holds the card numbers, and the custom function adds code to maintain. It fails the least-overhead requirement." }
    ],
    explanation: "CloudWatch Logs data protection policies mask sensitive data at ingestion. Only principals with the logs:Unmask permission can see the original values." },

  { id: "appsec-005", topic: "appsec-sanitize-mask", domain: 4,
    stem: "A developer added a data protection policy with the email address data identifier to a log group yesterday. Today, in CloudWatch Logs Insights, the email addresses in events written today are masked. Events written last week still show the email addresses. What is the reason?",
    options: [
      { text: "CloudWatch Logs masks sensitive data when it ingests a log event. Events ingested before the policy existed are not masked.", correct: true,
        why: "Masking happens at ingestion. The policy does not change events that CloudWatch Logs stored before the policy was created." },
      { text: "Data protection policies work only for log groups in the Infrequent Access log class.", correct: false,
        why: "Masking works in both the Standard and Infrequent Access log classes. The class does not explain the difference by date." },
      { text: "CloudWatch Logs Insights does not apply masking. Only the console log viewer masks data.", correct: false,
        why: "Masked data stays masked at all egress points, including Logs Insights. Today's events are masked in the same query." },
      { text: "The policy needs one week to propagate to existing log streams.", correct: false,
        why: "There is no one-week propagation rule. Today's events are already masked, and older events will never be masked by this policy." }
    ],
    explanation: "Data protection policies mask data at ingestion only. Log events stored before you create the policy stay unmasked." },

  { id: "appsec-006", topic: "appsec-sanitize-mask", domain: 2,
    stem: "A company has hundreds of CloudWatch Logs log groups, and teams create new log groups every week. The company must mask AWS secret access keys in every current and future log group. An audit role must be able to see the original values. Which actions should the developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "Create an account-level data protection policy that uses the AWS secret access key data identifier.", correct: true,
        why: "An account-level policy applies to all existing log groups and to log groups created in the future." },
      { text: "Grant the logs:Unmask permission to the audit role.", correct: true,
        why: "Only principals with logs:Unmask can see the masked values in their original form." },
      { text: "Create a data protection policy on each existing log group.", correct: false,
        why: "Log group-level policies do not cover log groups that teams create later, so new log groups stay unprotected." },
      { text: "Grant the logs:GetLogEvents permission to the audit role.", correct: false,
        why: "logs:GetLogEvents reads log events, but the audit role still sees masked values without logs:Unmask." },
      { text: "Associate a separate AWS KMS key with each log group.", correct: false,
        why: "KMS encryption protects data at rest. It does not mask secret keys inside the log text, and it does not cover new log groups." }
    ],
    explanation: "An account-level data protection policy covers all current and future log groups. logs:Unmask controls who sees the original values." },

  { id: "appsec-007", topic: "appsec-sanitize-mask", domain: 2,
    stem: "A support portal shows customer payment cards. Support agents must confirm a card by its last four digits only. A separate payment service must get the full card number later to process refunds. Which solution will meet these requirements?",
    options: [
      { text: "Store the card number encrypted or as a token in a secure store, show agents only a masked value such as ****-****-****-1234, and let only the payment service get the original.", correct: true,
        why: "Masking limits what agents see. Encryption or tokenization keeps a way for the authorized payment service to get the full number." },
      { text: "Store a SHA-256 hash of the card number and show the hash to agents.", correct: false,
        why: "A hash is one-way. The payment service cannot get the full number back, and agents cannot match the last four digits." },
      { text: "Base64-encode the card number before storing it and before showing it to agents.", correct: false,
        why: "Base64 is encoding, not protection. Anyone can decode it, so agents would see the full number." },
      { text: "Show the full card number to agents over HTTPS only.", correct: false,
        why: "HTTPS protects data in transit, but agents still see the full number. This fails the last-four-digits requirement." }
    ],
    explanation: "Masking hides part of a value from people who do not need it. Use encryption or tokenization when an authorized system must get the original value back." },

  { id: "appsec-008", topic: "appsec-sanitize-mask", domain: 2,
    stem: "An Amazon API Gateway REST API sends order requests to a Lambda function. Malformed JSON bodies with missing fields and wrong types reach the function and cause errors. The developer must reject these requests before the function runs, without writing code. Which solution will meet these requirements?",
    options: [
      { text: "Create a model with a JSON schema for the body, and turn on a request validator for the method that validates the body.", correct: true,
        why: "API Gateway validates the body against the model and returns 400 for invalid requests. The function does not run, and no code is needed." },
      { text: "Add a Lambda authorizer that parses the body.", correct: false,
        why: "A REST API Lambda authorizer receives a token or request parameters, not the body. It is also custom code." },
      { text: "Attach an AWS WAF web ACL with a rate-based rule.", correct: false,
        why: "A rate-based rule limits request rates. It does not check the body against a schema, so malformed bodies still reach the function." },
      { text: "Configure a usage plan with throttling limits.", correct: false,
        why: "Usage plans control request rates and quotas for API keys. They do not validate request bodies." }
    ],
    explanation: "Validate input before it reaches the backend. A REST API request validator with a JSON schema model rejects bad bodies with HTTP 400." },

  { id: "appsec-009", topic: "appsec-jwt-validation", domain: 2,
    stem: "A containerized service receives Amazon Cognito user pool access tokens in the Authorization header. API Gateway is not in front of the service, so the service must validate each token itself. Which actions should the developer take? (Choose three.)",
    options: [
      { text: "Get the public key that matches the token kid from the user pool JWKS URL, and verify the token signature.", correct: true,
        why: "The signature proves that Cognito issued the token and that nobody changed it. The JWKS gives the public key for each kid." },
      { text: "Check that exp is in the future, that iss matches the user pool, and that client_id matches the app client ID.", correct: true,
        why: "These checks confirm that the token is current and that it came from the correct user pool for the correct app client." },
      { text: "Check that the token_use claim is access.", correct: true,
        why: "The service accepts only access tokens. The token_use check rejects ID tokens from the same user pool." },
      { text: "Base64-decode the payload and trust the claims if exp is in the future.", correct: false,
        why: "Anyone can decode and change a JWT payload. Without a signature check, the service would trust modified tokens." },
      { text: "Check that the aud claim matches the app client ID.", correct: false,
        why: "Cognito access tokens carry client_id, not aud, unless resource binding is used. This check would reject valid access tokens." },
      { text: "Call the Cognito GetUser API for every request to check if the token is expired.", correct: false,
        why: "AWS says not to use GetUser to check expiration. Compare the exp claim instead, which needs no network call." }
    ],
    explanation: "Verify the signature with the JWKS key that matches kid, then check exp, iss, aud or client_id, and token_use. Decoding alone is not verification." },

  { id: "appsec-010", topic: "appsec-jwt-validation", domain: 4,
    stem: "A Lambda authorizer verifies Amazon Cognito tokens with one RSA public key that a developer copied into the function configuration. The authorizer worked for months. Now it rejects some valid tokens from the same user pool with a signature error. Which solution will fix the problem?",
    options: [
      { text: "Download the keys from the user pool JWKS URL, cache them by kid, and refresh the cache when a token has an unknown kid.", correct: true,
        why: "Cognito can rotate signing keys. Looking up the key by kid from the JWKS lets the authorizer verify tokens signed with any current key." },
      { text: "Increase the authorizer result cache TTL to 3,600 seconds.", correct: false,
        why: "The cache stores policies for tokens that already passed. It does not let the function verify tokens signed with a new key." },
      { text: "Send ID tokens instead of access tokens.", correct: false,
        why: "ID tokens are also signed with keys from the JWKS. The hardcoded key fails in the same way." },
      { text: "Increase the access token expiration in the app client.", correct: false,
        why: "Token lifetime does not change the signing key. Tokens signed with a different key still fail." }
    ],
    explanation: "Get signing keys from the issuer JWKS by kid, and cache them. Do not hardcode one public key, because the issuer can rotate keys." },

  { id: "appsec-011", topic: "appsec-jwt-validation", domain: 2,
    stem: "A company uses an Amazon API Gateway HTTP API. Users sign in with an Amazon Cognito user pool. The API must accept only requests that include a valid token from that user pool. The company wants no custom authorization code. Which solution will meet these requirements?",
    options: [
      { text: "Create a JWT authorizer with the user pool URL as the issuer and the app client ID as the audience, and attach it to the routes.", correct: true,
        why: "HTTP API JWT authorizers validate the signature, issuer, audience or client_id, and expiry. No code is needed." },
      { text: "Create a COGNITO_USER_POOLS authorizer.", correct: false,
        why: "The COGNITO_USER_POOLS authorizer type is for REST APIs. It is not available on an HTTP API." },
      { text: "Create a Lambda authorizer that validates the token.", correct: false,
        why: "A Lambda authorizer works, but it is custom code. The company wants no custom authorization code." },
      { text: "Set the route authorization type to AWS_IAM.", correct: false,
        why: "IAM authorization needs requests signed with AWS credentials (SigV4). It does not accept Cognito user pool tokens." }
    ],
    explanation: "On an HTTP API, a JWT authorizer validates tokens from an OIDC or OAuth 2.0 issuer such as a Cognito user pool, with no code." },

  { id: "appsec-012", topic: "appsec-jwt-validation", domain: 2,
    stem: "A single-page application calls a REST API with a URL such as https://api.example.com/orders?token=eyJ... A security review finds the bearer tokens in proxy and access logs. Which solution is MOST secure?",
    options: [
      { text: "Send the token in the Authorization header over HTTPS, and do not log the header value.", correct: true,
        why: "Headers are not part of the URL, so URL logs do not record them. HTTPS protects the token in transit." },
      { text: "Base64-encode the token in the query string.", correct: false,
        why: "Base64 is encoding, not protection. The encoded token is still in the URL and in the logs, and anyone can decode it." },
      { text: "Send the token in the query string over HTTP to remove the TLS overhead.", correct: false,
        why: "Plain HTTP exposes the token on the network. This makes the problem worse, so it is not the most secure option." },
      { text: "Increase the token lifetime so that the application sends fewer tokens.", correct: false,
        why: "A longer lifetime makes a leaked token useful for longer. It does not remove tokens from the logs." }
    ],
    explanation: "A bearer token gives access to whoever holds it. Send it only over HTTPS in the Authorization header, and keep it out of URLs and logs." },

  { id: "appsec-013", topic: "appsec-jwt-validation", domain: 2,
    stem: "A REST API method uses an Amazon Cognito user pool authorizer with no authorization scopes. The backend needs the email address of the signed-in user from a mapping template value such as $context.authorizer.claims.email. Which token should the client send in the Authorization header?",
    options: [
      { text: "The ID token.", correct: true,
        why: "With no scopes on the method, API Gateway treats the token as an ID token. The ID token holds user attributes such as email." },
      { text: "The access token.", correct: false,
        why: "Access tokens carry scopes and groups, not user attributes such as email. The backend would not get the email claim." },
      { text: "The refresh token.", correct: false,
        why: "A refresh token only gets new ID and access tokens from Cognito. API Gateway does not accept it for authorization." },
      { text: "Temporary AWS credentials from a Cognito identity pool, signed with SigV4.", correct: false,
        why: "SigV4 credentials are for AWS_IAM authorization. A Cognito user pool authorizer expects a user pool token." }
    ],
    explanation: "The ID token holds identity claims such as email. With no authorization scopes, a REST API Cognito authorizer treats the token as an ID token." },

  { id: "appsec-014", topic: "appsec-fine-grained-authz", domain: 2,
    stem: "A REST API uses an Amazon Cognito user pool authorizer. Any signed-in user can call GET /orders. Only clients whose token contains the custom scope orders-api/orders.write can call POST /orders. Which solution will meet these requirements?",
    options: [
      { text: "Add orders-api/orders.write as an authorization scope on the POST method, and have clients send the access token.", correct: true,
        why: "With scopes on the method, API Gateway treats the token as an access token and allows the call only if a scope matches. Otherwise it returns 401." },
      { text: "Set the authorizer token validation regex to orders-api/orders.write.", correct: false,
        why: "The token validation regex checks the aud claim, not scopes. It also rejects access tokens, which have no aud claim." },
      { text: "Require an API key on the POST method.", correct: false,
        why: "An API key identifies a client for usage plans. It does not check OAuth scopes in the token." },
      { text: "Add an AWS WAF rule that blocks POST requests.", correct: false,
        why: "The rule would block POST for every caller, including clients that have the write scope." }
    ],
    explanation: "On a REST API Cognito authorizer, authorization scopes on a method make API Gateway require an access token with a matching scope." },

  { id: "appsec-015", topic: "appsec-fine-grained-authz", domain: 4,
    stem: "A REST API uses a TOKEN Lambda authorizer with result caching at the default TTL. The authorizer returns an Allow policy whose Resource is the methodArn of the current request. Users report that GET /orders works, but a call to GET /invoices right after it returns 403 for several minutes. The developer must fix the issue and keep authorizer caching. Which solution will meet these requirements?",
    options: [
      { text: "Return a policy that allows every method that the user is allowed to call, for example with a wildcard in the resource ARN.", correct: true,
        why: "With caching, API Gateway uses the cached policy for other methods. A policy that covers all allowed methods works for every cached request." },
      { text: "Set the authorizer result TTL to 3,600 seconds.", correct: false,
        why: "A longer TTL keeps the one-method policy longer. The 403 errors last longer." },
      { text: "Set the authorizer result TTL to 0.", correct: false,
        why: "TTL 0 turns caching off. It fixes the 403, but it fails the requirement to keep caching." },
      { text: "Increase the timeout of the authorizer function.", correct: false,
        why: "The function does not time out. The cached policy causes the 403." }
    ],
    explanation: "When authorizer caching is on, the returned policy must apply to all methods the caller can use. A policy for only one method causes 403 on other methods during the TTL." },

  { id: "appsec-016", topic: "appsec-fine-grained-authz", domain: 1,
    stem: "A Lambda authorizer looks up the tenant ID and the plan tier for each caller. The backend Lambda function uses a Lambda proxy integration and needs both values without doing the lookup again. Which solution will meet these requirements?",
    options: [
      { text: "Return the values in the authorizer context map as strings, and read them from event.requestContext.authorizer in the backend function.", correct: true,
        why: "API Gateway passes the context map to the backend. With a proxy integration, the function reads each key from requestContext.authorizer." },
      { text: "Return one context key whose value is a JSON object that holds both values.", correct: false,
        why: "Context values must be strings, numbers, or booleans. API Gateway does not accept a JSON object or array as a context value." },
      { text: "Return the values in the usageIdentifierKey property.", correct: false,
        why: "usageIdentifierKey must be an API key from a usage plan. It is not a way to pass application data." },
      { text: "Store the values in stage variables.", correct: false,
        why: "Stage variables are fixed for each stage. They cannot hold different values for each caller." }
    ],
    explanation: "A Lambda authorizer can return a context map of string, number, or boolean values. The backend reads them from $context.authorizer or event.requestContext.authorizer." },

  { id: "appsec-017", topic: "appsec-fine-grained-authz", domain: 2,
    stem: "An application uses an Amazon Cognito user pool. Users are admins, editors, or viewers. Only admins may call the DELETE /documents/{id} operation. The developer wants the least custom code and wants to manage roles in Cognito. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Create Cognito user pool groups for admins, editors, and viewers, and add each user to the correct group.", correct: true,
        why: "Groups model roles in the user pool. Cognito adds the group names to the tokens of each member." },
      { text: "Before the delete runs, check that the cognito:groups claim in the verified token contains the admin group.", correct: true,
        why: "The cognito:groups claim is in both the ID token and the access token. Checking it enforces the admin-only rule." },
      { text: "Give admins an API key, and require API keys on the DELETE method.", correct: false,
        why: "API keys identify clients for usage plans and are easy to share. They do not prove that the signed-in user is an admin." },
      { text: "Set the authorizer token validation regex to match the word admin.", correct: false,
        why: "The token validation regex checks only the aud claim, which holds the app client ID, not the user role." },
      { text: "Use the unauthenticated role of a Cognito identity pool for viewers.", correct: false,
        why: "The unauthenticated role is for guests who did not sign in. It does not control which signed-in users can delete." }
    ],
    explanation: "Use Cognito groups for roles. The cognito:groups claim in the ID and access tokens lets the backend or an authorizer allow or deny each operation." },

  { id: "appsec-018", topic: "appsec-fine-grained-authz", domain: 2,
    stem: "A company exposes an Amazon API Gateway REST API. Clients sign in with a third-party OpenID Connect provider that issues JWTs. The API must validate these tokens and allow or deny each request based on the path and a claim in the token. Which solution will meet these requirements?",
    options: [
      { text: "Create a REQUEST Lambda authorizer that validates the JWT with the provider JWKS and returns a policy based on the path and the claim.", correct: true,
        why: "A Lambda authorizer can validate tokens from any issuer. A REQUEST authorizer can read $context.path to make a decision for each path." },
      { text: "Create a COGNITO_USER_POOLS authorizer that points to the provider.", correct: false,
        why: "A COGNITO_USER_POOLS authorizer accepts tokens only from Amazon Cognito user pools, not from a third-party provider." },
      { text: "Create a JWT authorizer with the provider as the issuer.", correct: false,
        why: "JWT authorizers are a feature of HTTP APIs. The company uses a REST API." },
      { text: "Set the method authorization type to AWS_IAM.", correct: false,
        why: "IAM authorization needs SigV4-signed requests with AWS credentials. It does not validate third-party JWTs." }
    ],
    explanation: "For custom token logic or a non-Cognito issuer on a REST API, use a Lambda authorizer. REQUEST authorizers can use the path and method in the decision." },

  { id: "appsec-019", topic: "appsec-fine-grained-authz", domain: 2,
    stem: "A SaaS application has thousands of projects, and teams add new projects every day. A user may open a project only if the department of the user matches the department of the project. The company wants to avoid policy changes when it adds projects. Which access control model will meet these requirements?",
    options: [
      { text: "Attribute-based access control (ABAC) that compares the department attribute of the user with the department attribute of the project.", correct: true,
        why: "ABAC decides from attributes. New projects with a department attribute need no policy change." },
      { text: "Role-based access control (RBAC) with a new role for each project.", correct: false,
        why: "Each new project needs a new role and policy. This fails the requirement to avoid policy changes." },
      { text: "An access control list (ACL) on each project that names each allowed user.", correct: false,
        why: "Each new project and each staff change needs ACL updates. This does not scale to thousands of projects." },
      { text: "One role for all users that allows access to all projects.", correct: false,
        why: "This removes the department check, so users can open projects from other departments." }
    ],
    explanation: "ABAC compares attributes of the principal and the resource. It scales to many resources with no policy change for each new resource." },

  { id: "appsec-020", topic: "appsec-service-to-service", domain: 2,
    stem: "A billing service runs a scheduled job with no user involved. The job calls a REST API that uses an Amazon Cognito user pool authorizer with the authorization scope billing-api/invoices.read on the method. Which solution will meet these requirements?",
    options: [
      { text: "Create a resource server with the custom scope, create an app client with a client secret that allows the scope, and get an access token with the client credentials grant.", correct: true,
        why: "The client credentials grant is for machine-to-machine calls. It returns an access token with custom scopes, and no user is needed." },
      { text: "Use the authorization code grant with PKCE.", correct: false,
        why: "The authorization code grant needs a user to sign in through a browser. The job has no user." },
      { text: "Create a Cognito user for the job and sign in with a user name and password.", correct: false,
        why: "User pool API sign-in gives an access token with only the aws.cognito.signin.user.admin scope, not the custom scope. It also uses a person-style account for a machine." },
      { text: "Create an API key for the job and add it to a usage plan.", correct: false,
        why: "An API key does not carry OAuth scopes. The Cognito authorizer still requires an access token with the scope." }
    ],
    explanation: "For machine-to-machine access, use an app client with a client secret, a resource server with custom scopes, and the client credentials grant." },

  { id: "appsec-021", topic: "appsec-service-to-service", domain: 2,
    stem: "A Lambda function in account A must call a REST API in account B. The company does not allow long-term secrets such as passwords, API keys, or client secrets. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "In account B, set the method authorization type to AWS_IAM, and add an API resource policy that allows execute-api:Invoke for the function role in account A.", correct: true,
        why: "IAM authorization uses AWS credentials. For a cross-account caller, the resource policy in account B must allow the role." },
      { text: "In account A, allow execute-api:Invoke on the API in the function execution role, and sign the request with SigV4.", correct: true,
        why: "A cross-account call needs an allow in the caller identity policy too. SigV4 signing uses the temporary credentials of the role." },
      { text: "Store an API key for the API in AWS Secrets Manager in account A.", correct: false,
        why: "An API key is a long-term secret. API keys also identify clients for usage plans and are not an authorization method." },
      { text: "Use the Cognito client credentials grant with a client secret stored in account A.", correct: false,
        why: "The client secret is a long-term secret, which the company does not allow." },
      { text: "Create a VPC peering connection between the two accounts.", correct: false,
        why: "Peering connects networks. It does not authenticate or authorize the API call." }
    ],
    explanation: "For service-to-service calls inside AWS, use IAM authorization with SigV4. Across accounts, both the caller identity policy and the API resource policy must allow the call." },

  { id: "appsec-022", topic: "appsec-service-to-service", domain: 2,
    stem: "Business partners call a public REST API. Each partner must present a client certificate issued by the company certificate authority. Partners must not be able to call the API without a certificate. Which solution will meet these requirements?",
    options: [
      { text: "Configure mutual TLS on a Regional custom domain name with a truststore in Amazon S3, and disable the default execute-api endpoint.", correct: true,
        why: "Mutual TLS needs a Regional custom domain and a truststore. Disabling the default endpoint stops callers from skipping mutual TLS." },
      { text: "Configure mutual TLS on an edge-optimized custom domain name.", correct: false,
        why: "API Gateway supports mutual TLS on Regional custom domain names, not on edge-optimized ones." },
      { text: "Make the API a private API and configure mutual TLS.", correct: false,
        why: "Mutual TLS is not supported for private APIs. Partners outside the VPC also cannot reach a private API." },
      { text: "Configure mutual TLS on the custom domain but keep the default execute-api endpoint active.", correct: false,
        why: "Clients can still call the default endpoint without a certificate. This fails the requirement that partners cannot skip the certificate." }
    ],
    explanation: "REST API mutual TLS needs a Regional custom domain name, the TLS_1_2 security policy, and a truststore in S3. Disable the default endpoint so that clients cannot skip it." },

  { id: "appsec-023", topic: "appsec-service-to-service", domain: 2,
    stem: "A REST API uses mutual TLS on a custom domain name. The truststore holds the company intermediate and root CA certificates. The company must now reject client certificates that the CA has revoked, while certificates from the same CA that are not revoked keep working. Which solution will meet these requirements?",
    options: [
      { text: "Add a Lambda authorizer that checks each client certificate against the CA revocation information.", correct: true,
        why: "API Gateway does not check revocation. It forwards the client certificate to Lambda authorizers, which can check revocation." },
      { text: "Remove the CA certificates from the truststore.", correct: false,
        why: "The truststore holds CA certificates. Removing them rejects every certificate from that CA, including valid ones." },
      { text: "Do nothing. API Gateway checks certificate revocation automatically.", correct: false,
        why: "API Gateway validates syntax, integrity, validity period, and chain. It does not check revocation." },
      { text: "Add an AWS WAF IP set rule that blocks the partner IP addresses.", correct: false,
        why: "IP rules block networks, not certificates. A revoked certificate used from another IP address still works." }
    ],
    explanation: "API Gateway mutual TLS does not check revocation. Use a Lambda authorizer for revocation checks and other certificate rules." },

  { id: "appsec-024", topic: "appsec-service-to-service", domain: 2,
    stem: "An internal API must be reachable only from applications in two VPCs. Calls from the internet must fail. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Create the API as a private REST API, and create an interface VPC endpoint for execute-api in each VPC.", correct: true,
        why: "A private API is callable only through interface VPC endpoints. Traffic does not leave the Amazon network." },
      { text: "Add an API resource policy that allows requests only when aws:SourceVpce matches the two VPC endpoints.", correct: true,
        why: "The resource policy limits the private API to the named endpoints, so other VPCs cannot call it." },
      { text: "Create the API as a private HTTP API.", correct: false,
        why: "Only REST APIs can be private. HTTP APIs do not support the private endpoint type." },
      { text: "Create a gateway VPC endpoint for API Gateway.", correct: false,
        why: "Gateway endpoints exist only for Amazon S3 and DynamoDB. API Gateway uses interface endpoints." },
      { text: "Attach a security group to the API that allows the VPC CIDR ranges.", correct: false,
        why: "API Gateway APIs do not have security groups. Use a resource policy and VPC endpoints instead." }
    ],
    explanation: "A private REST API is reached through interface VPC endpoints for execute-api. Use aws:SourceVpc or aws:SourceVpce in the resource policy to limit access." },

  { id: "appsec-025", topic: "appsec-service-to-service", domain: 2,
    stem: "An order service on Amazon ECS calls a Lambda function URL in the same account. The function URL must reject calls that are not authenticated with AWS credentials. The developer wants no secrets in the order service. Which solution will meet these requirements?",
    options: [
      { text: "Set the function URL AuthType to AWS_IAM, allow the ECS task role to invoke the function URL, and sign requests with SigV4.", correct: true,
        why: "With AWS_IAM, Lambda authenticates the SigV4 signature and checks IAM permissions. The task role gives temporary credentials, so no secret is stored." },
      { text: "Set the function URL AuthType to NONE, and check a shared password header in the function code.", correct: false,
        why: "A shared password is a secret that the service must store. NONE also does no authentication with AWS credentials." },
      { text: "Set the function URL AuthType to NONE, and add a resource-based policy that allows all principals.", correct: false,
        why: "This makes the URL public. Anyone with the URL can invoke the function without authentication." },
      { text: "Put an API key in the function environment variables and require it in the request.", correct: false,
        why: "Function URLs do not support API keys, and the key is a secret stored in the service. It fails the no-secrets requirement." }
    ],
    explanation: "A function URL with AuthType AWS_IAM requires SigV4-signed requests and IAM permission to invoke. Roles give temporary credentials with no stored secret." },

  { id: "appsec-026", topic: "appsec-multi-tenant", domain: 2,
    stem: "A mobile app uses an Amazon Cognito identity pool to get AWS credentials. A DynamoDB table uses the identity ID as the partition key. Each user must read and write only their own items, directly from the app. Which IAM policy condition on the authenticated role will meet these requirements?",
    options: [
      { text: "ForAllValues:StringEquals with dynamodb:LeadingKeys set to ${cognito-identity.amazonaws.com:sub}.", correct: true,
        why: "LeadingKeys checks the partition key of each request. The variable is the identity pool identity ID, so users reach only their own items." },
      { text: "StringEquals with dynamodb:LeadingKeys set to ${aws:username}.", correct: false,
        why: "aws:username exists for IAM users, not for identity pool sessions. LeadingKeys also requires the ForAllValues modifier." },
      { text: "Allow dynamodb:Scan with a filter expression on the identity ID in the app.", correct: false,
        why: "A scan reads all items, and the filter runs after the read. The app controls the filter, so it does not enforce isolation." },
      { text: "ForAllValues:StringEquals with dynamodb:Attributes set to ${cognito-identity.amazonaws.com:sub}.", correct: false,
        why: "dynamodb:Attributes limits attribute names, not partition key values. It does not limit which items a user reads." }
    ],
    explanation: "Use dynamodb:LeadingKeys with ForAllValues and an identity variable for per-user item access. ${cognito-identity.amazonaws.com:sub} is the identity pool identity ID." },

  { id: "appsec-027", topic: "appsec-multi-tenant", domain: 2,
    stem: "A photo app uses an Amazon Cognito identity pool. The app calls Amazon S3 directly with the identity pool credentials. Each user must read and write only objects under a prefix named with their identity ID in one shared bucket. The company wants the least operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "In the authenticated role policy, allow s3:GetObject and s3:PutObject on arn:aws:s3:::bucket/${cognito-identity.amazonaws.com:sub}/*, and allow s3:ListBucket with an s3:prefix condition for the same prefix.", correct: true,
        why: "The policy variable becomes each user identity ID at request time. One policy gives every user a private prefix." },
      { text: "Create a separate S3 bucket for each user.", correct: false,
        why: "A bucket for each user adds many resources to create and manage. It fails the least-overhead requirement and the one-bucket design." },
      { text: "Have a backend generate presigned URLs for each object.", correct: false,
        why: "Presigned URLs need a backend service. The app must call Amazon S3 directly with identity pool credentials." },
      { text: "Set an object ACL on each object that grants access to its owner.", correct: false,
        why: "ACLs are disabled by default on new buckets, and AWS recommends policies instead. Per-object ACLs also add work for every upload." }
    ],
    explanation: "Policy variables such as ${cognito-identity.amazonaws.com:sub} in an S3 resource ARN give each identity its own prefix with one policy." },

  { id: "appsec-028", topic: "appsec-multi-tenant", domain: 2,
    stem: "A multi-tenant API stores all tenants in one DynamoDB table with the tenant ID as the partition key. The backend Lambda function reads the tenant ID from an X-Tenant-Id request header. A penetration test shows that a user can read another tenant's data by changing the header. The API uses an Amazon Cognito user pool authorizer, and each token has a custom:tenant_id claim. Which solution will fix the issue?",
    options: [
      { text: "Read the tenant ID from the verified custom:tenant_id claim that the authorizer passes to the backend, and ignore the header.", correct: true,
        why: "The client controls the header, but not the claims in a token that the authorizer verified. The tenant ID then comes from a trusted source." },
      { text: "Add a request validator that checks the format of the X-Tenant-Id header.", correct: false,
        why: "A valid format does not prove tenant membership. The user can still send another tenant's ID in the correct format." },
      { text: "Require the client to encrypt the X-Tenant-Id header.", correct: false,
        why: "The client still chooses the value before it encrypts it. Encryption does not prove which tenant the user belongs to." },
      { text: "Add an AWS WAF rate-based rule to the API.", correct: false,
        why: "Rate limits slow down requests. They do not stop one request from reading another tenant's data." }
    ],
    explanation: "Take the tenant ID from the verified token or the authorizer context. Never trust a tenant ID from a header, query string, or body that the client controls." },

  { id: "appsec-029", topic: "appsec-multi-tenant", domain: 2,
    stem: "A SaaS company adds a regulated customer. The customer requires that its data is stored in resources that no other tenant uses, that the data is encrypted with a KMS key used only for this customer, and that the company can report this customer's storage cost on its own. Which solution will meet these requirements?",
    options: [
      { text: "Use a silo model: a separate DynamoDB table for this customer, encrypted with a customer managed KMS key used only for this customer.", correct: true,
        why: "A dedicated table and key give resource isolation and a separate cost line. This meets all three requirements." },
      { text: "Keep the customer in the shared table and restrict access with dynamodb:LeadingKeys.", correct: false,
        why: "The pool model shares the table with other tenants. It fails the requirement for resources that no other tenant uses." },
      { text: "Keep the customer in the shared table and add a tenant attribute to each item.", correct: false,
        why: "A tenant attribute helps the code filter data, but the table and its key are still shared with other tenants." },
      { text: "Store the customer data under its own prefix in a shared S3 bucket.", correct: false,
        why: "A prefix is still inside a shared resource. It fails the requirement for resources that no other tenant uses." }
    ],
    explanation: "The silo model gives each tenant its own resources. Use it for strict isolation, dedicated keys, and simple per-tenant cost. The pool model shares resources and costs less." },

  { id: "appsec-030", topic: "appsec-multi-tenant", domain: 2,
    stem: "Users get AWS credentials from an Amazon Cognito identity pool and call DynamoDB directly. Users may read only items whose partition key is their identity ID, and only the attributes UserId, Name, and Email. A read must never return other attributes such as SSN. Which policy elements should the developer use? (Choose two.)",
    options: [
      { text: "A ForAllValues:StringEquals condition on dynamodb:LeadingKeys with ${cognito-identity.amazonaws.com:sub}.", correct: true,
        why: "This limits each request to items whose partition key is the identity ID of the user." },
      { text: "A ForAllValues:StringEquals condition on dynamodb:Attributes with UserId, Name, and Email, and a condition that requires dynamodb:Select to be SPECIFIC_ATTRIBUTES.", correct: true,
        why: "The attribute list limits the names in the request. Requiring SPECIFIC_ATTRIBUTES stops reads with no projection from returning all attributes." },
      { text: "Allow dynamodb:Scan on the table.", correct: false,
        why: "A scan returns items whatever the leading keys are. It breaks the own-items requirement." },
      { text: "Trust the app to always send a ProjectionExpression with the three attributes.", correct: false,
        why: "The app runs on the user device and can change. A policy must enforce the limit, not client code." },
      { text: "A condition on dynamodb:ReturnConsumedCapacity.", correct: false,
        why: "ReturnConsumedCapacity controls capacity data in the response. It does not limit items or attributes." }
    ],
    explanation: "Combine dynamodb:LeadingKeys for item-level access with dynamodb:Attributes and dynamodb:Select for attribute-level access." },

  { id: "appsec-031", topic: "appsec-encryption-in-transit", domain: 2,
    stem: "An S3 bucket stores reports that contain PII. A compliance rule says that the bucket must reject any request that does not use TLS. Which solution will meet these requirements?",
    options: [
      { text: "Add a bucket policy statement that denies all S3 actions when aws:SecureTransport is false.", correct: true,
        why: "aws:SecureTransport is false for plain HTTP requests. An explicit deny rejects them for every principal." },
      { text: "Set the bucket default encryption to SSE-KMS.", correct: false,
        why: "Default encryption protects data at rest. It does not reject requests that do not use TLS." },
      { text: "Turn on S3 Block Public Access for the bucket.", correct: false,
        why: "Block Public Access stops public access. Authenticated callers can still send plain HTTP requests." },
      { text: "Turn on S3 Object Lock in compliance mode.", correct: false,
        why: "Object Lock prevents deletion and overwrite. It does not control the request protocol." }
    ],
    explanation: "Enforce encryption in transit with a bucket policy that denies requests when aws:SecureTransport is false. Encryption at rest is a separate control." },

  { id: "appsec-032", topic: "appsec-encryption-in-transit", domain: 2,
    stem: "A website runs behind an Application Load Balancer in eu-west-1, with an Amazon CloudFront distribution in front of it. Users who type http:// must reach the site over HTTPS without an error. Traffic from CloudFront to the load balancer must also use TLS. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Set the CloudFront viewer protocol policy to Redirect HTTP to HTTPS.", correct: true,
        why: "CloudFront returns a 301 redirect to the HTTPS URL for GET and HEAD, so users reach the site over HTTPS without an error." },
      { text: "Set the CloudFront origin protocol policy to HTTPS only, and add an HTTPS listener with an ACM certificate in eu-west-1 to the load balancer.", correct: true,
        why: "This encrypts traffic from CloudFront to the origin. The load balancer certificate must be in the Region of the load balancer." },
      { text: "Set the CloudFront viewer protocol policy to HTTPS only.", correct: false,
        why: "HTTPS only returns 403 to HTTP requests. Users who type http:// get an error, which fails the requirement." },
      { text: "Request the CloudFront distribution certificate in eu-west-1.", correct: false,
        why: "CloudFront uses ACM certificates only from us-east-1. A certificate in eu-west-1 cannot be attached to the distribution." },
      { text: "Add a bucket policy that denies requests when aws:SecureTransport is false.", correct: false,
        why: "The origin is a load balancer, not an S3 bucket. A bucket policy does not affect this traffic." }
    ],
    explanation: "Use the viewer protocol policy for client to CloudFront, and the origin protocol policy for CloudFront to origin. CloudFront certificates come from us-east-1." },

  { id: "appsec-033", topic: "appsec-encryption-in-transit", domain: 2,
    stem: "A developer deploys an edge-optimized REST API in eu-west-1 and wants the custom domain name api.example.com with HTTPS. The developer requested an ACM public certificate in eu-west-1, but the certificate does not appear in the list for the edge-optimized custom domain. Which solution will meet these requirements?",
    options: [
      { text: "Request or import the ACM certificate in us-east-1, and use it for the edge-optimized custom domain name.", correct: true,
        why: "Edge-optimized custom domains use CloudFront, so the ACM certificate must be in us-east-1." },
      { text: "Create a Regional custom domain name with a certificate in us-east-1.", correct: false,
        why: "A Regional custom domain needs the certificate in the same Region as the API, which is eu-west-1." },
      { text: "Issue a certificate from AWS Private CA for api.example.com.", correct: false,
        why: "Private certificates are trusted only where the company installs its CA. Public internet users would get certificate errors." },
      { text: "Change the API to a private API.", correct: false,
        why: "A private API is reachable only from VPCs, and private APIs cannot become edge-optimized. This does not give a public HTTPS domain." }
    ],
    explanation: "Certificates for CloudFront and for edge-optimized API Gateway custom domains must be in us-east-1. Regional custom domains need the certificate in the API Region." },

  { id: "appsec-034", topic: "appsec-encryption-in-transit", domain: 2,
    stem: "A developer creates a new Amazon SNS topic and a new Amazon SQS queue with the AWS SDK over HTTPS. The developer does not set any encryption attributes. A compliance rule says that message data in both resources must be encrypted at rest. Which solution will meet these requirements with the least effort?",
    options: [
      { text: "Set a KMS key (KmsMasterKeyId) on the SNS topic. The queue already uses SSE-SQS by default.", correct: true,
        why: "SNS does not encrypt topics at rest by default. New SQS queues created without encryption attributes use SSE-SQS by default." },
      { text: "Do nothing, because both services encrypt message data at rest by default.", correct: false,
        why: "SNS server-side encryption is not on by default. The topic fails the compliance rule." },
      { text: "Set a KMS key on the SQS queue only.", correct: false,
        why: "The queue is already encrypted with SSE-SQS, and the SNS topic stays unencrypted. This fails the rule for the topic." },
      { text: "Turn on default encryption on an S3 bucket.", correct: false,
        why: "S3 default encryption applies to S3 objects only. It does not encrypt SNS or SQS messages." }
    ],
    explanation: "Know the at-rest defaults: S3 (SSE-S3) and DynamoDB always encrypt, new SQS queues use SSE-SQS, and SNS topics need a KMS key set." },

  { id: "appsec-035", topic: "appsec-dev-certs-keys", domain: 2,
    stem: "A developer has an RSA SSH key pair on a laptop, created with ssh-keygen. The developer wants to use this key to connect to new Amazon EC2 Linux instances. The private key must never leave the laptop. Which solution will meet these requirements?",
    options: [
      { text: "Import the public key into Amazon EC2 with import-key-pair, and choose that key pair when launching the instances.", correct: true,
        why: "Importing sends only the public key. EC2 puts it on the instance, and the private key stays on the laptop." },
      { text: "Create a new key pair in the EC2 console and download the .pem file.", correct: false,
        why: "This creates a different key pair. It does not use the existing key that the developer wants." },
      { text: "Upload the private key to AWS Secrets Manager and reference it at launch.", correct: false,
        why: "The private key leaves the laptop, which fails the requirement. EC2 launches also need a public key, not a private key." },
      { text: "Create a new key pair with an AWS::EC2::KeyPair resource that has no PublicKeyMaterial, and get the private key from Parameter Store.", correct: false,
        why: "This creates a different key pair, and its private key is stored in Parameter Store. It fails both requirements: use the existing laptop key, and the private key must never leave the laptop." }
    ],
    explanation: "To use your own SSH key, create it with a tool such as ssh-keygen and import only the public key into EC2. EC2 never needs your private key." },

  { id: "appsec-036", topic: "appsec-dev-certs-keys", domain: 2,
    stem: "Microservices in a VPC talk to each other over TLS with private host names such as payments.internal. The company wants certificates that only its own systems trust, issued from a CA that AWS manages, with no on-premises CA servers. Which solution will meet these requirements?",
    options: [
      { text: "Create a private CA in AWS Private CA and issue private certificates for the internal host names.", correct: true,
        why: "AWS Private CA runs private root and subordinate CAs for you. Its certificates are trusted where the company installs the CA." },
      { text: "Request ACM public certificates for the .internal host names.", correct: false,
        why: "ACM public certificates need domain validation for a public domain name. Private host names such as payments.internal cannot be validated." },
      { text: "Create self-signed certificates with OpenSSL for each service.", correct: false,
        why: "Each self-signed certificate must be trusted one by one, and there is no managed CA. This fails the AWS-managed CA requirement." },
      { text: "Create an Amazon EC2 key pair for each service.", correct: false,
        why: "EC2 key pairs are SSH keys for instance access. They are not X.509 certificates for TLS." }
    ],
    explanation: "Use AWS Private CA for internal TLS and private host names. Use ACM public certificates for public endpoints, and self-signed certificates only for local tests." },

  { id: "appsec-037", topic: "appsec-dev-certs-keys", domain: 2,
    stem: "A development team has two requirements. First, developers must test HTTPS on localhost at no cost. Second, developers must get a shell on development EC2 instances with no SSH key pairs and no inbound port 22 open. Which actions should the team take? (Choose two.)",
    options: [
      { text: "Create a self-signed certificate with OpenSSL for localhost.", correct: true,
        why: "A self-signed certificate is free and is enough for local tests. Only the developer machine needs to trust it." },
      { text: "Connect to the instances with AWS Systems Manager Session Manager.", correct: true,
        why: "Session Manager gives a shell with no SSH keys and no open inbound ports." },
      { text: "Request an ACM public certificate for localhost.", correct: false,
        why: "ACM cannot validate localhost because it is not a public domain that you own. It does not meet the local test need." },
      { text: "Connect with EC2 Instance Connect.", correct: false,
        why: "EC2 Instance Connect uses SSH, so it needs inbound port 22 on the instance. This fails the second requirement." },
      { text: "Create a private CA in AWS Private CA for localhost certificates.", correct: false,
        why: "AWS Private CA has a monthly charge for each CA. This fails the no-cost requirement." }
    ],
    explanation: "Use self-signed certificates for local development only. Use Session Manager for shell access without keys or open ports." }

] });
