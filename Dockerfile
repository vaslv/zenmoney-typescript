ARG NODE_IMAGE=node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392
FROM ${NODE_IMAGE} AS node
WORKDIR /app
ENV XDG_CONFIG_HOME=/tmp/chrome-config XDG_CACHE_HOME=/tmp/chrome-cache
ENV npm_config_cache=/opt/npm-cache npm_config_update_notifier=false
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund \
    && npm cache add lossless-json@4.3.2
COPY . .
RUN npm run check:manifest && npm run build && npm run typecheck && npm run build:spikes
CMD ["sh", "scripts/test-node.sh"]

FROM python:3.12-slim-bookworm@sha256:34386ef0cb081344d7ec1c103ba398e6e9f64e9ab3a1509accc92a4e24a07258 AS reference
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.reference.txt ./
RUN python -m pip install --no-cache-dir --require-hashes -r requirements.reference.txt && python -m pip check
COPY docs/python-baseline.json docs/python-inventory.json ./docs/
COPY scripts/check-reference.py ./scripts/
COPY contracts ./contracts
COPY tests/parity/python ./tests/parity/python
CMD ["python", "scripts/check-reference.py"]

FROM mcr.microsoft.com/playwright:v1.64.1-noble@sha256:7852dc5a7d72f5fe458a597d690f6c42fbc8e9e26ddfa95f8e6ef552558d9bbf AS browser
WORKDIR /app
ENV XDG_CONFIG_HOME=/tmp/chrome-config XDG_CACHE_HOME=/tmp/chrome-cache
ENV npm_config_cache=/opt/npm-cache npm_config_update_notifier=false
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund \
    && npm cache add lossless-json@4.3.2
COPY . .
RUN npm run build && npm run build:spikes
CMD ["xvfb-run", "-a", "node", "tests/browser/run.mjs"]
