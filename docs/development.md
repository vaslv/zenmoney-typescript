# Development and verification

Use Docker for reproducible acceptance. Host Node is not acceptance evidence.

```sh
BUILDX_CONFIG=/tmp/zenmoney-typescript-buildx ./scripts/test.sh
BUILDX_CONFIG=/tmp/zenmoney-typescript-buildx ./scripts/pack.sh
```

The optional BUILDX_CONFIG selects a writable buildx activity directory without
changing the user's Docker settings. scripts/test.sh builds pinned Node 22/24,
Python 3.12, current Chromium and Chrome 120 images. Builds may download pinned
public dependencies; every test container runs offline (--network none), with a
read-only root and temporary writable directories. Only synthetic loopback HTTP
servers are used. No host ports, production tokens, bank tabs, host financial
folders or running ZenImport containers are needed.

The complete matrix verifies:
- Lock/version integrity, all 50 Python declaration mappings, strict SDK/types and
  compiled examples. Every inventoried model field has an exact type assertion.
- Focused native codec/builders/HTTP/OAuth tests, including seeded comparisons,
  validation before dispatch, unknown outcomes, streams, cancellation and privacy.
- 124 reviewed shared cases in both installed Python clients and the packed SDK;
  comparator negative controls and mandatory native checks cannot silently skip.
- Offline tarball installation, root export allowlist, runtime operations and strict
  NodeNext/Bundler consumers without Node ambient types.
- Installed-package browser bundle and MV3 workers, granted/missing host permission,
  exact expense write/readback, CORS restrictions, bounds/abort/redirect probes.

Full logs live in ignored .local; summarized evidence and review outcomes are in
status.md. No skipped/optional live tests are reported as passing. The Python SDK
is installed from the hash-locked public wheel, never imported from a sibling tree.

## Fast checks

Use Node 22/24 and npm ci --ignore-scripts. Run npm test for native/package checks;
run scripts/test-parity.sh for Python/packed-TS contracts in Docker. Browser image
builds prime/install the candidate tarball before bundling. For an entirely offline
consumer install, first prime exact runtime dependency metadata while online:
`npm cache add lossless-json@4.3.2`. Docker handles this automatically. A restricted
host npm cache is not a reason to change its ownership; use Docker or a dedicated
writable cache directory.

The package is publishable but unpublished. scripts/pack.sh writes only a candidate
tarball and SHA256SUMS under .local/release. It does not publish, tag, push or modify siblings.
CI repeats Docker acceptance and packs only, with contents:read permission and no
publication secrets. GitHub-hosted execution is pending the first authorized push;
local success is not a claimed remote CI run.

## Baseline maintenance

python-baseline.json and python-inventory.json pin artifact/source hashes.
api-options.json maps declarations; contracts/coverage.json links runtime/type
checks. When reference behavior changes, review source differences and deliberate
expected values; do not regenerate outputs from an SDK to make it pass. Additive
cases increment suite minor version. Update dependency/image ADRs and affected
acceptance for toolchain changes. No runtime Python dependency exists.
