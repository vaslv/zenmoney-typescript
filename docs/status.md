# Progress and decisions

## 2026-10-20 — S0

User-approved approach: B, TypeScript-native API with full Python functionality and
shared protocol checks. User authorized creating the local project and detailed
implementation documentation. No remote creation, push, tags or publication.

Created documentation-only project and public Python declaration/field inventory.
No package.json, runtime SDK implementation, dependency installation or product
integration has been added. S1–S8 are planned, not started.

Detailed design status: APPROVED by the user on 2026-10-20. No blocking product questions
for S1; the numeric-parser/runtime spike and registry ownership are explicit gates.

Validation completed:
- All 11 relative Markdown links resolve across 12 Markdown documents.
- JSON inventory parses and all eight source-module SHA256 values match the Python
  snapshot. Runtime source has no diff between v0.7.0 and reference HEAD.
- Public functions, methods, model fields, module declarations and __all__ are
  inventoried; actual case-level coverage remains an S1/S2 deliverable.
- Documentation is English; no runtime SDK code, tokens or live payloads were added.
- Independent specification review: two rounds, two material issues found and
  fixed, zero remaining blockers, final PASS (9/10). Fixes explicitly cover native
  redirect error differences and mandatory non-JSON input tests.
- Git staged whitespace check passed.

No Docker/runtime/real API tests were run or claimed: there is no SDK implementation
at S0. Existing Python/backend/Chrome runtime files and production data are unchanged.
S0 is complete and approved. The user created the GitHub repository at
https://github.com/vaslv/zenmoney-typescript; origin is configured locally.
At the S0 handoff there were no tags, pushes or publication; S1 was deferred
until the user switched models.

## 2026-10-20 — S1 foundation

Implemented pinned ESM/strict TypeScript tooling, installed-artifact checks,
hash-locked Python reference validation, exact-number primitives and private codec/
transport feasibility probes. Public package exports only ExactDecimal, decimal,
and MAX_NUMBER_LENGTH; complete clients/builders/parity are later stages.

Verified the PyPI 0.7.0 wheel hash and all eight runtime modules against the approved
source inventory. The peeled tag is 6c38d4c0cb3e8cc271292e37e9934e6c1a7b9972;
its runtime source equals the recorded source HEAD. Baseline details and exact
transitive hashes are committed. Added 50 declaration/parameter mappings.

Decisions: ADR 001 pins tooling/runtimes; ADR 002 selects lossless-json 4.3.2 with
an equal-duplicate-key preflight, 4096-character numeric and 128-container limits.
No production API calls. No sibling runtime files or running products changed.

Initial full acceptance passed with:
`BUILDX_CONFIG=/tmp/zenmoney-typescript-buildx ./scripts/test.sh`.

- Node 22.23.3 / Node 24.22.0: lock/mapping checks, strict build/types, 13 focused
  tests per runtime (including 200 seeded comparisons), offline seven-file package
  installation and NodeNext/Bundler consumer types.
- Python 3.12.15: installed-wheel hash checks, pip consistency, exact roundtrip.
- Chromium 156.0.8078.4 arm64 and Chrome 120.0.6099.109 amd64: nine scenario groups
  covering ordinary-page CORS, MV3 host permission absence/presence, precision,
  bounded/cancelled streams, invalid UTF-8, deadlines, abort and redirect no-retry.
- Every runtime container used --network none with a read-only root. Download/build
  steps had network access; test APIs ran exclusively on loopback.
- Markdown links, English source/comments, lock integrity and whitespace checked.

The first planning result remains separate from full protocol acceptance: S2 has
not started, and these checks do not claim a complete working ZenMoney SDK.
Clean Git-archive acceptance of commit 3103a1e passed with exit code 0. It used
no host node_modules or ignored source files. Full machine-readable results:
[s1-results.json](s1-results.json). Local implementation commit:
`3103a1e build(tooling): establish verified SDK feasibility environment`.
The follow-up documentation commit records the final acceptance and handoff.

## Handoff for S2

S1 is complete. Read AGENTS.md and docs/implementation-plan.md, then execute S2 only
when requested. Build the shared fixture schema, comparator and installed Python
sync/async adapters. Use docs/contracts.md and docs/api-options.json; do not mistake
S1's exact-number and transport probes for completed SDK feature coverage.
No push, tags, releases, registry publication or live API writes are authorized.

## 2026-10-20 — S2 complete

Added 86 manually specified shared vectors, draft-2020-12 schema, hash manifest,
feature/field coverage metadata, exact-number comparator with negative controls,
and installed Python sync/async adapters. The default Docker acceptance now requires
the adapters and comparator; it cannot pass by only checking wheel hashes.

Review: five issues fixed and independent follow-up PASS; see reviews/s2.md.
Docker: full matrix passed; final Python parity and Node acceptance passed after
review fixes (17 Node tests, 86 vectors per Python runner, two native checks each).
Commands: scripts/test.sh and scripts/test-parity.sh with the documented buildx env.
No financial service requests, push, tags or publication. Next: S3.

## 2026-10-20 — S3 complete

Implemented public lossless codec, error hierarchy, every inventoried model field,
composite identities and structural diff/suggest protocol. Added exact model-field
type checks, native validation/security regressions and staged TS vector execution.
Review fixed six issues; independent follow-up PASS (reviews/s3.md).
Full Docker acceptance passed: 22 tests per Node version, 86 Python vectors per
runner, 18 active TypeScript vectors, both browser versions. No live requests.
Next: S4 builders. No push, tags or publication.

## 2026-10-20 — S4 complete

Implemented complete transaction/expense/income/transfer/debt builders, update,
deletions, budget clearing and account/tag/merchant builders. Inputs are copied,
unknown update fields retained, protected identities rejected and optional flags
remain explicit. Dedicated option interfaces reject known type mistakes.
Independent review PASS after two silent-option-loss fixes (reviews/s4.md).
Full Docker acceptance passed: 27 Node tests per version, 86 Python vectors per
runner, 48 active TypeScript vectors, package/consumer types and both browsers.
Next: S5 asynchronous client. No push, tags, publication or live requests.

## 2026-10-20 — S5 complete

Implemented the asynchronous Bearer client and bounded streaming transport,
per-call cancellation, overflow-safe deadlines, close cancellation and exact diff/
suggest requests. No automatic retries or persistent cursor state. Independent
review PASS after three fixes (reviews/s5.md).
Full Docker acceptance: `BUILDX_CONFIG=/tmp/zenmoney-typescript-buildx ./scripts/test.sh`
passed with 38 Node tests per version, 86 Python vectors per runner, 78 active TS
vectors, package/consumer checks and both browser versions using the SDK.
Next: S6 optional OAuth. No live API requests, push, tags or publication.

## 2026-10-20 — S6 complete

Implemented authorizationUrl/callbackCode, OAuthClient and redacted OAuthToken.
Exchange/refresh remain explicit; application credentials are optional for using
Bearer clients. Exact integer lifetimes and the 1 MiB response limit are enforced.
Independent review PASS with no material findings (reviews/s6.md).
Full Docker command `BUILDX_CONFIG=/tmp/zenmoney-typescript-buildx ./scripts/test.sh`
passed: 44 Node tests per version, all 86 shared vectors in three runners, package/
consumer checks and both browsers. OAuth registered-application live flow remains
unverified. Next: S7 complete acceptance/documentation. No push/tags/publication.

## 2026-10-20 — S7 complete

Expanded the offline baseline to 124 reviewed shared cases, exact model-field types,
eight mandatory TS native checks and Python native loopback redirect checks.
TypeScript parity, browser and MV3 use the installed npm artifact. Added compiled
recipes, complete English usage/errors/limitations docs, license/link validation,
local archive/checksum creation and least-privilege CI with no publishing step.
Fixed initial-BOM raw text preservation. All independent review findings resolved;
follow-up PASS (reviews/s7.md).

Verification:
- `BUILDX_CONFIG=/tmp/zenmoney-typescript-buildx ./scripts/test.sh`: exit 0,
  Node 22.23.3 and 24.22.0 each 49 tests, 124 vectors in each Python client and
  packed TS client; eight TS native checks, package/types and both browsers pass.
- Browser versions: Chromium 156.0.8078.4 and Chrome 120.0.6099.109. Synthetic exact
  expense write/readback plus denied CORS/MV3 cases exercise the installed SDK.
- `./scripts/pack.sh` with the same buildx configuration: exit 0, 27 allowlisted
  archive files and SHA256SUMS under ignored .local/release.
- Docker clean fast npm test, with empty dist/.local: passed without prior artifacts.
- Documentation links, strict compiled examples, dependency licenses and whitespace
  checks passed. No skipped required cases, live financial calls or sibling edits.

S1–S7 implementation is complete. S8 remote publication remains explicitly
unauthorized. package.json stays private:true; no push, tags or registry release.

## Clean committed-source acceptance and S8 local handoff

Clean `git archive` of reviewed commit 2c5ea88 passed the full Docker matrix and
packing with exit 0, without host node_modules or ignored build inputs. Results:
[s7-results.json](s7-results.json). The tarball reproduced byte-for-byte:
`4cdac33c1de9ee09e501253a84cf20e23c89146e39b1099d646a846a29621ca0`.
The same candidate and SHA256SUMS are in .local/release. This private artifact is
for local installation/acceptance; the future private:false release commit must
be rebuilt and checked again.

| Completed stage | Local implementation commit |
|---|---|
| S2 contracts/Python adapters | 4075bd5 |
| S3 protocol/models/exact codec | fd5a5d3 |
| S4 builders | f17542d |
| S5 data client/transport | 1e31b84 |
| S6 OAuth | c5a2d8e |
| S7 full candidate acceptance | 2c5ea88 |

S8 local preparation/checklist is complete in release-candidate.md and publication.md.
Remote S8 actions are pending the user's explicit authorization; no tags, push,
GitHub Release or npm publication occurred. Anonymous registry 404 is not ownership
verification. No live API acceptance or remote CI run is claimed. The Python SDK,
backend, installed extension and all financial data remain untouched.
Independent final handoff review: PASS. Artifact size (17,589 bytes), 27-file
allowlist, checksum and explicit remote/live publication gates were independently
confirmed. The final handoff documentation is recorded in a separate local commit.

## 2026-10-20 — Full-review remediation F1

The decoded JSON tree is validated before a response can return an apparently
usable cursor. Escaped unpaired surrogates in keys or values now fail consistently
as ResponseError; valid pairs and literal backslash sequences still round-trip.
This is an explicit difference from Python's permissive escaped-surrogate decoder.

Verification: `BUILDX_CONFIG=/tmp/zenmoney-typescript-remediation-buildx docker build
--target node -t zenmoney-typescript-review-current .` and offline Docker execution
of `node --test tests/unit/codec.test.mjs tests/unit/client.test.mjs`: 21 passed.
Reviewed the diff for preservation of UTF-8/BOM, depth, duplicate-key and exact
number behavior. No live API call was made.

## 2026-10-20 — Full-review remediation F2

The account builder reserves type and instrument in its extension bag. The
validated constructor parameters remain the sole way to set those values; other
future fields and required loan/deposit parameters remain available. Python 0.7.0
has a type-override defect, so this intentional correction is documented in
parity.md without changing the pinned Python baseline.

Verification: node-target Docker build passed package, declarations, and manifest
checks; offline `node --test tests/unit/builders.test.mjs` passed. The new native
case covers forbidden type/instrument overrides, ordinary accounts, valid deposits,
and preserved extensions. Reviewed the change for accidental restrictions on
complete-object low-level writes. No live API call was made.

## 2026-10-20 — Full-review remediation F3

Validated caller options are copied without converting ExactDecimal integer
lexemes into native integers before ID, cursor, instrument, or timestamp checks.
The wire decoder and ordinary response clone remain unchanged. JavaScript callers
now receive consistent validation for decimal('1'), decimal('1.0') and decimal('1e0')
in integer-only positions, matching the Python reference's type rule.

Verification: node-target Docker build passed package, declarations and manifest
checks. Offline native protocol, builder and codec tests passed, followed by the
complete Node 22 unit suite: 54 passed. Reviewed copying for immutable decimal
sharing, independent caller arrays/objects, accessor rejection, and inert
__proto__ keys. No live API call was made.

## 2026-10-20 — Full-review remediation F4

Mixed changes/deletions use a per-kind set of validated write identities for
conflict detection. This removes the per-deletion scan over all written entities
while retaining duplicate and same-kind conflict rejection.

Verification: node-target Docker build passed package, declarations and manifest
checks; offline `node --test tests/unit/protocol.test.mjs` passed. A synthetic
16,000-write plus 16,000-deletion call completed in 219 ms in Node 22 Docker,
compared with approximately 927 ms on the review snapshot. Timings are diagnostic;
the structural absence of the nested scan is the acceptance criterion. Reviewed
cross-kind equal IDs, repeated deletions and unchanged request semantics. No live
API call was made.

## 2026-10-20 — Full-review remediation F5

Documentation now names the four fields protected by the generic update helper
and explains the separate user/date/tag identity rule for budgets. A compiled
example updates a budget amount while verifying that its composite key stays the
same; a native test records the behavior of budget and transaction date changes.

Verification: node-target Docker build passed declarations, package and manifest
checks; offline `node --test tests/unit/builders.test.mjs` passed. Reviewed the
example against entityKey and the generic helper without changing runtime API
behavior. No live API call was made.
