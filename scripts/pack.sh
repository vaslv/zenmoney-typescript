#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
docker build --target node -t zenmoney-typescript-candidate .
mkdir -p .local/release
docker run --rm --init --network none --read-only --tmpfs /tmp \
  --mount "type=bind,src=$PWD/.local/release,dst=/output" zenmoney-typescript-candidate \
  sh -c 'cp -R /opt/npm-cache /tmp/npm-cache && export npm_config_cache=/tmp/npm-cache && npm pack --ignore-scripts --pack-destination /output >/dev/null && cd /output && sha256sum zenmoney-typescript-0.1.0.tgz > SHA256SUMS'
