# Proposed public API and invariant contract

Status: approved target API. S1 implements ExactDecimal/decimal only and freezes
the mapping in api-options.json; all remaining root exports below are planned.
Numeric/resource decisions are recorded in adr/002-exact-json.md.

## Exports and module boundaries

Root exports: ZenMoneyClient, OAuthClient, OAuthToken, authorizationUrl,
callbackCode, ExactDecimal, decimal, encodeJson, decodeJson, entityKey,
KINDS, FORCE_FETCH, WRITABLE, DELETABLE, entities, transactions, model types and
ZenMoneyError/ValidationError/HTTPError/TransportError/ResponseError/ClientClosedError.
Only root exports are initially supported; source deep imports are private.

Use named ESM exports, .js extensions in emitted relative imports, .d.ts files,
and an explicit package exports map with types before default. No CJS build in
v0.1.0. The package must be bundleable without process, Buffer, filesystem, DOM,
or Chrome globals in runtime modules. Node-only tests/tools stay outside src.

## Proposed signatures

```ts
const client = new ZenMoneyClient({
  token, fetch: globalThis.fetch, timeoutMs: 60_000,
  maxResponseBytes: 64 * 1024 * 1024,
  clock: () => Math.floor(Date.now() / 1000),
});
const diff = await client.readDiff({serverTimestamp: 0});
// Atomically persist diff.data and then its cursor in the calling application.
const item = transactions.expense({
  user: 1, date: "2026-01-15", account: "synthetic-account",
  instrument: 1, amount: decimal("12.34"), viewed: false,
  id: "synthetic-transaction", now: 1768435200,
});
// A later caller may explicitly send the prepared object:
// await client.upsert("transaction", [item], {serverTimestamp: diff.serverTimestamp});
client.close();
```

Draft declaration shapes:
- diff({serverTimestamp = 0, changes?, deletions?, forceFetch?, signal?} = {}): Promise<Diff>
- readDiff({serverTimestamp = 0, forceFetch?, signal?} = {}): Promise<Diff>
- upsert(kind, entities, {serverTimestamp = 0, signal?} = {}): Promise<Diff>
- delete(deletions, {serverTimestamp = 0, signal?} = {}): Promise<Diff>
- suggest(object, {signal?}?): Promise<Entity>; list overload returns Entity[].
- Diff = {data: decoded response object, rawJson: original string,
  serverTimestamp: nonnegative exact integer}; do not strip unknown top-level data.
- All builders use options objects; wire-style optional fields keep their names.
  Core convenience options use incomeAccount/fromAccount/amountOut/etc. Map all
  Python options explicitly in the S1 generated coverage manifest.
- transactions.update(entity, fields, {now?} = {}); identity/timestamp overrides in
  fields rejected. entities builders accept extension fields through fields?.
- client.close(): void, idempotent; client.isClosed: boolean.
- OAuthClient({clientId, clientSecret, redirectUri, fetch?, timeoutMs?});
  authorizationUrl({state}), exchangeCode(code, {signal?}?),
  refresh(refreshToken, {signal?}?), close(), isClosed.
- standalone authorizationUrl({clientId, redirectUri, state});
  callbackCode(callbackUrl, {expectedState}); neither launches UI.

## Exact numbers

Public ExactDecimal is an immutable SDK-owned value, created by decimal(string).
It accepts valid finite JSON decimal notation including exponents; rejects NaN,
Infinity, locale commas, whitespace padding and empty strings. Expose toString()
and explicit comparison/equality, not arithmetic/currency rounding or implicit
valueOf conversion. It must not silently serialize as a quoted JSON money value.
Ordinary JSON.stringify on an ExactDecimal should throw with guidance to encodeJson.

Decode every decimal/exponent numeric token as ExactDecimal, including nested unknown
fields. Decode integer tokens as number if safe, bigint otherwise. Known integer
fields accept number | bigint and validate sign/integrality; never reject a valid
large integer merely to satisfy TypeScript's number type. Dates remain strings.
Decoded integer monetary values follow the same rule. Number = number | bigint |
ExactDecimal; field-level models use the appropriate exact integer/numeric union.

Encode ExactDecimal and bigint as unquoted JSON numeric tokens. Accept finite JS
number input for compatibility, serialize its existing shortest decimal value;
reject unsafe integer numbers (precision was already lost). Recommend decimal("0.1")
for money. Document that 0.1 + 0.2 is already approximate before SDK entry and cannot
be repaired. No tolerance-based comparisons in parity tests. Preserve mathematical
value, not numeric spelling, except rawJson which is unchanged. Treat -0 and 0 as
equal for semantic contract results; keep original raw response bytes/text.

The codec must reject duplicate keys, invalid UTF-8, malformed JSON, nonfinite
numbers, cycles and unsupported JS values (functions/symbols/custom prototypes).
JSON object keys such as __proto__ must remain inert data without prototype mutation.
Preserve missing versus null versus empty arrays. Avoid regex-based JSON replacement.
S1 selected lossless-json 4.3.2 with bounded duplicate-key preflight; see ADR 002.
Maximum numeric token length is 4096 and nesting depth is 128. These are explicit
resource bounds compared with Python, not rounding or loss of accepted values.

## Transport

Production origin is https://api.zenmoney.ru with /v8/diff/, /v8/suggest/ and OAuth
paths from the reference. No unrestricted baseUrl override initially; tests inject
fetch that routes internally to a fake server without changing public endpoint
semantics. The injected transport is trusted caller code and receives credentials.

POST JSON with Bearer auth for data endpoints; form encoding for OAuth token calls.
Success status is 200, matching Python. Set redirect:error and credentials:omit;
no automatic redirect, retry, token refresh, persistence, polling, or batching.
Native fetch may reject a real redirect without exposing its status; report this
as TransportError without an invented status. Python can report HTTPError(3xx).
This specific runtime difference is required in parity.md and local HTTP tests.
No token in URL. Validate before network. Consume the response stream with a
64 MiB data/default limit and 1 MiB OAuth limit, including unknown content length.
Count decoded body bytes delivered by fetch; oversized streams are cancelled before
unbounded buffering. Decode UTF-8 strictly. A positive finite timeout or null is
required. Combine caller abort with the deadline and close cancellation; remove
listeners/timers on every outcome. close does not establish whether writes landed.

Expose only sanitized error category, code and HTTP status when available. Do not
retain raw response bodies, request objects, headers or unsanitized error causes.
Use timeout/aborted/network reason codes under TransportError. Cancellation after
send can have an unknown write outcome. An HTTP error is not proof of non-creation.
No success response should be interpreted as a persisted local cursor by the SDK.

## OAuth and secrets

Bearer tokens are required nonempty strings without whitespace. OAuth validation
matches the reference: one matching nonempty state, one nonempty code, rejection of
OAuth errors/duplicates, bearer token type, exact nonnegative lifetime, valid optional
refresh token. Keep state comparison behavior tested; do not invent PKCE endpoints
or claim public-client flows absent service evidence. Browser ordinary JS is not a
confidential client; clientSecret examples belong only in trusted server applications.

OAuthToken exposes explicit credential access for callers but redacts JSON/string
and inspect output where supported. Tests check ordinary logging/serialization.
Do not promise that devtools or direct property access can never expose a secret.
There is no automatic refresh or token storage in the library.
