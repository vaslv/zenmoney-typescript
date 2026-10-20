# Python feature parity and evidence

Reference: zenmoney-python 0.7.0; checked-out commit and file hashes are recorded in
[python-inventory.json](python-inventory.json). It is a local source snapshot, not
an assertion that HEAD equals the release tag. The tag points to
6c38d4c0cb3e8cc271292e37e9934e6c1a7b9972; the runtime source diff from that tag to
the recorded HEAD is empty. The installed published wheel and all eight runtime module hashes were verified
in S1; the baseline is frozen in python-baseline.json.

The inventory lists public module functions, class methods and model fields.
It is an inventory, not proof by itself. The complete implementation is checked by
124 independently specified shared cases in both installed Python clients and the
packed TypeScript SDK, exact model-field type assertions, native input tests,
local HTTP lifecycle tests and installed browser/MV3 consumers. See
[coverage](../contracts/coverage.json), [manifest](../contracts/manifest.json) and
[status](status.md). This establishes the documented offline behavioral baseline,
not exhaustive proof of every combination or live service acceptance.

| ID | Python capability | TypeScript surface | Required evidence |
|---|---|---|---|
| P01 | Client / AsyncClient | ZenMoneyClient, async only | same requests/results in both Python runners and TS |
| P02 | diff / read_diff | diff / readDiff | initial/incremental/mixed changes, cursor equality/regression |
| P03 | upsert / delete | upsert / delete | each writable/deletable kind; conflict/duplicates rejected |
| P04 | suggest object/list | suggest overloads | object vs list shape, cardinality, errors |
| P05 | Diff.raw_json / server_timestamp | Diff.rawJson / serverTimestamp | untouched UTF-8 and exact decoded data |
| P06 | KINDS/FORCE_FETCH/WRITABLE/DELETABLE | same constants | country read-only observed extension; excluded forceFetch |
| P07 | entity_key | entityKey | ordinary IDs and budget composite user/date/tag |
| P08 | models and all fields | exported entity interfaces | inventory field coverage and compile-time examples |
| P09 | entities.account/tag/merchant | entities.account/tag/merchant | full defaults and override restrictions |
| P10 | transaction/expense/income | transactions equivalents | complete defaults, validation and optional fields |
| P11 | transfer | transactions.transfer | both legs, amounts/currencies and same-account rejection |
| P12 | debt | transactions.debt | lend, borrow, repay, collect; counterparty required |
| P13 | update | transactions.update | copied object, unknown fields, immutable identity/timestamps |
| P14 | deletion / clear_budget | deletion / clearBudget | stamp/user, budget zeroing + unlock, no budget ID deletion |
| P15 | authorization_url / callback_code | authorizationUrl / callbackCode | encoding, unique state/code, OAuth errors |
| P16 | OAuthClient/AsyncOAuthClient | OAuthClient, async | exchangeCode/refresh and token validation |
| P17 | Token | OAuthToken | explicit token access, redacted routine serialization |
| P18 | error hierarchy | SDK error classes | validation/HTTP/transport/response/closed; sanitized fields |
| P19 | injected HTTPX transport/clock | fetch/clock/UUID injection | deterministic requests and non-global ownership |
| P20 | close/aclose/is_closed | close/isClosed | idempotent close, no re-open, cancellation documented |
| P21 | decimal codec / unknown fields | ExactDecimal + protocol codec | exact parse/encode/copy, nested extensions |
| P22 | response limits/timeouts | limits/timeoutMs/signal | bounded chunked read, invalid config, abort cleanup |
| P23 | live-observed fields | same preserved/buildable fields | fixtures for private/balanceCorrectionType/archive/staticId |

## Entity capabilities

Read: instrument, company, user, account, tag, merchant, budget, reminder,
reminderMarker, transaction; preserve observed country collections and unknown
extensions. forceFetch accepts the reference documented list, never country.
Write: account, tag, merchant, budget, reminder, reminderMarker, transaction.
Delete by object/id: those writable kinds except budget. Budget uses composite
user/date/tag identity; clear amounts and locks instead. ReminderMarker deletion
state and entity deletion are separate forms and need separate tests.

Full support for Reminder/ReminderMarker/Budget means models and complete-object
low-level write/update operations. Python has no dedicated creation builder for
every entity; do not invent a second convenience layer as a parity requirement.

## Financial behavior to preserve

Builders return complete objects, not network writes. Income/expense use the same
account on both sides and one zero amount. Transfers use both accounts/instruments
and separately supplied amounts; no currency conversion is performed. Lend/repay
move ordinary account → debt account; borrow/collect reverse it, with the ordinary
account's currency on both legs and a named counterparty.

Refunds use income with the appropriate expense category; there is no invented
refund endpoint. Splitting by amount uses several transactions; a list of tags
alone is not category-amount splitting. The debt account is existing system data,
not a new account type accepted by the account builder.

Default viewed is true, matching Python. ZenImport must explicitly request false
for unreviewed imports; SDK defaults must not contain ZenImport policy. Keep null
and [] distinct for tag. Neither promises to disable ZenMoney auto-categorization.
Preserve date strings as calendar dates and timestamps as seconds; never derive
transaction time ordering from a date-only field or change timezone silently.

## Intentional language differences (must have tests)

- Explicit TS numeric-token length limit 4096 and JSON container-depth limit 128,
  compared with Python interpreter resource limits. Over-limit input is rejected
  without truncation; required native resource-bound cases follow ADR 002.
- One async client instead of sync/async variants; camelCase helper names while
  entity wire fields keep ZenMoney spellings exactly.
- timeoutMs is a total request/body deadline, default 60000 or null for unlimited.
  HTTPX's per-phase connect/read/write/pool settings are not emulated; classify as
  runtime-specific, and document the reduced timeout configurability explicitly.
- close aborts only this client's in-flight requests and permanently closes it;
  it never disposes global/injected fetch or another client's resources.
- ExactDecimal/bigint replace Python Decimal/arbitrary-size int; no implicit
  financial conversion through floating point. See api.md for number inputs.
- The TypeScript account builder rejects `fields.type` and `fields.instrument`:
  callers must use the validated `accountType` and `instrument` options. Python
  0.7.0 accepts a type override through extra fields, which can bypass its
  account-type and loan/deposit checks. This inherited reference defect is not
  replicated; the low-level write API remains available for complete records.
- TypeScript rejects JSON strings and keys containing unpaired surrogates after
  unescaping them. Python's JSON decoder can accept these sequences; rejecting
  them keeps every accepted TypeScript response serializable by the SDK codec.
- JS undefined is not JSON null. Optional object properties with undefined are
  omitted at the public options boundary; undefined array entries and explicit
  protocol objects containing undefined are rejected.
- Network cookies/environment-proxy controls vary by runtime. Fetch requests omit
  credentials; no parity claim that browser/Node fetch implements trust_env=False.
- Real HTTP redirects with fetch redirect:error reject without an accessible status:
  TS reports TransportError with no status; Python reports HTTPError(3xx). Both
  must issue no follow-up request and never forward credentials to the redirect
  destination. This case has separate runtime expected results. An injected
  Response(302) alone is not evidence of native redirect behavior.
- ValidationError is the explicit TS counterpart of Python ValueError; error text
  and stack frames are not contract equality requirements.

These are documented semantics, not blanket exemptions. Further changes require
an ADR and a targeted fixture. Do not weaken exact values/identities/no-retry rules.

## Evidence hierarchy and limitations

Compare source/tests with the public API documentation and historical synthetic
live findings. Resolve conflicts explicitly. Never rewrite expected fixtures solely
to make the reference pass. Historical October 2026 Python live results do not
constitute a live TypeScript test. OAuth refresh has protocol/local-test evidence,
not registered-application live acceptance. Loan/deposit and recurring reminder
combinations also need that distinction. See sources.md.
