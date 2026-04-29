#!/usr/bin/env bash
cd /opt/dva-lab-08-04/www
nohup python3 -m http.server 8080 > /var/log/dva-lab.log 2>&1 &
sleep 2
exit 0
