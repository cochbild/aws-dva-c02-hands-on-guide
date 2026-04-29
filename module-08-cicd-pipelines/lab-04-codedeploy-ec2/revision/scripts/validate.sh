#!/usr/bin/env bash
sleep 3
curl -fs http://localhost:8080/ | grep -q "Hello from EC2"
exit $?
