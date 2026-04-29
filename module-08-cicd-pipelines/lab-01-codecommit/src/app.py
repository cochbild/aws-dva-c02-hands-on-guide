"""DVA-C02 Module 8 sample app.

Two entry points so the same code can be deployed to:
  - AWS Lambda (handler = lambda_handler)
  - EC2 / ECS as a tiny web server (run main() directly)

The Module 8 labs deploy this code via CodeBuild → CodeDeploy in different
configurations to demonstrate Lambda canary/linear, EC2 in-place/blue-green,
and ECS blue/green strategies.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

APP_VERSION = os.environ.get("APP_VERSION", "1.0.0")


def lambda_handler(event, context):
    """Lambda entry point.

    Returns the app version. Labs 8.3 changes this to demonstrate traffic
    shifting between versions.
    """
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({
            "message": "hello from dva-lab-08 app",
            "version": APP_VERSION,
            "request_id": getattr(context, "aws_request_id", "local"),
        }),
    }


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({
            "message": "hello from dva-lab-08 app",
            "version": APP_VERSION,
            "path": self.path,
        }).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Silence default access log to keep CodeDeploy validation hooks clean
        pass


def main():
    """Web server entry point for EC2 / ECS labs."""
    port = int(os.environ.get("PORT", "8080"))
    server = HTTPServer(("0.0.0.0", port), _Handler)
    print(f"Listening on 0.0.0.0:{port} (version {APP_VERSION})")
    server.serve_forever()


if __name__ == "__main__":
    main()
