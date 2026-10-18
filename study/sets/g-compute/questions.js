window.QUESTION_BANKS = window.QUESTION_BANKS || [];
window.QUESTION_BANKS.push({ setId: "g-compute", questions: [

  { id: "gcmp-001", topic: "compute-ec2-dev", domain: 2,
    stem: "A web application runs on Amazon EC2 instances and uses an instance profile to call Amazon S3. A security review finds a server-side request forgery (SSRF) flaw. An attacker could make the application send requests to the instance metadata service and read the role credentials. The application must keep using the instance profile. Which solution will provide the MOST protection for the credentials?",
    options: [
      { text: "Set HttpTokens to required on the instances so that the instance metadata service accepts only IMDSv2 session requests.", correct: true,
        why: "IMDSv2 needs a token from a PUT request first. IMDS rejects a token PUT that has an X-Forwarded-For header, and simple SSRF GET requests cannot get a token. The SDK still gets the role credentials." },
      { text: "Turn off the instance metadata service endpoint on the instances.", correct: false,
        why: "Without IMDS, the SDK cannot get the instance profile credentials. This fails the requirement to keep using the instance profile." },
      { text: "Replace the instance profile with an IAM user access key that is stored in the instance user data.", correct: false,
        why: "Any process on the instance can read user data from the metadata service, so the SSRF flaw can still expose the key. Long-term keys are also less secure than role credentials." },
      { text: "Increase the PUT response hop limit to 3.", correct: false,
        why: "A larger hop limit lets token responses travel further. It does not add protection, and IMDSv1 requests still work without a token." }
    ],
    explanation: "Require IMDSv2 (HttpTokens required) to protect instance profile credentials from SSRF. IMDSv2 needs a session token from a PUT request before any GET." },

  { id: "gcmp-002", topic: "compute-ec2-dev", domain: 4,
    stem: "A team sets HttpTokens to required on an EC2 instance. The instance runs an application in a Docker container that uses the AWS SDK and the instance profile. After the change, the SDK in the container cannot get credentials, and the token request times out. Processes that run directly on the host still work. The team must keep IMDSv2 required. Which solution will meet these requirements?",
    options: [
      { text: "Set the instance metadata PUT response hop limit to 2.", correct: true,
        why: "The token response has a hop limit of 1 by default. The container network adds a hop, so the response does not reach the container. AWS recommends hop limit 2 in container environments." },
      { text: "Set HttpTokens to optional so that the container can use IMDSv1.", correct: false,
        why: "This turns IMDSv1 on again. It fails the requirement to keep IMDSv2 required." },
      { text: "Turn on the IPv6 endpoint for the instance metadata service.", correct: false,
        why: "The IPv6 endpoint is another address for the same service. The hop limit still blocks the token response, so the problem continues." },
      { text: "Allow access to instance tags in the instance metadata.", correct: false,
        why: "Tag access adds tag data to the metadata. It does not change the hop limit, so the container still cannot get a token." }
    ],
    explanation: "The IMDSv2 PUT response hop limit is 1 by default. Containers on the instance can need hop limit 2 to receive the token." },

  { id: "gcmp-003", topic: "compute-ec2-dev", domain: 4,
    stem: "An old monitoring script on Amazon EC2 instances runs curl http://169.254.169.254/latest/meta-data/instance-id. After an administrator required IMDSv2 on the instances, the script gets HTTP 401 Unauthorized. The developer must fix the script with the fewest changes and keep IMDSv2 required. Which solution will meet these requirements?",
    options: [
      { text: "Send a PUT request to /latest/api/token with the X-aws-ec2-metadata-token-ttl-seconds header, then send the GET request with the X-aws-ec2-metadata-token header.", correct: true,
        why: "When IMDSv2 is required, a request without a valid token gets 401. The script must create a session token and send it with each GET." },
      { text: "Increase the PUT response hop limit to 2.", correct: false,
        why: "The script sends no token at all. The hop limit affects how far a token response travels, so the 401 continues." },
      { text: "Call the DescribeInstances API from the script with the AWS CLI instead of the metadata service.", correct: false,
        why: "This needs IAM permissions and more code changes than adding a token. It fails the fewest-changes requirement." },
      { text: "Send the GET request to the IPv6 address of the metadata service.", correct: false,
        why: "The IPv6 endpoint has the same IMDSv2 rules. A request without a token still gets 401." }
    ],
    explanation: "IMDSv2 needs a PUT to /latest/api/token, then GET requests with the X-aws-ec2-metadata-token header. Without a token, IMDSv2-only instances return 401." },

  { id: "gcmp-004", topic: "compute-ec2-dev", domain: 2,
    stem: "Developers need shell access to EC2 instances in private subnets. The subnets have no route to the internet, and company policy does not allow internet access. Security groups must not allow any inbound traffic. The company does not want to manage SSH keys or bastion hosts. Which actions should the developer take to meet these requirements? (Choose two.)",
    options: [
      { text: "Attach an instance profile that includes the AmazonSSMManagedInstanceCore managed policy, and connect with Session Manager.", correct: true,
        why: "Session Manager gives shell access through SSM Agent with no inbound ports, no bastion hosts, and no SSH keys. The managed policy gives the agent the permissions it needs." },
      { text: "Create interface VPC endpoints for ssm, ssmmessages, and ec2messages in the VPC.", correct: true,
        why: "SSM Agent needs outbound HTTPS to these three endpoints. Interface endpoints give this access without an internet route." },
      { text: "Add a NAT gateway and a route to it from the private subnets.", correct: false,
        why: "A NAT gateway gives the instances internet access. This fails the policy that does not allow internet access." },
      { text: "Create a key pair and allow inbound port 22 from the corporate IP range.", correct: false,
        why: "This uses SSH keys and an inbound rule. It fails both the no-inbound-traffic and the no-SSH-keys requirements." },
      { text: "Launch a bastion host in a public subnet and allow SSH from it to the instances.", correct: false,
        why: "A bastion host needs management and an inbound SSH rule on the instances. It fails the requirements." }
    ],
    explanation: "Session Manager needs SSM Agent, an instance profile with the right permissions, and outbound HTTPS to ssm, ssmmessages, and ec2messages. In a private subnet, use interface VPC endpoints." },

  { id: "gcmp-005", topic: "compute-ec2-dev", domain: 4,
    stem: "A developer launches an Amazon Linux EC2 instance with a user data shell script that installs and starts a web server. After launch, the web server is not installed. The developer can connect to the instance with Session Manager. Which action will help the developer find the cause MOST quickly?",
    options: [
      { text: "Read the /var/log/cloud-init-output.log file on the instance.", correct: true,
        why: "The cloud-init output log captures the console output of the user data script, including error messages." },
      { text: "Search AWS CloudTrail for the RunInstances event of the instance.", correct: false,
        why: "CloudTrail records the API call that launched the instance. It does not record the output of the script that ran inside it." },
      { text: "Run aws ec2 describe-instance-attribute --attribute userData for the instance.", correct: false,
        why: "This returns the base64-encoded script text, not the result of the run. It does not show why the script failed." },
      { text: "Check the EC2 instance status checks in the console.", correct: false,
        why: "Status checks test the instance and the host. They pass even when a user data script fails, so they do not show the cause." }
    ],
    explanation: "User data runs at the first boot as root. The script output, with errors, is in /var/log/cloud-init-output.log on Amazon Linux." },

  { id: "gcmp-006", topic: "compute-ec2-dev", domain: 2,
    stem: "An EC2 user data script must download a configuration file from a private Amazon S3 bucket and read a database password at first boot. Currently the script contains an IAM user access key and the password in plain text. A security review requires removing both secrets from the user data. Which actions should the developer take to meet this requirement? (Choose two.)",
    options: [
      { text: "Attach an instance profile with a role that allows s3:GetObject on the bucket, and remove the access key from the script.", correct: true,
        why: "The AWS CLI in the script gets temporary role credentials from the instance metadata service. No long-term key is in the user data." },
      { text: "Store the password in AWS Secrets Manager, and make the script get the secret value at boot with the role credentials.", correct: true,
        why: "The password leaves the user data. The role must also allow secretsmanager:GetSecretValue on the secret." },
      { text: "Base64-encode the access key and the password in the user data.", correct: false,
        why: "Base64 is an encoding, not encryption. Anyone who can read the user data can decode the secrets." },
      { text: "Move the access key and the password into the AMI that the instance uses.", correct: false,
        why: "The secrets are still stored in plain form, now in every instance launched from the AMI. This fails the security requirement." },
      { text: "Turn on encryption of the root EBS volume.", correct: false,
        why: "EBS encryption protects data at rest on the volume. User data is still readable through the metadata service and the EC2 API, so the secrets stay exposed." }
    ],
    explanation: "Never put credentials or secrets in user data. Use an instance profile for AWS API calls and get secrets at run time from Secrets Manager or Parameter Store." },

  { id: "gcmp-007", topic: "compute-elb", domain: 1,
    stem: "A company runs three microservices on Amazon ECS. Requests to example.com/api/* must go to the API service, requests to example.com/images/* must go to the image service, and all other requests must go to the web service. The company wants one load balancer with the LEAST operational overhead. Which solution will meet these requirements?",
    options: [
      { text: "Create an Application Load Balancer with listener rules that use path-pattern conditions to forward to three target groups.", correct: true,
        why: "An ALB works at layer 7. Path-pattern listener rules send each path to its own target group, and the default rule handles all other requests." },
      { text: "Create a Network Load Balancer with one listener and three target groups.", correct: false,
        why: "An NLB works at layer 4 and cannot read the URL path. It cannot route by path." },
      { text: "Create three Application Load Balancers and use Amazon Route 53 weighted records to split traffic.", correct: false,
        why: "Weighted DNS records split traffic by percentage, not by path. Three load balancers also add overhead, so this fails both requirements." },
      { text: "Create one target group for all services, and make the web service forward requests to the other services.", correct: false,
        why: "This puts routing logic into application code and adds a hop. It fails the least-operational-overhead requirement." }
    ],
    explanation: "ALB listener rules route by host header, path pattern, HTTP header, HTTP method, query string, and source IP. NLBs cannot route by path." },

  { id: "gcmp-008", topic: "compute-elb", domain: 1,
    stem: "A company exposes a TCP-based trading service that runs on EC2 instances. Partner firewalls allow traffic only to a fixed list of IP addresses. The service must handle millions of requests each second with very low latency. Which solution will meet these requirements?",
    options: [
      { text: "Use a Network Load Balancer and associate one Elastic IP address with each enabled subnet.", correct: true,
        why: "An NLB works at layer 4 for TCP, handles millions of requests each second, and gives a static IP address in each Availability Zone. Elastic IP addresses give partners a fixed list." },
      { text: "Use an Application Load Balancer and give the partners its current IP addresses.", correct: false,
        why: "An ALB does not support Elastic IP addresses. Its node addresses can change, so the partner list can become wrong." },
      { text: "Use an Application Load Balancer with a source-ip listener rule.", correct: false,
        why: "A source-ip rule routes requests by client address. It does not give the load balancer static IP addresses, and an ALB handles HTTP, not raw TCP." },
      { text: "Use Amazon Route 53 multivalue answer records that point to the instance public IP addresses.", correct: false,
        why: "Instance addresses change when instances are replaced, and DNS does not balance load at this scale. This fails the fixed-IP and throughput requirements." }
    ],
    explanation: "Choose an NLB for layer 4 traffic, static IP addresses (Elastic IP addresses for each subnet), and very high throughput." },

  { id: "gcmp-009", topic: "compute-elb", domain: 4,
    stem: "A web application runs on four EC2 instances behind an Application Load Balancer. The application stores user sessions in memory on each instance. Users report that they are logged out at random. The team needs a fix now with the fewest code changes. Which solution will meet these requirements?",
    options: [
      { text: "Turn on duration-based sticky sessions (lb_cookie) for the target group.", correct: true,
        why: "The ALB sets the AWSALB cookie and sends each user to the same target. The in-memory session is found again, with no code change." },
      { text: "Change the routing algorithm of the target group to least outstanding requests.", correct: false,
        why: "This algorithm sends each request to the least busy target. Requests from one user still go to different instances, so logouts continue." },
      { text: "Move the sessions to an Amazon ElastiCache cluster.", correct: false,
        why: "A shared session store is a better long-term design, but it needs application code changes. It fails the fewest-code-changes requirement." },
      { text: "Turn off cross-zone load balancing for the target group.", correct: false,
        why: "This keeps traffic in each Availability Zone, but users still move between instances. Sticky sessions also do not work with cross-zone load balancing off." }
    ],
    explanation: "Sticky sessions bind a user to one target with a cookie (AWSALB for duration-based stickiness). They are a quick fix for in-memory sessions." },

  { id: "gcmp-010", topic: "compute-elb", domain: 1,
    stem: "An application on EC2 instances behind an Application Load Balancer must record the IP address of each client in its own request log. The current logs show only private IP addresses of the load balancer. Which solution will meet this requirement?",
    options: [
      { text: "Read the client IP address from the X-Forwarded-For request header in the application.", correct: true,
        why: "The ALB connects to the target from its own address. In the default append mode, it adds the client IP address to the X-Forwarded-For header." },
      { text: "Set the routing.http.preserve_host_header.enabled attribute to true.", correct: false,
        why: "This attribute keeps the original Host header. It does not give the client IP address." },
      { text: "Set the routing.http.xff_header_processing.mode attribute to remove.", correct: false,
        why: "The remove mode deletes the X-Forwarded-For header before the request reaches the target. The client IP address is lost." },
      { text: "Add a listener rule with a source-ip condition.", correct: false,
        why: "A source-ip condition only routes requests. It does not pass the client address to the application." }
    ],
    explanation: "Targets behind an ALB see the load balancer address. The client IP address is in X-Forwarded-For; the protocol is in X-Forwarded-Proto." },

  { id: "gcmp-011", topic: "compute-elb", domain: 4,
    stem: "Users upload large files to an application on EC2 instances behind an Application Load Balancer. An upload can take up to 8 minutes. During each deployment, old instances are deregistered from the target group, and some users get HTTP 502 errors for uploads in progress. The target group uses default settings. Which change will fix the problem?",
    options: [
      { text: "Increase the deregistration delay of the target group to more than 8 minutes.", correct: true,
        why: "The default delay is 300 seconds. When the delay ends during a request, the ALB returns 502. A longer delay lets the uploads finish while the target drains." },
      { text: "Increase the idle timeout of the load balancer.", correct: false,
        why: "The idle timeout controls idle connections and causes 504 errors when it is too short. It does not keep a deregistered target active." },
      { text: "Turn on slow start mode for the target group.", correct: false,
        why: "Slow start sends a growing share of traffic to new targets. It does not protect requests on targets that are deregistering." },
      { text: "Decrease the health check interval of the target group.", correct: false,
        why: "The health check interval controls how often targets are tested. It does not affect requests on a draining target." }
    ],
    explanation: "Deregistration delay (default 300 seconds, maximum 3,600) lets in-flight requests finish. If it ends during a request, the ALB returns 502." },

  { id: "gcmp-012", topic: "compute-elb", domain: 4,
    stem: "An Application Load Balancer returns HTTP 504 errors for some requests. The HTTPCode_ELB_5XX_Count metric increases, and HTTPCode_Target_5XX_Count does not. Which conditions can cause these 504 errors? (Choose two.)",
    options: [
      { text: "The target accepted the connection but did not respond before the load balancer idle timeout ended.", correct: true,
        why: "When the target does not respond within the idle timeout (default 60 seconds), the ALB returns 504." },
      { text: "The load balancer could not establish a connection to the target before the 10-second connection timeout.", correct: true,
        why: "A failed connection within 10 seconds is a documented 504 cause." },
      { text: "The target group has no registered targets.", correct: false,
        why: "No registered targets causes 503 Service Unavailable, not 504." },
      { text: "The target returned a malformed HTTP response.", correct: false,
        why: "A malformed response from the target causes 502 Bad Gateway, not 504." },
      { text: "An AWS WAF web ACL blocked the request.", correct: false,
        why: "A request that AWS WAF blocks gets 403 Forbidden, not 504." }
    ],
    explanation: "ALB 502 = bad or reset response from the target. 503 = no registered targets. 504 = connection or response timeout to the target." },

  { id: "gcmp-013", topic: "compute-health-checks", domain: 4,
    stem: "All targets in an Application Load Balancer target group show unhealthy with the reason Target.ResponseCodeMismatch. The health check uses the default path /. The application redirects / to /login with HTTP 302. The application works when users open it. The team wants the health check to show the real health of the application. Which solution will meet this requirement?",
    options: [
      { text: "Add a /health endpoint that returns HTTP 200 when the application works, and set the health check path to /health.", correct: true,
        why: "The default matcher expects 200. A dedicated path that returns 200 gives a correct result and does not depend on the redirect." },
      { text: "Increase the unhealthy threshold count to 10.", correct: false,
        why: "Every check still gets 302, so the targets become unhealthy later but still fail. The result stays wrong." },
      { text: "Increase the health check timeout to 60 seconds.", correct: false,
        why: "The problem is the status code, not a timeout. A longer timeout does not change the 302 response." },
      { text: "Turn off health checks for the target group.", correct: false,
        why: "Without health checks, the ALB cannot detect failed targets. This fails the requirement to show the real health." }
    ],
    explanation: "Target.ResponseCodeMismatch means the status code is not in the matcher (default 200). Use a health check path that returns 200, or change the matcher." },

  { id: "gcmp-014", topic: "compute-health-checks", domain: 4,
    stem: "A developer registers new EC2 instances in a target group. The application listens on port 8080, and curl http://localhost:8080/health on each instance returns 200. The targets stay unhealthy with the reason Target.Timeout. Which action will MOST likely fix the problem?",
    options: [
      { text: "Add an inbound rule to the instance security group that allows port 8080 from the load balancer security group.", correct: true,
        why: "Target.Timeout means the health check got no response. The instance security group must allow the load balancer on the health check port." },
      { text: "Change the health check success codes to 200-399.", correct: false,
        why: "A matcher problem gives Target.ResponseCodeMismatch, not a timeout. The check gets no response at all." },
      { text: "Increase the deregistration delay to 600 seconds.", correct: false,
        why: "Deregistration delay affects targets that leave the group. It does not help new targets pass health checks." },
      { text: "Turn on sticky sessions for the target group.", correct: false,
        why: "Stickiness affects client routing. It does not change whether health check traffic reaches the instances." }
    ],
    explanation: "Target.Timeout usually means a security group or network ACL blocks the health check, or the target is overloaded." },

  { id: "gcmp-015", topic: "compute-health-checks", domain: 4,
    stem: "An Amazon ECS service on AWS Fargate runs behind an Application Load Balancer. The application needs about 3 minutes to load data before it can answer requests. New tasks fail the target group health checks, and ECS stops and replaces them in a loop. Which solution will meet these requirements?",
    options: [
      { text: "Set healthCheckGracePeriodSeconds on the ECS service to a value longer than the startup time, for example 240.", correct: true,
        why: "During the grace period, the ECS scheduler ignores unhealthy ELB health checks for new tasks. The tasks have time to start." },
      { text: "Set startPeriod in the container health check of the task definition.", correct: false,
        why: "startPeriod applies only to the container health check. ECS still acts on the failed ELB health checks, so the loop continues." },
      { text: "Increase the deregistration delay of the target group.", correct: false,
        why: "Deregistration delay affects targets that are leaving. It does not stop ECS from replacing new tasks that fail health checks." },
      { text: "Double the CPU and memory of the task.", correct: false,
        why: "More resources can make startup a little faster, but the data load still takes time. It does not stop health check failures during startup and adds cost." }
    ],
    explanation: "healthCheckGracePeriodSeconds (default 0) makes the ECS scheduler ignore ELB, VPC Lattice, and container health checks for a time after a task starts." },

  { id: "gcmp-016", topic: "compute-health-checks", domain: 4,
    stem: "An application on Amazon EKS uses a liveness probe that calls an endpoint that tests the database connection. During a short database outage, Kubernetes restarted every Pod, and recovery took a long time. The team wants Pods to stop getting traffic when the database is not available, without restarting. Which solution will meet these requirements?",
    options: [
      { text: "Move the database test to a readiness probe, and make the liveness probe check only that the process responds.", correct: true,
        why: "A failed readiness probe removes the Pod from Service endpoints without a restart. A shallow liveness probe restarts only stuck processes." },
      { text: "Replace the liveness probe with a startup probe that tests the database.", correct: false,
        why: "A startup probe runs only while the container starts. It does not stop traffic during a later database outage." },
      { text: "Increase the number of Pod replicas.", correct: false,
        why: "Every replica runs the same liveness probe, so all of them restart in the next outage." },
      { text: "Remove all probes from the Pod specification.", correct: false,
        why: "Without a readiness probe, Pods keep getting traffic during the outage. This fails the requirement." }
    ],
    explanation: "Liveness failure restarts the container. Readiness failure only removes the Pod from Service endpoints. Keep dependency checks out of liveness probes." },

  { id: "gcmp-017", topic: "compute-health-checks", domain: 4,
    stem: "An EC2 Auto Scaling group runs a web application behind an Application Load Balancer. The group was created with the AWS CLI with default health settings. When the application process crashes, the target group marks the instance unhealthy, but Auto Scaling does not replace it. New instances need 4 minutes to start the application. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Turn on Elastic Load Balancing health checks for the Auto Scaling group.", correct: true,
        why: "By default, Auto Scaling uses only EC2 status checks, which do not see the crash. With ELB health checks, Auto Scaling replaces instances that fail the target group check." },
      { text: "Set the health check grace period of the Auto Scaling group to about 300 seconds.", correct: true,
        why: "The CLI default is 0 seconds. Without a grace period, new instances can fail ELB health checks during the 4-minute start and be replaced." },
      { text: "Increase the healthy threshold count of the target group to 10.", correct: false,
        why: "This makes targets take longer to become healthy. It does not make Auto Scaling act on target group health." },
      { text: "Set the deregistration delay of the target group to 0.", correct: false,
        why: "This only stops in-flight requests sooner. Auto Scaling still ignores the failed health check." },
      { text: "Keep EC2 status checks and add a CloudWatch alarm on CPU utilization.", correct: false,
        why: "A crashed process can have low CPU and pass status checks. No instance is replaced." }
    ],
    explanation: "Turn on ELB health checks so that Auto Scaling replaces instances with failed applications. Set a grace period (console default 300 seconds, CLI default 0)." },

  { id: "gcmp-018", topic: "compute-health-checks", domain: 4,
    stem: "A company uses an Amazon Route 53 private hosted zone with failover records for an internal API. The primary API runs on EC2 instances with private IP addresses only. The team must make Route 53 fail over when the primary API returns errors. Which solution will meet these requirements?",
    options: [
      { text: "Create a CloudWatch alarm on an error metric of the API, and create a Route 53 health check that monitors the alarm.", correct: true,
        why: "Route 53 health checkers cannot reach private IP addresses. A health check that monitors a CloudWatch alarm works for private resources." },
      { text: "Create a Route 53 HTTP endpoint health check that uses the private IP address of the primary instance.", correct: false,
        why: "Route 53 cannot check endpoints with private, nonroutable IP addresses. The health check cannot work." },
      { text: "Create a calculated health check with no child health checks.", correct: false,
        why: "A calculated health check gets its status from other health checks. With no children, it does not measure the API." },
      { text: "Turn on string matching on an HTTPS health check for the private endpoint.", correct: false,
        why: "String matching still needs Route 53 to reach the endpoint. It cannot reach a private IP address." }
    ],
    explanation: "Route 53 health checks can monitor an endpoint, other health checks, or a CloudWatch alarm. Use the alarm type for resources with private IP addresses." },

  { id: "gcmp-019", topic: "compute-health-checks", domain: 4,
    stem: "A Java application on Amazon EKS needs up to 2 minutes to start. The liveness probe runs every 10 seconds with a failure threshold of 3, so the kubelet restarts the container before it starts. The Service must not send traffic to a Pod until the application can take requests. Which actions will meet these requirements? (Choose two.)",
    options: [
      { text: "Add a startup probe with periodSeconds and failureThreshold values that allow more than 2 minutes.", correct: true,
        why: "The kubelet does not run liveness or readiness probes until the startup probe succeeds. The slow start no longer causes restarts." },
      { text: "Add a readiness probe that succeeds only when the application can serve requests.", correct: true,
        why: "Until the readiness probe succeeds, the Pod is not in the Service endpoints, so it gets no traffic." },
      { text: "Lower the liveness probe failure threshold to 1.", correct: false,
        why: "This makes the kubelet restart the container sooner. The restarts become worse." },
      { text: "Increase the number of replicas in the Deployment.", correct: false,
        why: "Each new Pod has the same slow start and the same liveness probe. Restarts continue." },
      { text: "Change the liveness probe from httpGet to exec.", correct: false,
        why: "The probe type does not matter. Any liveness probe that fails during startup still restarts the container." }
    ],
    explanation: "Use a startup probe to protect slow-starting containers from liveness restarts. Use a readiness probe to keep traffic away until the Pod is ready." },

  { id: "gcmp-020", topic: "compute-container-images", domain: 3,
    stem: "A Node.js team builds a container image in a CI pipeline for each commit. The Dockerfile copies all source files and then runs npm ci. Each build reinstalls all dependencies and takes 6 minutes, even when only one source file changes. The team wants faster builds at no extra cost. Which solution will meet these requirements?",
    options: [
      { text: "Copy package.json and package-lock.json first, run npm ci, and copy the rest of the source code after that.", correct: true,
        why: "When a layer changes, Docker rebuilds that layer and all layers after it. With the dependency files first, a source change does not invalidate the npm ci layer." },
      { text: "Build with the --no-cache option.", correct: false,
        why: "--no-cache turns off the layer cache. Every step runs again, so builds get slower." },
      { text: "Run the build on a larger build instance.", correct: false,
        why: "More CPU can shorten the install a little, but it still runs every time. It also adds cost, so it fails the requirement." },
      { text: "Turn on tag immutability for the Amazon ECR repository.", correct: false,
        why: "Tag immutability prevents tag overwrites in the registry. It does not change how Docker builds the image." }
    ],
    explanation: "Order Dockerfile steps from least to most often changed. Copy and install dependencies before you copy the source code, so Docker reuses the cached dependency layer." },

  { id: "gcmp-021", topic: "compute-container-images", domain: 3,
    stem: "A Go service image is 1.2 GB because it contains the compiler, build tools, and source code. Tasks start slowly because the image download takes a long time. A security team also wants fewer packages in the runtime image. Which solution will meet these requirements?",
    options: [
      { text: "Use a multi-stage build: compile in a builder stage, and copy only the binary into a small runtime base image.", correct: true,
        why: "The final image contains only the binary and a minimal base. It is smaller, downloads faster, and has fewer packages to attack." },
      { text: "Turn on scan on push for the Amazon ECR repository.", correct: false,
        why: "Scanning reports vulnerabilities. It does not make the image smaller or remove packages." },
      { text: "Add an ECR lifecycle policy that deletes old images.", correct: false,
        why: "A lifecycle policy removes old images from the repository. Each image stays 1.2 GB." },
      { text: "Tag the image as latest so that tasks always use the newest build.", correct: false,
        why: "The tag does not change the image size or content. AWS also recommends latest only for tests." }
    ],
    explanation: "A multi-stage build keeps compilers and build tools out of the final image. A small runtime image downloads faster and has a smaller attack surface." },

  { id: "gcmp-022", topic: "compute-container-images", domain: 2,
    stem: "A build server on an EC2 instance must push images to one Amazon ECR repository. docker push fails with \"no basic auth credentials\". The instance has an instance profile with no ECR permissions. The solution must follow least privilege and must not use long-term keys. Which actions should the developer take? (Choose two.)",
    options: [
      { text: "Add ecr:GetAuthorizationToken on resource * and the layer upload and PutImage actions on the repository ARN to the instance profile role.", correct: true,
        why: "GetAuthorizationToken gets the registry login token. The upload actions and PutImage on the one repository ARN allow the push with least privilege." },
      { text: "Run aws ecr get-login-password and pipe the output to docker login with the username AWS and the registry URI before the push.", correct: true,
        why: "Docker needs an ECR authorization token. The error shows that Docker has not logged in to the registry." },
      { text: "Create an IAM user with the AmazonEC2ContainerRegistryFullAccess policy and store its access key on the server.", correct: false,
        why: "This uses a long-term key and gives far more than push access. It fails both requirements." },
      { text: "Add a repository policy that allows ecr:* for the principal *.", correct: false,
        why: "This gives every principal full access to the repository. It fails the least-privilege requirement." },
      { text: "Turn on tag immutability for the repository.", correct: false,
        why: "Tag immutability controls tag overwrites. It does not give the server credentials to push." }
    ],
    explanation: "To push to ECR: get a token with get-login-password, log in with docker login --username AWS, and allow GetAuthorizationToken plus the layer upload actions and PutImage." },

  { id: "gcmp-023", topic: "compute-eks", domain: 2,
    stem: "Several applications run on an Amazon EKS cluster with Linux EC2 managed node groups. Each application needs access to a different Amazon S3 bucket. The security team requires least privilege for each application. The cluster administrators must not create an IAM OIDC identity provider. Which solution will meet these requirements?",
    options: [
      { text: "Install the EKS Pod Identity Agent, and create a Pod Identity association that maps an IAM role to each application service account.", correct: true,
        why: "EKS Pod Identity gives each service account its own role, and it does not need an OIDC provider. The role trusts pods.eks.amazonaws.com." },
      { text: "Add permissions for all buckets to the node IAM role.", correct: false,
        why: "Every Pod on the node can use the node role, so every application gets access to all buckets. This fails least privilege." },
      { text: "Use IAM roles for service accounts (IRSA) for each application.", correct: false,
        why: "IRSA gives least privilege, but it needs an IAM OIDC provider for the cluster. This fails the requirement." },
      { text: "Store IAM user access keys in a Kubernetes Secret for each application.", correct: false,
        why: "Long-term keys need manual rotation and can leak. Roles with temporary credentials are more secure." }
    ],
    explanation: "EKS Pod Identity maps an IAM role to a namespace and service account. It needs the Pod Identity Agent but no OIDC provider." },

  { id: "gcmp-024", topic: "compute-eks", domain: 2,
    stem: "A team runs Pods on AWS Fargate in an Amazon EKS cluster. The Pods must write items to an Amazon DynamoDB table. The team must use temporary credentials and least privilege. Which solution will meet these requirements?",
    options: [
      { text: "Use IAM roles for service accounts (IRSA): create an IAM OIDC provider, create a role that the service account can assume, and annotate the service account with the role ARN.", correct: true,
        why: "IRSA works for Fargate Pods. Only Pods that use the service account get the role, with temporary credentials." },
      { text: "Create an EKS Pod Identity association for the service account.", correct: false,
        why: "EKS Pod Identity does not support Pods on Fargate. It works only on Linux EC2 nodes." },
      { text: "Add the DynamoDB permissions to the Fargate Pod execution role.", correct: false,
        why: "The Pod execution role is for Fargate tasks such as image pulls and logs. Containers cannot use its permissions." },
      { text: "Make the application get credentials from the instance metadata service.", correct: false,
        why: "Fargate Pods cannot use the instance metadata service, so the application gets no credentials." }
    ],
    explanation: "For Fargate Pods on EKS, use IRSA. EKS Pod Identity is not supported on Fargate, and the Pod execution role is not available to containers." },

  { id: "gcmp-025", topic: "compute-eks", domain: 1,
    stem: "A company runs its applications on a self-managed Kubernetes cluster in its data center. The developers use kubectl, Helm charts, and existing Kubernetes manifests. The company wants to move to AWS, keep the same tools, and stop managing the Kubernetes control plane. Which solution will meet these requirements?",
    options: [
      { text: "Move the workloads to Amazon EKS.", correct: true,
        why: "EKS runs the Kubernetes control plane for the company. The team keeps kubectl, Helm, and its manifests." },
      { text: "Move the workloads to Amazon ECS on AWS Fargate.", correct: false,
        why: "ECS uses task definitions, not Kubernetes manifests, and it does not support kubectl or Helm. The team would have to change its tools." },
      { text: "Install Kubernetes on EC2 instances with a custom control plane.", correct: false,
        why: "The company would still manage the control plane. This fails the requirement." },
      { text: "Move each application to AWS Elastic Beanstalk.", correct: false,
        why: "Elastic Beanstalk does not use Kubernetes manifests or Helm. The team would have to change its tools." }
    ],
    explanation: "Choose EKS when the team uses Kubernetes tools or needs Kubernetes portability. Choose ECS for a simpler AWS native orchestrator." },

  { id: "gcmp-026", topic: "compute-eks", domain: 2,
    stem: "An Amazon EKS cluster runs on EC2 nodes. Each application uses EKS Pod Identity with its own role. A security audit finds that containers can still get the credentials of the node IAM role. The team must stop Pods from using the node role and keep each Pod role working. Which solution will meet these requirements?",
    options: [
      { text: "Restrict Pod access to the instance metadata service on the nodes, for example require IMDSv2 with a PUT response hop limit of 1.", correct: true,
        why: "If IMDS is not restricted, containers can get the node role credentials. Pod Identity credentials come from the Pod Identity Agent, so the Pod roles keep working." },
      { text: "Remove the node IAM role from the node group.", correct: false,
        why: "Nodes need the node role to join the cluster and pull images. The cluster stops working." },
      { text: "Add the same permissions to every Pod role that the node role has.", correct: false,
        why: "This gives Pods more permissions. It fails the requirement to stop Pods from using node-level access." },
      { text: "Move each application to its own namespace.", correct: false,
        why: "Namespaces do not block network access to the instance metadata service. Containers can still get the node role." }
    ],
    explanation: "EKS documentation warns that containers can get node role credentials when IMDS is not restricted. Restrict IMDS, and give each Pod its own role." },

  { id: "gcmp-027", topic: "compute-sizing", domain: 3,
    stem: "A developer creates an Amazon ECS task definition for AWS Fargate (Linux). The application needs 4 GB of memory and uses little CPU. Registration fails with the values cpu 256 and memory 4096. The developer wants the lowest cost valid configuration. Which configuration should the developer use?",
    options: [
      { text: "cpu 512 (0.5 vCPU) and memory 4096 (4 GB)", correct: true,
        why: "0.5 vCPU supports 1 GB to 4 GB. It is the smallest CPU value that allows 4 GB, so it costs the least." },
      { text: "cpu 256 (0.25 vCPU) and memory 3072 (3 GB)", correct: false,
        why: "0.25 vCPU supports only 512 MiB, 1 GB, or 2 GB. This pair is not valid, and the application needs 4 GB." },
      { text: "cpu 1024 (1 vCPU) and memory 4096 (4 GB)", correct: false,
        why: "This pair is valid, but 1 vCPU costs more than 0.5 vCPU. It fails the lowest-cost requirement." },
      { text: "cpu 2048 (2 vCPU) and memory 4096 (4 GB)", correct: false,
        why: "This pair is valid, but it pays for 2 vCPUs that the application does not use. It fails the lowest-cost requirement." }
    ],
    explanation: "Fargate tasks need task-level CPU and memory from a fixed set of pairs. For example, 0.25 vCPU allows up to 2 GB, and 0.5 vCPU allows 1 GB to 4 GB." },

  { id: "gcmp-028", topic: "compute-sizing", domain: 4,
    stem: "A company opts in to AWS Compute Optimizer for its EC2 instances. The recommendations use CPU and network data, but they do not consider memory. Some instances run memory-heavy applications. Which solution will make Compute Optimizer consider memory use?",
    options: [
      { text: "Install the CloudWatch agent on the instances and collect memory utilization metrics.", correct: true,
        why: "EC2 does not publish memory metrics by default. Compute Optimizer analyzes memory when the CloudWatch agent sends it." },
      { text: "Turn on detailed monitoring for the instances.", correct: false,
        why: "Detailed monitoring sends the default metrics every minute. It does not add memory metrics." },
      { text: "Activate enhanced infrastructure metrics in Compute Optimizer.", correct: false,
        why: "This feature extends the lookback period to 93 days. It does not add memory data." },
      { text: "Increase the instance sizes so that memory pressure goes down.", correct: false,
        why: "This changes the workload but does not give Compute Optimizer memory data. Recommendations still ignore memory." }
    ],
    explanation: "For EC2 memory recommendations, Compute Optimizer needs memory metrics from the CloudWatch agent." },

  { id: "gcmp-029", topic: "compute-sizing", domain: 4,
    stem: "A billing application on EC2 instances has its highest load during the last 3 days of each month. The team uses AWS Compute Optimizer with default settings. In the middle of the month, the recommendations suggest smaller instances that would not handle the month-end load. The team wants recommendations that include the full monthly cycle at no additional cost. Which solution will meet these requirements?",
    options: [
      { text: "Set the rightsizing recommendation preference lookback period to 32 days.", correct: true,
        why: "By default, Compute Optimizer analyzes the last 14 days. The 32-day lookback has no extra cost and captures monthly patterns, including the month-end peak." },
      { text: "Activate the enhanced infrastructure metrics preference to get a 93-day lookback.", correct: false,
        why: "93 days includes the peak, but enhanced infrastructure metrics is a paid feature. It fails the no-additional-cost requirement." },
      { text: "Install the CloudWatch agent on the instances.", correct: false,
        why: "The agent adds memory metrics. The lookback period stays 14 days, so the month-end peak can still be missing." },
      { text: "Turn on detailed monitoring for the instances.", correct: false,
        why: "Detailed monitoring gives 1-minute data at extra cost. It does not extend the analysis period." }
    ],
    explanation: "Compute Optimizer lookback options: 14 days (default), 32 days (no extra cost, captures monthly cycles), and 93 days (paid enhanced infrastructure metrics)." },

  { id: "gcmp-030", topic: "compute-sizing", domain: 3,
    stem: "An application on a general purpose EC2 instance keeps a large dataset in memory. CloudWatch agent metrics show 90 percent memory use and 10 percent CPU use at peak. The team wants the MOST cost-effective instance that keeps the dataset in memory. Which instance family should the team choose?",
    options: [
      { text: "A memory optimized family, such as R, sized for the memory need", correct: true,
        why: "Memory optimized instances give more memory for each vCPU. The team pays for the memory it needs, not for unused CPU." },
      { text: "A compute optimized family, such as C", correct: false,
        why: "Compute optimized instances give more CPU for each GB of memory. The application is memory-bound, so this wastes money." },
      { text: "A larger general purpose instance with twice the vCPUs", correct: false,
        why: "This adds memory, but it also doubles CPU that the application does not use. It is not the most cost-effective choice." },
      { text: "A burstable family, such as T, with the same vCPU count", correct: false,
        why: "Burstable instances help with low average CPU. They do not add memory for the dataset." }
    ],
    explanation: "Match the instance family to the limiting resource: memory optimized for memory-bound work, compute optimized for CPU-bound work." }

] });
