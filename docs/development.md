# S1 local development and verification

This is an incomplete SDK. S1 implements only exact numeric primitives and test-only
codec/transport feasibility probes. There is no diff/suggest/OAuth client yet.

## Complete Docker acceptance

```sh
./scripts/test.sh
```

The script builds pinned Node 22 and Node 24 test images, Python reference image,
current browser image and Linux amd64 Chrome 120 fixture. Builds download pinned
public dependencies. Every test container then runs with --network none, so only
its own synthetic loopback HTTP server is reachable. No host ports, real accounts,
financial tokens or existing ZenImport containers are needed.

On environments where Docker's default buildx activity directory is inaccessible,
use a writable task-specific directory without changing the user's Docker settings:

```sh
BUILDX_CONFIG=/tmp/zenmoney-typescript-buildx ./scripts/test.sh
```

Node stages verify exact versions/lock integrity, 50 Python declaration mappings,
build/declarations and strict types; run 13 focused tests (including 200 seeded
number comparisons); pack the seven-file npm archive and install it offline into
a fresh consumer; type-check NodeNext and Bundler consumers without Node ambient
types. The package is private:true and no publication commands are run.

The Python stage installs the hash-locked published 0.7.0 wheel, verifies all eight
runtime module hashes and performs a synthetic exact-number roundtrip. This is
baseline validation, not the S2 shared contract suite or all Python SDK tests.

Browser checks exercise a normal page with CORS allowed/denied and two MV3 fixtures
with API host permissions absent/present. The permitted worker checks precision,
exact/over response limits, chunked cancellation, malformed UTF-8, timeout, caller
abort and a real redirect without a second request. Static permission fixtures
prove the networking behavior; the optional-permission user-consent UI is outside S1.

## Local quick checks

Use Node 22 or 24. The host Node version is not acceptance evidence.

```sh
npm ci --ignore-scripts
npm test
```

npm test runs build, type and unit/pack checks. test:package uses --offline for
consumer installation. npm ci alone caches tarballs but can omit registry metadata;
prime the exact runtime package metadata while online first if needed:

```sh
npm cache add lossless-json@4.3.2
```

The Dockerfile handles that step during image construction. Browser tests additionally
need the pinned Playwright browsers, Xvfb and writable XDG directories; use Docker
for the reproducible path rather than modifying a user's installed Chrome profile.

## Baseline maintenance

python-baseline.json records published wheel URL/hash, Git commits and per-module
hashes. python-inventory.json is the approved source/API inventory. api-options.json
maps all 50 inventoried declarations and parameters to their intended TypeScript
names; it does not promise those methods are implemented. Runtime wire field names
stay unchanged. Future contract case IDs and implemented coverage belong to S2–S7.

If the reference changes, review actual source differences before updating hashes.
Do not generate fixtures from real service responses or alter expected results to
hide a mismatch. Dependency/image changes require reviewing ADRs and rerunning the
affected acceptance matrix. Tests do not write to sibling projects.
