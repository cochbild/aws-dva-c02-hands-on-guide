window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "m08-cicd", questions: [

  { id: "m08-001", topic: "cicd-codecommit", domain: 3,
    stem: "A company has 12 CodeArtifact repositories in one domain, one for each team. Each team build downloads open-source packages from npmjs.com. The company wants every repository to use public npm packages, and wants each public package version stored only once. The solution must need the least ongoing configuration. Which solution will meet these requirements?",
    options: [
      { text: "Add an external connection to npmjs.com on one repository in the domain, and configure that repository as an upstream repository of the 12 team repositories.", correct: true,
        why: "This is the recommended CodeArtifact pattern. Packages fetched one time from npmjs.com are available to all downstream repositories, and the domain stores each asset once." },
      { text: "Add an external connection to npmjs.com on each of the 12 team repositories.", correct: false,
        why: "This works, but it is 12 connections to manage, and each repository fetches public packages separately. It fails the least-configuration requirement and does not follow the recommended pattern." },
      { text: "Configure each build to download packages directly from npmjs.com, and publish them to its team repository.", correct: false,
        why: "Every team must run and maintain its own copy step. This adds ongoing work and fails the least-configuration requirement." },
      { text: "Create a second CodeArtifact domain for public packages, and add it as an external connection.", correct: false,
        why: "An external connection points to a public repository, not to another domain. Also, a repository belongs to one domain only, so this design is not possible." }
    ],
    explanation: "In CodeArtifact, use one repository per domain with the external connection to a public repository, and make it an upstream of the other repositories. Then you manage one connection, each public package version comes in one time, and the domain stores each asset once for all repositories." },

  { id: "m08-002", topic: "cicd-codecommit", domain: 2,
    stem: "A CodeBuild project runs a Maven build that must download packages from a CodeArtifact repository. The buildspec runs aws codeartifact get-authorization-token and stores the token in CODEARTIFACT_AUTH_TOKEN. The command fails with an AccessDenied error. The developer must grant the minimum permissions. Which permissions must the developer add to the CodeBuild service role? (Choose two.)",
    options: [
      { text: "codeartifact:GetAuthorizationToken on the domain", correct: true,
        why: "The GetAuthorizationToken API needs this permission. Without it, the build cannot get a token." },
      { text: "sts:GetServiceBearerToken", correct: true,
        why: "CodeArtifact needs sts:GetServiceBearerToken together with codeartifact:GetAuthorizationToken to create the token." },
      { text: "ecr:GetAuthorizationToken", correct: false,
        why: "This permission creates Amazon ECR registry tokens. It does not create CodeArtifact tokens, so it does not fix the error." },
      { text: "codeartifact:* on all resources", correct: false,
        why: "This includes the needed action, but it also grants publish and delete actions. It fails the minimum-permissions requirement." },
      { text: "sts:AssumeRole on the CodeBuild service role", correct: false,
        why: "The build already runs with the service role. Assuming the role again does not add the missing token permissions." }
    ],
    explanation: "To call the CodeArtifact GetAuthorizationToken API, a principal needs both codeartifact:GetAuthorizationToken and sts:GetServiceBearerToken." },

  { id: "m08-003", topic: "codebuild-buildspec", domain: 3,
    stem: "A buildspec starts a local test database in the build phase, runs integration tests, and then stops the database. When a test command fails, the command that stops the database does not run. The stop command must run every time, even when tests fail. Which solution will meet these requirements?",
    options: [
      { text: "Move the stop command to a finally block in the build phase.", correct: true,
        why: "Commands in a finally block run after the commands block, even if a command in the commands block fails." },
      { text: "Move the stop command to the end of the build phase commands list.", correct: false,
        why: "When a command fails, CodeBuild skips the remaining commands in that block. The stop command still does not run after a test failure." },
      { text: "Move the stop command to the install phase.", correct: false,
        why: "The install phase runs before the build phase. The command would stop the database before the tests start." },
      { text: "Increase the build timeout to 2,160 minutes.", correct: false,
        why: "The timeout controls how long a build can run. It does not make skipped commands run after a failure." }
    ],
    explanation: "Each buildspec phase can have a finally block. CodeBuild runs it even when a command in the phase fails." },

  { id: "m08-004", topic: "codebuild-buildspec", domain: 3,
    stem: "A repository has buildspec.yml at its root for test builds. A release build project must use config/buildspec-release.yml from the same repository. The team does not want to move or rename files in the repository. Which solution will meet these requirements?",
    options: [
      { text: "Set the buildspec of the release build project to config/buildspec-release.yml.", correct: true,
        why: "A project can point to a buildspec file with a different name and path, relative to the source directory. No file changes are needed." },
      { text: "Store the release buildspec in an S3 bucket in a different Region, and set the project buildspec to the S3 object ARN.", correct: false,
        why: "A buildspec in Amazon S3 must be in the same Region as the build project. This configuration does not work." },
      { text: "Add a second buildspec section to buildspec.yml for release builds.", correct: false,
        why: "A build project uses only one buildspec. CodeBuild does not select a second section in the same file." },
      { text: "Set an environment variable named CODEBUILD_BUILDSPEC to the release file path in the project.", correct: false,
        why: "The CODEBUILD_ prefix is reserved for internal use. A custom variable does not change which buildspec CodeBuild uses." }
    ],
    explanation: "Override the default buildspec location in the project settings, or with buildspecOverride on StartBuild. The path is relative to CODEBUILD_SRC_DIR." },

  { id: "m08-005", topic: "codebuild-buildspec", domain: 3,
    stem: "A build creates target/app.jar. The repository has appspec.yml at its root. CodeDeploy needs one artifact .zip file with appspec.yml and app.jar both at the top level, with no target directory. Which buildspec artifacts settings will meet these requirements? (Choose two.)",
    options: [
      { text: "List appspec.yml and target/app.jar under artifacts files.", correct: true,
        why: "The files list selects which build outputs go into the artifact. Both files must be in the list." },
      { text: "Set discard-paths to yes.", correct: true,
        why: "discard-paths puts all artifact files at the top level. target/app.jar becomes app.jar at the root, next to appspec.yml." },
      { text: "Set base-directory to target.", correct: false,
        why: "With base-directory set to target, file paths are relative to target. appspec.yml is at the repository root, so it is not in the artifact." },
      { text: "Define app.jar as a secondary artifact.", correct: false,
        why: "A secondary artifact is a separate output. CodeDeploy needs one bundle with both files, so this fails the requirement." },
      { text: "Add target/app.jar to the cache paths.", correct: false,
        why: "The cache saves files for later builds. It does not put files in the output artifact." },
      { text: "Add the file name to exported-variables.", correct: false,
        why: "Exported variables pass values to later pipeline actions. They do not add files to the artifact." }
    ],
    explanation: "The artifacts files list selects outputs. discard-paths: yes flattens the directory structure so that all files are at the top level." },

  { id: "m08-006", topic: "codebuild-env", domain: 2,
    stem: "A buildspec contains a database password in env variables in plaintext. The integration tests need the password as an environment variable. A security review requires that the password is not stored in the buildspec or in the project in plaintext, and that it is masked in build logs. The developer wants the fewest changes to the build commands. Which solution will meet these requirements?",
    options: [
      { text: "Store the password in AWS Secrets Manager, reference it in the env secrets-manager section with the same variable name, and allow secretsmanager:GetSecretValue in the CodeBuild service role.", correct: true,
        why: "CodeBuild resolves the secret into the same environment variable and masks the value in logs. The build commands do not change." },
      { text: "Move the password to a plaintext environment variable in the build project settings.", correct: false,
        why: "Project environment variables of type plaintext can be displayed in the console and the AWS CLI. This fails the security requirement." },
      { text: "Store the password Base64-encoded in env variables, and decode it in the build commands.", correct: false,
        why: "Base64 is an encoding, not encryption. The value stays readable in the buildspec, and the decoded value is not masked." },
      { text: "Commit the password to a .env file in the repository, and read it in the build commands.", correct: false,
        why: "The password is stored in source control in plaintext. This fails the security requirement and also changes the build commands." }
    ],
    explanation: "Use env parameter-store or env secrets-manager for sensitive values. CodeBuild masks those values in logs. Plaintext variables can be displayed." },

  { id: "m08-007", topic: "codebuild-env", domain: 4,
    stem: "A developer configures a CodeBuild project to use a VPC so that tests can reach an Amazon RDS database in a private subnet. After the change, the install phase fails because pip cannot download packages from the internet. Which solution will meet these requirements?",
    options: [
      { text: "Configure the project to use private subnets that have a route to a NAT gateway in a public subnet.", correct: true,
        why: "VPC builds reach public endpoints through a NAT gateway or NAT instance. The private subnets also keep access to the database." },
      { text: "Configure the project to use public subnets that have a route to an internet gateway.", correct: false,
        why: "CodeBuild does not assign public IP addresses to its network interfaces. An internet gateway alone does not give the build internet access." },
      { text: "Add an inbound rule for HTTPS to the build security group.", correct: false,
        why: "The build starts outbound connections. Builds need no inbound rules, so this does not restore internet access." },
      { text: "Increase the build timeout and queued timeout.", correct: false,
        why: "The failure is a network path problem. More time does not create a route to the internet." }
    ],
    explanation: "For a VPC-enabled build, select private subnets and route internet traffic through a NAT gateway or NAT instance." },

  { id: "m08-008", topic: "codebuild-env", domain: 4,
    stem: "A CodeBuild project builds a Docker image and pushes it to Amazon ECR. The build fails with \"Cannot connect to the Docker daemon\". After the fix, the team also wants repeated builds to reuse unchanged image layers to reduce build time. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Turn on privileged mode in the build project environment.", correct: true,
        why: "Privileged mode lets the Docker daemon run inside the build container, so docker build can run." },
      { text: "Configure a local cache with the Docker layer cache mode.", correct: true,
        why: "The Docker layer cache keeps image layers for later builds on the same host. It requires privileged mode, which the other action turns on." },
      { text: "Select a larger compute type.", correct: false,
        why: "More CPU and memory do not start the Docker daemon, and they do not reuse layers between builds." },
      { text: "Add run-as: root to the buildspec.", correct: false,
        why: "Commands already run as root when run-as is not set. The Docker daemon still cannot run without privileged mode." },
      { text: "Set git-credential-helper to yes in the buildspec.", correct: false,
        why: "This setting provides Git credentials. It has no effect on Docker." }
    ],
    explanation: "Docker builds in CodeBuild need privileged mode. The local Docker layer cache mode reuses layers and also requires privileged mode." },

  { id: "m08-009", topic: "codedeploy-lambda", domain: 3,
    stem: "A team deploys a Lambda function with AWS SAM. For each release, 10 percent of traffic must go to the new version for 10 minutes, and then all traffic must move. If the function error rate alarm goes into the ALARM state during the release, traffic must return to the old version automatically. Which solution will meet these requirements with the least operational overhead?",
    options: [
      { text: "Add AutoPublishAlias to the function, and add a DeploymentPreference with Type Canary10Percent10Minutes and the error alarm in Alarms.", correct: true,
        why: "SAM publishes a version, creates the CodeDeploy resources, shifts 10 percent for 10 minutes, and rolls back if the alarm goes into the ALARM state." },
      { text: "Add a DeploymentPreference with Type Linear10PercentEvery1Minute and the error alarm in Alarms.", correct: false,
        why: "Linear moves 10 percent more every minute. It does not hold 10 percent for 10 minutes, so it fails the traffic requirement." },
      { text: "Add a DeploymentPreference with Type AllAtOnce and the error alarm in Alarms.", correct: false,
        why: "All traffic moves at once. There is no 10 percent stage, so it fails the traffic requirement." },
      { text: "Configure a canary release on the API Gateway stage, and promote it manually after 10 minutes.", correct: false,
        why: "A person must watch and promote the canary. There is no alarm-based automatic rollback, and the manual work adds overhead." }
    ],
    explanation: "In AWS SAM, AutoPublishAlias with DeploymentPreference uses CodeDeploy for canary or linear traffic shifting with alarm-based rollback." },

  { id: "m08-010", topic: "codedeploy-lambda", domain: 4,
    stem: "A CodeDeploy deployment for a Lambda function uses a BeforeAllowTraffic hook function. CloudWatch Logs show that the hook function runs its tests and they pass. The deployment still fails after about one hour, and no traffic moves to the new version. Which solution will meet these requirements?",
    options: [
      { text: "Update the hook function to call PutLifecycleEventHookExecutionStatus with Succeeded, and allow codedeploy:PutLifecycleEventHookExecutionStatus in its role.", correct: true,
        why: "CodeDeploy waits for the hook to report a status. Without the call, the deployment fails after one hour." },
      { text: "Increase the hook function timeout to 15 minutes.", correct: false,
        why: "The function already finishes its tests. A longer timeout does not send the status that CodeDeploy waits for." },
      { text: "Move the tests to an AfterAllowTraffic hook.", correct: false,
        why: "An AfterAllowTraffic hook must also report its status. The same failure would occur, after traffic has already moved." },
      { text: "Install the CodeDeploy agent in a Lambda layer.", correct: false,
        why: "Lambda deployments do not use the CodeDeploy agent. The agent is for EC2 and on-premises instances." }
    ],
    explanation: "A Lambda or ECS hook function must call PutLifecycleEventHookExecutionStatus. If CodeDeploy gets no status within one hour, the deployment fails." },

  { id: "m08-011", topic: "codedeploy-lambda", domain: 4,
    stem: "A team uses CodeDeploy with LambdaCanary10Percent30Minutes for a function that has an alias named live. During the canary period, monitoring shows that all requests from the client application run the new code at once, not 10 percent. The client calls the Invoke API with the unqualified function name. Which solution will meet these requirements?",
    options: [
      { text: "Change the client to invoke the function through the live alias.", correct: true,
        why: "CodeDeploy shifts traffic by changing the weights on the alias. An unqualified name invokes $LATEST, which bypasses the alias and the canary." },
      { text: "Change the deployment configuration to LambdaLinear10PercentEvery10Minutes.", correct: false,
        why: "Linear also shifts traffic through the alias. The client still bypasses the alias, so the problem stays." },
      { text: "Configure reserved concurrency on the function.", correct: false,
        why: "Reserved concurrency limits concurrent executions. It does not route traffic between versions." },
      { text: "Publish a new version before each client request.", correct: false,
        why: "Publishing versions does not change which version an unqualified invocation runs. It also adds work and gives no traffic split." }
    ],
    explanation: "CodeDeploy for Lambda shifts traffic through an alias. Clients must invoke the alias ARN to get the traffic split." },

  { id: "m08-012", topic: "codedeploy-ec2", domain: 3,
    stem: "A CodeDeploy in-place deployment to Amazon Linux instances copies application files to /opt/app. After the files are copied, a script must set file permissions and write a configuration file. The script must run before the application starts. In which lifecycle event hook should the developer run the script?",
    options: [
      { text: "AfterInstall", correct: true,
        why: "AfterInstall runs after the agent copies the revision files to their destination and before ApplicationStart. Use it for configuration and file permissions." },
      { text: "BeforeInstall", correct: false,
        why: "BeforeInstall runs before the agent copies the files. The new files do not exist yet, so the script cannot set their permissions." },
      { text: "Install", correct: false,
        why: "Install is reserved for the CodeDeploy agent. You cannot attach scripts to it." },
      { text: "ValidateService", correct: false,
        why: "ValidateService runs after ApplicationStart. The application would start before its configuration exists." }
    ],
    explanation: "EC2 in-place order: ApplicationStop, DownloadBundle, BeforeInstall, Install, AfterInstall, ApplicationStart, ValidateService (plus traffic hooks with a load balancer). AfterInstall is the first hook after the agent copies the files and the last one before the application starts, so configuration and permission scripts go there." },

  { id: "m08-013", topic: "codedeploy-ec2", domain: 4,
    stem: "Every CodeDeploy deployment to an EC2 deployment group fails in the ApplicationStop event. The developer finds a bug in scripts/stop.sh, fixes it in a new revision, and deploys again. The deployment still fails in ApplicationStop. Which solution will meet these requirements?",
    options: [
      { text: "Create a new deployment of the fixed revision with the --ignore-application-stop-failures option.", correct: true,
        why: "ApplicationStop runs the scripts from the last successful revision, which still has the bug. This option lets the deployment continue past that failure, and later deployments use the fixed script." },
      { text: "Increase the timeout of the ApplicationStop script to 7,200 seconds.", correct: false,
        why: "The maximum is 3,600 seconds for each lifecycle event. Also, the old script fails because of a bug, not because of time." },
      { text: "Change the deployment configuration to CodeDeployDefault.AllAtOnce.", correct: false,
        why: "The configuration controls how many instances update at the same time. Each instance still runs the old, broken script." },
      { text: "Move the stop logic from ApplicationStop to BeforeInstall in the new revision.", correct: false,
        why: "ApplicationStop still runs the old revision's broken script first, so the deployment still fails." }
    ],
    explanation: "ApplicationStop uses the AppSpec and scripts from the last successful revision. Use --ignore-application-stop-failures to get past a broken old script." },

  { id: "m08-014", topic: "codedeploy-ec2", domain: 3,
    stem: "A company deploys an application to 20 EC2 instances with CodeDeploy. When a deployment fails, or when a CloudWatch alarm for HTTP 5xx errors goes into the ALARM state, the last working version must be deployed again automatically. The solution must need the least operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Turn on automatic rollback in the deployment group for failed deployments and for alarm thresholds, and add the 5xx alarm to the deployment group.", correct: true,
        why: "CodeDeploy then deploys the last known good revision automatically, as a new deployment, when either trigger occurs." },
      { text: "Create an SNS topic for deployment failures, and subscribe a Lambda function that calls CreateDeployment with the previous revision.", correct: false,
        why: "This rebuilds a feature that CodeDeploy already has. It adds code to maintain, so it fails the least-overhead requirement." },
      { text: "Turn on versioning on the S3 bucket that stores the revisions.", correct: false,
        why: "Versioning keeps old bundles, but nothing deploys them. It does not roll back automatically." },
      { text: "Change the deployment configuration to CodeDeployDefault.OneAtATime.", correct: false,
        why: "OneAtATime limits how many instances update at the same time. It does not deploy the previous revision again." }
    ],
    explanation: "CodeDeploy automatic rollback triggers on deployment failure or on alarm thresholds. It redeploys the last known good revision as a new deployment with a new ID." },

  { id: "m08-015", topic: "codedeploy-ecs", domain: 3,
    stem: "A team uses CodeDeploy blue/green deployments for an Amazon ECS service behind an Application Load Balancer. Before production traffic moves, automated tests must run against the replacement task set through port 8080. If the tests fail, the deployment must roll back. Which solution will meet these requirements?",
    options: [
      { text: "Add a test listener on port 8080 to the deployment group, and add an AfterAllowTestTraffic hook that runs the tests.", correct: true,
        why: "The test listener sends traffic to the replacement task set. The AfterAllowTestTraffic hook runs at that point, and a failed result can trigger a rollback." },
      { text: "Add a BeforeInstall hook that runs the tests.", correct: false,
        why: "BeforeInstall runs before the replacement task set exists, and a rollback is not possible at that point." },
      { text: "Add a ValidateService hook that runs the tests.", correct: false,
        why: "ValidateService is an EC2/On-Premises hook. ECS deployments do not have it." },
      { text: "Use one target group for both the production listener and the test listener.", correct: false,
        why: "CodeDeploy blue/green for ECS needs two target groups. With one target group, the original and replacement task sets cannot be separated." }
    ],
    explanation: "ECS hooks run in this order: BeforeInstall, AfterInstall, AfterAllowTestTraffic, BeforeAllowTraffic, AfterAllowTraffic. Test traffic needs a test listener." },

  { id: "m08-016", topic: "codedeploy-ecs", domain: 3,
    stem: "A developer is setting up an existing Amazon ECS service on Fargate for CodeDeploy blue/green deployments with canary traffic shifting through an Application Load Balancer. Which configurations are required? (Choose two.)",
    options: [
      { text: "Set the service deployment controller type to CODE_DEPLOY.", correct: true,
        why: "CodeDeploy can manage ECS deployments only for services that use the CODE_DEPLOY deployment controller." },
      { text: "Create two target groups, and add them as a target group pair in the CodeDeploy deployment group.", correct: true,
        why: "One target group serves the original task set and the other serves the replacement task set. CodeDeploy moves traffic between them." },
      { text: "Turn on the deployment circuit breaker with rollback.", correct: false,
        why: "The circuit breaker works only with the rolling update (ECS) deployment type. It is not used by CodeDeploy blue/green." },
      { text: "Replace the Application Load Balancer with a Network Load Balancer, and use CodeDeployDefault.ECSCanary10Percent5Minutes.", correct: false,
        why: "With a Network Load Balancer, only CodeDeployDefault.ECSAllAtOnce is supported. This fails the canary requirement." },
      { text: "Install the CodeDeploy agent in the container image.", correct: false,
        why: "ECS deployments do not use the CodeDeploy agent. CodeDeploy works with ECS task sets and the load balancer." },
      { text: "Set minimumHealthyPercent to 50 in the service.", correct: false,
        why: "For CODE_DEPLOY services with Fargate tasks, ECS does not use the minimum healthy percent value." }
    ],
    explanation: "CodeDeploy blue/green for ECS needs the CODE_DEPLOY controller, two target groups, and a production listener. A test listener is optional." },

  { id: "m08-017", topic: "cicd-codepipeline", domain: 3,
    stem: "A pipeline deploys to a staging environment and then to production. A release manager must review staging and approve before the production deployment starts. The release manager must get an email when a review is needed. Which solution will meet these requirements with the least operational overhead?",
    options: [
      { text: "Add a manual approval action before the production stage, and configure it to publish to an SNS topic that has the release manager's email subscribed.", correct: true,
        why: "The approval action stops the pipeline until someone approves or rejects. It publishes the notification, with a link to the review, to the SNS topic." },
      { text: "Add a Lambda invoke action that waits until the release manager replies to an email.", correct: false,
        why: "A Lambda function can run for 15 minutes at most, and you must write and maintain the email logic. This fails the least-overhead requirement." },
      { text: "Disable the transition to the production stage, and ask the release manager to enable it after the review.", correct: false,
        why: "A disabled transition sends no notification. The release manager would not get an email." },
      { text: "Add a CodeBuild action that runs a sleep command for 24 hours.", correct: false,
        why: "A timed wait does not ask for approval, and it adds build cost. Production would start without a review." }
    ],
    explanation: "A CodePipeline manual approval action stops the pipeline and can notify approvers through Amazon SNS. A rejection or no response in seven days fails the action." },

  { id: "m08-018", topic: "cicd-codepipeline", domain: 3,
    stem: "Developers push many commits to the main branch in a short time. The pipeline must process every commit through all stages, one at a time, in the order of the commits. No execution can be skipped. Which solution will meet these requirements?",
    options: [
      { text: "Use a V2 pipeline and set the execution mode to QUEUED.", correct: true,
        why: "In QUEUED mode, executions wait in order at each locked stage, and newer executions do not overtake older ones." },
      { text: "Keep the default SUPERSEDED execution mode.", correct: false,
        why: "In SUPERSEDED mode, a newer execution replaces an older one that waits between stages. Some commits would be skipped." },
      { text: "Use a V2 pipeline and set the execution mode to PARALLEL.", correct: false,
        why: "PARALLEL executions run at the same time and do not wait for each other. They are not processed one at a time in order." },
      { text: "Disable the transition after the source stage, and enable it after each execution finishes.", correct: false,
        why: "A waiting execution can still be superseded while the transition is disabled. It also needs manual work for every commit." }
    ],
    explanation: "SUPERSEDED is the default mode. QUEUED and PARALLEL need a V2 pipeline. QUEUED processes executions in order without skipping. SUPERSEDED lets a newer execution replace an older waiting one, so some commits never deploy." },

  { id: "m08-019", topic: "cicd-codepipeline", domain: 3,
    stem: "A pipeline deploys a CloudFormation stack to production. An engineer must review the exact resource changes and approve them before CloudFormation changes the stack. Which CodePipeline actions, in order, will meet these requirements? (Choose three.)",
    options: [
      { text: "A CloudFormation action with ActionMode CHANGE_SET_REPLACE", correct: true,
        why: "This creates a change set that lists the resource changes. It does not change the stack." },
      { text: "A manual approval action after the change set is created", correct: true,
        why: "The pipeline stops so that the engineer can review the change set and approve or reject it." },
      { text: "A CloudFormation action with ActionMode CHANGE_SET_EXECUTE after the approval", correct: true,
        why: "This runs the reviewed change set. CloudFormation changes the stack only at this point." },
      { text: "A CloudFormation action with ActionMode CREATE_UPDATE", correct: false,
        why: "CREATE_UPDATE changes the stack directly. There is no change set to review first, so it fails the review requirement." },
      { text: "A CloudFormation action with ActionMode REPLACE_ON_FAILURE", correct: false,
        why: "This mode can delete and create the stack again. AWS recommends it for testing only, and it gives no review step." },
      { text: "A CloudFormation action with ActionMode DELETE_ONLY", correct: false,
        why: "DELETE_ONLY deletes the stack. It does not deploy or show changes." }
    ],
    explanation: "Use CHANGE_SET_REPLACE to create a change set, a manual approval to review it, and CHANGE_SET_EXECUTE to apply it." },

  { id: "m08-020", topic: "cicd-codepipeline", domain: 3,
    stem: "A team pushes commits to many feature branches every day. The production pipeline must start only when someone pushes a Git tag that starts with release-. Pushes to branches must not start it. The solution must need the least operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Use a V2 pipeline with a trigger that filters on Git tags that match release-*.", correct: true,
        why: "V2 pipelines support trigger filters on Git tags, branches, and file paths. Only matching tag pushes start the pipeline." },
      { text: "Use a V1 pipeline with the source action set to the main branch.", correct: false,
        why: "A V1 pipeline cannot filter on Git tags. It starts on changes to the branch, not on release tags." },
      { text: "Add a first-stage Lambda action that stops the execution when the commit has no release tag.", correct: false,
        why: "Every push still starts the pipeline, and you must write and maintain the check. This fails the least-overhead requirement." },
      { text: "Create a scheduled EventBridge rule that starts the pipeline every hour.", correct: false,
        why: "A schedule does not react to tag pushes. It starts runs without a release and can miss the timing of a release." }
    ],
    explanation: "Trigger filters on Git tags, branches, pull requests, and file paths are V2 pipeline features. A V1 pipeline starts on every change to its source branch, so it cannot start only on a release tag." },

  { id: "m08-021", topic: "cicd-pipeline-security", domain: 2,
    stem: "A pipeline in account A deploys with a CodeDeploy deployment group in account B. The artifact bucket uses the default AWS managed key for Amazon S3. The deploy action fails because account B cannot read the artifacts. The artifacts must stay encrypted. Which solution will meet these requirements?",
    options: [
      { text: "Create a customer managed KMS key in account A that allows account B, use it for the artifact store, add a bucket policy for account B, and use a role in account B for the action.", correct: true,
        why: "Cross-account pipelines need a customer managed key, because you can change its key policy. The bucket policy and the cross-account role complete the access." },
      { text: "Turn off encryption on the artifact bucket.", correct: false,
        why: "This fails the requirement that the artifacts stay encrypted." },
      { text: "Edit the key policy of the AWS managed key to allow account B.", correct: false,
        why: "You cannot change the key policy of an AWS managed key. The default key does not work across accounts." },
      { text: "Configure S3 Replication to copy the artifact bucket to a bucket in account B.", correct: false,
        why: "Replication copies objects, but the pipeline action still reads from the artifact store. It also leaves the key access problem unsolved." }
    ],
    explanation: "For cross-account actions, use a customer managed KMS key for the artifact store, a bucket policy, and a role in the other account. The other account must decrypt the artifacts, and only a customer managed key has a key policy that you can change to allow it." },

  { id: "m08-022", topic: "cicd-pipeline-security", domain: 2,
    stem: "A pipeline has a manual approval action named ApproveProd in a stage named Production. Only members of the ReleaseManagers IAM group can approve or reject this action. The solution must follow the principle of least privilege. Which solution will meet these requirements?",
    options: [
      { text: "Attach a policy to the ReleaseManagers group that allows codepipeline:PutApprovalResult on the ARN of the ApproveProd action only.", correct: true,
        why: "PutApprovalResult is the permission to approve or reject. Scoping it to one action grants only what the group needs." },
      { text: "Subscribe only the ReleaseManagers members to the SNS topic of the approval action.", correct: false,
        why: "The SNS topic only sends notifications. Any user with PutApprovalResult permission can still approve." },
      { text: "Attach the AWSCodePipeline_FullAccess managed policy to the ReleaseManagers group.", correct: false,
        why: "Full access allows changes to and deletion of pipelines. This fails the least-privilege requirement." },
      { text: "Add a bucket policy on the artifact bucket that allows only the ReleaseManagers group.", correct: false,
        why: "The bucket policy controls artifact access, not approval permissions. It can also break the pipeline itself." }
    ],
    explanation: "Approvers need codepipeline:PutApprovalResult. Scope it to the approval action ARN for least privilege." },

  { id: "m08-023", topic: "cicd-pipeline-security", domain: 2,
    stem: "A team sets up CodeDeploy for EC2 instances. The revisions are in an S3 bucket. CodeDeploy must read instance tags and manage the deployment, and the agent on each instance must download the revisions. The solution must follow the principle of least privilege and must not use long-term credentials. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Attach an instance profile to the instances with s3:Get* and s3:List* permissions on the revision bucket.", correct: true,
        why: "The CodeDeploy agent uses the instance profile to download revisions from Amazon S3. Scoping it to the bucket follows least privilege." },
      { text: "Create a CodeDeploy service role with the AWSCodeDeployRole managed policy, and use it in the deployment group.", correct: true,
        why: "This AWS managed policy gives CodeDeploy the permissions for EC2/On-Premises deployments, such as reading tags and updating load balancers." },
      { text: "Store an IAM user's access keys in the CodeDeploy agent configuration on each instance.", correct: false,
        why: "Access keys are long-term credentials. This fails the requirement to avoid long-term credentials." },
      { text: "Attach a policy that allows codedeploy:* to the instance profile.", correct: false,
        why: "The agent needs to read the revision, not to manage CodeDeploy. This fails the least-privilege requirement." },
      { text: "Make the revision bucket public so that the agent can download without credentials.", correct: false,
        why: "Anyone could read the application code. This is not secure and fails least privilege." }
    ],
    explanation: "EC2 deployments need two roles: a CodeDeploy service role (AWSCodeDeployRole) and an instance profile that can read the revision bucket." },

  { id: "m08-024", topic: "cicd-cdk", domain: 4,
    stem: "A developer runs cdk deploy for the first time in a new AWS account and Region. The stack includes a Lambda function whose code comes from a local folder. The deployment fails with an error about missing bootstrap resources. Which solution will meet these requirements?",
    options: [
      { text: "Run cdk bootstrap for that account and Region, and then run cdk deploy again.", correct: true,
        why: "Bootstrap creates the S3 bucket, ECR repository, and IAM roles that the CDK uses to upload assets and deploy. Each account and Region needs it." },
      { text: "Run cdk synth, and then run cdk deploy again.", correct: false,
        why: "cdk synth only creates the template locally. It does not create the bootstrap resources." },
      { text: "Run cdk diff to find the missing resources.", correct: false,
        why: "cdk diff compares the app with the deployed stack. It does not create any resources." },
      { text: "Run cdk destroy, and then run cdk deploy again.", correct: false,
        why: "Destroying the stack does not create the bootstrap resources. The next deployment fails in the same way." }
    ],
    explanation: "Bootstrap each AWS environment (account and Region) before you deploy CDK apps with assets. The default bootstrap stack is CDKToolkit." },

  { id: "m08-025", topic: "cicd-cdk", domain: 2,
    stem: "A developer defines a Lambda function and a DynamoDB table in an AWS CDK app with L2 constructs. The function must read items from the table. The developer wants least privilege and the least code. Which solution will meet these requirements?",
    options: [
      { text: "Call table.grantReadData(fn) in the CDK app.", correct: true,
        why: "The L2 grant method adds an IAM policy with read actions on that table only to the function role. It is one line of code." },
      { text: "Attach the AmazonDynamoDBFullAccess managed policy to the function role.", correct: false,
        why: "Full access allows writes and deletes on all tables. This fails the least-privilege requirement." },
      { text: "Add an L1 CfnPolicy that allows dynamodb:* on all resources.", correct: false,
        why: "dynamodb:* on all resources is too broad, and an L1 policy needs more code. This fails both requirements." },
      { text: "Store IAM user access keys in the function environment variables.", correct: false,
        why: "Long-term keys in environment variables are not secure, and the user's permissions are not scoped to the table." }
    ],
    explanation: "L2 constructs have grant methods (for example grantReadData) that create least-privilege IAM policies for you." },

  { id: "m08-026", topic: "ecs-tasks", domain: 4,
    stem: "A team moves an Amazon ECS service from the EC2 launch type to Fargate. The task definition uses the bridge network mode with dynamic port mapping. Registration of the task definition for Fargate fails. Which change will meet these requirements?",
    options: [
      { text: "Change the network mode to awsvpc.", correct: true,
        why: "Fargate tasks must use the awsvpc network mode. Each task gets its own elastic network interface." },
      { text: "Change the network mode to host.", correct: false,
        why: "The host network mode is available only with the EC2 launch type. Fargate does not support it." },
      { text: "Keep bridge mode and set a static host port.", correct: false,
        why: "Fargate does not support the bridge network mode, so a static port does not help." },
      { text: "Change the network mode to none.", correct: false,
        why: "Fargate requires awsvpc. A task with no network also cannot receive traffic." }
    ],
    explanation: "Fargate requires the awsvpc network mode. The EC2 launch type also supports bridge, host, and none." },

  { id: "m08-027", topic: "ecs-tasks", domain: 3,
    stem: "An Amazon ECS service on the EC2 launch type has a desired count of 4 tasks. The cluster has no free capacity for more tasks. The team must deploy a new task definition with a rolling update without adding capacity. At least 2 tasks must stay running during the deployment. Which deployment configuration will meet these requirements?",
    options: [
      { text: "minimumHealthyPercent 50 and maximumPercent 100", correct: true,
        why: "ECS can stop 2 old tasks and start 2 new tasks without running more than 4 tasks. At least 2 tasks stay running." },
      { text: "minimumHealthyPercent 100 and maximumPercent 200", correct: false,
        why: "ECS must start new tasks before it stops old ones, which needs capacity for up to 8 tasks. The cluster has no free capacity." },
      { text: "minimumHealthyPercent 0 and maximumPercent 100", correct: false,
        why: "ECS can stop all 4 tasks at the same time. This fails the requirement to keep at least 2 tasks running." },
      { text: "Turn on the deployment circuit breaker and keep the default percentages.", correct: false,
        why: "The circuit breaker detects failed deployments. With the defaults (100 and 200), the deployment still needs extra capacity." }
    ],
    explanation: "minimumHealthyPercent is the lower limit and maximumPercent the upper limit of tasks during a rolling update. The defaults for a replica service are 100 and 200." },

  { id: "m08-028", topic: "ecs-tasks", domain: 4,
    stem: "An Amazon ECS service uses rolling updates. After a bad deployment, new tasks fail their health checks again and again, and the deployment never finishes. The team wants ECS to detect this automatically, stop the deployment, and return to the last deployment that worked. The solution must need the least operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Turn on the deployment circuit breaker with the rollback option on the service.", correct: true,
        why: "The circuit breaker fails a deployment that cannot reach a steady state. With rollback, ECS returns to the last successful deployment." },
      { text: "Increase maximumPercent to 300.", correct: false,
        why: "More tasks can start at the same time, but failed tasks still fail. Nothing stops or rolls back the deployment." },
      { text: "Create an EventBridge rule for task state changes that invokes a Lambda function to update the service to the previous task definition.", correct: false,
        why: "This can work, but you must write and maintain the detection and rollback logic. It fails the least-overhead requirement." },
      { text: "Set the desired count to 0 and then back to 4.", correct: false,
        why: "This causes an outage and still uses the bad task definition. It does not roll back." }
    ],
    explanation: "The ECS deployment circuit breaker (rolling update type only) stops failing deployments and can roll back to the last successful deployment." },

  { id: "m08-029", topic: "ecs-iam", domain: 2,
    stem: "An application runs in an Amazon ECS task on Fargate. The task starts, pulls its image from Amazon ECR, and sends logs to CloudWatch Logs. When the application code calls s3:PutObject, it gets an AccessDenied error. The solution must follow the principle of least privilege. Which solution will meet these requirements?",
    options: [
      { text: "Add s3:PutObject on the target bucket to the task role in the task definition.", correct: true,
        why: "Application code in the container uses the task role credentials. Scoping the permission to the bucket follows least privilege." },
      { text: "Add s3:PutObject to the task execution role.", correct: false,
        why: "The ECS and Fargate agents use the execution role. Its credentials are not available to the application code, so the error stays." },
      { text: "Store an IAM user's access keys as environment variables in the task definition.", correct: false,
        why: "Long-term keys in a task definition are not secure. The task role gives temporary credentials instead." },
      { text: "Attach the AmazonS3FullAccess managed policy to the task role.", correct: false,
        why: "This fixes the error but allows all S3 actions on all buckets. It fails the least-privilege requirement." }
    ],
    explanation: "The task role is for AWS calls from application code. The task execution role is for the agent: image pulls, logs, and secrets in the task definition." },

  { id: "m08-030", topic: "ecs-iam", domain: 2,
    stem: "A task definition references a database password in AWS Secrets Manager in the container secrets section. The secret uses the default AWS managed key. When the service starts a task, the task stops before the container runs, with an error that ECS cannot retrieve the secret. Which solution will meet these requirements?",
    options: [
      { text: "Add secretsmanager:GetSecretValue for the secret ARN to the task execution role.", correct: true,
        why: "The agent gets secrets that the task definition references before the container starts. It uses the task execution role." },
      { text: "Add secretsmanager:GetSecretValue for the secret ARN to the task role.", correct: false,
        why: "The task role is for application code after the container starts. The agent cannot use it to inject the secret." },
      { text: "Add kms:Decrypt for a customer managed key to the task execution role.", correct: false,
        why: "kms:Decrypt is needed only for a customer managed key. This secret uses the default key, and the GetSecretValue permission is still missing." },
      { text: "Move the password to a plaintext environment variable in the task definition.", correct: false,
        why: "The password would be visible in the task definition. This is not secure." }
    ],
    explanation: "Secrets referenced in a task definition are retrieved by the agent with the task execution role. It needs secretsmanager:GetSecretValue or ssm:GetParameters." },

  { id: "m08-031", topic: "ecs-iam", domain: 2,
    stem: "A developer creates a new Amazon ECS service on Fargate. Tasks must pull a private image from Amazon ECR and send logs with the awslogs driver. The application must read items from one DynamoDB table. The solution must follow the principle of least privilege. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Create a task execution role with the AmazonECSTaskExecutionRolePolicy managed policy.", correct: true,
        why: "This policy has the permissions that the agent needs to pull ECR images and write logs." },
      { text: "Create a task role that allows dynamodb:GetItem and dynamodb:Query on the table ARN only.", correct: true,
        why: "The application uses the task role for its own AWS calls. The policy is scoped to the read actions on one table." },
      { text: "Add the DynamoDB permissions to the task execution role and do not create a task role.", correct: false,
        why: "Containers cannot use the execution role credentials. The application would get AccessDenied from DynamoDB." },
      { text: "Attach AmazonECSTaskExecutionRolePolicy to the task role and do not set an execution role.", correct: false,
        why: "The agent pulls images with the execution role. Without one, the task cannot pull the private image." },
      { text: "Create an IAM user for the application and pass its access keys as environment variables.", correct: false,
        why: "Long-term keys are not secure and are not needed. The task role gives temporary credentials." }
    ],
    explanation: "Use the task execution role for the agent (image pull, logs, secrets) and the task role for the application's AWS calls." },

  { id: "m08-032", topic: "ecs-ecr", domain: 3,
    stem: "A team stores release images in an Amazon ECR repository and deploys them by version tag, for example v2.3.0, first to test and then to production. A tag that production uses must never point to a different image later. Untagged images older than 14 days must be deleted automatically. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Turn on tag immutability for the repository.", correct: true,
        why: "With tag immutability, a push with an existing tag fails with ImageTagAlreadyExistsException. The tag that production uses cannot change." },
      { text: "Add a lifecycle policy rule that expires untagged images 14 days after they are pushed.", correct: true,
        why: "ECR lifecycle policies delete images automatically by tag status and age or count." },
      { text: "Turn on scan on push.", correct: false,
        why: "Scanning finds vulnerabilities. It does not stop tag overwrites or delete old images." },
      { text: "Add an S3 Lifecycle rule to the bucket that stores the images.", correct: false,
        why: "You do not manage an S3 bucket for ECR images. ECR uses its own lifecycle policies." },
      { text: "Add a repository policy that denies ecr:PutImage for all principals.", correct: false,
        why: "This blocks all new pushes, including new release tags. The team could not release new versions." }
    ],
    explanation: "Tag immutability keeps a version tag pointing to one image. ECR lifecycle policies remove old or untagged images automatically." },

  { id: "m08-033", topic: "ecs-ecr", domain: 4,
    stem: "A build server signs in to Amazon ECR one time each morning with aws ecr get-login-password and docker login. Image pushes work in the morning. Pushes late at night fail with an authentication error. The IAM permissions have not changed. Which solution will meet these requirements?",
    options: [
      { text: "Run get-login-password and docker login before each push, because the token is valid for 12 hours.", correct: true,
        why: "The ECR authorization token expires after 12 hours. A new token before each push avoids the expired-token error." },
      { text: "Rotate the IAM access keys of the build server.", correct: false,
        why: "The keys still work, because the morning sign-in works. The problem is the expired registry token." },
      { text: "Turn on tag immutability for the repository.", correct: false,
        why: "Tag immutability stops tag overwrites. It does not change authentication." },
      { text: "Add ecr:BatchGetImage to the build server policy.", correct: false,
        why: "BatchGetImage is a pull permission. Pushes work in the morning, so permissions are not the cause." }
    ],
    explanation: "An Amazon ECR authorization token is valid for 12 hours. Get a new token before it expires." },

  { id: "m08-034", topic: "eb-env-deploy", domain: 3,
    stem: "An Elastic Beanstalk environment runs on 8 instances behind a load balancer. During deployments, the application must keep its full capacity. The company wants to keep extra instance cost during the deployment as low as possible. Which deployment policy will meet these requirements?",
    options: [
      { text: "Rolling with additional batch", correct: true,
        why: "Elastic Beanstalk launches one extra batch first, then updates batches. Full capacity stays, and only one extra batch runs." },
      { text: "Rolling", correct: false,
        why: "Each batch is out of service while it updates. Capacity goes down, so this fails the full-capacity requirement." },
      { text: "Immutable", correct: false,
        why: "Immutable launches a full set of new instances in a second Auto Scaling group. It costs more during the deployment than one extra batch." },
      { text: "All at once", correct: false,
        why: "All instances update at the same time, which can cause downtime. This fails the full-capacity requirement." }
    ],
    explanation: "Rolling reduces capacity. Rolling with additional batch keeps full capacity with one extra batch. Immutable uses a full set of new instances." },

  { id: "m08-035", topic: "eb-env-deploy", domain: 3,
    stem: "A team deploys to a load-balanced Elastic Beanstalk environment with an Application Load Balancer. The new version must never be installed on an instance that serves traffic for the current version. The environment DNS name must not change. Which deployment policies will meet these requirements? (Choose two.)",
    options: [
      { text: "Immutable", correct: true,
        why: "Immutable deploys only to new instances in a second Auto Scaling group. The DNS name does not change." },
      { text: "Traffic splitting", correct: true,
        why: "Traffic splitting deploys to new instances and sends a percentage of traffic to them. The DNS name does not change." },
      { text: "Rolling", correct: false,
        why: "Rolling installs the new version on existing instances, one batch at a time." },
      { text: "Rolling with additional batch", correct: false,
        why: "This policy uses new and existing instances. Existing instances get the new version." },
      { text: "Blue/green deployment with Swap environment URLs", correct: false,
        why: "The URL swap is a DNS (CNAME) change. This fails the requirement that DNS must not change." }
    ],
    explanation: "Immutable and traffic splitting deploy to new instances with no DNS change. Blue/green uses new instances but changes DNS with a CNAME swap." },

  { id: "m08-036", topic: "eb-env-deploy", domain: 3,
    stem: "A company must move an Elastic Beanstalk application to a new platform version. The new version cannot run next to the old version in the same environment. The company needs a fast way to return to the old version if problems occur. Which solution will meet these requirements?",
    options: [
      { text: "Create a second environment with the new platform version, deploy and test the application there, and then swap the environment URLs.", correct: true,
        why: "Blue/green with a CNAME swap keeps the old environment unchanged. Swapping the URLs back is a fast rollback." },
      { text: "Use the traffic splitting deployment policy in the current environment.", correct: false,
        why: "Traffic splitting runs both versions in the same environment at the same time. The new version cannot run next to the old one." },
      { text: "Use the rolling deployment policy in the current environment.", correct: false,
        why: "Rolling runs old and new versions side by side in one environment, and rollback is a manual redeploy." },
      { text: "Use the all at once deployment policy, and redeploy the old version if problems occur.", correct: false,
        why: "All at once causes downtime, and a manual redeploy is not a fast rollback." }
    ],
    explanation: "For changes that cannot run alongside the old version, use a new environment and a CNAME swap (Swap environment URLs)." },

  { id: "m08-037", topic: "eb-env-config", domain: 1,
    stem: "An application runs in an Elastic Beanstalk worker environment that uses an automatically generated Amazon SQS standard queue. A cleanup job must run every night at 02:00 UTC on one instance only. The solution must need the least operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Add a cron.yaml file to the source bundle that sends the job to an application path on a schedule.", correct: true,
        why: "The worker daemon puts a message in the queue on the schedule, and one instance processes it. Leader election stops duplicate scheduling." },
      { text: "Add a crontab entry with an .ebextensions container_commands section.", correct: false,
        why: "The crontab entry is created on every instance. The job would run on all instances, which fails the one-instance requirement." },
      { text: "Connect to an instance with SSH and add a crontab entry.", correct: false,
        why: "Elastic Beanstalk can replace the instance at any time, and the entry is lost. This needs manual work." },
      { text: "Create an EventBridge scheduled rule that invokes a Lambda function to call the application.", correct: false,
        why: "This works, but it adds a function and a rule to maintain. The worker environment already has periodic tasks, so this fails the least-overhead requirement." }
    ],
    explanation: "In a worker environment, cron.yaml defines periodic tasks. Leader election makes one instance put each task in the queue, and one instance processes it. A crontab entry would run the job on every instance." },

  { id: "m08-038", topic: "eb-env-config", domain: 3,
    stem: "An Elastic Beanstalk environment runs on Amazon Linux 2023. After each application deployment, a script must run on every instance after the application and proxy server are deployed, as the final step. Which solution will meet these requirements?",
    options: [
      { text: "Put the executable script in the .platform/hooks/postdeploy directory of the source bundle.", correct: true,
        why: "postdeploy hooks run after the platform deploys the application and proxy server. This is the last deployment step." },
      { text: "Put the script in the .platform/hooks/prebuild directory of the source bundle.", correct: false,
        why: "prebuild hooks run after the bundle is extracted and before the application is configured. The application is not deployed yet." },
      { text: "Put the script in the .platform/confighooks/postdeploy directory only.", correct: false,
        why: "confighooks run during configuration deployments, not during application deployments." },
      { text: "Add the script to the commands section of an .ebextensions configuration file.", correct: false,
        why: "commands run before the prebuild hooks, early in the deployment, not after the application is deployed." }
    ],
    explanation: "Platform hooks run in this order: prebuild, predeploy, and postdeploy. postdeploy runs last, after the application and proxy server are deployed. Put hooks in .platform/hooks for application deployments, and in .platform/confighooks for configuration deployments (changed settings with no new application version)." },

  { id: "m08-039", topic: "cicd-amplify", domain: 3,
    stem: "A team builds a React single-page application in a GitHub repository. Every push to the main branch must build and deploy the site, and the dev branch must have its own test URL. The team wants the least operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Connect the repository to AWS Amplify Hosting, and connect the main and dev branches.", correct: true,
        why: "Amplify Hosting builds and deploys on each push. Each connected branch gets its own environment and URL." },
      { text: "Deploy the site to an Elastic Beanstalk environment for each branch.", correct: false,
        why: "Elastic Beanstalk runs EC2 instances for a static site. It needs more setup and cost, so it fails the least-overhead requirement." },
      { text: "Build an nginx container image and run it as an Amazon ECS service on Fargate for each branch.", correct: false,
        why: "You must manage images, task definitions, services, and a pipeline. This fails the least-overhead requirement." },
      { text: "Create a CodePipeline pipeline with CodeBuild for each branch that copies the files to an S3 bucket behind CloudFront.", correct: false,
        why: "This works, but you must build and maintain pipelines, buckets, and distributions for each branch. Amplify Hosting does this with less effort." }
    ],
    explanation: "Amplify Hosting gives Git-based builds, deployments, and a separate environment for each connected branch." },

  { id: "m08-040", topic: "cicd-amplify", domain: 3,
    stem: "A team hosts a web app with AWS Amplify Hosting from a private GitHub repository. Reviewers must see each pull request on its own URL before the merge. The dev branch must ask visitors for a user name and password. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Turn on web previews for pull requests.", correct: true,
        why: "Amplify deploys each pull request to a unique preview URL and deletes it when the pull request closes." },
      { text: "Turn on access control for the dev branch with a user name and password.", correct: true,
        why: "Amplify access control asks for a user name and password before it shows a protected branch." },
      { text: "Create a separate Amplify app for each pull request manually.", correct: false,
        why: "This needs manual work for every pull request. Web previews do it automatically." },
      { text: "Add an Amazon Cognito user pool to the application code for the dev branch.", correct: false,
        why: "This needs code changes in the application. Access control protects the branch without code." },
      { text: "Turn on performance mode for the dev branch.", correct: false,
        why: "Performance mode changes how long the content stays in the cache. It does not ask for a password or create pull request previews." }
    ],
    explanation: "Amplify web previews deploy each pull request to a preview URL. Access control protects a branch with a user name and password." }

] });
