# Shared language-neutral contract suite

## Ownership and reproducibility

Initially the canonical suite lives in this repository under contracts/v1. No fourth
repository or independently published contract package is required. Both runners
consume the same exact files; Python production source is not copied or rewritten.
Store contracts/manifest.json with format version, suite version, reference package
version, reference commit, artifact hashes and a sorted inventory of case IDs/files.
A case's semantic change requires review and a suite-version change. Schema changes
require a new format version. Additive cases increment the suite minor version.

The TypeScript CI installs a verified Python 0.7.0 wheel with locked dependencies
and runs both Client and AsyncClient through adapters kept in tests/parity/python.
Keep source-checkout mode for diagnosis only; CI baseline is explicit, never a
floating sibling checkout or latest registry version. S1 compares the published
wheel, v0.7.0 tag and recorded HEAD source hashes and records any discrepancy.
Store dependency/artifact hashes in the lock, not credentials or live payloads.

Future Python CI can download a contract bundle from a pinned commit or consume
an approved copy verified by SHA256. Do not set up an automatic cross-repository
update workflow now. A Python PR is needed only if adopting the consumer job or
fixing a demonstrated defect, and remains a separate reviewed change.

## Fixture encoding (format 1)

Use ordinary JSON for metadata and a fully tagged tree for all values. A tagged tree
avoids reserved-key collisions with unknown API fields:

- {"type":"object","entries":[["key", <value>], ...]}
- {"type":"array","items":[<value>, ...]}
- {"type":"string","value":"text"}
- {"type":"number","lexeme":"123.45000000000000000001"}
- {"type":"boolean","value":true}
- {"type":"null"}

No ordinary untagged numbers in data trees. An absent key is absent from entries;
explicit null has its own node. Disallow duplicate entries in valid value trees;
use raw response fixtures to test duplicate wire keys. Raw response body is an
inline UTF-8 string or bodyBase64 for invalid UTF-8, never both. Do not include
real service responses, account IDs, names, comments, tokens, or bank records.

Every case contains:
- id (stable descriptive slug), featureIds (Pxx), formatVersion, description,
  evidence (source symbol + source hash or source-document reference).
- operation (e.g. client.diff, builder.expense, oauth.refresh, codec.decode).
- input tagged tree, fixed clock in seconds, optional supplied entity IDs.
- scripted transport events: response status/headers/body or synthetic disconnect;
  all credentials are obvious fake values such as TEST_BEARER_NOT_A_SECRET.
- expect: request count, ordered requests, decoded result and/or error class/code.
- runtimeScope: shared, python-runtime, or typescript-runtime. Each nonshared case
  needs a specific approved rationale from parity.md, not a wildcard skip.

Request assertions include method, full canonical endpoint, relevant headers,
losslessly decoded JSON body or decoded form pairs. Header name case, JSON object
key order, insignificant whitespace, form percent-encoding style and mathematically
equivalent numeric lexemes do not differ semantically. Request count, array order,
null/absent distinction, identities, amounts, timestamps and body meaning do.
When testing rawJson preservation assert exact original text separately.

## Non-JSON inputs and runtime-specific cases

Format 1 tagged trees represent JSON values only. They cannot represent cycles,
undefined, functions/symbols/custom prototypes or an already rounded JS number.
Do not overload numeric lexemes or add executable fixture expressions to encode
these. Implement them as mandatory native-language tests under tests/unit and
Python reference-adapter tests, with stable IDs in the same feature coverage
manifest. Both languages test cycles and unsupported native inputs; JS-only
undefined/unsafe-number/prototype cases are typescript-runtime. Test code may
construct those inputs directly and assert validation plus zero HTTP requests.

Runtime cases report in the same result manifest, with explicit expected runners;
they are not silently skipped by other runners. The release checker requires every
declared runner result, including these native tests. Shared JSON-compatible
values still run in all three runners. RuntimeScope is never a waiver of a
required assertion. Real redirects similarly need per-runtime expectations:
Python HTTPError(3xx), TS TransportError without status; both assert zero requests
to the redirect target using the local server. A fake Response(302) is insufficient.

## Normalized results and comparison

Each runner writes JSONL, one result per requested case, with caseId, featureIds,
status, requests, result/error and runtime identity. Request count is the exact
requests array length; no independent count can disagree with the trace. Catch errors at
the adapter boundary. Canonicalize values into tagged trees. Normalize number
lexemes as exact sign/coefficient/base-10-exponent tuples using string/integer
operations, stripping trailing coefficient zeros. Do not normalize via JS Number
or Python Decimal arithmetic with default precision. Normalize zero sign only.
Do not expand huge exponents into enormous strings.

Normalize Python ValueError to validation, SDK errors to their declared categories,
and TypeScript ValidationError to validation. Do not compare exception prose or
stack traces. Adapters may translate names, parameter layout and exact-number
representations only; they must not repair bodies, remove unsupported fields,
retry, sort arrays, suppress errors or adjust mismatched amounts.

Missing results, duplicate case IDs, unsupported mandatory operations, skipped
required cases, reference import failures and nonzero runner exits fail the job.
A green result requires each implementation independently matches reviewed expected
results AND both match each other. Mere agreement between two bugs is insufficient.
Do not regenerate expected outputs from the TypeScript implementation.

## Required case families

1. Diff: initial 0; equal/forward cursor; backwards/negative/wrong-type cursor;
   all read kinds, empty/missing collections, unknown top-level/nested fields;
   malformed arrays/identities and error object.
2. Changes: every writable kind, mixed batch, structural required fields, duplicate
   IDs and composite budgets, duplicate/upsert-conflicting deletions, read-only
   writes denied, deduplicated forceFetch, unsupported country forceFetch denied.
3. Suggest: one/list, empty list rejection, input not mutated, wrong result shape,
   list length mismatch, error at top or any member, exact numeric extensions.
4. Builders: all defaults and optional fields; account types/loan fields; tag and
   merchant defaults; expense/income/transfer/refund recipe; four debt actions;
   dates/leap day, zero/negative values, two currencies, null/empty/multiple tags;
   viewed true default and explicit false; hold/deleted, bank IDs, source, QR, MCC,
   coordinates, original amount/instrument pairing; unknown fields on update;
   input mutation and protected identity overrides; clearBudget and deletions.
5. Numbers: safe boundary and adjacent integers, >2^53, very large coefficients,
   long fractions, exponent notation, negative zero, tiny values, nested unknown
   numeric fields, finite number inputs and unsafe-number rejection in TS-only
   input tests; no money epsilon comparisons or implicit rounding.
6. Codec: invalid UTF-8, duplicate keys, invalid syntax, nonfinite tokens, cyclic
   caller values, unsupported caller types; __proto__/constructor inert keys;
   null/missing distinction and raw response preservation.
7. Transport: shared 200 vs 204/400/401/403/429/500; real 3xx under the explicit
   runtime-specific redirect contract; no retries; body limit exact and
   +1, unknown content length, disconnect before/after synthetic application;
   errors must not leak bearer, OAuth tokens, body, query or headers.
8. OAuth: encoded URLs, duplicate/missing state/code, Unicode state, callback error,
   exchange and refresh form; bad token/lifetime/type; reuse before close, close
   before first request, repeated close, requests after close, injected ownership.
9. Runtime-specific: total deadline/abort/close races, stream cleanup, pure imports,
   browser CORS denial and MV3 host-permission missing/granted, package types.

## Anti-vacuity and drift controls

Add deliberate negative controls: alter an amount, swap transfer accounts, remove
an unknown field, change viewed=false, emit a second request. The comparator must
fail each mutation. Ensure fixtures actually invoke SDK functions rather than only
comparing prebuilt JSON. Test the comparator and schema on corrupted fixtures.
Use fixed seeded generated decimal/object cases to complement reviewed examples;
record seeds and keep deterministic failure artifacts with synthetic values only.

Release manifest maps every feature and exported model field to case/test IDs,
with explicit exceptions for type-only fields. The inventory script detects new
reference exports or fields. A runtime representation difference does not waive
wire-level feature coverage. Keep a deviations file with rationale, affected case
IDs, owner and status; no unexplained xfail/skip in release acceptance.
