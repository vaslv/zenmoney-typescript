#!/bin/sh
set -eu
cp -R /opt/npm-cache /tmp/npm-cache
export npm_config_cache=/tmp/npm-cache
npm run test:package
export ZENMONEY_SDK_URL=file:///app/.local/package-check/consumer/node_modules/zenmoney-typescript/dist/index.js
node tests/parity/typescript.mjs
