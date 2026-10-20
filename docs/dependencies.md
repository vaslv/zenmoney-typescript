# Dependency and license inventory

All selected versions and transitive integrity hashes are in package-lock.json.
Do not import a dev dependency from runtime source. No dependency is vendored.

| Package | Version | Use | License |
|---|---|---|---|
| lossless-json | 4.3.2 | only runtime dependency, JSON grammar/parser/serializer | MIT |
| typescript | 5.9.3 | compiler and consumer types | Apache-2.0 |
| esbuild | 0.28.2 | test browser bundles | MIT |
| playwright | 1.64.1 | disposable browser/MV3 tests | Apache-2.0 |
| @types/node | 22.19.0 | tooling declarations only | MIT |
| ajv | 8.17.1 | contract schema validation only | MIT |

lossless-json has no runtime dependencies. esbuild platform packages and
playwright-core are dev-only. The license/lock check verifies the installed direct
package metadata against this inventory. The npm archive contains project LICENSE;
package-manager installation retains dependency licenses in their own packages.
See ADR 002 for parser compensations and resource limits. This is an inventory,
not a claim of a comprehensive third-party security audit.
