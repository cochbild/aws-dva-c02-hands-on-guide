# dva-lab-08-app

Sample app used across DVA-C02 Module 8 labs.

`app.py` exposes:
- `lambda_handler` — entry point for AWS Lambda labs
- `main()` — tiny HTTP server for EC2 / ECS / Beanstalk labs (port 8080)

Both return JSON with `message` + `version`. The version is pinned via the `APP_VERSION` environment variable so the deployment-strategy labs can demonstrate traffic shifting between versions.
