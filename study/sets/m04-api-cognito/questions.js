window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "m04-api-cognito", questions: [

  { id: "m04-001", topic: "apigw-api-types", domain: 1,
    stem: "A startup builds a new serverless API. Every route uses a Lambda proxy integration. Users sign in with an Amazon Cognito user pool, and the API must reject requests that do not have a valid JWT. The API does not need API keys, caching, or request validation. The startup wants the LOWEST cost. Which solution will meet these requirements?",
    options: [
      { text: "Create an Amazon API Gateway HTTP API with a JWT authorizer that uses the user pool as the issuer.", correct: true,
        why: "HTTP APIs cost less than REST APIs and have a built-in JWT authorizer that validates Cognito tokens. The API needs no REST-only features." },
      { text: "Create an Amazon API Gateway REST API with a Cognito user pool authorizer.", correct: false,
        why: "This validates the tokens, but REST APIs cost more than HTTP APIs. It fails the lowest-cost requirement." },
      { text: "Create an Amazon API Gateway REST API with a private endpoint and a resource policy.", correct: false,
        why: "A private endpoint is reachable only from a VPC, and it does not validate JWTs. It fails the authorization requirement and costs more." },
      { text: "Create an Amazon API Gateway WebSocket API with a Lambda authorizer on the $connect route.", correct: false,
        why: "A WebSocket API is for two-way connections, not request-response routes. It also needs custom authorizer code." }
    ],
    explanation: "Choose an HTTP API for a low-cost Lambda or HTTP proxy with JWT authorization. Choose a REST API only when the scenario needs REST-only features." },

  { id: "m04-002", topic: "apigw-api-types", domain: 1,
    stem: "A company builds a chat feature for its web app. The backend must push new messages to connected browsers as soon as other users send them. The company wants a serverless solution with the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Create an Amazon API Gateway WebSocket API. Store connection IDs in Amazon DynamoDB, and send messages with POST requests to the @connections endpoint for each connection ID.", correct: true,
        why: "A WebSocket API keeps a two-way connection open. The backend pushes messages to clients through the @connections API without servers to manage." },
      { text: "Create an Amazon API Gateway HTTP API. Make each browser poll a GET route every second.", correct: false,
        why: "Polling does not push messages as soon as they arrive, and it adds many requests. It fails the push requirement." },
      { text: "Create an Amazon API Gateway REST API with caching turned on for the GET /messages method.", correct: false,
        why: "Caching serves stored responses to clients that ask. It cannot push messages to browsers, and cached data can be out of date." },
      { text: "Create an Amazon API Gateway REST API with a mock integration that returns new messages.", correct: false,
        why: "A mock integration returns a fixed response without a backend. It cannot deliver real messages or push to clients." }
    ],
    explanation: "WebSocket APIs support server push. The backend sends a message to a client with a signed POST to @connections/{connection_id}." },

  { id: "m04-003", topic: "apigw-api-types", domain: 2,
    stem: "A company has an internal inventory API. Only applications that run in the company VPC may call the API. The API must not be reachable from the public internet. Which solution will meet these requirements?",
    options: [
      { text: "Create a private Amazon API Gateway REST API. Create an interface VPC endpoint for execute-api, and add a resource policy that allows requests only from that VPC endpoint.", correct: true,
        why: "A private REST API is reachable only through an interface VPC endpoint. The resource policy limits access to the company VPC endpoint." },
      { text: "Create a Regional REST API and attach an AWS WAF web ACL that allows only the VPC NAT gateway IP address.", correct: false,
        why: "WAF can block other callers, but a Regional endpoint is still a public internet endpoint. It fails the requirement that the API is not reachable from the internet." },
      { text: "Create an edge-optimized REST API with a resource policy that allows only the company IP range.", correct: false,
        why: "An edge-optimized endpoint is public and goes through CloudFront. The endpoint stays reachable from the internet." },
      { text: "Create an HTTP API with a private endpoint and a JWT authorizer.", correct: false,
        why: "HTTP APIs support only Regional endpoints. They do not have a private endpoint type." }
    ],
    explanation: "Private REST APIs are reachable only from a VPC through an interface VPC endpoint. A resource policy controls which VPCs or endpoints can call them." },

  { id: "m04-004", topic: "apigw-integrations", domain: 4,
    stem: "A REST API uses a Lambda proxy integration. Clients receive HTTP 502 Bad Gateway for every request. The Lambda logs show that the function runs without errors and returns the object {\"orders\": [...]} . Which change will fix the problem?",
    options: [
      { text: "Change the function to return an object with a statusCode field and a body field that contains the JSON as a string.", correct: true,
        why: "A Lambda proxy integration requires statusCode, optional headers, and a string body. Any other format causes API Gateway to return 502." },
      { text: "Increase the integration timeout to 29 seconds.", correct: false,
        why: "A timeout returns 504, not 502. The function already finishes without errors, so the timeout is not the cause." },
      { text: "Add a mapping template to the integration response that wraps the output.", correct: false,
        why: "Proxy integrations do not use integration response mapping templates. API Gateway still receives the wrong format." },
      { text: "Increase the reserved concurrency of the function.", correct: false,
        why: "Reserved concurrency controls scaling. Throttling returns 429 errors, so this does not fix the response format." }
    ],
    explanation: "With Lambda proxy integration, the function must return statusCode, headers (optional), and body as a string. Otherwise API Gateway returns 502 Bad Gateway." },

  { id: "m04-005", topic: "apigw-integrations", domain: 1,
    stem: "A REST API method starts a report job in a Lambda function through a Lambda custom (non-proxy) integration. The job takes up to 8 minutes. Clients receive HTTP 504 errors. The client must get a response immediately, and the job must still finish. Which solution will meet these requirements with the LEAST development effort?",
    options: [
      { text: "In the integration request, add the header X-Amz-Invocation-Type with the static value 'Event' so that API Gateway invokes the function asynchronously.", correct: true,
        why: "With the Event invocation type, Lambda queues the request and API Gateway returns at once. The function runs in the background for up to its own timeout." },
      { text: "Request a Service Quotas increase for the integration timeout of the API.", correct: false,
        why: "A longer timeout makes the client wait for the full job. It fails the requirement to respond immediately." },
      { text: "Increase the Lambda function timeout to 15 minutes.", correct: false,
        why: "The function timeout does not change the API Gateway integration timeout. Clients still get 504 after the integration timeout." },
      { text: "Change the method to a Lambda proxy integration.", correct: false,
        why: "A proxy integration also invokes the function synchronously and has the same integration timeout. Clients still get 504." }
    ],
    explanation: "REST API integrations time out at 29 seconds by default and return 504. For long work, invoke Lambda asynchronously (X-Amz-Invocation-Type: 'Event') and return at once." },

  { id: "m04-006", topic: "apigw-integrations", domain: 4,
    stem: "A team moves a Lambda function from a REST API with Lambda proxy integration to a new HTTP API. After the move, the function fails because event.httpMethod and event.queryStringParameters are not where the code expects them. The team wants to fix the problem with the FEWEST code changes. Which solution will meet these requirements?",
    options: [
      { text: "Set the payload format version of the HTTP API Lambda integration to 1.0.", correct: true,
        why: "Format 1.0 sends the same event shape as a REST API proxy integration. The function then works without code changes." },
      { text: "Add a mapping template to the HTTP API integration that rebuilds the old event.", correct: false,
        why: "HTTP APIs do not support request body mapping templates. This option is not available." },
      { text: "Add stage variables to the HTTP API stage for the method and query string.", correct: false,
        why: "Stage variables are fixed values for a stage. They cannot carry the method or query string of each request." },
      { text: "Turn on automatic deployments for the HTTP API.", correct: false,
        why: "Automatic deployments only publish changes to the stage. They do not change the event format." }
    ],
    explanation: "HTTP API Lambda integrations support payload format 1.0 and 2.0. Format 2.0 uses requestContext.http.method and rawQueryString. Format 1.0 matches the REST API proxy event." },

  { id: "m04-007", topic: "apigw-stages", domain: 3,
    stem: "A REST API has a dev stage and a prod stage. One Lambda function has a dev alias and a prod alias. Each stage must invoke the matching alias. The team wants one API definition for both stages. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Set the Lambda integration URI to the function ARN with the suffix :${stageVariables.lambdaAlias}, and set the lambdaAlias stage variable on each stage.", correct: true,
        why: "A stage variable in the integration ARN lets each stage call a different alias from one API definition." },
      { text: "Add a Lambda resource-based policy statement that allows apigateway.amazonaws.com to invoke each alias.", correct: true,
        why: "When a stage variable picks the alias, API Gateway needs an invoke permission on each alias. Without it, calls fail." },
      { text: "Create a second REST API for prod and point it to the prod alias.", correct: false,
        why: "This works, but it creates two API definitions. It fails the one-API requirement." },
      { text: "Add an environment variable to the function that tells it which stage called it.", correct: false,
        why: "An environment variable cannot route requests. All stages still invoke the same function version." },
      { text: "Create a canary release on the prod stage that sends 100% of traffic to the prod alias.", correct: false,
        why: "A canary splits traffic between API deployments. It does not select a Lambda alias for each stage." }
    ],
    explanation: "Use ${stageVariables.name} in the integration ARN to pick a Lambda alias for each stage. Add a Lambda permission for API Gateway on every alias that a stage variable can select." },

  { id: "m04-008", topic: "apigw-stages", domain: 3,
    stem: "A developer changes the mapping templates of a production REST API. The developer wants to send 10% of prod stage traffic to the new API configuration, compare its logs and metrics with the current version, and then move all traffic to it. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Deploy the change as a canary release on the prod stage with 10% of traffic. Review the canary logs, and then promote the canary.", correct: true,
        why: "A canary release splits stage traffic between two deployments and writes separate canary logs. Promotion moves all traffic to the new deployment." },
      { text: "Create a weighted Lambda alias that sends 10% of invocations to a new function version.", correct: false,
        why: "The change is in the API mapping templates, not in Lambda code. A weighted alias does not test the API configuration." },
      { text: "Deploy the change to a new prod-v2 stage and ask 10% of clients to use the new URL.", correct: false,
        why: "Clients must change URLs, and the split is not automatic. This adds overhead and is not a random 10% split." },
      { text: "Create two custom domain names and a Route 53 weighted routing policy with a 90/10 split.", correct: false,
        why: "This can split traffic, but it needs extra domains, certificates, and records. It fails the least-overhead requirement." }
    ],
    explanation: "REST API canary releases send a percentage of stage traffic to a new deployment, log canary requests separately, and let you promote the canary." },

  { id: "m04-009", topic: "apigw-transform", domain: 1,
    stem: "A REST API has a POST /orders method with a Lambda integration. API Gateway must reject requests that do not include customerId (a string) and quantity (an integer) in the JSON body. The function must not run for invalid requests. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Create a model with a JSON schema that marks customerId and quantity as required, and set it as the request model for application/json.", correct: true,
        why: "The model defines the required fields and types that API Gateway checks." },
      { text: "Set a request validator on the method that validates the request body.", correct: true,
        why: "The validator tells API Gateway to check the body against the model. Invalid requests get 400 before the integration runs." },
      { text: "Add validation code to the Lambda function that returns 400 for invalid input.", correct: false,
        why: "The function still runs for invalid requests. It fails the requirement that the function must not run." },
      { text: "Attach an AWS WAF web ACL with a size constraint rule on the request body.", correct: false,
        why: "A size rule checks the body length, not required fields or data types." },
      { text: "Add an API key requirement to the method.", correct: false,
        why: "An API key identifies the caller. It does not check the content of the request body." }
    ],
    explanation: "REST API request validation needs a model (JSON Schema draft 4) and a request validator on the method. API Gateway returns 400 and does not call the backend." },

  { id: "m04-010", topic: "apigw-transform", domain: 1,
    stem: "A REST API must send requests to a legacy HTTP backend. Clients send {\"customerId\": \"C1\", \"qty\": 5}, but the backend expects {\"customer_id\": \"C1\", \"quantity\": 5}. The company cannot change the backend and does not want to add new compute resources. Which solution will meet these requirements?",
    options: [
      { text: "Use an HTTP (non-proxy) integration with a request mapping template that builds the new body from $input.path values.", correct: true,
        why: "A mapping template in the integration request changes the body shape. It needs no backend change and no new compute." },
      { text: "Use an HTTP proxy integration to the backend.", correct: false,
        why: "A proxy integration passes the request without changes. The backend still gets the wrong field names." },
      { text: "Add a Lambda proxy integration with a function that renames the fields and calls the backend.", correct: false,
        why: "This works, but it adds a new Lambda function. It fails the requirement to add no compute resources." },
      { text: "Move the API to an HTTP API and use parameter mapping.", correct: false,
        why: "HTTP API parameter mapping can change headers, query strings, and paths, but not the request body." }
    ],
    explanation: "Mapping templates (VTL) in non-proxy integrations transform request and response bodies. Proxy integrations do not use mapping templates." },

  { id: "m04-011", topic: "apigw-transform", domain: 1,
    stem: "A REST API uses a Lambda custom (non-proxy) integration. When an order is too large, the function throws an error with the message ORDER_TOO_LARGE: limit 1000. Clients currently receive HTTP 200 with the error in the body. Clients must receive HTTP 422 for this error. Which solution will meet these requirements?",
    options: [
      { text: "Add a 422 method response, and add an integration response with the selection pattern .*ORDER_TOO_LARGE.* that maps to status 422.", correct: true,
        why: "For Lambda integrations, the selection pattern is a regular expression that matches the errorMessage. The status must also exist as a method response." },
      { text: "Change the function to return {\"statusCode\": 422} in its result.", correct: false,
        why: "In a non-proxy integration, API Gateway does not read statusCode from the result. The client still gets 200 with that object as the body." },
      { text: "Customize the BAD_REQUEST_BODY gateway response to return 422.", correct: false,
        why: "Gateway responses apply to errors that API Gateway creates, such as validation failures. They do not handle errors from the backend." },
      { text: "Add an integration response with the selection pattern 422.", correct: false,
        why: "The pattern matches the Lambda errorMessage, not a status code. The message does not contain 422, so the response stays 200." }
    ],
    explanation: "In a Lambda non-proxy integration, integration responses use a selection pattern regex against errorMessage to choose the status code. Declare the status code as a method response." },

  { id: "m04-012", topic: "apigw-throttling", domain: 1,
    stem: "A company sells access to a REST API. Basic customers may send 10 requests each second and 100,000 requests each month. Premium customers may send 100 requests each second and 5,000,000 requests each month. API Gateway must enforce the limits for each customer. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Create a Basic usage plan and a Premium usage plan with throttle and quota settings, and associate both plans with the API stage.", correct: true,
        why: "Usage plans set rate, burst, and quota limits for the API keys in the plan." },
      { text: "Create an API key for each customer, add the key to the usage plan for the customer tier, and require an API key on the methods.", correct: true,
        why: "The API key identifies each customer, so API Gateway applies the limits of that customer plan." },
      { text: "Set stage-level throttling to 100 requests each second.", correct: false,
        why: "Stage throttling applies to all clients together. It cannot give different limits or monthly quotas to each customer." },
      { text: "Create an AWS WAF rate-based rule that limits each IP address.", correct: false,
        why: "WAF counts requests by IP address in a short window. It does not know customer tiers and has no monthly quota." },
      { text: "Set reserved concurrency on the backend Lambda function for each tier.", correct: false,
        why: "Reserved concurrency limits the function, not each customer. It cannot count monthly requests for a customer." }
    ],
    explanation: "REST API usage plans with API keys give per-client throttling and quotas (DAY, WEEK, or MONTH). Methods must require an API key." },

  { id: "m04-013", topic: "apigw-throttling", domain: 2,
    stem: "A REST API uses API keys and a usage plan for partner billing. A security review finds that anyone with a leaked key can call the API. Each partner has its own OAuth 2.0 identity provider that issues signed JWTs. The partners call from IP addresses that change often. The company must authenticate partners and keep usage-based billing. Which solution will meet these requirements?",
    options: [
      { text: "Add a Lambda authorizer that validates the partner JWTs, and keep the API keys and usage plan for metering.", correct: true,
        why: "The Lambda authorizer authenticates each call with the partner tokens. API keys stay in place to identify partners for usage plans." },
      { text: "Rotate the API keys every month.", correct: false,
        why: "API keys are not authentication. A rotated key can leak again, so callers are still not authenticated." },
      { text: "Add an AWS WAF IP set that allows only the partner IP addresses.", correct: false,
        why: "The partner IP addresses change often, so an IP allow list breaks access. It also does not authenticate the caller." },
      { text: "Add a Cognito user pool authorizer to the methods.", correct: false,
        why: "A Cognito user pool authorizer accepts only tokens from Cognito user pools. The partners use their own identity providers." }
    ],
    explanation: "AWS says not to use API keys for authentication or authorization. Use IAM, a Cognito authorizer, or a Lambda authorizer, and keep API keys for usage plans." },

  { id: "m04-014", topic: "apigw-integrations", domain: 3,
    stem: "A front-end team must start integration tests against a new REST API method today. The backend service for the method will not be ready for three weeks. The method must return a fixed sample JSON response with HTTP 200. The team wants the LEAST effort and no new compute resources. Which solution will meet these requirements?",
    options: [
      { text: "Configure the method with a mock integration, and return the sample JSON from the integration response mapping template.", correct: true,
        why: "A mock integration returns a response that API Gateway builds from a mapping template. It needs no backend and no compute." },
      { text: "Create a Lambda function that returns the sample JSON, and use a Lambda proxy integration.", correct: false,
        why: "This works, but it adds a new Lambda function. It fails the requirement for no new compute resources." },
      { text: "Configure an HTTP proxy integration to a public sample API on the internet.", correct: false,
        why: "An outside API does not return the company sample response, and the team does not control it." },
      { text: "Turn on stage caching and load the sample response into the cache.", correct: false,
        why: "You cannot load responses into the API cache. The cache stores only responses from an integration." }
    ],
    explanation: "A mock integration returns a response from mapping templates with no backend. Use it to test clients and prototype APIs, and for CORS OPTIONS methods." },

  { id: "m04-015", topic: "apigw-caching", domain: 4,
    stem: "A REST API has caching turned on for the stage with a 300-second TTL. The GET /products method accepts a category query string parameter. Users who request ?category=books sometimes receive the cached results for ?category=toys. Which solution will fix the problem and keep caching?",
    options: [
      { text: "Add the category query string parameter as a cache key for the method.", correct: true,
        why: "With category in the cache key, API Gateway caches responses for each category value separately." },
      { text: "Set the method cache TTL to 0.", correct: false,
        why: "TTL 0 turns caching off. It fails the requirement to keep caching." },
      { text: "Flush the stage cache every 5 minutes.", correct: false,
        why: "Flushing removes all entries, but new requests still share one cache entry for all categories. The wrong results return." },
      { text: "Increase the cache capacity of the stage.", correct: false,
        why: "Capacity changes how much the cache holds. It does not change how API Gateway builds the cache key." }
    ],
    explanation: "Add method or integration parameters (query strings, headers, paths) as cache keys. API Gateway caches responses for each key value separately." },

  { id: "m04-016", topic: "apigw-caching", domain: 2,
    stem: "A REST API uses stage caching to protect a slow backend. Monitoring shows that many clients send the header Cache-Control: max-age=0, so most requests go to the backend. Only an internal admin role may refresh cache entries. Requests from other clients must still succeed. Which solution will meet these requirements?",
    options: [
      { text: "Turn on Require authorization for cache invalidation, allow execute-api:InvalidateCache only for the admin role, and set unauthorized requests to ignore the Cache-Control header.", correct: true,
        why: "Only callers with execute-api:InvalidateCache can invalidate entries. Other clients get normal responses, and API Gateway ignores their header." },
      { text: "Turn on Require authorization for cache invalidation, and set unauthorized requests to fail with a 403 status code.", correct: false,
        why: "This stops the invalidation, but the client requests fail with 403. It fails the requirement that other requests still succeed." },
      { text: "Increase the cache TTL to 3,600 seconds.", correct: false,
        why: "A longer TTL does not stop clients from invalidating entries with Cache-Control: max-age=0." },
      { text: "Turn on cache data encryption for the stage.", correct: false,
        why: "Encryption protects cached data at rest. It does not control who can invalidate entries." }
    ],
    explanation: "Clients invalidate a cache entry with Cache-Control: max-age=0. Require authorization with execute-api:InvalidateCache, and choose how API Gateway handles unauthorized invalidation requests." },

  { id: "m04-017", topic: "apigw-auth", domain: 2,
    stem: "A single-page web app signs users in with an Amazon Cognito user pool. The app calls a REST API in Amazon API Gateway. Only signed-in users may call the API. The developer wants to write the LEAST custom code. Which solution will meet these requirements?",
    options: [
      { text: "Create a COGNITO_USER_POOLS authorizer for the user pool, attach it to the methods, and send the ID token in the Authorization header.", correct: true,
        why: "API Gateway validates user pool tokens itself. With no scopes on the method, the authorizer expects the ID token." },
      { text: "Create a Lambda authorizer that downloads the user pool JWKS and validates the token.", correct: false,
        why: "This works, but it needs custom validation code. It fails the least-code requirement." },
      { text: "Set the methods to AWS_IAM authorization and sign requests with the ID token.", correct: false,
        why: "IAM authorization needs a SigV4 signature from AWS credentials. An ID token is not AWS credentials." },
      { text: "Require an API key on the methods and give each user a key after sign-in.", correct: false,
        why: "API keys do not authenticate users. Anyone who copies a key can call the API." }
    ],
    explanation: "A Cognito user pool authorizer validates user pool tokens with no custom code. Without OAuth scopes on the method, it treats the token as an ID token." },

  { id: "m04-018", topic: "apigw-auth", domain: 4,
    stem: "A REST API uses a Cognito user pool authorizer. A new method must allow only clients whose access token includes the custom scope orders/read. The client sends a valid access token, but API Gateway returns 401. No authorization scopes are set on the method. Which solution will meet these requirements?",
    options: [
      { text: "Add orders/read as an authorization scope on the method, and redeploy the API.", correct: true,
        why: "With scopes on the method, the authorizer treats the token as an access token and checks its scopes. Without scopes, it expects an ID token." },
      { text: "Change the client to send the ID token instead of the access token.", correct: false,
        why: "The ID token does not carry OAuth scopes. The method could then not check for orders/read." },
      { text: "Add a token validation regular expression that checks the aud claim.", correct: false,
        why: "Access tokens do not have an aud claim. This validation rejects access tokens." },
      { text: "Increase the authorizer result TTL to 3,600 seconds.", correct: false,
        why: "Caching stores results longer. It does not change how the authorizer validates the token." }
    ],
    explanation: "A COGNITO_USER_POOLS authorizer treats the token as an ID token when the method has no scopes. With scopes, it expects an access token and checks the scope claim." },

  { id: "m04-019", topic: "apigw-auth", domain: 2,
    stem: "A multi-tenant REST API must authorize each request by using a bearer token in the Authorization header and the tenantId query string parameter together. The authorization logic is custom. Which solution will meet these requirements?",
    options: [
      { text: "Create a REQUEST Lambda authorizer with the Authorization header and the tenantId query string as identity sources.", correct: true,
        why: "A REQUEST authorizer receives headers, query strings, stage variables, and context variables. Both values become identity sources and cache key parts." },
      { text: "Create a TOKEN Lambda authorizer with Authorization as the token source.", correct: false,
        why: "A TOKEN authorizer receives only one header value. It cannot see the tenantId query string." },
      { text: "Create a Cognito user pool authorizer.", correct: false,
        why: "A Cognito authorizer validates a token only. It cannot run custom logic on the query string." },
      { text: "Create a JWT authorizer with the tenant identity provider as the issuer.", correct: false,
        why: "JWT authorizers are for HTTP APIs, not REST APIs. They also do not run custom logic on query strings." }
    ],
    explanation: "REQUEST Lambda authorizers can use several identity sources (headers, query strings, stage variables, context). TOKEN authorizers use one header token." },

  { id: "m04-020", topic: "apigw-auth", domain: 4,
    stem: "A REST API uses a Lambda authorizer with authorization caching (TTL 300 seconds). The authorizer returns an Allow policy for the exact methodArn of each request. A user calls GET /reports successfully. Within the next minute, the same user calls GET /reports/summary, which the user is allowed to use, and receives 403. Which actions will resolve the issue? (Choose two.)",
    options: [
      { text: "Change the authorizer to return a policy that allows every method that the user may call.", correct: true,
        why: "With caching, API Gateway uses the first policy for later requests from the same identity. A policy that covers all allowed methods works for each of them." },
      { text: "Set the authorizer result TTL to 0 to turn off authorization caching.", correct: true,
        why: "Without caching, API Gateway calls the authorizer for each request, so each request gets a policy for its own method." },
      { text: "Increase the authorizer result TTL to 3,600 seconds.", correct: false,
        why: "A longer TTL keeps the narrow policy for longer. The 403 errors continue." },
      { text: "Turn on stage caching for GET methods.", correct: false,
        why: "Stage caching stores backend responses. It does not change the cached authorizer policy." },
      { text: "Add the user to a usage plan with a higher quota.", correct: false,
        why: "A quota problem returns 429. The 403 comes from the cached policy, which allows only the first method, so the second method is implicitly denied." }
    ],
    explanation: "A cached Lambda authorizer policy applies to all methods for the same identity until the TTL ends. Return a policy for every allowed method, or turn off caching." },

  { id: "m04-021", topic: "apigw-auth", domain: 2,
    stem: "A Lambda function in Account B must call a REST API in Account A. The API must accept only signed requests from one IAM role in Account B. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "In Account A, set the method authorization to AWS_IAM and add an API resource policy that allows execute-api:Invoke for the Account B role ARN.", correct: true,
        why: "For cross-account IAM access, the API resource policy must allow the caller from the other account." },
      { text: "In Account B, attach a policy to the function role that allows execute-api:Invoke on the API ARN, and sign the requests with SigV4.", correct: true,
        why: "The caller also needs an identity policy that allows the call, and it must sign the request with its credentials." },
      { text: "Create an API key for Account B and require it on the method.", correct: false,
        why: "An API key is not authentication. It does not prove that the call comes from the Account B role." },
      { text: "Add a Cognito user pool authorizer and create a user for Account B.", correct: false,
        why: "This uses user pool tokens, not IAM roles. It fails the requirement to accept only the Account B IAM role." },
      { text: "Change the API to a private endpoint in Account A.", correct: false,
        why: "A private endpoint limits access to VPCs. It does not authenticate the role and does not allow a Lambda function outside the VPC." }
    ],
    explanation: "Cross-account IAM authorization needs AWS_IAM on the method, an API resource policy that allows the caller, and an identity policy for execute-api:Invoke on the caller." },

  { id: "m04-022", topic: "apigw-auth", domain: 2,
    stem: "An HTTP API must accept only requests with a valid access token from a third-party OpenID Connect identity provider. API Gateway must check the signature, issuer, audience, and expiration. The team wants the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Create a JWT authorizer with the identity provider issuer URL and the API audience, and attach it to the routes.", correct: true,
        why: "A JWT authorizer validates the signature with the issuer keys and checks iss, aud, and exp with no custom code." },
      { text: "Create a Lambda authorizer that validates the token.", correct: false,
        why: "This works, but the team must write and run validation code. It fails the least-overhead requirement." },
      { text: "Create a Cognito user pool authorizer.", correct: false,
        why: "HTTP APIs do not have a Cognito user pool authorizer type, and the tokens do not come from Cognito." },
      { text: "Set the routes to IAM authorization.", correct: false,
        why: "IAM authorization requires SigV4 signatures with AWS credentials. It cannot validate third-party JWTs." }
    ],
    explanation: "HTTP API JWT authorizers validate OIDC and OAuth 2.0 JWTs: signature (from jwks_uri), iss, aud or client_id, exp, nbf, iat, and route scopes." },

  { id: "m04-023", topic: "apigw-cors", domain: 4,
    stem: "A browser app at https://app.example.com calls a REST API that uses Lambda proxy integrations. The developer used Enable CORS in the API Gateway console, and the preflight OPTIONS request succeeds. The browser still blocks the GET responses with a CORS error. Which solution will fix the problem?",
    options: [
      { text: "Change the Lambda function to return the Access-Control-Allow-Origin header with the value https://app.example.com in each response.", correct: true,
        why: "A proxy integration has no integration response, so API Gateway cannot add CORS headers. The function must return them." },
      { text: "Run Enable CORS again on the resource and redeploy the API.", correct: false,
        why: "The console adds CORS headers to integration responses, which proxy integrations do not use. The GET responses still lack the header." },
      { text: "Add an OPTIONS method with a mock integration.", correct: false,
        why: "The preflight already succeeds. The missing header is on the GET response, not on OPTIONS." },
      { text: "Attach an AWS WAF web ACL that allows the app.example.com origin.", correct: false,
        why: "WAF allows or blocks requests. It does not add CORS headers to responses." }
    ],
    explanation: "With Lambda proxy or HTTP proxy integrations, the backend must return Access-Control-Allow-Origin and the other CORS headers in its responses." },

  { id: "m04-024", topic: "apigw-cors", domain: 1,
    stem: "A browser app at https://app.example.com calls an HTTP API. The requests include an Authorization header, so browsers send preflight requests. The developer wants to support CORS with the LEAST effort. Which solution will meet these requirements?",
    options: [
      { text: "Configure CORS on the HTTP API with https://app.example.com as an allowed origin and Authorization as an allowed header.", correct: true,
        why: "With CORS configured, API Gateway answers preflight OPTIONS requests itself and adds the CORS headers to responses." },
      { text: "Add CORS headers to the responses of the Lambda functions only.", correct: false,
        why: "Without a CORS configuration, API Gateway does not answer preflight OPTIONS requests automatically. You must also add a route and code to answer OPTIONS, which takes more effort." },
      { text: "Add an OPTIONS route for each path with a Lambda integration that returns CORS headers.", correct: false,
        why: "This can work, but it adds routes and functions to maintain. It fails the least-effort requirement." },
      { text: "Put an Amazon CloudFront distribution in front of the API with a response headers policy.", correct: false,
        why: "This adds a new distribution to set up and manage. It fails the least-effort requirement." }
    ],
    explanation: "For HTTP APIs, configure CORS on the API. API Gateway answers preflight requests automatically and ignores CORS headers from the backend." },

  { id: "m04-025", topic: "apigw-monitoring", domain: 4,
    stem: "A REST API uses a Lambda authorizer with authorization caching turned off. CloudWatch shows an average Latency of 900 ms and an average IntegrationLatency of 120 ms. The developer must reduce response time with the LEAST cost. Which solution will meet these requirements?",
    options: [
      { text: "Turn on authorization caching for the Lambda authorizer with a suitable TTL.", correct: true,
        why: "Latency includes API Gateway overhead, such as the authorizer call. The backend is fast, so caching the authorizer result removes most of the delay." },
      { text: "Increase the memory of the backend Lambda function.", correct: false,
        why: "IntegrationLatency is only 120 ms, so the backend is not the slow part. More memory adds cost without a large gain." },
      { text: "Turn on stage caching with a 0.5 GB cache.", correct: false,
        why: "Stage caching skips the backend, which is already fast. The authorizer still runs, and the cache costs money each hour." },
      { text: "Increase the stage throttling rate limit.", correct: false,
        why: "Throttling limits do not make each request faster. They only change when API Gateway returns 429." }
    ],
    explanation: "Latency is total time in API Gateway, including IntegrationLatency and overhead such as Lambda authorizers. A large gap between them points to API Gateway processing." },

  { id: "m04-026", topic: "apigw-monitoring", domain: 4,
    stem: "A developer must see how API Gateway processes requests to a REST API, including mapping template output and authorizer results. The developer turns on logging for the stage in the console, but no execution logs appear in CloudWatch Logs. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Create an IAM role that API Gateway can assume with the AmazonAPIGatewayPushToCloudWatchLogs policy.", correct: true,
        why: "API Gateway needs a role with permission to write to CloudWatch Logs." },
      { text: "Set the role ARN as the CloudWatch log role ARN in the API Gateway account settings for the Region, and set the stage log level to INFO.", correct: true,
        why: "API Gateway uses the cloudWatchRoleArn account setting for each Region. The INFO level logs the processing details." },
      { text: "Turn on access logging only, with a custom $context format.", correct: false,
        why: "Access logs write one summary line for each request. They do not show mapping template output or execution steps." },
      { text: "Attach AWSLambdaBasicExecutionRole to the backend function role.", correct: false,
        why: "This lets the function write its own logs. It does not let API Gateway write execution logs." },
      { text: "Turn on X-Ray tracing for the stage.", correct: false,
        why: "X-Ray records traces and timing. It does not create execution logs with mapping template output." }
    ],
    explanation: "REST API execution logs need an IAM role (AmazonAPIGatewayPushToCloudWatchLogs) set as cloudWatchRoleArn in the account settings for each Region, and logging turned on for the stage." },

  { id: "m04-027", topic: "apigw-monitoring", domain: 4,
    stem: "Requests to a REST API sometimes take 3 seconds. The request path is API Gateway, then a Lambda function, then Amazon DynamoDB and an external payment API. The developer must find which part of the path causes the delay. Which solution will meet these requirements?",
    options: [
      { text: "Turn on AWS X-Ray tracing for the API stage and active tracing for the Lambda function, and instrument the SDK and HTTP calls.", correct: true,
        why: "X-Ray shows a trace with segments for API Gateway, Lambda, DynamoDB, and the external call, with the time for each." },
      { text: "Turn on detailed CloudWatch metrics for the stage.", correct: false,
        why: "Detailed metrics show latency for each method. They do not split time between DynamoDB and the payment API." },
      { text: "Turn on access logging with $context.integrationLatency.", correct: false,
        why: "This shows the total backend time. It does not show which call inside the function is slow." },
      { text: "Turn on stage caching and watch CacheHitCount.", correct: false,
        why: "Cache metrics show hits and misses. They do not find the slow part of the request path." }
    ],
    explanation: "Turn on X-Ray tracing on the REST API stage and active tracing in Lambda to see time for each service in the request path. HTTP APIs do not support X-Ray." },

  { id: "m04-028", topic: "cognito-user-pools", domain: 2,
    stem: "A company uses an Amazon Cognito user pool for an employee app. Only users with an email address in the example.com domain may sign up. Cognito must reject other sign-up requests before it creates the user. Which solution will meet these requirements?",
    options: [
      { text: "Add a pre sign-up Lambda trigger that returns an error when the email domain is not example.com.", correct: true,
        why: "The pre sign-up trigger runs before Cognito creates the user. An error from the function denies the sign-up." },
      { text: "Add a post confirmation Lambda trigger that deletes users from other domains.", correct: false,
        why: "Post confirmation runs after Cognito creates and confirms the user. It fails the requirement to reject the request first." },
      { text: "Add a pre token generation Lambda trigger that removes claims for other domains.", correct: false,
        why: "Pre token generation runs at sign-in, after the user exists. It does not stop sign-up." },
      { text: "Add a pre authentication Lambda trigger that checks the email domain.", correct: false,
        why: "Pre authentication runs at sign-in. The user is already created by then." }
    ],
    explanation: "Use the pre sign-up trigger to accept, deny, or auto-confirm sign-up requests. Cognito invokes it before the user exists." },

  { id: "m04-029", topic: "edge-route53-waf", domain: 3,
    stem: "A company has two Regional REST APIs in the same account and Region: an orders API and a users API. Clients must call https://api.example.com/orders/... for the orders API and https://api.example.com/users/... for the users API. Each API must use its prod stage. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Create one Regional custom domain name for api.example.com, add API mappings with the paths orders and users to the prod stage of each API, and create a Route 53 alias record for the domain.", correct: true,
        why: "API mappings connect paths on one custom domain to different API stages. API Gateway removes the base path before it calls each API." },
      { text: "Create two custom domain names, orders.example.com and users.example.com.", correct: false,
        why: "This gives two host names. It fails the requirement for one host name with different paths." },
      { text: "Merge both APIs into one REST API with stage variables that select the backend.", correct: false,
        why: "Merging the APIs is a large change. Stage variables select values for a stage, not for each path." },
      { text: "Put an Amazon CloudFront distribution in front of the APIs with a cache behavior for each path.", correct: false,
        why: "This can route paths, but it adds a distribution to manage. API mappings meet the requirement with less overhead." }
    ],
    explanation: "API mappings (base path mappings) connect API stages to a custom domain name, optionally with a path. REST and HTTP API stages can share one custom domain." },

  { id: "m04-030", topic: "cognito-user-pools", domain: 2,
    stem: "A REST API uses a Cognito user pool authorizer and Lambda proxy integrations. Some API operations are for administrators only. Users must not be able to give themselves administrator access. Which solution will meet these requirements with the LEAST operational overhead?",
    options: [
      { text: "Add administrators to an admins group in the user pool. In the function, check that the cognito:groups claim in requestContext.authorizer.claims contains admins.", correct: true,
        why: "Group membership appears in the cognito:groups claim. Only administrators with AWS credentials can change group membership." },
      { text: "Add a custom:role attribute that users can write, and check it in the function.", correct: false,
        why: "If users can write the attribute, they can set it to admin. It fails the requirement that users cannot give themselves access." },
      { text: "Create a second user pool for administrators and a second authorizer.", correct: false,
        why: "This works, but it doubles the user pools and authorizers to manage. It fails the least-overhead requirement." },
      { text: "Give administrators a different API key.", correct: false,
        why: "API keys do not prove identity. Anyone with the key could use the admin operations." }
    ],
    explanation: "User pool groups add a cognito:groups claim to ID and access tokens. Backends use it for role-based access control." },

  { id: "m04-031", topic: "cognito-user-pools", domain: 2,
    stem: "A service on Amazon ECS receives Amazon Cognito user pool access tokens directly from clients, without API Gateway. The service must accept only valid, unexpired access tokens from its own user pool. Which actions should the service take for each token? (Choose two.)",
    options: [
      { text: "Verify the token signature with the public key from the user pool JWKS endpoint that matches the kid in the token header.", correct: true,
        why: "Cognito signs tokens with private keys. The public keys at /.well-known/jwks.json prove that the user pool issued the token." },
      { text: "Check that exp is in the future, iss is the user pool URL, token_use is access, and client_id is the expected app client.", correct: true,
        why: "These claim checks reject expired tokens, tokens from other pools, ID tokens, and tokens for other app clients." },
      { text: "Decode the payload from Base64 and accept the token if the claims look correct.", correct: false,
        why: "Anyone can create a Base64 payload. Without the signature check, forged tokens pass." },
      { text: "Check that the aud claim matches the app client ID.", correct: false,
        why: "Access tokens do not contain an aud claim. This check rejects every valid access token." },
      { text: "Verify the signature with the app client secret.", correct: false,
        why: "Cognito signs tokens with RSA private keys, not with the app client secret. This check cannot verify the token." }
    ],
    explanation: "To verify a Cognito JWT, check the signature with the user pool JWKS public key, then check exp, iss, token_use, and aud (ID token) or client_id (access token)." },

  { id: "m04-032", topic: "cognito-identity-pools", domain: 2,
    stem: "A mobile app signs users in with an Amazon Cognito user pool. Users must upload photos directly to an Amazon S3 bucket, with no backend servers. Each user may write only to a prefix that belongs to that user. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Create an identity pool with the user pool as a provider, and have the app exchange the ID token for temporary AWS credentials.", correct: true,
        why: "The identity pool gives each signed-in user temporary credentials, so the app can call S3 directly without a backend." },
      { text: "Attach a policy to the authenticated role that allows s3:PutObject on arn:aws:s3:::bucket/${cognito-identity.amazonaws.com:sub}/*.", correct: true,
        why: "The policy variable becomes the identity ID of the caller, so each user can write only to their own prefix." },
      { text: "Create a Lambda function that returns presigned URLs through an API.", correct: false,
        why: "This works, but it adds a backend API and function. It fails the requirement for no backend." },
      { text: "Create an IAM user and put its access keys in the app.", correct: false,
        why: "Long-term keys in an app can leak, and all users share one identity. Per-user prefixes cannot be enforced." },
      { text: "Send the user pool ID token in the Authorization header of S3 PutObject requests.", correct: false,
        why: "Amazon S3 needs requests signed with AWS credentials. It does not accept Cognito user pool tokens." }
    ],
    explanation: "Identity pools exchange user pool tokens for temporary AWS credentials. Use ${cognito-identity.amazonaws.com:sub} in policies for per-user resources." },

  { id: "m04-033", topic: "cognito-user-pools", domain: 2,
    stem: "A nightly batch service must call a REST API that uses a Cognito user pool authorizer with the custom scope reports/read. No user is involved. The service must not use a user name and password. Which solution will meet these requirements?",
    options: [
      { text: "Create an app client with a client secret that allows only the client credentials grant and the reports/read scope. Have the service get an access token from the token endpoint.", correct: true,
        why: "The client credentials grant is for machine-to-machine access. It returns an access token with custom scopes, which the authorizer checks." },
      { text: "Create a user for the service and sign in with the ADMIN_USER_PASSWORD_AUTH flow.", correct: false,
        why: "This uses a user name and password, which the requirements forbid. API sign-in also does not issue custom scopes." },
      { text: "Use the implicit grant from the service.", correct: false,
        why: "The implicit grant needs a user to sign in through the browser. It is a legacy flow for user sign-in, not for services." },
      { text: "Create an identity pool and use unauthenticated credentials to call the API.", correct: false,
        why: "Identity pool credentials are AWS credentials, not access tokens. The Cognito authorizer requires a user pool token with the scope." }
    ],
    explanation: "Cognito user pools support authorization code (with PKCE), implicit (legacy), and client credentials grants. Client credentials needs a client secret and returns only an access token with scopes." },

  { id: "m04-034", topic: "cognito-identity-pools", domain: 2,
    stem: "Users sign in with an Amazon Cognito user pool and get AWS credentials from an identity pool. Members of the editors group need a role with write access. Other users need a read-only role. Users must not be able to choose a role themselves. Which solution will meet these requirements?",
    options: [
      { text: "Assign the write role to the editors group in the user pool, set the read-only role as the default authenticated role, and set the identity pool to choose the role from the token.", correct: true,
        why: "The group role appears in the cognito:preferred_role claim. The identity pool reads the claim, and only administrators can change group membership." },
      { text: "Turn on the basic (classic) flow and let the app call AssumeRoleWithWebIdentity with the role that the user selects.", correct: false,
        why: "In the basic flow, the client picks the role. Users could choose the write role themselves." },
      { text: "Add a rule that maps a custom attribute that users can write to the write role.", correct: false,
        why: "Users can change a writable attribute and get the write role. AWS warns against mapping roles from claims that users can change." },
      { text: "Use one authenticated role with write access for all users.", correct: false,
        why: "All users would get write access. It fails the requirement for a read-only role for other users." }
    ],
    explanation: "Identity pools can choose the role from the token (cognito:preferred_role from user pool groups) or from rules. Never map roles from claims that users can change." },

  { id: "m04-035", topic: "edge-cloudfront", domain: 4,
    stem: "An Amazon CloudFront distribution is in front of a product catalog API. The cache hit ratio is very low. The cache policy includes all headers and all query strings in the cache key. Responses change only with the lang query string. The origin also needs the User-Agent header for analytics. Which solution will increase the cache hit ratio and meet these requirements?",
    options: [
      { text: "Use a cache policy that includes only the lang query string in the cache key, and an origin request policy that forwards the User-Agent header.", correct: true,
        why: "A smaller cache key gives more cache hits. The origin request policy sends User-Agent to the origin without adding it to the cache key." },
      { text: "Increase the default TTL in the current cache policy.", correct: false,
        why: "All headers are still in the cache key, so most requests still have a unique key. The hit ratio stays low." },
      { text: "Create an invalidation for /* every hour.", correct: false,
        why: "Invalidations remove cached objects. They lower the hit ratio and do not change the cache key." },
      { text: "Add the User-Agent header and lang to the cache key, and remove all other values.", correct: false,
        why: "User-Agent has many values, so each browser gets its own cache entry. The hit ratio stays low." }
    ],
    explanation: "Put only the values that change the response in the cache policy. Use an origin request policy to send other values to the origin without adding them to the cache key." },

  { id: "m04-036", topic: "edge-cloudfront", domain: 2,
    stem: "A company serves files from a private Amazon S3 bucket through Amazon CloudFront. The objects use SSE-KMS encryption with a customer managed key. Users must not be able to read the objects directly from Amazon S3. Which solution will meet these requirements?",
    options: [
      { text: "Configure origin access control (OAC). Add a bucket policy that allows cloudfront.amazonaws.com with an AWS:SourceArn condition for the distribution, and allow CloudFront in the KMS key policy.", correct: true,
        why: "OAC supports SSE-KMS. The bucket policy allows only this distribution, and the key policy lets CloudFront decrypt the objects." },
      { text: "Configure an origin access identity (OAI) and allow it in the bucket policy.", correct: false,
        why: "OAI does not support SSE-KMS without workarounds. CloudFront cannot read the encrypted objects." },
      { text: "Turn on S3 static website hosting and use the website endpoint as a custom origin.", correct: false,
        why: "A website endpoint needs public read access, so users can read objects directly. OAC does not work with website endpoints." },
      { text: "Use CloudFront signed URLs and keep the bucket policy unchanged.", correct: false,
        why: "Signed URLs control viewer access to CloudFront. They do not give CloudFront access to the bucket or the KMS key." }
    ],
    explanation: "Use OAC for S3 origins. It supports SSE-KMS, all Regions, and PUT and DELETE. The bucket policy and the KMS key policy must allow the CloudFront service principal." },

  { id: "m04-037", topic: "edge-cloudfront", domain: 2,
    stem: "A video service uses Amazon CloudFront to deliver HLS streams. Each video has hundreds of segment files. Only paying subscribers may watch, and the company does not want to change the URLs of the segment files. Which solution will meet these requirements?",
    options: [
      { text: "Use CloudFront signed cookies that grant access to the video paths.", correct: true,
        why: "Signed cookies give access to many files at once and do not change the URLs." },
      { text: "Use CloudFront signed URLs for each segment file.", correct: false,
        why: "Signed URLs add signature parameters to each URL. This changes the URLs and is hard to manage for hundreds of files." },
      { text: "Turn on CloudFront geographic restrictions.", correct: false,
        why: "Geographic restrictions block countries, not users. Non-subscribers in allowed countries could still watch." },
      { text: "Configure origin access control for the S3 origin.", correct: false,
        why: "OAC stops direct S3 access, but anyone can still get the files through CloudFront." }
    ],
    explanation: "Use signed URLs for single files or clients without cookie support. Use signed cookies for many files and when URLs must not change." },

  { id: "m04-038", topic: "edge-route53-waf", domain: 2,
    stem: "A company runs an Amazon API Gateway HTTP API in eu-west-1. The company must block any IP address that sends more than 1,000 requests in 5 minutes. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Put an Amazon CloudFront distribution in front of the HTTP API.", correct: true,
        why: "AWS WAF cannot attach to HTTP APIs. A CloudFront distribution gives a resource that WAF can protect." },
      { text: "Create an AWS WAF web ACL with CLOUDFRONT scope in us-east-1, add a rate-based rule with a limit of 1,000 and a 300-second window, and associate the web ACL with the distribution.", correct: true,
        why: "Web ACLs for CloudFront must be in us-east-1. The rate-based rule counts requests for each IP address and blocks those over the limit." },
      { text: "Create a Regional web ACL in eu-west-1 and associate it with the HTTP API stage.", correct: false,
        why: "AWS WAF does not support HTTP APIs. The association is not possible." },
      { text: "Create a usage plan with a throttle of 1,000 requests.", correct: false,
        why: "Usage plans are for REST APIs and count by API key, not by IP address." },
      { text: "Set the HTTP API stage throttling rate to 1,000 requests each second.", correct: false,
        why: "Stage throttling limits all clients together. It does not block individual IP addresses." }
    ],
    explanation: "AWS WAF protects CloudFront, REST APIs, ALBs, AppSync, Cognito user pools, and other resources, but not HTTP APIs. Web ACLs for CloudFront must be in us-east-1." },

  { id: "m04-039", topic: "edge-route53-waf", domain: 1,
    stem: "An application runs in us-east-1 with a standby copy in us-west-2. DNS must send all users to us-east-1. Users must go to us-west-2 only when us-east-1 is unhealthy. Which Amazon Route 53 configuration will meet these requirements?",
    options: [
      { text: "Failover routing with a primary record for us-east-1 that has a health check, and a secondary record for us-west-2.", correct: true,
        why: "Failover routing answers with the primary record while its health check passes, and with the secondary record when it fails." },
      { text: "Latency routing with records for both Regions.", correct: false,
        why: "Latency routing sends some users to us-west-2 even when us-east-1 is healthy. It fails the requirement to send all users to us-east-1." },
      { text: "Weighted routing with weights of 100 and 0 and no health checks.", correct: false,
        why: "Without health checks, Route 53 does not know when us-east-1 fails. Traffic does not move to us-west-2." },
      { text: "Multivalue answer routing with records for both Regions.", correct: false,
        why: "Multivalue answers return both healthy records at random. Users go to both Regions." }
    ],
    explanation: "Failover routing is active-passive: Route 53 returns the primary record while its health check is healthy and the secondary record when it is not." },

  { id: "m04-040", topic: "edge-route53-waf", domain: 3,
    stem: "A developer creates an edge-optimized REST API in eu-west-1 and wants the custom domain api.example.com. The developer requested an AWS Certificate Manager (ACM) certificate in eu-west-1, but the certificate does not appear when the developer creates the custom domain name. Which solution will meet these requirements?",
    options: [
      { text: "Request the ACM certificate for api.example.com in us-east-1, and then create the edge-optimized custom domain name.", correct: true,
        why: "Edge-optimized custom domains use CloudFront, so the ACM certificate must be in us-east-1." },
      { text: "Import the same certificate into eu-west-1 again.", correct: false,
        why: "The certificate is already in eu-west-1. Edge-optimized custom domains cannot use certificates from that Region." },
      { text: "Create a Route 53 CNAME record for api.example.com that points to the execute-api URL.", correct: false,
        why: "A DNS record does not give the API a certificate for api.example.com. HTTPS requests fail the TLS check." },
      { text: "Upload the certificate to IAM in eu-west-1.", correct: false,
        why: "API Gateway custom domains use ACM certificates. IAM in eu-west-1 does not meet the us-east-1 requirement for edge-optimized domains." }
    ],
    explanation: "Edge-optimized API custom domains and CloudFront need ACM certificates in us-east-1. Regional custom domains need the certificate in the API Region." }

] });
