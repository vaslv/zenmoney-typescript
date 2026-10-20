# Sequential implementation plan

Status: DRAFT. This file describes future implementation; only S0 documentation
exists. Approach B is approved; detailed specification is awaiting review.

## Execution discipline

Work in this repository, one stage at a time. Read AGENTS.md and predecessor stage
results first. Do not touch running ZenImport containers, extension installations,
production data, private test journals or sibling runtime source. No implementation
stage requires real API writes. Use local commits with the suggested conventional
scope, record actual commands/results in status.md, and leave the worktree clean.
Do not bump the Python package or force matching SDK version numbers.

A stage is complete only after its exit checks pass. Report blockers rather than
relabeling a failing required test optional. Keep the public API and wire fixtures
reviewable. Run a fresh installed-artifact acceptance after changes to packaging,
exports, codec, client or builders; avoid repeating unaffected expensive suites.

## S0 — design and local repository

Deliver: README, MIT license, repository instructions, design, exact API proposal,
parity inventory/matrix, fixture specification, phased plan, acceptance/security,
publishing and extension-boundary docs. Initialize main locally with no remote.
Check Markdown links and JSON inventory against read-only Python source hashes.
Obtain an independent specification review and record remaining questions.
Commit: docs(plan): define TypeScript SDK parity and implementation stages.
Exit: detailed design presented for user review, no false working-package claims.

## S1 — toolchain, protocol baseline and feasibility spikes

1. Freeze reference zenmoney-python 0.7.0 wheel hash, v0.7.0 peeled commit and local
   source snapshot. Compare runtime module hashes; separate documentation changes
   from behavior changes. Investigate rather than silently choose a different API.
2. Set up package.json as private:true, provisional 0.1.0, ESM, strict TypeScript,
   declarations and explicit export/files allowlist. Commit exact dependencies and
   lockfile. No publishing workflow yet. Build only actual implemented exports.
3. Pin available Node 22/24 patch images by digest, Python 3.12 reference runner,
   a compatible TypeScript/compiler and browser test runtime; record versions and
   minimum supported TypeScript consumer in an ADR. Use npm ci, no floating latest.
4. Precision spike: evaluate a maintained lossless JSON parser against duplicate
   keys, unknown nested decimals, huge integers, inert prototype keys, immutable
   ExactDecimal and number-token serialization. Prefer a small reviewed dependency;
   do not implement a new parser merely to avoid a dependency. Record selection,
   license, bundle size, precision/DoS boundaries and codec API in an ADR.
5. Browser transport spike: bundle a minimal ESM caller, test fake HTTP from an
   ordinary page and MV3 worker with explicit permissions, abort and streaming
   limits. Test the declared Chrome 120 minimum or raise it explicitly with user
   impact documented. Live ZenMoney reachability is separate, not assumed.
6. Create Docker developer/test commands and a reusable local fake API with fixed
   synthetic data. Dependency download can have network; test execution must be
   isolated from external hosts. Test artifact packaging from a clean checkout.

Exit: builds/types resolve; codec candidate meets invariants; worker fake-network
request succeeds; dependencies/licenses pinned; no production contact. If this
fails, update design before implementing the rest. Suggested commit(s):
build(tooling): establish reproducible SDK and parity test environments.

## S2 — shared fixture infrastructure and Python baseline

Implement contracts/v1/schema.json, manifest, fixtures, deterministic comparator,
JSONL adapters and a trace collector. Build the Python sync and async adapters
against the installed pinned wheel without modifying Python production source.
Add representative valid and invalid cases for every P01–P23 family now, then
expand in subsequent stages. Validate schema uniqueness and path/hash inventories.
Create the feature/field coverage manifest from python-inventory.json.

Exit: both Python runners independently match reviewed expected vectors; comparator
negative controls fail as intended; unsupported/missing cases fail, no silent skips.
Reference bugs become documented issues with narrowly classified exceptions, never
fixture rewrites to hide them. Do not describe partial vectors as full parity.
Commit: test(contracts): establish shared vectors and Python reference runners.

## S3 — exact codec, models and pure protocol

Implement numbers.ts, models.ts, protocol.ts, errors.ts and safe deep-copy logic.
Export documented model fields, exact integer unions and unknown JSON values.
Implement entityKey, constants, diff/suggest structural validation and decoding.
Public helper payload and response invariants follow api.md and parity.md.
Add every codec/cursor/identity/read-only/deletion-conflict vector and TS adapter.

Exit: exact values survive parse→copy→encode; prototypes stay intact; invalid input
causes zero HTTP calls; raw text stays unchanged; all completed shared families pass
three runners; strict type tests cover every model and preserved extension access.
Commit(s): feat(protocol): implement exact JSON and public entity contracts.

## S4 — entity and transaction builders

Implement account/tag/merchant and transaction/expense/income/transfer/debt builders,
update/deletion/clearBudget. Reproduce full reference defaults with deterministic
id/now overrides. Implement all optional fields and validation, positive amounts,
ISO dates, two-currency transfer, account types, debt actions and safe updates.
Add complete examples for reminders/markers/budgets through low-level objects.

Exit: all builder vectors pass both Python clients' supporting modules and TS;
inputs remain unchanged; unknown fields preserved; viewed defaults true/explicit
false; tag null and [] remain different; refund and split recipes documented without
invented endpoints. Commit: feat(builders): add complete financial entity builders.

## S5 — asynchronous data client and safe HTTP lifecycle

Implement ZenMoneyClient and transport with injected fetch/clock, exact request
encoding, bounded streaming responses, correct headers/endpoints and sanitized
errors. Expose diff/readDiff/upsert/delete/suggest; implement per-call signal,
timeoutMs, isClosed/close. Reuse no private global state across instances.

Exit: full data-client vectors pass in three runners; real local HTTP tests cover
chunked limit, timeouts, redirects, disconnect after mock commit, status errors,
concurrent calls and close races. Every SDK operation performs at most one request;
no payload/token leak. Commit: feat(client): add bounded asynchronous API transport.

## S6 — optional OAuth functionality

Implement authorizationUrl/callbackCode/OAuthClient/OAuthToken with explicit
exchangeCode/refresh, redacted representations, callback validation, bounded forms
and response parsing. It must not require credentials for installing/importing the
SDK or using the Bearer client. No automatic refresh, browser secret distribution,
new PKCE assumptions or interactive login integration.

Exit: OAuth shape/lifecycle/error/security vectors pass locally, including repeated
calls, close before first use and close during a request. Document lack of registered
application live evidence. Commit: feat(oauth): add explicit authorization helpers.

## S7 — full acceptance, documentation and release candidate

Expand all required vectors; feature/field coverage has no unexplained gaps. Build
npm tarball from clean source and install it into clean Node and browser fixtures.
Run strict consumers, full Docker parity/unit/HTTP suites, MV3 worker and browser
bundle tests. Inspect license/dependency inventory and tarball allowlist. Add
English quickstart, exact-number examples, transfer/debt/refund recipes, missing
category caveat, errors/unknown outcomes, OAuth server example and support matrix.
Prepare changelog and SHA256SUMS. Add CI build/test/pack only, no publish-on-push.

Optional live acceptance requires a newly approved scenario on a verified test
account. Maintain a durable private object-ownership journal and read-before-retry;
no main account or copying real financial history. Offline acceptance is sufficient
to prepare a candidate, but reports must distinguish it from live evidence.

Exit: installed artifact passes every required suite; complete feature mapping;
no secrets or production accesses; independent code review findings resolved or
explicitly accepted; realistic limitations published. First-version production use
in ZenImport additionally requires the live/read integration gate in extension-boundary.md.
Commit: docs(release): document verified SDK acceptance and publication steps.

## S8 — separately authorized publication

Confirm GitHub repository and npm ownership/name. Prepare release workflow/manual
steps using current official docs; CI/publish permissions minimized. Rebuild the
reviewed commit, verify tarball/checksums and request explicit push/tag/release/npm
permission before any remote write. Change private:true only as part of the approved
release preparation. Never infer publication permission from the planning request.

Publish approved immutable artifacts, then anonymously install the registry version
in a clean fixture and rerun package smoke/type tests; verify GitHub tag commit,
release attachments and npm tarball integrity/provenance. Record exact URLs, hashes,
version and CI runs. Do not publish partial-functionality SDK as full Python parity.
Suggested final local record: docs(release): record verified initial publication.

## Expected future layout (not created yet)

src/{index,client,transport,protocol,numbers,models,transactions,entities,oauth,errors}.ts
contracts/{manifest.json,v1/schema.json,v1/cases/}
tests/{unit,types,http,browser,mv3,parity/{typescript,python},fixtures/}
scripts/{test,build,pack,check-contracts}.*
examples/{node,browser,extension}/
Dockerfile; compose.test.yml; package.json; package-lock.json; tsconfig*.json
.github/workflows/ci.yml

Do not add folders with placeholder source just to match this diagram. Files are
created when a stage implements and verifies them. No database dependency is needed.
