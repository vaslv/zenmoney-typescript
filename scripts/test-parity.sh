#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p .local/parity
docker build --target reference -t zenmoney-typescript-reference .
docker run --rm --init --network none --read-only --tmpfs /tmp zenmoney-typescript-reference python tests/parity/python/runner.py > .local/parity/python.jsonl
docker build --target node -t zenmoney-typescript-parity .
docker run --rm --init --network none --read-only --tmpfs /tmp -v "$PWD/.local/parity:/results:ro" zenmoney-typescript-parity node tests/parity/compare.mjs /results/python.jsonl
