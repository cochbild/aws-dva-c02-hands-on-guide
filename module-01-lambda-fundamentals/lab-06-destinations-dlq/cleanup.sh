#!/usr/bin/env bash
set -euo pipefail
sam delete --stack-name dva-lab-01-06-destinations-dlq --no-prompts
