# Design: an independent TypeScript ZenMoney SDK

Generated with office-hours on 2026-10-20.
Status: APPROVED by the user on 2026-10-20.
Mode: Builder. Local project: zenmoney-typescript.
Repository: https://github.com/vaslv/zenmoney-typescript (created by the user).

## Problem and intended outcome

ZenImport currently needs a Python backend even for one browser. A reusable
TypeScript SDK is the first independent prerequisite for local operation. It must
also be useful outside ZenImport. An installed package must expose all public API
capabilities already supported by the Python SDK, with exact financial values and
predictable failure behavior.

The useful outcome is a single-browser setup without a server, while preserving
an optional server for multiple browsers. This SDK stage does not itself deliver
that outcome; browser storage, matching, prediction, durable delivery, UI, and
migration remain later projects.

## Confirmed premises

- The user selected approach B: idiomatic TypeScript with shared contract checks.
- Full functionality means the supported public data API, not private mobile
  endpoints, bank credential login, or remote bank-sync triggers.
- Bearer-token usage is the primary acceptance path. OAuth registration is not
  required to use or accept the SDK; confidential-client OAuth remains available.
- Python is a behavioral reference, not an infallible oracle. A discovered defect
  must be documented and resolved explicitly instead of copied into a new SDK.
- Database migration requires delivery state, identities and tombstones, not just
  transaction rows. No storage/migration implementation belongs in this SDK.
- For future ZenImport: exactly one active local/server mode; import only into a
  fresh destination; join an already used server without merging histories.

## Alternatives considered

A. Close translation of Python classes and independent tests. Smaller initial
mapping effort and familiar source layout; risks awkward TypeScript usage and
quiet divergence between tests.

B. TypeScript-native asynchronous client plus a shared language-neutral contract
suite. More initial work on the fixture format; explicit, repeatable evidence of
wire-level equivalence without forcing Python lifecycle or naming onto JavaScript.
Selected by the user.

Code-generating both complete SDKs or moving the Python backend to TypeScript is
not part of the selected scope. Models may later be generated from a reviewed
schema, but a generator is not a prerequisite for this release.

## Architecture

- Public client: diff, readDiff, upsert, delete, suggest.
- Protocol: validation, lossless JSON, entity identities, constants and raw replies.
- Models: documented fields plus forward-compatible unknown data.
- Pure builders: entities and financial movements, update/deletion/budget helpers.
- OAuth helpers and client: explicit exchanges and refresh, no token persistence.
- Fetch transport: bounded responses, timeouts, cancellation, no redirects/retries.
- Test-only adapters: convert language-neutral fixtures to each SDK's native API.

No runtime dependency on Python. Only the parity test job runs both languages.
No runtime network requests at import time and no browser/node global requirement
until a request or UUID generation actually needs it. Inject fetch/clock/UUID for tests.

## Decisions and implementation gates

Use ESM with bundled type declarations; no initial CommonJS bundle. Target Node.js
22 and 24 and Chrome 120+ (the current extension minimum). Verify exact available
runtime/tool versions in S1 and pin them. Ordinary web pages still depend on CORS;
a browser-compatible module does not bypass remote server policy. Test the Chrome
extension context with explicit host permissions, not bank content scripts.

Use a package-owned ExactDecimal abstraction for lossless values. Choose an audited
parser implementation behind this abstraction during S1, after a precision and
security spike. Do not turn a dependency's classes into a mandatory public API.
S1 must freeze the codec contract before builders/client implementation.

No critical product question blocks documentation. Technical spike outcomes may
require an ADR, but must not silently reduce supported capabilities. Registry name,
GitHub ownership, and publishing credentials are release-time questions.

## Success criteria

1. Every public Python feature has a mapping, fixture/test and documented status.
2. Both Python client variants and the TypeScript client pass the same required
   protocol vectors; approved runtime-specific differences are reported separately.
3. Exact decimal/integer and unknown-field roundtrips pass, including large values.
4. Every attempted SDK request sends at most one HTTP request; lost-response tests
   never resend an operation automatically.
5. An installed npm tarball works in Node, a bundled browser app, and a minimal MV3
   worker fixture. Type checking and local tests use the installed artifact.
6. No production tokens/data and no ZenImport dependency are required for acceptance.
7. Coverage matrix, limitations, examples and package contents are reviewed before
   publication. Offline success is not called live API acceptance.

## Distribution and next steps

GitHub source plus npm package and a GitHub Release with tarball/checksums. First
release target is 0.1.0; feature parity does not require copying Python's version.
No publication is authorized by this design. Follow S0–S8 in implementation-plan.md.

## User priorities reflected in the design

The user explicitly requested identical capability and shared checks rather than a
literal translation, and settled one active storage mode before discussing storage
technology. This makes preservation of behavior and migration state the primary
constraint, rather than copying the current backend architecture.
