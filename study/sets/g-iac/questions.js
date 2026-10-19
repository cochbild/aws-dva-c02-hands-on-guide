window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "g-iac", questions: [

  { id: "g-iac-001", topic: "iac-cfn-template", domain: 3,
    stem: "A CloudFormation template deploys an application into an existing VPC. Users type the VPC ID as a String parameter. Typing errors cause stack creation to fail late in the deployment. The developer wants users to choose from the VPCs that exist in the account and Region, and wants CloudFormation to reject invalid values before it creates resources. Which solution will meet these requirements?",
    options: [
      { text: "Change the parameter type to AWS::EC2::VPC::Id.", correct: true,
        why: "AWS-specific parameter types make the user choose an existing value from the account and Region. The console shows a list of existing VPCs, and CloudFormation rejects values that do not exist." },
      { text: "Keep the String type and add an AllowedPattern of ^vpc-[0-9a-f]+$.", correct: false,
        why: "The pattern checks only the format. A correctly formatted ID that does not exist in the account still passes, so the requirement to allow only existing VPCs fails." },
      { text: "Add a Mappings section that lists every VPC ID for each Region.", correct: false,
        why: "Mappings are static lookup tables that the developer must maintain. Users cannot choose from them, and new VPCs are missing until someone edits the template." },
      { text: "Add a Rules section that requires the parameter to be not empty.", correct: false,
        why: "A rule that checks for an empty value does not check that the VPC exists. Invalid IDs still pass." }
    ],
    explanation: "AWS-specific parameter types (for example AWS::EC2::VPC::Id) validate that the value exists in the account and Region and give a selection list in the console." },

  { id: "g-iac-002", topic: "iac-cfn-template", domain: 2,
    stem: "A template has a DBPassword parameter with NoEcho set to true. A security review finds the password in plain text in some places. Where can the plain-text password appear even though NoEcho is true? (Choose two.)",
    options: [
      { text: "In the value of an output in the Outputs section that uses Ref to the parameter.", correct: true,
        why: "NoEcho does not mask information stored in the Outputs section. An output that references the parameter shows the value." },
      { text: "In a resource Metadata attribute that uses the parameter value.", correct: true,
        why: "NoEcho does not mask information in the Metadata attribute of a resource definition. CloudFormation does not redact it." },
      { text: "In the Parameters section of the describe-stacks output.", correct: false,
        why: "CloudFormation returns a NoEcho parameter as asterisks in describe calls. The value is masked there." },
      { text: "In the stack events that DescribeStackEvents returns.", correct: false,
        why: "NoEcho masks the value in calls that describe the stack or stack events. The value is masked there." },
      { text: "In the Parameters tab of the CloudFormation console.", correct: false,
        why: "The console shows NoEcho parameters as asterisks. The value is masked there." }
    ],
    explanation: "NoEcho masks parameter values in describe calls and stack events, but not in the Metadata section, the Outputs section, or a resource Metadata attribute. Use dynamic references for secrets." },

  { id: "g-iac-003", topic: "iac-cfn-template", domain: 2,
    stem: "A template creates an AWS::IAM::Role resource with the RoleName property set to app-runtime-role. The developer runs aws cloudformation create-stack with no capabilities. The operation fails with an InsufficientCapabilities error. The developer wants to keep the fixed role name. Which solution will meet these requirements?",
    options: [
      { text: "Run the command again with --capabilities CAPABILITY_NAMED_IAM.", correct: true,
        why: "IAM resources with custom names require CAPABILITY_NAMED_IAM. This acknowledges the named IAM resource and keeps the fixed name." },
      { text: "Run the command again with --capabilities CAPABILITY_IAM.", correct: false,
        why: "CAPABILITY_IAM is enough only for IAM resources without custom names. A template with RoleName must use CAPABILITY_NAMED_IAM." },
      { text: "Run the command again with --capabilities CAPABILITY_AUTO_EXPAND.", correct: false,
        why: "CAPABILITY_AUTO_EXPAND acknowledges macros such as the SAM transform. It does not acknowledge IAM resources." },
      { text: "Remove the RoleName property so that CloudFormation generates the name.", correct: false,
        why: "This removes the fixed name, which fails the requirement. It also still needs CAPABILITY_IAM for the role." }
    ],
    explanation: "Templates with IAM resources need CAPABILITY_IAM or CAPABILITY_NAMED_IAM. IAM resources with custom names need CAPABILITY_NAMED_IAM." },

  { id: "g-iac-004", topic: "iac-cfn-template", domain: 3,
    stem: "A template launches EC2 instances in many Regions. The ImageId must always be the latest Amazon Linux AMI in the Region where the stack runs. The developer does not want to edit the template when AWS releases a new AMI. Which solution will meet these requirements?",
    options: [
      { text: "Declare a parameter of type AWS::SSM::Parameter::Value<AWS::EC2::Image::Id> with the public Amazon Linux AMI parameter name as the default, and use Ref for ImageId.", correct: true,
        why: "CloudFormation reads the latest value of the Parameter Store key at each create or update. The public parameter always holds the current AMI ID for that Region." },
      { text: "Add a Mappings section with an AMI ID for each Region and use Fn::FindInMap for ImageId.", correct: false,
        why: "The mapping holds fixed AMI IDs. Someone must edit the template for each new AMI, which fails the requirement." },
      { text: "Declare a parameter of type AWS::EC2::Image::Id and ask users to enter the AMI ID.", correct: false,
        why: "Users must find and type the AMI ID for each deployment. CloudFormation does not choose the latest AMI." },
      { text: "Use Fn::GetAZs to select the AMI for the current Region.", correct: false,
        why: "Fn::GetAZs returns a list of Availability Zones. It does not return AMI IDs." }
    ],
    explanation: "Systems Manager parameter types resolve a Parameter Store key at create or update time. AWS publishes public parameters, for example /aws/service/ami-amazon-linux-latest/..., and updates them in each Region when it releases a new AMI." },

  { id: "g-iac-005", topic: "iac-cfn-intrinsics", domain: 3,
    stem: "A template creates an AWS::SQS::Queue named WorkQueue and a Lambda function. The function code needs the queue URL in an environment variable. The function execution role needs an IAM policy statement whose Resource is the queue. Which values should the developer use in the template?",
    options: [
      { text: "Environment variable: !Ref WorkQueue. Policy Resource: !GetAtt WorkQueue.Arn.", correct: true,
        why: "Ref on an SQS queue returns the queue URL. Fn::GetAtt with Arn returns the ARN that an IAM policy Resource needs." },
      { text: "Environment variable: !GetAtt WorkQueue.Arn. Policy Resource: !Ref WorkQueue.", correct: false,
        why: "This swaps the values. The code gets an ARN instead of a URL, and the policy gets a URL, which is not a valid IAM resource." },
      { text: "Environment variable: !Ref WorkQueue. Policy Resource: !Ref WorkQueue.", correct: false,
        why: "Ref returns the queue URL. A URL is not valid as an IAM policy Resource, so the permission does not work." },
      { text: "Environment variable: !GetAtt WorkQueue.QueueName. Policy Resource: !GetAtt WorkQueue.QueueName.", correct: false,
        why: "The queue name is not the URL that the code needs. A queue name is also not a valid IAM policy Resource." }
    ],
    explanation: "Know the Ref return values: SQS queue returns the URL, SNS topic returns the ARN, and most others return the name. Use Fn::GetAtt Arn for IAM policies." },

  { id: "g-iac-006", topic: "iac-cfn-intrinsics", domain: 2,
    stem: "A template creates an Amazon RDS DB instance. The master password is a template parameter today. The security team requires that the password never appears in the template or in parameter values, and that the password rotates automatically. Which solution will meet these requirements?",
    options: [
      { text: "Store the credentials in AWS Secrets Manager with rotation turned on, and set MasterUserPassword to a {{resolve:secretsmanager:...}} dynamic reference.", correct: true,
        why: "The secret stays outside the template, CloudFormation does not store the resolved value, and Secrets Manager rotates the secret automatically." },
      { text: "Keep the parameter and set NoEcho to true.", correct: false,
        why: "A user still passes the password as a parameter value, which fails the requirement. NoEcho also gives no rotation." },
      { text: "Store the password as a SecureString in Parameter Store and use a {{resolve:ssm-secure:...}} dynamic reference.", correct: false,
        why: "This keeps the password out of the template, but Parameter Store does not rotate the password automatically. The rotation requirement fails." },
      { text: "Store the password as a String in Parameter Store and use a {{resolve:ssm:...}} dynamic reference.", correct: false,
        why: "A String parameter is not encrypted, so it is not secure for a password. It also does not rotate." }
    ],
    explanation: "Use a Secrets Manager dynamic reference for database credentials that must rotate. ssm-secure works only for some properties and has no automatic rotation." },

  { id: "g-iac-007", topic: "iac-cfn-intrinsics", domain: 4,
    stem: "A stack creates an AWS::RDS::DBInstance. MasterUserPassword uses a versionless Secrets Manager dynamic reference. An administrator changed the secret value in the Secrets Manager console. The database still accepts only the old password. The team wants CloudFormation to apply the new secret value to the database. Which solution will meet these requirements?",
    options: [
      { text: "Make a change to the DB instance resource in the template, and update the stack.", correct: true,
        why: "CloudFormation resolves the dynamic reference only when it creates or updates the resource that contains it. An update to that resource makes it read the new value." },
      { text: "Run drift detection on the stack and resolve the drift.", correct: false,
        why: "Drift detection does not change resources. The database keeps the old password." },
      { text: "Update the stack with the current template and the existing parameter values.", correct: false,
        why: "With no template or parameter changes, CloudFormation has no updates to perform. It does not read the secret again." },
      { text: "Add AWSPREVIOUS as the version stage in the dynamic reference.", correct: false,
        why: "AWSPREVIOUS selects the earlier secret version. That is the old password, which is the opposite of the requirement." }
    ],
    explanation: "Changing a secret value does not update stack resources. CloudFormation reads dynamic references again only when it updates the resource that uses them." },

  { id: "g-iac-008", topic: "iac-cfn-multi-stack", domain: 3,
    stem: "A network team owns a CloudFormation stack that creates a shared VPC and subnets. Five application teams own separate stacks in the same account and Region. The application stacks must use the subnet IDs without hardcoding them. The network stack must not be deleted while an application stack uses its subnets. Which solution will meet these requirements?",
    options: [
      { text: "Export the subnet IDs in the Outputs section of the network stack, and use Fn::ImportValue in the application stacks.", correct: true,
        why: "Exports share values between independent stacks in the same account and Region. CloudFormation blocks deletion of the exporting stack while other stacks import its values." },
      { text: "Make each application stack a nested stack of the network stack.", correct: false,
        why: "Nested stacks are managed as one hierarchy from the root stack. Separate teams then cannot own and deploy their stacks independently." },
      { text: "Pass the subnet IDs to each application stack as String parameters.", correct: false,
        why: "Someone must copy the IDs by hand, and CloudFormation does not stop deletion of the network stack. Both requirements fail." },
      { text: "Deploy the network template with StackSets to all application accounts.", correct: false,
        why: "StackSets deploy copies of a template to many accounts and Regions. This creates more VPCs and does not share one VPC." }
    ],
    explanation: "Export plus Fn::ImportValue shares values between stacks in the same account and Region and protects the exporting stack from deletion while it is in use." },

  { id: "g-iac-009", topic: "iac-cfn-multi-stack", domain: 4,
    stem: "A developer changes the value of an exported output in a network stack. The stack update fails with an error that says the export cannot be updated because it is in use by another stack. The developer must change the value. Which solution will meet these requirements?",
    options: [
      { text: "Find the importing stacks with list-imports, update them to stop using Fn::ImportValue for that export, and then update the network stack.", correct: true,
        why: "CloudFormation does not allow changes to an export while another stack imports it. After all imports are removed, the export can change." },
      { text: "Create a change set for the network stack and run it.", correct: false,
        why: "A change set runs the same update. CloudFormation still blocks the change while the export is in use." },
      { text: "Turn off termination protection on the network stack, and update the stack again.", correct: false,
        why: "Termination protection applies only to stack deletion. It has no effect on export changes." },
      { text: "Delete the export from the Exports page of the CloudFormation console.", correct: false,
        why: "Exports are part of the exporting stack template. You cannot delete an export that other stacks import." }
    ],
    explanation: "An export that another stack imports cannot be changed or removed. Remove the imports first; list-imports shows which stacks use the export." },

  { id: "g-iac-010", topic: "iac-cfn-multi-stack", domain: 3,
    stem: "A company uses AWS Organizations. A developer must deploy the same CloudFormation template, which creates an audit IAM role and a logging bucket, to every account in an organizational unit (OU) in two Regions. Accounts that join the OU later must get the resources automatically. The developer wants the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Create a stack set with service-managed permissions, target the OU, and turn on automatic deployment.", correct: true,
        why: "Service-managed StackSets use Organizations, create the required roles, and can deploy automatically to accounts that join the OU later." },
      { text: "Create a stack set with self-managed permissions, and create AWSCloudFormationStackSetExecutionRole in each account.", correct: false,
        why: "Self-managed permissions need roles that you create in every account, and they do not deploy to new accounts automatically. This adds overhead." },
      { text: "Use nested stacks in a root stack in the management account.", correct: false,
        why: "Nested stacks stay in the account and Region of the root stack. They cannot deploy to other accounts." },
      { text: "Create a pipeline that runs aws cloudformation deploy with credentials for each account.", correct: false,
        why: "This needs custom credentials and a pipeline change for each new account. It has more overhead and is not automatic." }
    ],
    explanation: "StackSets deploy one template to many accounts and Regions. Service-managed permissions with Organizations support automatic deployment to new accounts in a target OU." },

  { id: "g-iac-011", topic: "iac-cfn-multi-stack", domain: 3,
    stem: "A developer has a standard Application Load Balancer configuration that many templates use. The developer wants each application template to include the load balancer as a separate child stack that the application stack creates, updates, and deletes. The application stack must read the load balancer DNS name from the child stack. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Store the load balancer template in Amazon S3, and add an AWS::CloudFormation::Stack resource with TemplateURL to each application template.", correct: true,
        why: "A nested stack is an AWS::CloudFormation::Stack resource that points to a child template in S3. The parent creates, updates, and deletes it." },
      { text: "Add an output for the DNS name to the child template, and read it in the parent with Fn::GetAtt ChildStack.Outputs.OutputName.", correct: true,
        why: "A parent reads nested stack outputs with Fn::GetAtt and the Outputs.Name attribute. No export is needed." },
      { text: "Deploy the load balancer template with StackSets to each account.", correct: false,
        why: "StackSets create independent stacks in target accounts. The application stack does not manage them as children." },
      { text: "Put the load balancer template in the Metadata section of each application template.", correct: false,
        why: "CloudFormation does not create resources from the Metadata section. The load balancer is not deployed." },
      { text: "Store the load balancer settings in a Mappings section, and read them with Fn::FindInMap.", correct: false,
        why: "Mappings hold static values only. They do not create a child stack or its resources." }
    ],
    explanation: "Nested stacks use AWS::CloudFormation::Stack with a TemplateURL in S3. The parent reads child outputs with Fn::GetAtt Child.Outputs.Name." },

  { id: "g-iac-012", topic: "iac-cfn-updates", domain: 3,
    stem: "A developer changed several properties of an AWS::RDS::DBInstance resource in a production template. Before the update runs, the developer must know if CloudFormation will replace the database. Which solution will meet these requirements?",
    options: [
      { text: "Create a change set with the new template, and review the Replacement value for the DB instance.", correct: true,
        why: "A change set shows each change and if CloudFormation will replace the resource. Creating it does not change the stack." },
      { text: "Run drift detection on the stack.", correct: false,
        why: "Drift detection compares the deployed resources with the current template. It does not preview a new template." },
      { text: "Run aws cloudformation validate-template on the new template.", correct: false,
        why: "Validation checks template syntax. It does not show how the update changes existing resources." },
      { text: "Set a stack policy that denies Update:Replace on the database.", correct: false,
        why: "A stack policy can block a replacement, but it does not show the developer what the update will do before it runs." }
    ],
    explanation: "Use a change set to preview an update, including replacements, before you apply it." },

  { id: "g-iac-013", topic: "iac-cfn-updates", domain: 3,
    stem: "A production stack contains a database and many application resources. The team wants to allow all stack updates, except updates that replace or delete the resource with the logical ID ProdDatabase. Which solution will meet these requirements?",
    options: [
      { text: "Set a stack policy with an Allow statement for Update:* on all resources and a Deny statement for Update:Replace and Update:Delete on LogicalResourceId/ProdDatabase.", correct: true,
        why: "A stack policy controls update actions on stack resources. An explicit Deny overrides the Allow for the database only." },
      { text: "Turn on termination protection for the stack.", correct: false,
        why: "Termination protection blocks deletion of the whole stack. It does not block replacement of one resource during an update." },
      { text: "Set DeletionPolicy: Retain on the database resource.", correct: false,
        why: "DeletionPolicy applies when the resource is deleted. It does not stop a replacement during an update, so the requirement fails." },
      { text: "Attach an IAM policy to the deployment role that denies cloudformation:UpdateStack.", correct: false,
        why: "This blocks all stack updates. The requirement is to allow updates to the other resources." }
    ],
    explanation: "Stack policies protect resources during stack updates. After you set one, use Allow for what may change and Deny for protected resources." },

  { id: "g-iac-014", topic: "iac-cfn-updates", domain: 4,
    stem: "A stack update failed, and the rollback also failed. The stack status is UPDATE_ROLLBACK_FAILED. The stack events show that the rollback could not find an Amazon SQS queue that an engineer deleted manually. The team wants to return the stack to a working state with the LEAST effort. Which solution will meet these requirements?",
    options: [
      { text: "Continue the update rollback, and specify the queue logical ID in ResourcesToSkip.", correct: true,
        why: "ContinueUpdateRollback with ResourcesToSkip skips resources that cannot roll back. The stack reaches UPDATE_ROLLBACK_COMPLETE." },
      { text: "Delete the stack and create it again from the original template.", correct: false,
        why: "This removes and recreates every resource in the stack, with downtime and possible data loss. It is not the least effort." },
      { text: "Run another stack update with the original template.", correct: false,
        why: "CloudFormation does not allow an update while the stack is in UPDATE_ROLLBACK_FAILED. The rollback must complete first." },
      { text: "Run drift detection, and then update the stack.", correct: false,
        why: "Drift detection only reports differences. It does not finish the failed rollback." }
    ],
    explanation: "From UPDATE_ROLLBACK_FAILED, fix the cause or skip the resource, then continue the update rollback to reach UPDATE_ROLLBACK_COMPLETE." },

  { id: "g-iac-015", topic: "iac-cfn-updates", domain: 4,
    stem: "Stack creation fails and rolls back. The stack has 40 events, and most of them are DELETE events from the rollback. The developer must find the root cause and inspect the failed resources. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "In the stack events, find the first event with a CREATE_FAILED status, and read its status reason.", correct: true,
        why: "The first failure is usually the root cause. Later failures and DELETE events are effects of the rollback." },
      { text: "Create the stack again with rollback disabled (OnFailure set to DO_NOTHING) so that the created resources stay for inspection.", correct: true,
        why: "With rollback disabled, CloudFormation keeps the resources that it created. The developer can inspect them, for example the logs on an instance." },
      { text: "Read the status reason of the last event in the list, ROLLBACK_COMPLETE.", correct: false,
        why: "ROLLBACK_COMPLETE only says that the rollback finished. It does not explain why creation failed." },
      { text: "Run drift detection on the failed stack.", correct: false,
        why: "Drift detection compares resources with the template. It does not explain a creation failure, and the rolled-back resources no longer exist." },
      { text: "Turn on termination protection, and create the stack again.", correct: false,
        why: "Termination protection blocks stack deletion only. It does not stop the rollback or show the cause." }
    ],
    explanation: "Read stack events from the first failure. Disable rollback (or preserve resources) to inspect what CloudFormation created." },

  { id: "g-iac-016", topic: "iac-cfn-updates", domain: 3,
    stem: "An engineer changed the inbound rules of a security group in the EC2 console. The security group is part of a CloudFormation stack. The developer must find which stack resources now differ from their template definitions. Which solution will meet these requirements?",
    options: [
      { text: "Run drift detection on the stack, and review the resources with a MODIFIED status.", correct: true,
        why: "Drift detection compares the actual configuration of supported resources with the template and parameter values. It reports changed properties." },
      { text: "Create a change set with the current template.", correct: false,
        why: "A standard change set compares a new template with the current template. It does not read changes made outside CloudFormation." },
      { text: "Read the stack events.", correct: false,
        why: "Stack events record CloudFormation operations only. Changes in the EC2 console do not create stack events." },
      { text: "Update the stack with the current template.", correct: false,
        why: "CloudFormation sees no template changes, so it performs no update. It does not report the difference." }
    ],
    explanation: "Drift detection finds configuration changes made outside CloudFormation. It checks only explicitly set properties and does not check nested stacks." },

  { id: "g-iac-017", topic: "iac-cfn-resource-policies", domain: 3,
    stem: "A stack creates an Amazon S3 bucket that stores reports. The team plans to delete the stack at the end of a project. The bucket and its objects must stay after the stack is deleted. Which solution will meet these requirements?",
    options: [
      { text: "Add DeletionPolicy: Retain to the bucket resource.", correct: true,
        why: "With Retain, CloudFormation deletes the stack but keeps the bucket and its contents." },
      { text: "Add DeletionPolicy: Snapshot to the bucket resource.", correct: false,
        why: "Snapshot works only for resource types that support snapshots, such as EBS volumes and RDS. S3 buckets do not support it." },
      { text: "Add UpdateReplacePolicy: Retain to the bucket resource.", correct: false,
        why: "UpdateReplacePolicy applies only when an update replaces the resource. It has no effect when the stack is deleted." },
      { text: "Turn on termination protection for the stack.", correct: false,
        why: "Termination protection blocks deletion of the whole stack. The team needs to delete the stack, so this fails the requirement." }
    ],
    explanation: "DeletionPolicy controls what happens to a resource when its stack is deleted or the resource is removed from the template. Retain works for every resource type." },

  { id: "g-iac-018", topic: "iac-cfn-resource-policies", domain: 3,
    stem: "A developer must change a property of an AWS::RDS::DBInstance that requires replacement. The team needs a backup of the old database after CloudFormation replaces it. Which solution will meet these requirements?",
    options: [
      { text: "Add UpdateReplacePolicy: Snapshot to the DB instance resource before the update.", correct: true,
        why: "UpdateReplacePolicy controls the old physical resource when an update replaces it. Snapshot makes CloudFormation take a snapshot before it deletes the old instance." },
      { text: "Add DeletionPolicy: Snapshot to the DB instance resource before the update.", correct: false,
        why: "DeletionPolicy applies when the stack is deleted or the resource is removed from the template. It does not apply to a replacement." },
      { text: "Add a stack policy that denies Update:Replace on the DB instance.", correct: false,
        why: "This blocks the replacement, so the required change cannot happen." },
      { text: "Add a CreationPolicy to the DB instance resource.", correct: false,
        why: "CreationPolicy waits for signals during creation. It is not supported for RDS and does not make backups." }
    ],
    explanation: "Use UpdateReplacePolicy for replacements during updates and DeletionPolicy for deletions. Both support Retain, Snapshot (for supported types), and Delete." },

  { id: "g-iac-019", topic: "iac-cfn-resource-policies", domain: 3,
    stem: "A template creates an EC2 instance. The UserData script installs and starts an application, which takes about 8 minutes. CloudFormation marks the instance CREATE_COMPLETE before the application is ready, and a later resource that calls the application fails. Which solution will meet these requirements?",
    options: [
      { text: "Add a CreationPolicy with a ResourceSignal Timeout of PT15M to the instance, and run cfn-signal at the end of the UserData script.", correct: true,
        why: "CreationPolicy keeps the instance in CREATE_IN_PROGRESS until it receives a success signal. cfn-signal sends that signal after the application is ready." },
      { text: "Add DependsOn to the later resource so that it waits for the instance.", correct: false,
        why: "DependsOn waits only until CloudFormation finishes creating the instance. It does not wait for the UserData script." },
      { text: "Run cfn-hup on the instance.", correct: false,
        why: "cfn-hup detects metadata changes on stack updates. It does not delay CREATE_COMPLETE." },
      { text: "Add a CreationPolicy with the default timeout and no cfn-signal call.", correct: false,
        why: "Without a signal, the timeout ends (default PT5M) and the resource fails, so the stack rolls back." }
    ],
    explanation: "CreationPolicy plus cfn-signal makes CloudFormation wait for the instance to report success. Timeout default is PT5M and maximum is 12 hours." },

  { id: "g-iac-020", topic: "iac-cfn-resource-policies", domain: 4,
    stem: "A stack uses a Lambda-backed custom resource. When the team deletes the stack, the custom resource stays in DELETE_IN_PROGRESS for 1 hour, and then the deletion fails. The function logs show an exception in the Delete branch before the code sends a response. Which actions will fix the problem and make failures appear sooner? (Choose two.)",
    options: [
      { text: "Change the function so that it sends a SUCCESS or FAILED response to the ResponseURL in every code path, including errors and Delete requests.", correct: true,
        why: "CloudFormation waits for a response at the pre-signed ResponseURL. If the function always responds, the stack does not wait for the timeout." },
      { text: "Set the ServiceTimeout property of the custom resource to a value close to the expected run time.", correct: true,
        why: "The default custom resource timeout is 3,600 seconds. ServiceTimeout makes CloudFormation fail the operation sooner if no response arrives." },
      { text: "Increase the Lambda function timeout to 900 seconds.", correct: false,
        why: "The function already fails quickly with an exception. A longer timeout does not send the missing response." },
      { text: "Increase the Lambda function memory.", correct: false,
        why: "Memory does not change the code path that skips the response. CloudFormation still waits for 1 hour." },
      { text: "Move the function to another Region.", correct: false,
        why: "The ServiceToken function must be in the same Region as the stack. Another Region does not work." }
    ],
    explanation: "Custom resource providers must always respond to the ResponseURL. The default wait is 3,600 seconds; ServiceTimeout shortens it." },

  { id: "g-iac-021", topic: "iac-cfn-resource-policies", domain: 3,
    stem: "EC2 instances in a stack use cfn-init to write configuration files from AWS::CloudFormation::Init metadata. The team updates the metadata often. Running instances must apply the new configuration when the stack is updated, without replacement of the instances. Which solution will meet these requirements?",
    options: [
      { text: "Configure and run the cfn-hup daemon on the instances so that it runs cfn-init when the metadata changes.", correct: true,
        why: "cfn-hup checks for changes to resource metadata and runs hooks, such as cfn-init, when it finds a change." },
      { text: "Run cfn-signal from the UserData script.", correct: false,
        why: "cfn-signal sends a signal to a CreationPolicy or wait condition. It does not apply metadata changes." },
      { text: "Run cfn-get-metadata from the UserData script.", correct: false,
        why: "cfn-get-metadata only reads the metadata, and UserData runs at first boot only. Changes on later updates are not applied." },
      { text: "Change the AMI ID in the template with each metadata change.", correct: false,
        why: "Changing the AMI replaces the instances, which fails the requirement." }
    ],
    explanation: "cfn-init applies AWS::CloudFormation::Init metadata. cfn-hup detects metadata changes on stack updates and runs cfn-init again." },

  { id: "g-iac-022", topic: "iac-sam-template", domain: 2,
    stem: "A SAM template defines a Lambda function and an AWS::DynamoDB::Table named OrdersTable. The function must create, read, update, and delete items in OrdersTable only. The developer wants least privilege with the fewest template lines. Which solution will meet these requirements?",
    options: [
      { text: "Add Policies to the function with the policy template DynamoDBCrudPolicy and TableName: !Ref OrdersTable.", correct: true,
        why: "The DynamoDBCrudPolicy policy template gives CRUD permissions scoped to the named table in a few lines." },
      { text: "Add the AmazonDynamoDBFullAccess managed policy to the function.", correct: false,
        why: "This allows all DynamoDB actions on all tables. It fails the least-privilege requirement." },
      { text: "Add the policy template DynamoDBReadPolicy with TableName: !Ref OrdersTable.", correct: false,
        why: "DynamoDBReadPolicy gives read-only access. The function cannot create, update, or delete items." },
      { text: "Write a separate AWS::IAM::Role resource with an inline policy that lists each DynamoDB action and the table ARN.", correct: false,
        why: "This can be least privilege, but it needs many more template lines than a policy template." }
    ],
    explanation: "SAM policy templates (for example DynamoDBCrudPolicy) give scoped permissions to one resource with very little template code." },

  { id: "g-iac-023", topic: "iac-sam-template", domain: 3,
    stem: "A SAM template has this Globals section: Function: Environment: Variables: STAGE: prod, TABLE: orders. A function resource sets Environment: Variables: STAGE: test, DEBUG: 'true'. Which environment variables does the deployed function have?",
    options: [
      { text: "STAGE=test, TABLE=orders, DEBUG=true.", correct: true,
        why: "SAM merges maps. The function keeps TABLE from Globals, adds DEBUG, and its own STAGE value overrides the global value." },
      { text: "STAGE=test, DEBUG=true.", correct: false,
        why: "SAM does not replace a map. It merges the map from Globals with the resource map, so TABLE stays." },
      { text: "STAGE=prod, TABLE=orders, DEBUG=true.", correct: false,
        why: "For duplicate keys, the resource value wins over the Globals value. STAGE is test." },
      { text: "STAGE=prod, TABLE=orders.", correct: false,
        why: "The resource values are not ignored. SAM merges them with the global values." }
    ],
    explanation: "In SAM Globals, primitives are replaced, maps are merged (the resource key wins), and lists are added after the global items." },

  { id: "g-iac-024", topic: "iac-sam-template", domain: 2,
    stem: "A SAM function must send messages to one Amazon SQS queue that the same template creates. The team does not want to write IAM policy JSON, and the permission must be limited to that queue. Which solutions will meet these requirements? (Choose two.)",
    options: [
      { text: "Add the SQSSendMessagePolicy policy template with QueueName: !GetAtt Queue.QueueName to the function Policies.", correct: true,
        why: "This policy template gives send permission scoped to the named queue without hand-written policy JSON." },
      { text: "Add a Connectors attribute to the function with the queue as Destination and Permissions: [Write].", correct: true,
        why: "SAM connectors compose a least-privilege policy between the source and destination resources. Write allows sending to the queue." },
      { text: "Add the AmazonSQSFullAccess managed policy to the function.", correct: false,
        why: "This allows all SQS actions on all queues. It fails the requirement to limit permission to one queue." },
      { text: "Add a resource-based policy to the function that allows sqs.amazonaws.com to invoke it.", correct: false,
        why: "A function resource-based policy controls who invokes the function. It does not let the function send messages." },
      { text: "Deploy the template with CAPABILITY_NAMED_IAM.", correct: false,
        why: "Capabilities acknowledge IAM resources in a template. They do not grant the function any permission." }
    ],
    explanation: "SAM gives two least-privilege shortcuts: policy templates on the function and connectors between a source and a destination." },

  { id: "g-iac-025", topic: "iac-sam-cli", domain: 1,
    stem: "A developer writes a Lambda function that processes Amazon S3 PutObject events. The developer wants to test the handler on a laptop with a realistic S3 event before any deployment. Which solution will meet these requirements?",
    options: [
      { text: "Run sam local generate-event s3 put > event.json, and then run sam local invoke -e event.json.", correct: true,
        why: "generate-event makes a sample S3 event payload. sam local invoke runs the function in a local container with that event." },
      { text: "Run sam remote invoke with the event file.", correct: false,
        why: "sam remote invoke calls a function that is already deployed. The requirement is to test before deployment." },
      { text: "Run sam sync --watch and upload a file to the bucket.", correct: false,
        why: "sam sync deploys to the cloud. It does not test before deployment." },
      { text: "Run sam local start-api and send the event with curl.", correct: false,
        why: "start-api serves API Gateway routes. An S3 event function has no API route." }
    ],
    explanation: "Use sam local generate-event for sample payloads and sam local invoke -e to run a function locally with them." },

  { id: "g-iac-026", topic: "iac-sam-cli", domain: 1,
    stem: "A team has integration tests that call Lambda functions with the AWS SDK Invoke operation. The team wants to run these tests on developer machines against the local function code without deploying. Which solution will meet these requirements?",
    options: [
      { text: "Run sam local start-lambda, and set the SDK client endpoint URL to the local endpoint that it prints.", correct: true,
        why: "start-lambda starts a local endpoint that emulates the Lambda Invoke API. SDK and CLI calls with the local endpoint URL run the local code." },
      { text: "Run sam local start-api, and point the SDK client at the local API.", correct: false,
        why: "start-api emulates API Gateway HTTP routes. It does not emulate the Lambda Invoke API that the SDK calls." },
      { text: "Run sam local invoke for each test.", correct: false,
        why: "sam local invoke runs one function one time from the command line. It does not give an endpoint for SDK calls." },
      { text: "Run sam remote invoke from the tests.", correct: false,
        why: "sam remote invoke calls deployed resources. The requirement is to test without deploying." }
    ],
    explanation: "sam local start-lambda emulates the Lambda service endpoint (default port 3001) so that SDK and CLI calls can invoke local functions." },

  { id: "g-iac-027", topic: "iac-sam-cli", domain: 3,
    stem: "A developer changes Lambda code many times each hour and tests the changes in a personal development stack. Each sam deploy takes several minutes. The developer wants code changes to appear in the development stack within seconds. Which solution will meet these requirements?",
    options: [
      { text: "Run sam sync --watch against the development stack.", correct: true,
        why: "sam sync watches local files and pushes code changes through service APIs, which is much faster than a CloudFormation deployment. It is meant for development stacks." },
      { text: "Run sam deploy --guided after each change.", correct: false,
        why: "sam deploy runs a full CloudFormation deployment each time. It is the slow process that the developer wants to avoid." },
      { text: "Run sam build --use-container after each change.", correct: false,
        why: "sam build only builds the artifacts locally. It does not update the cloud stack." },
      { text: "Run cdk watch in the project folder.", correct: false,
        why: "cdk watch works with AWS CDK apps. This project uses an AWS SAM template." }
    ],
    explanation: "sam sync --watch pushes code changes to a development stack in seconds through service APIs, not through CloudFormation. The stack then no longer matches its template (drift), so use sam deploy or a pipeline for production." },

  { id: "g-iac-028", topic: "iac-sam-cli", domain: 3,
    stem: "A developer builds a Python SAM application on a Windows laptop. One dependency includes native compiled code. After deployment, the function fails because the compiled library does not work in the Lambda environment. Which solution will meet these requirements?",
    options: [
      { text: "Run sam build --use-container, and then deploy.", correct: true,
        why: "--use-container builds the dependencies inside a container that matches the Lambda environment, so native code is compiled for Lambda." },
      { text: "Run sam deploy --resolve-s3.", correct: false,
        why: "--resolve-s3 only chooses a managed S3 bucket for artifacts. It does not change how dependencies are built." },
      { text: "Run sam local invoke before deployment.", correct: false,
        why: "Local invoke tests the function. It does not rebuild the dependencies for the Lambda environment." },
      { text: "Run aws cloudformation package on the template.", correct: false,
        why: "package uploads the existing local files. The Windows-built library is still in the package." }
    ],
    explanation: "sam build --use-container builds functions in a Lambda-like container. Use it for native dependencies or when the local runtime differs." },

  { id: "g-iac-029", topic: "iac-sam-safe-deploy", domain: 3,
    stem: "A SAM function uses AutoPublishAlias and DeploymentPreference with a PreTraffic hook function. The hook function runs its tests successfully and returns a value, but each deployment waits and then fails. Which change will fix the problem?",
    options: [
      { text: "Change the hook function to call the CodeDeploy PutLifecycleEventHookExecutionStatus API with Succeeded or Failed, and allow that action in its execution role.", correct: true,
        why: "CodeDeploy waits for the hook to report its result through PutLifecycleEventHookExecutionStatus. A return value alone is not a report." },
      { text: "Change the hook function to return an HTTP 200 status code.", correct: false,
        why: "CodeDeploy does not read the function return value. It still waits for the status call." },
      { text: "Change the hook function to publish the test result to an SNS topic.", correct: false,
        why: "CodeDeploy does not read SNS messages for hook results. The deployment still waits." },
      { text: "Change the DeploymentPreference Type to AllAtOnce.", correct: false,
        why: "The hook still runs and must still report its status. The traffic shift type does not fix the missing report." }
    ],
    explanation: "SAM PreTraffic and PostTraffic hooks are CodeDeploy lifecycle hooks. The hook function must call PutLifecycleEventHookExecutionStatus." },

  { id: "g-iac-030", topic: "iac-sam-safe-deploy", domain: 3,
    stem: "A team deploys a Lambda function with AWS SAM. New releases must send 10% of traffic to the new version for 5 minutes and then send all traffic to it. If a CloudWatch error alarm goes off, the release must roll back automatically. The team wants the LEAST operational effort. Which solution will meet these requirements?",
    options: [
      { text: "Add AutoPublishAlias and a DeploymentPreference with Type Canary10Percent5Minutes and the alarm in Alarms.", correct: true,
        why: "SAM creates the CodeDeploy resources. CodeDeploy shifts 10% for 5 minutes, then the rest, and rolls back if a listed alarm goes off." },
      { text: "Add AutoPublishAlias and a DeploymentPreference with Type Linear10PercentEvery1Minute and the alarm in Alarms.", correct: false,
        why: "Linear shifts 10% each minute in equal steps. It does not hold 10% for 5 minutes, so the traffic pattern fails." },
      { text: "Write a script that updates the alias routing weight to 10%, waits 5 minutes, checks the alarm, and sets the weight to 100%.", correct: false,
        why: "This can work, but the team must write and run the script and the rollback logic. It is not the least effort." },
      { text: "Configure an API Gateway canary release on the stage.", correct: false,
        why: "An API Gateway canary splits traffic between stage deployments. It does not shift Lambda alias traffic or use CodeDeploy alarms for rollback." }
    ],
    explanation: "SAM DeploymentPreference with AutoPublishAlias gives CodeDeploy canary or linear traffic shifting and alarm-based rollback with a few lines." },

  { id: "g-iac-031", topic: "iac-sam-safe-deploy", domain: 3,
    stem: "A developer wants SAM to manage gradual traffic shifting through CodeDeploy for an existing AWS::Serverless::Function. Which two properties must the developer add to the function? (Choose two.)",
    options: [
      { text: "AutoPublishAlias", correct: true,
        why: "AutoPublishAlias publishes a version for each code change and gives CodeDeploy an alias to shift traffic on." },
      { text: "DeploymentPreference", correct: true,
        why: "DeploymentPreference sets the traffic shift type and makes SAM create the CodeDeploy application and deployment group." },
      { text: "ProvisionedConcurrencyConfig", correct: false,
        why: "Provisioned concurrency keeps execution environments ready, so requests do not wait for a new environment to start (a cold start). Traffic shifting does not need it." },
      { text: "A Hooks PostTraffic function", correct: false,
        why: "Hooks are optional. Traffic shifting works without a PostTraffic function." },
      { text: "A separate AWS::CodeDeploy::Application resource", correct: false,
        why: "SAM creates the CodeDeploy application for you when you use DeploymentPreference. A separate resource is not required." }
    ],
    explanation: "AutoPublishAlias plus DeploymentPreference is the minimum for SAM gradual deployments. Alarms and hooks are optional additions." },

  { id: "g-iac-032", topic: "iac-cdk", domain: 3,
    stem: "A developer runs cdk deploy for the first time in a new AWS account and Region. The CDK app has a Lambda function with local code. The deployment fails because the CLI cannot find the resources that it needs to upload the assets. Which solution will meet these requirements?",
    options: [
      { text: "Run cdk bootstrap for that account and Region, and then run cdk deploy again.", correct: true,
        why: "Bootstrapping deploys the CDKToolkit stack with the S3 bucket, ECR repository, and IAM roles that CDK uses for assets and deployment. Each environment needs it." },
      { text: "Run cdk synth, and then run cdk deploy again.", correct: false,
        why: "cdk synth only writes the cloud assembly locally. It does not create the asset bucket in the account." },
      { text: "Run cdk init in the project folder.", correct: false,
        why: "cdk init creates a new project. It does not prepare the AWS environment." },
      { text: "Run cdk deploy --hotswap.", correct: false,
        why: "Hotswap is for fast development updates of existing resources. It does not create the bootstrap resources." }
    ],
    explanation: "Each account and Region must be bootstrapped before CDK deploys stacks with assets. Without bootstrap, only stacks with no assets and small templates deploy." },

  { id: "g-iac-033", topic: "iac-cdk", domain: 3,
    stem: "A developer uses CDK L2 constructs to create an S3 bucket and a DynamoDB table in a test stack. After cdk destroy, the stack is gone, but the bucket and the table still exist. For this test stack only, the developer wants cdk destroy to delete the bucket with its objects and the table. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Set removalPolicy to RemovalPolicy.DESTROY on the bucket and the table.", correct: true,
        why: "For stateful L2 resources, the CDK default removal policy is RETAIN. DESTROY makes CloudFormation delete the resources with the stack." },
      { text: "Set autoDeleteObjects to true on the bucket.", correct: true,
        why: "CloudFormation cannot delete a bucket that contains objects. autoDeleteObjects makes CDK empty the bucket before deletion." },
      { text: "Run cdk destroy --force.", correct: false,
        why: "--force only skips the confirmation prompt. The RETAIN removal policy still keeps the resources." },
      { text: "Change the constructs to L1 CfnBucket and CfnTable constructs.", correct: false,
        why: "This changes the code a lot and does not empty the bucket. The objects still block bucket deletion." },
      { text: "Run cdk bootstrap again before cdk destroy.", correct: false,
        why: "Bootstrapping prepares the environment for deployment. It does not change removal policies." }
    ],
    explanation: "CDK RemovalPolicy maps to DeletionPolicy. Stateful resources default to RETAIN; use DESTROY and autoDeleteObjects for disposable stacks." },

  { id: "g-iac-034", topic: "iac-cdk", domain: 2,
    stem: "A CDK app defines a Lambda function and a DynamoDB table with L2 constructs. The function must read items from the table. The developer wants least privilege and the least code. Which solution will meet these requirements?",
    options: [
      { text: "Use the table grants for read access with the function as the grantee, for example table.grants.readData(fn).", correct: true,
        why: "L2 grants (the grants property, or the older grantReadData method, which still works but is discouraged) add an IAM policy with the read actions for that table to the function role. The developer writes no policy JSON." },
      { text: "Attach the AmazonDynamoDBFullAccess managed policy to the function role.", correct: false,
        why: "This allows all DynamoDB actions on all tables. It fails least privilege." },
      { text: "Add a policy statement with dynamodb:* on the table ARN to the function role.", correct: false,
        why: "dynamodb:* also allows writes and deletes. It fails least privilege." },
      { text: "Add a resource-based policy to the function that allows dynamodb.amazonaws.com.", correct: false,
        why: "A function resource-based policy controls who can invoke the function. It does not let the function read the table." }
    ],
    explanation: "CDK L2 constructs have grant methods that add least-privilege permissions between resources with one line of code." },

  { id: "g-iac-035", topic: "iac-environments", domain: 3,
    stem: "A team deploys one SAM template to a dev stack with sam deploy. The team must also deploy the same template to a staging stack with a different stack name and different parameter values. The team wants repeatable commands and no copy of the template. Which solution will meet these requirements?",
    options: [
      { text: "Add a [staging.deploy.parameters] section with stack_name and parameter_overrides to samconfig.toml, and run sam deploy --config-env staging.", correct: true,
        why: "The SAM configuration file stores options for each named environment. --config-env selects the staging settings for the same template." },
      { text: "Copy template.yaml to template-staging.yaml with the staging values written into it.", correct: false,
        why: "This creates a copy of the template that the team must keep in sync. It fails the no-copy requirement." },
      { text: "Run sam sync --stack-name staging.", correct: false,
        why: "sam sync is meant for development stacks and causes drift. It is not a repeatable staging deployment." },
      { text: "Put the staging values in the Globals section of the template.", correct: false,
        why: "Globals sets shared resource properties for all deployments. It does not give different values for each environment." }
    ],
    explanation: "Use samconfig environments with --config-env to deploy one SAM template to many stacks with different settings." },

  { id: "g-iac-036", topic: "iac-environments", domain: 3,
    stem: "A CodePipeline pipeline deploys a CloudFormation stack to production. A release manager must review the exact resource changes before they are applied, and the changes must apply only after approval. Which pipeline design will meet these requirements?",
    options: [
      { text: "A CloudFormation action with CHANGE_SET_REPLACE, then a manual approval action, then a CloudFormation action with CHANGE_SET_EXECUTE.", correct: true,
        why: "CHANGE_SET_REPLACE creates a change set without changing the stack. After approval, CHANGE_SET_EXECUTE applies the reviewed change set." },
      { text: "A CloudFormation action with CREATE_UPDATE, then a manual approval action.", correct: false,
        why: "CREATE_UPDATE changes the stack at once. The approval comes after the changes, which fails the requirement." },
      { text: "A manual approval action, then a CloudFormation action with REPLACE_ON_FAILURE.", correct: false,
        why: "The manager approves without seeing the changes, and REPLACE_ON_FAILURE can delete the stack. AWS recommends it for testing only." },
      { text: "A CloudFormation action with CHANGE_SET_EXECUTE, then a manual approval action.", correct: false,
        why: "This applies changes before approval, and no step creates a change set to review." }
    ],
    explanation: "Create the change set, approve, then execute it. This is the standard reviewed CloudFormation deployment in CodePipeline." },

  { id: "g-iac-037", topic: "iac-environments", domain: 3,
    stem: "One template deploys dev and prod stacks. A parameter EnvType accepts dev or prod. Prod must use a larger instance type and must have an extra CloudWatch alarm. Dev must not create the alarm. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Add a Conditions entry IsProd with Fn::Equals on EnvType and prod, and add Condition: IsProd to the alarm resource.", correct: true,
        why: "A condition on a resource makes CloudFormation create it only when the condition is true. The alarm exists only in prod." },
      { text: "Add a Mappings section keyed by environment with the instance type for each, and use Fn::FindInMap with Ref EnvType.", correct: true,
        why: "A mapping gives a different literal value for each environment. FindInMap selects it with the parameter." },
      { text: "Add a condition that checks the alarm resource attribute with Fn::GetAtt.", correct: false,
        why: "Conditions cannot reference resources or resource attributes. They use parameters, pseudo parameters, mappings, and other conditions." },
      { text: "Put Fn::If with Ref EnvType inside the Mappings section to choose the instance type.", correct: false,
        why: "Mappings cannot contain parameters or intrinsic functions. CloudFormation rejects the template." },
      { text: "Keep two templates, one for dev and one for prod.", correct: false,
        why: "This duplicates the template. The requirement is one template for both environments." }
    ],
    explanation: "Use parameters, mappings, and conditions to drive environment differences from one template. Conditions cannot reference resources; mappings hold literals only." },

  { id: "g-iac-038", topic: "iac-environments", domain: 2,
    stem: "Developers deploy CloudFormation stacks that create Lambda functions, DynamoDB tables, and IAM roles. Security policy says developers must not have permission to create these resources directly through the service APIs. Developers must still be able to deploy and update the stacks. Which solution will meet these requirements?",
    options: [
      { text: "Create a CloudFormation service role with the resource permissions, and give developers CloudFormation permissions and iam:PassRole for that role only. Developers specify the role when they create stacks.", correct: true,
        why: "CloudFormation uses the service role credentials for all operations on the stack. Developers need only CloudFormation permissions and permission to pass the role." },
      { text: "Give developers AdministratorAccess, and require a stack policy on every stack.", correct: false,
        why: "AdministratorAccess lets developers create resources directly. A stack policy controls stack updates only, not direct API calls." },
      { text: "Turn on termination protection for all stacks.", correct: false,
        why: "Termination protection only blocks stack deletion. It does not control who can create resources." },
      { text: "Add CAPABILITY_NAMED_IAM to every deployment.", correct: false,
        why: "Capabilities acknowledge IAM resources in a template. They do not limit developer permissions." }
    ],
    explanation: "A CloudFormation service role separates deploy permission from resource permission. Users need iam:PassRole for the role; CloudFormation uses it for all later operations." },

  { id: "g-iac-039", topic: "iac-packaging", domain: 3,
    stem: "A CloudFormation template defines an AWS::Serverless::Function with CodeUri: ./src. The developer runs aws cloudformation create-stack with the template. The SAM transform fails because CodeUri must be an Amazon S3 location, not a local path. The developer wants to keep the code in the local folder in source control. Which solution will meet these requirements?",
    options: [
      { text: "Run aws cloudformation package with --s3-bucket to upload ./src and write an output template, and then deploy the output template.", correct: true,
        why: "package zips the local folder, uploads it to S3, and replaces CodeUri with the S3 location in a new template that CloudFormation can deploy." },
      { text: "Change CodeUri to the absolute path of the src folder on the developer machine.", correct: false,
        why: "CloudFormation runs in AWS and cannot read files on the developer machine. The code still is not found." },
      { text: "Run aws cloudformation validate-template, and then create the stack again.", correct: false,
        why: "Validation checks syntax only. It does not upload the code." },
      { text: "Put the code in the template Metadata section.", correct: false,
        why: "CloudFormation does not deploy code from the Metadata section. The function still has no code." }
    ],
    explanation: "aws cloudformation package (or sam deploy) uploads local artifacts to S3 and rewrites the template with S3 locations." },

  { id: "g-iac-040", topic: "iac-packaging", domain: 3,
    stem: "A SAM project has five Python functions. All five use the same internal helper library, and each function has different third-party dependencies. The developer wants small deployment packages and one place to update the helper library. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Put the helper library in an AWS::Serverless::LayerVersion with ContentUri, and add the layer to each function Layers property.", correct: true,
        why: "A layer shares the library between functions. An update to the layer is made in one place." },
      { text: "Give each function its own CodeUri folder with its own requirements.txt file.", correct: true,
        why: "Each function package then contains only its own code and dependencies, which keeps packages small." },
      { text: "Copy the helper library into each function folder.", correct: false,
        why: "The library then exists in five places. Updates must be made five times, which fails the one-place requirement." },
      { text: "Point all five functions at one CodeUri folder that contains all code and all dependencies.", correct: false,
        why: "Each package then contains the code and dependencies of all functions. Packages are larger than needed." },
      { text: "Set CodeUri in the Globals section to the helper library folder.", correct: false,
        why: "All functions then use the helper folder as their code, not their own handlers. This does not share a library." }
    ],
    explanation: "Use one folder and one dependency file for each function, and put shared code in a layer." }

] });
