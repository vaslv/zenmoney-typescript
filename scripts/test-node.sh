#!/bin/sh
set -eu
cp -R /opt/npm-cache /tmp/npm-cache
export npm_config_cache=/tmp/npm-cache
npm run test:unit
npm run test:package
