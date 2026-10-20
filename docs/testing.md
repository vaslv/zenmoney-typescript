# Acceptance and security plan

All checks below are future requirements, not recorded test results.

## Layers and required evidence

| Layer | Main assertions | Execution |
|---|---|---|
| Static | strict types, public declarations, no unsafe module/global imports | pinned compiler in Docker |
| Unit | codec/builders/validation/error sanitization | deterministic fake values |
| Shared contracts | exact requests/results and negative controls, full feature mapping | installed Python wheel + installed TS package |
| Local HTTP | streams, disconnect, redirect, timeout, count, body limits | mock server, isolated Docker network |
| Browser | import/bundle, exact JSON, request/abort, CORS limitations | pinned Chromium with synthetic endpoints |
| MV3 | service worker import/request and optional host permissions | minimal test extension, no real bank tabs |
| Packaging | exports/types/only intended files, dependency licenses | clean npm tarball install |
| Optional live | create/read/update/delete controlled test-owned objects | separately approved test account |

Do not make network-capable test runners silently fall back to api.zenmoney.ru.
Fake injected fetch must reject all unexpected endpoints and external hosts; local
HTTP runner containers cannot reach the Internet during test execution. CI jobs
have no financial tokens. Install dependencies before isolated execution.

Node matrix: 22 and 24; browser minimum: Chrome 120, plus current pinned Chromium.
Pin actual patch versions/digests in S1 and record successful commands in status.md.
If the minimum cannot be exercised in available infrastructure, call it unverified
and block claiming that minimum until verified or explicitly revised.

Test both Python Client and AsyncClient, not only one HTTP adapter. Test TypeScript
ESM from the packed installation rather than path aliases to src. Compile NodeNext
and bundler consumer fixtures and ensure Node type packages do not leak into the
browser declarations. Shared contracts and SDK assets must contain only synthetic data.

Required native cases that cannot be represented in JSON fixtures have stable
manifest IDs and explicit expected runners (contracts.md). They cannot disappear
behind parity-suite skips. Real redirect tests check both differing error outcomes
and that no request/token reaches the target; an artificial Response(302) is not
a replacement for native fetch behavior.

## High-risk regressions

- More than one HTTP send after a transient error, timeout, abort or refresh attempt.
- Loss of exact decimal/integer data before encode or during copy/update.
- Missing transfer leg/account/currency or incorrectly reversed debt direction.
- Viewed default silently set to false instead of explicit ZenImport opt-in.
- Converting null/[] categories or promising no automatic categorization.
- Cursor updated internally after partial/invalid data; SDK has no cursor storage.
- Unknown entity fields stripped or prototype keys mutating the runtime.
- UUID/time regenerated on a caller's retry instead of reusing a prepared object.
- HTTP error exposes response body/token via message/cause/inspect/JSON.
- OAuth close disposes a shared transport or a closed client reopens.
- Browser packaging imports node: modules or assumes content scripts have permission.

## Limits and malicious inputs

Bound response bytes before full buffering. Include strict malformed UTF-8 and
JSON nesting/numeric-token stress cases. S1 must define defensible numeric token
and nesting resource limits if the chosen codec needs them and label any additional
limits relative to Python explicitly; never silently round/truncate oversized values.
Test streaming exact-limit/+1 for both data and OAuth, absent/fake Content-Length,
large exponents without expansion, duplicate keys and prototype-pollution payloads.

Test concurrent requests with distinct controllers, caller abort before/after send,
client close, timeout racing successful body completion, listener/timer cleanup and
stream cancellation. No retry counts should be inferred from exceptions alone;
assert sends at the transport boundary and writes at the synthetic server.

## Live validation gate

Historical Python results are reference evidence only. Before a live run: explicit
user-approved test scenario, verified account identity, baseline snapshot/counts,
private journal path and ownership marker. Never obtain a token from chat history
or tracked files; configure it privately for that one run. Unknown write outcome:
read by recorded IDs through diff before any deliberate retry. Cleanup only IDs
created by this scenario, and confirm baseline restoration. Do not delete imported
or pre-existing user data. Abort if identity differs or cleanup cannot be verified.

A live availability problem is reported separately from an SDK defect. OAuth live
exchange/refresh can remain unverified if application credentials are unavailable;
never label mock success as live. Direct Chrome→ZenMoney connectivity must eventually
be demonstrated before the standalone extension is called production-ready.

## Release gates

All mandatory cases pass; zero unexplained skips; exact feature/field mapping;
compiler/examples pass; negative controls prove comparator sensitivity; tarball
contains no private data; CI runs on exact release commit; independent code review
completed. Coverage percentage is supporting evidence, not proof of parity.
