#!/usr/bin/env bash
# Create a 12 MB test file: 5 MB part 1 + 5 MB part 2 + 2 MB last part = 3 parts
set -euo pipefail
SIZE_MB=12
dd if=/dev/urandom of=bigfile.bin bs=1M count=$SIZE_MB status=none
echo "Created bigfile.bin: $(ls -lh bigfile.bin | awk '{print $5}')"
