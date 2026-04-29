#!/usr/bin/env bash
mkdir -p /opt/dva-lab-08-04/www
echo "<h1>Hello from EC2 (CodeDeploy v1)</h1>" > /opt/dva-lab-08-04/www/index.html
chmod -R 755 /opt/dva-lab-08-04
exit 0
