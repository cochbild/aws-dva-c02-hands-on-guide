window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "g-iam-sts", questions: [

  { id: "g-iam-sts-001", topic: "iam-policy-types", domain: 2,
    stem: "A company has 30 IAM roles for different microservices. Every role needs the same set of permissions to write to one Amazon CloudWatch Logs log group and to read one AWS Systems Manager parameter path. The security team will change these permissions often. Each change must apply to all 30 roles in one step, and the team must be able to go back to an earlier version of the permissions. Which solution will meet these requirements?",
    options: [
      { text: "Create a customer managed policy with the permissions, and attach it to all 30 roles.", correct: true,
        why: "One customer managed policy attaches to many identities. A change applies to every attached role, and IAM keeps earlier policy versions so the team can roll back." },
      { text: "Add an inline policy with the permissions to each of the 30 roles.", correct: false,
        why: "Inline policies have a one-to-one relationship with one identity. The team must edit 30 policies for each change, so this fails the one-step requirement." },
      { text: "Attach the AWS managed policy CloudWatchLogsFullAccess to all 30 roles.", correct: false,
        why: "AWS creates and updates AWS managed policies. The team cannot change them, and this policy does not give the Systems Manager parameter permission." },
      { text: "Attach a permissions boundary that contains the permissions to all 30 roles.", correct: false,
        why: "A permissions boundary only sets maximum permissions. It does not grant any permissions, so the roles still cannot write the logs or read the parameters." }
    ],
    explanation: "Use a customer managed policy when many identities need the same permissions that you must change. It applies changes to all attached identities and keeps versions." },

  { id: "g-iam-sts-002", topic: "iam-policy-types", domain: 2,
    stem: "Developers in an AWS account must create IAM roles for their own Lambda functions. The security team requires that any role a developer creates can never have permissions beyond Amazon S3, Amazon DynamoDB, and Amazon CloudWatch Logs, even if the developer attaches AdministratorAccess to the role. Other administrators in the account must keep their full access. Which solution will meet these requirements?",
    options: [
      { text: "Create a managed policy that allows only S3, DynamoDB, and CloudWatch Logs. Allow developers iam:CreateRole only when the iam:PermissionsBoundary condition key equals that policy ARN.", correct: true,
        why: "Every role that a developer creates must then have the boundary. The boundary caps the role at S3, DynamoDB, and CloudWatch Logs, even with AdministratorAccess attached. Other administrators are not affected." },
      { text: "Attach a service control policy to the account that allows only S3, DynamoDB, and CloudWatch Logs.", correct: false,
        why: "An SCP limits every user and role in the account. The other administrators would lose their full access, which fails a requirement." },
      { text: "Tell developers to pass a session policy that allows only S3, DynamoDB, and CloudWatch Logs.", correct: false,
        why: "Lambda assumes the execution role, so developers do not control the session. A session policy also depends on the caller, so it cannot enforce the limit." },
      { text: "Attach an inline policy to each developer that allows only S3, DynamoDB, and CloudWatch Logs.", correct: false,
        why: "This limits what developers can do themselves. It does not limit the permissions of the roles that they create, so a role with AdministratorAccess keeps full access." }
    ],
    explanation: "Permissions boundaries let you delegate role creation safely. Require the boundary with the iam:PermissionsBoundary condition key on iam:CreateRole." },

  { id: "g-iam-sts-003", topic: "iam-policy-types", domain: 2,
    stem: "A security engineer must choose policy types that set the maximum permissions for IAM principals. The chosen policy types must never grant permissions by themselves. Which policy types meet these requirements? (Choose two.)",
    options: [
      { text: "Permissions boundary", correct: true,
        why: "A permissions boundary sets the maximum permissions that identity-based policies can give a user or role. It does not grant permissions." },
      { text: "Service control policy (SCP)", correct: true,
        why: "An SCP sets the maximum permissions for users and roles in member accounts. AWS documents that an SCP never grants permissions." },
      { text: "Customer managed policy attached to a role", correct: false,
        why: "A customer managed policy attached as a permissions policy grants permissions, so it fails the requirement to never grant permissions." },
      { text: "Inline policy attached to a user", correct: false,
        why: "An inline policy is an identity-based policy that grants permissions. It fails the requirement." },
      { text: "Amazon S3 bucket policy", correct: false,
        why: "A bucket policy is a resource-based policy. In the same account, an allow in it can grant access by itself, so it fails the requirement." }
    ],
    explanation: "Permissions boundaries, SCPs, RCPs, and session policies only limit permissions. Identity-based and resource-based policies grant permissions." },

  { id: "g-iam-sts-004", topic: "iam-policy-evaluation", domain: 2,
    stem: "A developer role has an identity-based policy that allows s3:* on the bucket reports-prod and its objects. The bucket policy contains a statement that denies s3:DeleteObject for all principals except the role named ReportsAdmin. The developer must now delete objects in this bucket. The change must follow least privilege. Which solution will meet these requirements?",
    options: [
      { text: "Change the Deny statement in the bucket policy so that it also excludes the developer role, for example with an aws:PrincipalArn condition.", correct: true,
        why: "An explicit deny overrides every allow. The only way to let the developer delete objects is to remove the developer role from the scope of the deny." },
      { text: "Attach the AdministratorAccess managed policy to the developer role.", correct: false,
        why: "An explicit deny in the bucket policy overrides any allow. The delete still fails, and the role gets far more permissions than it needs." },
      { text: "Add an inline policy to the developer role that allows s3:DeleteObject on the bucket objects.", correct: false,
        why: "The role already has an allow for this action. Another allow does not override the explicit deny, so the delete still fails." },
      { text: "Attach a permissions boundary that allows s3:* to the developer role.", correct: false,
        why: "A boundary never grants permissions and never overrides a deny. The explicit deny in the bucket policy still blocks the delete." }
    ],
    explanation: "An explicit deny in any policy type gives a final Deny. Adding allows does not help. Remove or narrow the deny." },

  { id: "g-iam-sts-005", topic: "iam-policy-evaluation", domain: 2,
    stem: "A Lambda function must send messages to an Amazon SQS queue in the same AWS account. The function execution role has no SQS permissions and no permissions boundary. The team that owns the queue does not want to change the execution role, because another team manages it. Which solution will meet these requirements?",
    options: [
      { text: "Add a statement to the queue policy that names the execution role ARN as the principal and allows sqs:SendMessage.", correct: true,
        why: "In one account, an allow in the resource-based policy is enough for most services. The role has no boundary or session policy, so the queue policy alone allows the call." },
      { text: "Add sqs.amazonaws.com as a trusted principal in the trust policy of the execution role.", correct: false,
        why: "The trust policy controls who can assume the role. It gives no permission to send messages, so the call still fails." },
      { text: "Attach a service control policy that allows sqs:SendMessage to the account.", correct: false,
        why: "An SCP never grants permissions. Without an allow in an identity or resource policy, the request stays implicitly denied." },
      { text: "Create a VPC interface endpoint for Amazon SQS and attach it to the function.", correct: false,
        why: "An endpoint changes the network path. It does not authorize the request, so the function still has no permission to send messages." }
    ],
    explanation: "Within one account, an allow in either the identity-based policy or the resource-based policy is enough for most services, unless a boundary or session policy limits a role principal." },

  { id: "g-iam-sts-006", topic: "iam-policy-evaluation", domain: 4,
    stem: "A Lambda function fails with this error: 'is not authorized to perform: dynamodb:PutItem on resource: arn:aws:dynamodb:us-east-1:111122223333:table/Orders because no permissions boundary allows the dynamodb:PutItem action'. The execution role identity-based policy already allows dynamodb:PutItem on the Orders table. The developer must fix the error with the least privilege change. Which solution will meet these requirements?",
    options: [
      { text: "Add dynamodb:PutItem on the Orders table to the policy that is used as the permissions boundary of the execution role.", correct: true,
        why: "Effective permissions are the intersection of the identity-based policy and the boundary. Adding the one action for the one table to the boundary allows the call and nothing more." },
      { text: "Add another statement that allows dynamodb:PutItem to the execution role identity-based policy.", correct: false,
        why: "The identity-based policy already allows the action. The boundary still does not allow it, so the call still fails." },
      { text: "Add a resource-based policy to the Orders table that allows the execution role ARN to call dynamodb:PutItem.", correct: false,
        why: "A resource-based policy that names a role ARN is limited by an implicit deny in the role permissions boundary. The call still fails." },
      { text: "Remove the permissions boundary from the execution role.", correct: false,
        why: "This fixes the error but removes every limit that the boundary sets. It fails the least privilege requirement." }
    ],
    explanation: "With a permissions boundary, the role can do only what both the identity-based policy and the boundary allow. The error message names the boundary as the policy type that denied the call." },

  { id: "g-iam-sts-007", topic: "iam-policy-evaluation", domain: 2,
    stem: "An AWS account is a member account in AWS Organizations. The SCP attached to its OU replaces FullAWSAccess and allows only s3:*, dynamodb:*, and lambda:*. A developer role in the account has the AdministratorAccess managed policy. Which outcomes will occur? (Choose two.)",
    options: [
      { text: "The role cannot call sqs:SendMessage, even though AdministratorAccess allows it.", correct: true,
        why: "The SCP does not allow SQS actions. The effective permissions are the intersection of the SCP and the identity policy, so SQS calls are denied." },
      { text: "The role can call dynamodb:PutItem.", correct: true,
        why: "Both the SCP and the AdministratorAccess identity policy allow DynamoDB actions, so the call is allowed." },
      { text: "The member account root user can call sqs:SendMessage, because SCPs do not apply to the root user.", correct: false,
        why: "SCPs affect all users and roles in member accounts, including the member account root user. The root user cannot call SQS either." },
      { text: "A new role with no IAM policies can call lambda:InvokeFunction, because the SCP allows it.", correct: false,
        why: "An SCP never grants permissions. A role with no identity-based policies has no access, even when the SCP allows the action." },
      { text: "Service-linked roles in the account cannot call SQS.", correct: false,
        why: "SCPs do not affect service-linked roles, so the SCP does not restrict them." }
    ],
    explanation: "SCPs set maximum permissions for member accounts, including the root user. They never grant permissions and do not affect service-linked roles or the management account." },

  { id: "g-iam-sts-008", topic: "iam-policy-evaluation", domain: 2,
    stem: "An IAM user has a permissions boundary that allows only Amazon S3, Amazon CloudWatch, and Amazon EC2 actions. An AWS Secrets Manager secret in the same account has a resource-based policy that allows this IAM user ARN to call secretsmanager:GetSecretValue. No policy contains a Deny statement. A security reviewer asks what happens when the user calls GetSecretValue on the secret. Which statement is correct?",
    options: [
      { text: "The call succeeds, because an implicit deny in a permissions boundary does not limit a same-account resource-based policy that names the IAM user ARN.", correct: true,
        why: "AWS documents that a same-account resource-based policy that grants access to an IAM user ARN is not limited by an implicit deny in the identity-based policy or the boundary." },
      { text: "The call fails, because the permissions boundary does not allow Secrets Manager actions.", correct: false,
        why: "The boundary limits identity-based policies. It has only an implicit deny for Secrets Manager, which does not limit a resource-based policy that names the user ARN." },
      { text: "The call fails, because the user has no identity-based policy that allows secretsmanager:GetSecretValue.", correct: false,
        why: "In the same account, an allow in the resource-based policy is enough. An identity-based allow is not required." },
      { text: "The call fails, because resource-based policies apply only to cross-account requests.", correct: false,
        why: "Resource-based policies apply to same-account requests too. In the same account, their allow can grant access by itself." }
    ],
    explanation: "Implicit denies in permissions boundaries do not limit a same-account resource-based policy that names an IAM user ARN. A policy that names a role ARN is limited. An explicit deny always wins." },

  { id: "g-iam-sts-009", topic: "iam-policy-elements", domain: 2,
    stem: "A company has 200 IAM users in one IAM group. Each user must be able to read and write objects only under the prefix home/<user name>/ in the bucket team-files. The administrator wants one policy to maintain, with no change when users are added. Which solution will meet these requirements?",
    options: [
      { text: "Attach one policy to the group with Version 2012-10-17 and the resource arn:aws:s3:::team-files/home/${aws:username}/*.", correct: true,
        why: "The ${aws:username} policy variable becomes the name of the IAM user that makes the request. One group policy gives each user only their own prefix." },
      { text: "Attach one policy to the group with Version 2008-10-17 and the resource arn:aws:s3:::team-files/home/${aws:username}/*.", correct: false,
        why: "Policy variables need Version 2012-10-17. With an earlier version, ${aws:username} is literal text, so no user gets access to their prefix." },
      { text: "Create an inline policy for each user that names that user's prefix.", correct: false,
        why: "This works, but the administrator must maintain 200 policies and create one for each new user. It fails the one-policy requirement." },
      { text: "Attach a policy to the group that allows s3:GetObject and s3:PutObject on arn:aws:s3:::team-files/home/*.", correct: false,
        why: "Every user could read and write every other user's prefix. This fails the requirement that each user reaches only their own prefix." }
    ],
    explanation: "Policy variables such as ${aws:username} let one policy give each IAM user a different resource. They work only with Version 2012-10-17." },

  { id: "g-iam-sts-010", topic: "iam-policy-elements", domain: 2,
    stem: "A security audit requires that all requests to an Amazon S3 bucket use HTTPS. Some IAM roles in the same account already have identity-based policies that allow S3 access to the bucket. Which solution will meet these requirements?",
    options: [
      { text: "Add a bucket policy statement that denies s3:* on the bucket and its objects when aws:SecureTransport is false.", correct: true,
        why: "The explicit deny blocks every request sent without TLS, whatever the identity policies allow." },
      { text: "Add a bucket policy statement that allows s3:* only when aws:SecureTransport is true.", correct: false,
        why: "In the same account, the identity-based policies can still allow HTTP requests. An allow cannot block them, so this fails the requirement." },
      { text: "Turn on default encryption with SSE-KMS for the bucket.", correct: false,
        why: "Default encryption protects data at rest. It does not stop requests that are sent without TLS." },
      { text: "Turn on S3 Block Public Access for the bucket.", correct: false,
        why: "Block Public Access stops public access. It does not check whether a request uses HTTPS." }
    ],
    explanation: "To require HTTPS, use a Deny statement with the condition aws:SecureTransport equal to false. An explicit deny overrides other allows." },

  { id: "g-iam-sts-011", topic: "iam-policy-elements", domain: 2,
    stem: "A company requires MFA for all destructive actions. Some developers run AWS CLI scripts with long-term IAM user access keys. The security team adds a Deny statement for ec2:TerminateInstances and rds:DeleteDBInstance. The statement must deny these actions for requests that did not use MFA, including requests made with long-term access keys. Which condition will meet these requirements?",
    options: [
      { text: "\"BoolIfExists\": { \"aws:MultiFactorAuthPresent\": \"false\" }", correct: true,
        why: "Requests made with long-term access keys do not include the key. BoolIfExists matches when the key is absent or false, so those requests are denied too." },
      { text: "\"Bool\": { \"aws:MultiFactorAuthPresent\": \"false\" }", correct: false,
        why: "Requests made with long-term access keys do not include the key, so the Bool condition does not match them. Those requests are not denied." },
      { text: "\"Bool\": { \"aws:SecureTransport\": \"false\" }", correct: false,
        why: "This key checks for TLS. It does not check for MFA, so requests without MFA over HTTPS are not denied." },
      { text: "\"Null\": { \"aws:MultiFactorAuthPresent\": \"false\" }", correct: false,
        why: "In a Deny, this matches only when the key is present. It does not deny requests made with long-term access keys, where the key is absent." }
    ],
    explanation: "AWS recommends BoolIfExists with aws:MultiFactorAuthPresent false in a Deny statement. It denies requests without MFA, including requests made with long-term access keys." },

  { id: "g-iam-sts-012", topic: "iam-roles-trust", domain: 2,
    stem: "A developer tries to create a Lambda function with the execution role app-orders-role. The request fails with an error that the developer is not authorized to perform iam:PassRole on that role. The fix must follow least privilege. Which solution will meet these requirements?",
    options: [
      { text: "Add a statement to the developer's identity-based policy that allows iam:PassRole on the app-orders-role ARN, with the iam:PassedToService condition set to lambda.amazonaws.com.", correct: true,
        why: "The developer needs permission to pass this role to Lambda. The resource and the condition limit the permission to one role and one service." },
      { text: "Add the developer's IAM user ARN to the trust policy of app-orders-role.", correct: false,
        why: "This lets the developer assume the role. It does not give the iam:PassRole permission, so the function creation still fails." },
      { text: "Add iam:PassRole on all resources to the execution role permissions policy.", correct: false,
        why: "Lambda checks the permissions of the user who creates the function, not of the role. The wildcard resource also fails least privilege." },
      { text: "Attach the IAMFullAccess managed policy to the developer.", correct: false,
        why: "This fixes the error but gives full control of IAM. It fails the least privilege requirement." }
    ],
    explanation: "To give a role to a service, the user needs iam:PassRole on that role. Limit it with the role ARN and the iam:PassedToService condition key." },

  { id: "g-iam-sts-013", topic: "iam-roles-trust", domain: 4,
    stem: "A developer creates an IAM role with a permissions policy for Amazon DynamoDB. The developer then tries to create a Lambda function with this role. The request fails, and the error says that Lambda cannot assume the role. The developer has iam:PassRole permission for the role. Which solution will meet these requirements?",
    options: [
      { text: "Edit the role trust policy so that it allows the service principal lambda.amazonaws.com to perform sts:AssumeRole.", correct: true,
        why: "The trust policy controls who can assume the role. Lambda can use the role only when the trust policy names the Lambda service principal." },
      { text: "Attach the AWSLambdaBasicExecutionRole managed policy to the role.", correct: false,
        why: "This policy adds CloudWatch Logs permissions. It does not change who can assume the role, so Lambda still cannot assume it." },
      { text: "Add a function resource-based policy that allows lambda.amazonaws.com to call lambda:InvokeFunction.", correct: false,
        why: "A function resource-based policy controls who can invoke the function. It does not let Lambda assume the execution role." },
      { text: "Grant the developer sts:AssumeRole on the role.", correct: false,
        why: "Lambda, not the developer, assumes the execution role. The trust policy still does not name Lambda, so the error continues." }
    ],
    explanation: "A role has a trust policy (who can assume it) and permissions policies (what it can do). A service role must trust the service principal." },

  { id: "g-iam-sts-014", topic: "iam-roles-trust", domain: 2,
    stem: "A developer finds the role AWSServiceRoleForECS in an AWS account. The developer wants to add Amazon S3 permissions to this role so that an application can read a configuration file. Which statements about this role are correct? (Choose two.)",
    options: [
      { text: "The linked service defines the role permissions, and an IAM administrator can view but not edit them.", correct: true,
        why: "A service-linked role is predefined by the service. Administrators cannot edit its permissions, so the developer must use a different role." },
      { text: "Service control policies do not restrict actions that use the permissions of this role.", correct: true,
        why: "AWS documents that SCPs do not affect any service-linked role." },
      { text: "Any IAM user in the account can assume the role if the user has sts:AssumeRole permission.", correct: false,
        why: "Unless the service defines otherwise, only the linked service can assume a service-linked role. A user policy cannot change this." },
      { text: "An administrator can delete the role at any time, even when ECS resources still use it.", correct: false,
        why: "You must delete the related resources before you can delete a service-linked role." },
      { text: "The role path is /service-role/, and an administrator can attach customer managed policies to it.", correct: false,
        why: "Service-linked roles use the path /aws-service-role/, and their permissions cannot be edited." }
    ],
    explanation: "A service-linked role is owned by the service: it defines the trust and permissions policies, only it can assume the role, and SCPs do not restrict it." },

  { id: "g-iam-sts-015", topic: "iam-roles-trust", domain: 4,
    stem: "A security team must find which developer gave the role FinanceDataRole to a Lambda function. The team searches AWS CloudTrail for events named PassRole and finds none. CloudTrail management events are turned on. Which solution will meet these requirements?",
    options: [
      { text: "Search CloudTrail for the CreateFunction and UpdateFunctionConfiguration events that include FinanceDataRole, and read the identity that made them.", correct: true,
        why: "PassRole is a permission, not an API call, so CloudTrail logs no PassRole event. The event that created or changed the function records the role that was passed." },
      { text: "Turn on CloudTrail data events for Lambda, and search for PassRole again.", correct: false,
        why: "PassRole is never an API call, so no CloudTrail event type records it by name. Data events do not add a PassRole event." },
      { text: "Use IAM Access Analyzer policy generation for each developer and look for iam:PassRole.", correct: false,
        why: "CloudTrail does not track iam:PassRole, so policy generation does not include it. It cannot show who passed the role." },
      { text: "Use the IAM policy simulator to test which developers can pass FinanceDataRole.", correct: false,
        why: "The simulator shows who could pass the role. It does not show who actually did it." }
    ],
    explanation: "iam:PassRole is a permission check, not an API call. To audit it, read the CloudTrail event of the action that received the role, such as CreateFunction." },

  { id: "g-iam-sts-016", topic: "iam-sts-assume-role", domain: 2,
    stem: "A data job runs on a server and calls AssumeRole on the role BatchRole with DurationSeconds set to 14400 (4 hours). The call fails. The server uses IAM user credentials to call AssumeRole. BatchRole uses the default settings. The job must run for 4 hours with one set of role credentials. Which solution will meet these requirements?",
    options: [
      { text: "Increase the maximum session duration of BatchRole to at least 4 hours.", correct: true,
        why: "The default maximum session duration of a role is 1 hour. DurationSeconds cannot exceed this setting, which can be set up to 12 hours." },
      { text: "Call GetSessionToken with a duration of 4 hours and use those credentials as the role credentials.", correct: false,
        why: "GetSessionToken returns credentials for the IAM user, not for BatchRole. The job would not have the role permissions." },
      { text: "Assume a second role from the BatchRole session with DurationSeconds set to 14400.", correct: false,
        why: "This is role chaining, which limits the session to 1 hour. A 4-hour request fails." },
      { text: "Call AssumeRole without DurationSeconds so that the session never expires.", correct: false,
        why: "Without DurationSeconds, the session lasts 1 hour by default. Role credentials always expire." }
    ],
    explanation: "AssumeRole DurationSeconds ranges from 900 seconds to the role maximum session duration, which is 1 hour by default and can be set from 1 to 12 hours." },

  { id: "g-iam-sts-017", topic: "iam-sts-assume-role", domain: 2,
    stem: "A Lambda function uses its execution role credentials to call AssumeRole on the role ReportReader. The call sets DurationSeconds to 7200. ReportReader has a maximum session duration of 12 hours. The call fails. The developer must fix the error with the fewest changes. Which solution will meet these requirements?",
    options: [
      { text: "Set DurationSeconds to 3600 or less, and assume the role again when the credentials expire.", correct: true,
        why: "The execution role credentials are a role session, so this is role chaining. Role chaining limits the new session to 1 hour, whatever the role maximum is." },
      { text: "Increase the maximum session duration of ReportReader to 24 hours.", correct: false,
        why: "The maximum setting is 12 hours, and the role chaining limit of 1 hour still applies. The call still fails." },
      { text: "Increase the Lambda function timeout to 900 seconds.", correct: false,
        why: "The function timeout does not change STS session limits. The call with 7200 seconds still fails." },
      { text: "Call GetSessionToken from the function before AssumeRole.", correct: false,
        why: "Only IAM users and the root user can call GetSessionToken. A role session cannot use it, and it does not remove the role chaining limit." }
    ],
    explanation: "Role chaining (a role session that assumes another role) limits the session to 1 hour. A larger DurationSeconds makes the call fail." },

  { id: "g-iam-sts-018", topic: "iam-sts-assume-role", domain: 2,
    stem: "A developer uses long-term IAM user access keys with the AWS CLI. A new policy denies all actions, except the actions needed to get an MFA session, when the request is not authenticated with MFA. The developer has a virtual MFA device. Which steps will let the developer run AWS CLI commands again? (Choose two.)",
    options: [
      { text: "Run aws sts get-session-token with --serial-number and --token-code from the MFA device.", correct: true,
        why: "GetSessionToken with MFA information returns temporary credentials that are marked as authenticated with MFA." },
      { text: "Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_SESSION_TOKEN to the values that get-session-token returns.", correct: true,
        why: "The CLI must use all three parts of the temporary credentials. Requests made with them include MFA context, so the Deny does not match." },
      { text: "Run aws sts get-caller-identity before each command.", correct: false,
        why: "GetCallerIdentity only returns the identity. It does not add MFA to later requests." },
      { text: "Run aws sts assume-role-with-web-identity with the MFA code as the token.", correct: false,
        why: "This API needs an OIDC token from an identity provider. An MFA code is not such a token, so the call fails." },
      { text: "Create a new pair of long-term access keys for the user.", correct: false,
        why: "Requests made with long-term access keys have no MFA context. The Deny still blocks them." }
    ],
    explanation: "For MFA on the CLI with IAM user keys, call GetSessionToken with SerialNumber and TokenCode, then use the returned access key, secret key, and session token." },

  { id: "g-iam-sts-019", topic: "iam-sts-assume-role", domain: 4,
    stem: "An application runs in containers on several platforms. Sometimes it uses the wrong AWS credentials. The developer wants the application to log the ARN of the principal that its SDK uses at startup. The developer must not grant any new IAM permissions. Which solution will meet these requirements?",
    options: [
      { text: "Call sts:GetCallerIdentity at startup and log the returned ARN.", correct: true,
        why: "GetCallerIdentity returns the account, user ID, and ARN of the caller. It needs no permission, and an explicit deny does not block it." },
      { text: "Call iam:GetUser at startup and log the returned ARN.", correct: false,
        why: "GetUser needs IAM permissions, which the developer must not grant. It also does not describe a role session." },
      { text: "Call sts:DecodeAuthorizationMessage at startup.", correct: false,
        why: "This API decodes an authorization failure message and needs the sts:DecodeAuthorizationMessage permission. It does not report the current identity." },
      { text: "Read the AWS_ACCESS_KEY_ID environment variable and log it.", correct: false,
        why: "The SDK can get credentials from other sources, such as a container endpoint. The variable can be empty or different from what the SDK uses." }
    ],
    explanation: "sts:GetCallerIdentity returns which principal made the call. No permission is required to call it." },

  { id: "g-iam-sts-020", topic: "iam-cross-account", domain: 2,
    stem: "A Lambda function in account A must read objects from an S3 bucket in account B and write the processed results to an S3 bucket in account A in the same run. The function must have access to both buckets at the same time. Which solution will meet these requirements?",
    options: [
      { text: "Add a bucket policy in account B that allows the function execution role to read objects. Add s3:GetObject on the account B bucket to the execution role policy.", correct: true,
        why: "With a resource-based policy, the caller keeps its own permissions. Both accounts allow the read, and the role can still write to the account A bucket." },
      { text: "Create a role in account B that can read the bucket, and have the function assume it for all S3 calls.", correct: false,
        why: "A principal that assumes a role gives up its own permissions. With only the account B role credentials, the function cannot write to the account A bucket." },
      { text: "Add a bucket policy in account B that allows the execution role to read objects. Make no change in account A.", correct: false,
        why: "Across accounts, the identity-based policy must also allow the action. The execution role has no allow for the account B bucket, so reads fail." },
      { text: "Add s3:GetObject on the account B bucket to the execution role policy. Make no change in account B.", correct: false,
        why: "Across accounts, the resource-based policy in account B must also allow the request. Without it, reads fail." }
    ],
    explanation: "Cross-account access needs an allow in both the identity-based policy and the resource-based policy. With a resource-based policy, the caller keeps its own permissions." },

  { id: "g-iam-sts-021", topic: "iam-cross-account", domain: 2,
    stem: "A deployment tool runs with the role DeployRole in account A. It must assume the role TargetRole in account B. Which actions must the developer take? (Choose two.)",
    options: [
      { text: "In account B, edit the TargetRole trust policy to allow the DeployRole ARN (or account A) to perform sts:AssumeRole.", correct: true,
        why: "The trust policy is the resource-based policy on TargetRole. It must name the caller from account A." },
      { text: "In account A, add a policy to DeployRole that allows sts:AssumeRole on the TargetRole ARN.", correct: true,
        why: "Across accounts, the caller identity-based policy must also allow the action. DeployRole needs permission to call AssumeRole on TargetRole." },
      { text: "In account A, edit the DeployRole trust policy to allow account B.", correct: false,
        why: "The DeployRole trust policy controls who can assume DeployRole. It does not let DeployRole assume TargetRole." },
      { text: "In account B, attach a service control policy that allows sts:AssumeRole.", correct: false,
        why: "SCPs never grant permissions. The trust policy and the identity policy are still required." },
      { text: "In account B, create an IAM user and give its access keys to the deployment tool.", correct: false,
        why: "Long-term access keys are less secure than role credentials, and they do not meet the requirement to assume TargetRole." }
    ],
    explanation: "To assume a role across accounts, the role trust policy must trust the caller, and the caller identity-based policy must allow sts:AssumeRole on the role ARN." },

  { id: "g-iam-sts-022", topic: "iam-cross-account", domain: 2,
    stem: "A company uses a third-party monitoring service. The service runs in the vendor's AWS account and monitors the accounts of many customers. The company must give the vendor read-only access to its account in the MOST secure way. Which solution will meet these requirements?",
    options: [
      { text: "Create a role with read-only permissions. In the trust policy, name the vendor account as the principal and require the sts:ExternalId value that the vendor gives the company.", correct: true,
        why: "The vendor includes the company's unique external ID in each AssumeRole call. Another customer of the vendor cannot make the vendor use this role, which prevents the confused deputy problem." },
      { text: "Create an IAM user with read-only permissions, and give its access keys to the vendor.", correct: false,
        why: "Long-term access keys can leak and do not expire. AWS recommends roles for third-party access, so this is not the most secure solution." },
      { text: "Create a role with read-only permissions, and name the vendor account in the trust policy with no conditions.", correct: false,
        why: "Another customer of the vendor could give the vendor this role ARN. Without an external ID, the vendor can become a confused deputy." },
      { text: "Create a role with read-only permissions, and require aws:PrincipalOrgID in the trust policy.", correct: false,
        why: "The vendor account is not in the company's organization, so the vendor could not assume the role at all." }
    ],
    explanation: "For third parties that serve many customers, use a role whose trust policy requires sts:ExternalId. The vendor generates a unique external ID for each customer." },

  { id: "g-iam-sts-023", topic: "iam-cross-account", domain: 2,
    stem: "An S3 bucket in account 111122223333 sends object-created events to a Lambda function in the same account. The function resource-based policy allows the service principal s3.amazonaws.com to call lambda:InvokeFunction with no conditions. The security team wants only this bucket, owned by this account, to be able to invoke the function through Amazon S3. Which solution will meet these requirements?",
    options: [
      { text: "Add aws:SourceArn (the bucket ARN) and aws:SourceAccount (111122223333) conditions to the function resource-based policy statement.", correct: true,
        why: "These keys identify the resource and account that caused the service call. They stop a bucket in another account from using the S3 service principal to invoke the function." },
      { text: "Add an sts:ExternalId condition to the function resource-based policy statement.", correct: false,
        why: "An external ID is a parameter of AssumeRole. Amazon S3 does not send one when it invokes a function, so this does not limit the source bucket." },
      { text: "Add an aws:PrincipalOrgID condition to the function resource-based policy statement.", correct: false,
        why: "The caller is an AWS service principal, not a principal in an organization. This condition does not identify the source bucket." },
      { text: "Add s3.amazonaws.com to the trust policy of the function execution role.", correct: false,
        why: "The execution role trust policy controls who can assume the role. It does not control who can invoke the function." }
    ],
    explanation: "When a resource policy allows an AWS service principal, add aws:SourceArn and aws:SourceAccount to prevent the cross-service confused deputy problem. S3 bucket ARNs do not contain the account ID, so add aws:SourceAccount too." },

  { id: "g-iam-sts-024", topic: "iam-credential-chain", domain: 4,
    stem: "A developer rotated their IAM access keys and saved the new keys in the default profile of ~/.aws/credentials. An application on the developer's computer that uses the AWS SDK still fails with InvalidClientTokenId, which shows that it still sends the old access key. The application creates its clients with no explicit credentials. Which solution will meet these requirements?",
    options: [
      { text: "Remove the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables that still hold the old keys.", correct: true,
        why: "The SDK checks environment variables before the shared credentials file. Old keys in the environment hide the new keys in the file." },
      { text: "Run aws configure again and enter the new keys.", correct: false,
        why: "aws configure writes the credentials file again. The environment variables still come first in the chain, so the old keys are still used." },
      { text: "Move the new keys from the credentials file to the config file.", correct: false,
        why: "The config file is also later in the chain than environment variables. The old keys are still used." },
      { text: "Set the AWS_REGION environment variable.", correct: false,
        why: "The Region does not select credentials. The application still sends the old keys." }
    ],
    explanation: "The SDK credential chain checks environment variables before shared credentials and config files. The first source that has credentials wins." },

  { id: "g-iam-sts-025", topic: "iam-credential-chain", domain: 1,
    stem: "A Python application on an Amazon EC2 instance creates its boto3 clients with an access key ID and secret access key written in the code. The security team requires that the application use no long-term credentials. The developer wants the fewest code changes. Which solution will meet these requirements?",
    options: [
      { text: "Attach an instance profile with a role that has the required permissions. Remove the keys from the code and create the clients with no explicit credentials.", correct: true,
        why: "With no explicit credentials, boto3 uses its default chain. It finds the instance profile credentials in the instance metadata service, and these credentials are temporary and rotated automatically." },
      { text: "Move the keys into environment variables on the instance.", correct: false,
        why: "The keys are still long-term IAM user credentials, so this fails the security requirement." },
      { text: "Store the keys in AWS Secrets Manager and read them at startup.", correct: false,
        why: "The application still uses long-term keys, and the change needs more code. This fails both requirements." },
      { text: "Move the keys into ~/.aws/credentials on the instance.", correct: false,
        why: "The keys are still long-term IAM user credentials on the instance, so this fails the security requirement." }
    ],
    explanation: "On AWS compute, use the role of the service. Create SDK clients with no explicit credentials so that the default chain finds the role credentials." },

  { id: "g-iam-sts-026", topic: "iam-credential-chain", domain: 2,
    stem: "A company manages its workforce users in AWS IAM Identity Center. Developers need AWS CLI access from their computers. The security team does not allow long-term access keys. Which steps will meet these requirements? (Choose two.)",
    options: [
      { text: "Run aws configure sso one time to create a profile for the Identity Center account and permission set.", correct: true,
        why: "This command saves the IAM Identity Center settings in the config file, so the CLI can get short-term credentials for that profile." },
      { text: "Run aws sso login to start a session before the developer runs commands.", correct: true,
        why: "This command signs the developer in to IAM Identity Center. The CLI then uses short-term credentials, with no long-term keys." },
      { text: "Create an IAM user for each developer and run aws configure with its access keys.", correct: false,
        why: "IAM user access keys are long-term credentials, which the security team does not allow." },
      { text: "Copy the instance profile credentials from an EC2 instance to each developer computer.", correct: false,
        why: "These credentials belong to an instance role and expire. Copying them is not a supported or secure access method." },
      { text: "Call GetFederationToken with each developer's IAM user keys.", correct: false,
        why: "GetFederationToken needs IAM user long-term credentials to call it, which the security team does not allow." }
    ],
    explanation: "For workforce users in IAM Identity Center, configure the CLI with aws configure sso and sign in with aws sso login. The CLI then uses short-term credentials." },

  { id: "g-iam-sts-027", topic: "iam-compute-roles", domain: 2,
    stem: "An Amazon ECS service on AWS Fargate starts its tasks successfully. The container image comes from a private Amazon ECR repository. When the application writes to an Amazon DynamoDB table, it gets AccessDenied. Which solution will meet these requirements?",
    options: [
      { text: "Add the DynamoDB permissions to the task role that the task definition specifies in taskRoleArn.", correct: true,
        why: "The task role gives permissions to the application code in the containers. The application needs DynamoDB access there." },
      { text: "Add the DynamoDB permissions to the task execution role.", correct: false,
        why: "The ECS agent uses the task execution role to pull images and send logs. The application code does not get these permissions." },
      { text: "Add the DynamoDB permissions to the EC2 instance profile of the cluster.", correct: false,
        why: "Fargate tasks have no EC2 instance profile available to containers. This does not give the application access." },
      { text: "Store an IAM user access key in the task definition environment variables.", correct: false,
        why: "This puts long-term credentials in the task definition. The task role is the secure way to give the application permissions." }
    ],
    explanation: "ECS task role: permissions for the application code. Task execution role: permissions for the ECS agent to pull images, send logs, and get secrets." },

  { id: "g-iam-sts-028", topic: "iam-compute-roles", domain: 2,
    stem: "An Amazon EventBridge rule must invoke a Lambda function every hour. The function reads items from an Amazon DynamoDB table. Neither part works yet. The developer must use least privilege. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Add dynamodb:GetItem on the table to the function execution role.", correct: true,
        why: "The execution role controls what the function code can call. The function needs read access to the table." },
      { text: "Add a statement to the function resource-based policy that allows events.amazonaws.com to call lambda:InvokeFunction, with aws:SourceArn set to the rule ARN.", correct: true,
        why: "The function resource-based policy controls who can invoke the function. The condition limits it to this rule." },
      { text: "Add events.amazonaws.com to the trust policy of the function execution role.", correct: false,
        why: "This would let EventBridge assume the execution role. It does not give EventBridge permission to invoke the function." },
      { text: "Add lambda:InvokeFunction to the function execution role.", correct: false,
        why: "The execution role is what the function can call. It does not control who can invoke the function." },
      { text: "Add dynamodb:GetItem to the function resource-based policy.", correct: false,
        why: "The function resource-based policy controls access to the function. It cannot give the function access to DynamoDB." }
    ],
    explanation: "Lambda execution role: what the function can call. Function resource-based policy: who can invoke the function." },

  { id: "g-iam-sts-029", topic: "iam-compute-roles", domain: 2,
    stem: "An application on Amazon EC2 instances uses an instance profile. A security review finds that a server-side request forgery (SSRF) bug could let an attacker read the role credentials from the instance metadata service with a simple GET request. The fix must keep the instance profile. Which solution will meet these requirements?",
    options: [
      { text: "Set the instance metadata options so that IMDSv2 tokens are required.", correct: true,
        why: "IMDSv2 needs a session token from a PUT request first. A simple GET request without the token gets a 401 error, which protects against this SSRF case." },
      { text: "Increase the IMDS response hop limit to 3.", correct: false,
        why: "A larger hop limit lets the token response travel further. It does not stop GET requests without a token." },
      { text: "Reduce the maximum session duration of the role to 1 hour.", correct: false,
        why: "EC2 role credentials are not subject to the role maximum session duration. The setting does not protect the credentials." },
      { text: "Remove the instance profile and put IAM user access keys in the application configuration.", correct: false,
        why: "This fails the requirement to keep the instance profile, and it adds long-term credentials that can leak." }
    ],
    explanation: "Require IMDSv2 to protect instance credentials. IMDSv2 needs a token from a PUT request, and requests without a valid token fail when tokens are required." },

  { id: "g-iam-sts-030", topic: "iam-compute-roles", domain: 2,
    stem: "A company runs the same application in five Amazon EKS clusters on Linux EC2 nodes. The application pods need access to Amazon S3. Pods of other applications on the same nodes must not get this access. The IAM team does not want to change the role trust policy each time a cluster is added, and the team does not want to manage OIDC identity providers. Which solution will meet these requirements?",
    options: [
      { text: "Use EKS Pod Identity. Make the role trust the service principal pods.eks.amazonaws.com, and associate the role with the application service account in each cluster.", correct: true,
        why: "EKS Pod Identity needs no OIDC provider and uses one trust principal for all clusters. Only pods that use the associated service account get the role." },
      { text: "Use IAM roles for service accounts (IRSA) with an OIDC provider for each cluster.", correct: false,
        why: "IRSA needs an OIDC provider for each cluster and a trust policy entry for each one. This fails both IAM team requirements." },
      { text: "Add the S3 permissions to the node IAM role.", correct: false,
        why: "Every pod on the nodes can use the node role credentials. Other applications would get S3 access, which fails a requirement." },
      { text: "Store IAM user access keys in a Kubernetes secret for the application.", correct: false,
        why: "This uses long-term credentials that the team must rotate and protect. It is not a secure role-based solution." }
    ],
    explanation: "EKS Pod Identity maps an IAM role to a Kubernetes service account. The role trusts pods.eks.amazonaws.com, so no trust change or OIDC provider is needed for each cluster." },

  { id: "g-iam-sts-031", topic: "iam-federation", domain: 2,
    stem: "A company is building a mobile app. Users sign in with Google or with an Amazon Cognito user pool. Each signed-in user must upload photos directly to an Amazon S3 bucket. The app must not contain AWS credentials. Which solution will meet these requirements?",
    options: [
      { text: "Use an Amazon Cognito identity pool with Google and the user pool as identity providers. Give the authenticated role permission to upload to the bucket.", correct: true,
        why: "The identity pool exchanges the user's token for temporary AWS credentials for the authenticated role. The app needs no stored AWS credentials." },
      { text: "Create an IAM user for each app user, and send its access keys to the app after sign-in.", correct: false,
        why: "This creates long-term credentials on devices and does not scale. AWS recommends temporary credentials for app users." },
      { text: "Store one IAM user access key in the app code, and use it for all uploads.", correct: false,
        why: "This puts AWS credentials in the app, which fails the requirement." },
      { text: "Use AWS IAM Identity Center and assign each app user a permission set.", correct: false,
        why: "IAM Identity Center is for workforce users. It is not for the customers of a mobile app." }
    ],
    explanation: "Cognito identity pools give app users temporary AWS credentials for an IAM role. Do not put long-term AWS credentials in mobile or web apps." },

  { id: "g-iam-sts-032", topic: "iam-federation", domain: 2,
    stem: "A company has 40 AWS accounts in AWS Organizations. Employees sign in with the corporate Active Directory. The employees need console and AWS CLI access to different accounts, with central management and the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Use AWS IAM Identity Center with Active Directory as the identity source, and assign permission sets to groups for each account.", correct: true,
        why: "AWS recommends IAM Identity Center for workforce access to many accounts. It gives short-term credentials for the console and the CLI from one place." },
      { text: "Create a SAML 2.0 identity provider and IAM roles in each of the 40 accounts.", correct: false,
        why: "This works, but you must manage the provider and roles in 40 accounts. It fails the least operational overhead requirement." },
      { text: "Create IAM users with the same names in each account.", correct: false,
        why: "This creates many long-term identities to manage and does not use the corporate directory. It fails the central management requirement." },
      { text: "Use an Amazon Cognito identity pool with Active Directory as the provider.", correct: false,
        why: "Cognito identity pools are for the users of your applications, not for workforce access to the console and CLI across accounts." }
    ],
    explanation: "Use IAM Identity Center for workforce users across many accounts. Use IAM identity providers for one standalone account, and Cognito for app users." },

  { id: "g-iam-sts-033", topic: "iam-federation", domain: 2,
    stem: "A GitHub Actions workflow deploys an application to AWS. Today it uses IAM user access keys that are stored as GitHub secrets. The security team wants to remove all long-term AWS credentials from the workflow. Which solution will meet these requirements?",
    options: [
      { text: "Create an IAM OIDC identity provider for GitHub. Create a role that trusts it for sts:AssumeRoleWithWebIdentity, with conditions on the token audience and subject. Configure the workflow to assume the role.", correct: true,
        why: "The workflow exchanges its GitHub OIDC token for temporary credentials. The conditions limit which repositories and branches can assume the role." },
      { text: "Rotate the IAM user access keys every 30 days.", correct: false,
        why: "Rotated access keys are still long-term credentials, so this fails the requirement." },
      { text: "Create a SAML 2.0 identity provider and call AssumeRoleWithSAML from the workflow.", correct: false,
        why: "GitHub Actions issues OIDC tokens, not SAML assertions, so the workflow cannot use this API." },
      { text: "Store the access keys in AWS Secrets Manager and read them from the workflow.", correct: false,
        why: "The workflow still needs credentials to read the secret, and the deploy still uses long-term keys." }
    ],
    explanation: "For CI/CD systems outside AWS that issue OIDC tokens, use OIDC federation with AssumeRoleWithWebIdentity. Limit the role trust policy with token claim conditions." },

  { id: "g-iam-sts-034", topic: "iam-least-privilege", domain: 2,
    stem: "An application role has the PowerUserAccess managed policy. The application has run in production for 60 days, and an AWS CloudTrail trail logs the account management events. The team wants a least-privilege policy that contains only the actions the role used, with the LEAST effort. Which solution will meet these requirements?",
    options: [
      { text: "Use IAM Access Analyzer policy generation for the role with the CloudTrail trail and a 60-day range. Review the generated policy and replace PowerUserAccess.", correct: true,
        why: "Policy generation reads up to 90 days of CloudTrail events and creates a policy template with the actions the role used." },
      { text: "Use the IAM policy simulator to test each action of PowerUserAccess.", correct: false,
        why: "The simulator tests what policies allow. It does not show which actions the role used, and testing each action takes much effort." },
      { text: "Create an IAM Access Analyzer external access analyzer for the account.", correct: false,
        why: "An external access analyzer finds resources shared outside the zone of trust. It does not generate a policy from activity." },
      { text: "Search the CloudTrail logs manually and write a new policy.", correct: false,
        why: "This can work, but it takes much more effort than automatic policy generation." }
    ],
    explanation: "IAM Access Analyzer policy generation creates a policy from up to 90 days of CloudTrail activity. It does not include data events or iam:PassRole, so review the result." },

  { id: "g-iam-sts-035", topic: "iam-least-privilege", domain: 2,
    stem: "A company adds new projects every week. Developers on a project must manage only the Amazon EC2 instances and Amazon S3 objects of their own project. The security team does not want to update IAM policies each time a project is added. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Tag each developer role and each project resource with a project tag.", correct: true,
        why: "ABAC uses tags on principals and resources as the attributes that the policy compares." },
      { text: "Use one policy with a condition that aws:ResourceTag/project equals ${aws:PrincipalTag/project}.", correct: true,
        why: "The condition compares the resource tag with the principal tag. A new project needs only new tags, not a policy change." },
      { text: "Create a new IAM role and policy for each project that lists the project resource ARNs.", correct: false,
        why: "This is RBAC. Each new project needs a new policy, which fails the requirement." },
      { text: "Create a permissions boundary for each project.", correct: false,
        why: "A boundary only limits permissions and must be created for each project. The team must still change IAM for every new project." },
      { text: "Create a service control policy for each project.", correct: false,
        why: "SCPs apply to whole accounts or OUs, not to projects inside an account. They also never grant permissions." }
    ],
    explanation: "Attribute-based access control (ABAC) compares tags on principals and resources. New projects need new tags only, not new policies." },

  { id: "g-iam-sts-036", topic: "iam-troubleshooting", domain: 4,
    stem: "A developer role in a member account of AWS Organizations has the AdministratorAccess managed policy. A call to codecommit:ListRepositories fails with this message: 'is not authorized to perform: codecommit:ListRepositories with an explicit deny in a service control policy'. Which solution will meet these requirements?",
    options: [
      { text: "Ask the organization administrator to change the SCP that denies the action for this account.", correct: true,
        why: "The message names an explicit deny in an SCP. Only a change to the SCP by the organization administrator can remove the deny. IAM changes in the member account cannot." },
      { text: "Add an inline policy that allows codecommit:ListRepositories to the developer role.", correct: false,
        why: "An explicit deny overrides any allow. The role already has AdministratorAccess, so another allow does not help." },
      { text: "Add codecommit:ListRepositories to the permissions boundary of the developer role.", correct: false,
        why: "The message does not name a boundary. The explicit deny in the SCP still blocks the call." },
      { text: "Run aws sts decode-authorization-message on the error.", correct: false,
        why: "The message is not encoded, and it already names the policy type. Decoding does not remove the deny." }
    ],
    explanation: "Access denied messages name the policy type. 'With an explicit deny in a service control policy' means that only the SCP owner can fix the problem." },

  { id: "g-iam-sts-037", topic: "iam-troubleshooting", domain: 4,
    stem: "A developer runs a script that starts Amazon EC2 instances. The call fails with UnauthorizedOperation and includes an encoded authorization failure message. The developer wants to see whether an explicit deny caused the failure and which condition values were in the request. Which solution will meet these requirements?",
    options: [
      { text: "Get the sts:DecodeAuthorizationMessage permission and run aws sts decode-authorization-message with the encoded message.", correct: true,
        why: "The decoded message shows explicit or implicit deny, the principal, the action, the resource, and the condition key values of the request." },
      { text: "Run aws sts get-caller-identity.", correct: false,
        why: "This shows only which principal made the call. It does not explain why the request was denied." },
      { text: "Run IAM Access Analyzer policy validation on the role policy.", correct: false,
        why: "Policy validation checks grammar and best practices. It does not decode the failure or show the request condition values." },
      { text: "Turn on AWS X-Ray tracing for the script.", correct: false,
        why: "X-Ray traces requests for performance analysis. It does not decode IAM authorization failures." }
    ],
    explanation: "Some services, such as Amazon EC2, return an encoded authorization message. Decode it with sts:DecodeAuthorizationMessage, which needs its own permission." },

  { id: "g-iam-sts-038", topic: "iam-troubleshooting", domain: 4,
    stem: "A Lambda function in account A reads objects from an S3 bucket in account B. The bucket policy allows the function execution role to call s3:GetObject. The execution role policy allows s3:GetObject on the bucket objects. The objects are encrypted with SSE-KMS by a customer managed key in account B. The function still gets AccessDenied. Which actions will fix the problem? (Choose two.)",
    options: [
      { text: "Edit the key policy in account B to allow the execution role to use kms:Decrypt.", correct: true,
        why: "A KMS key policy must allow the principal. For cross-account use, the key policy in account B must allow the role from account A." },
      { text: "Add kms:Decrypt on the key ARN to the execution role policy in account A.", correct: true,
        why: "Across accounts, the caller identity-based policy must also allow the KMS action on the key in account B." },
      { text: "Add another s3:GetObject statement to the bucket policy.", correct: false,
        why: "The bucket policy already allows the read. The missing permission is for the KMS key, so the read still fails." },
      { text: "Change the bucket to use the AWS managed key aws/s3 for new objects.", correct: false,
        why: "You cannot change the key policy of an AWS managed key, so you cannot share it with account A. Existing objects also keep their current key." },
      { text: "Add account B to the trust policy of the execution role.", correct: false,
        why: "The trust policy controls who can assume the role. It does not give the role permission to use the KMS key." }
    ],
    explanation: "To read SSE-KMS objects across accounts, the key policy must allow the caller, and the caller identity policy must allow kms:Decrypt, in addition to the S3 permissions." }

] });
