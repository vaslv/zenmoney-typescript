# zenmoney-typescript

Independent asynchronous TypeScript SDK for the public ZenMoney API. Supports
Node.js 22/24, bundled browser applications and Chrome 120+ extension workers.
MIT licensed; ESM with TypeScript 5.9.3+ declarations. No Python runtime required.

**Unpublished 0.1.0 candidate.** Implements the public capabilities of
[zenmoney-python 0.7.0](https://github.com/vaslv/zenmoney-python), with shared offline
contracts, exact financial values and explicit lifecycle management. Offline
acceptance covers the shared contracts; a limited authorized test-account run
confirmed reads, suggestions and one owned expense creation/deletion. See
[the test record](docs/status.md) for its scope. npm installation by package name
is not available until publication; install the prepared `.tgz` locally instead.

## Read and prepare a transaction

```ts
import {ZenMoneyClient, decimal, transactions} from 'zenmoney-typescript';

// Supply a token from your application's private configuration.
const client = new ZenMoneyClient({token});
try {
  const diff = await client.readDiff({serverTimestamp: 0});
  // Atomically store diff.data and diff.serverTimestamp in your application.
  const item = transactions.expense({
    user: 1, date: '2026-01-15', account: 'verified-account-id', instrument: 1,
    amount: decimal('12.34'), categories: ['verified-category-id'], viewed: false,
  });
  // Creating an object is local. Send only after the caller authorizes the write:
  // await client.upsert('transaction', [item], {serverTimestamp: diff.serverTimestamp});
} finally {
  client.close();
}
```

`diff`, `readDiff`, `upsert`, `delete`, and `suggest` each send at most one request.
No hidden retries, batching, cursor storage, polling or automatic OAuth refresh.
Prepare IDs once and keep the same object when reconciling an uncertain write.
A timeout, cancellation or HTTP error does **not** prove that a write failed.
Read and reconcile before deciding to resend. This SDK is not a durable sync engine.

## Exact financial values

Use `decimal('0.1')` for money. `decodeJson` and API replies represent decimal or
exponent tokens as `ExactDecimal`; large integers become `bigint`, safe integers
remain `number`. Use `encodeJson` to serialize them as numeric JSON tokens.
`JSON.stringify` cannot safely replace the SDK codec. Implicit decimal conversion
is rejected; compare with `.equals()` / `.compare()` and display with `.toString()`.
The SDK cannot repair a number rounded by JavaScript before entry (e.g. `0.1 + 0.2`).
Numeric tokens are limited to 4096 characters, JSON containers to depth 128.
Default response limit is 64 MiB; OAuth is limited to 1 MiB.

## Capabilities and boundaries

- Read all public entity families and preserve unknown fields/raw JSON.
- Write transactions, accounts, tags, merchants, budgets, reminders and markers;
  delete supported entities and clear budgets through their composite identity.
- Build expenses, income/refunds, two-currency transfers and all four debt actions.
- Optional explicit confidential-client OAuth helpers and redacted token objects.
- Per-request `signal`, total `timeoutMs` (default 60000, or `null`), `close()`.

Default transaction `viewed` is **true**; use false for unreviewed imports. Empty or
null categories do not guarantee ZenMoney will skip its own categorization.
Dates are calendar strings; no timezone/time ordering is inferred. Transfer rates
and category split amounts are the caller's responsibility. There is no public
bank-login/sync endpoint, embedded database or financial matching in this SDK.
Ordinary web pages require server CORS support; extensions require API host
permission and should call from the worker, not a bank content script. Do not ship
OAuth client secrets in a browser. Direct live extension connectivity remains a
separate integration gate.

## Documentation and development

- [Usage, recipes, OAuth and errors](docs/usage.md)
- [API/types and invariants](docs/api.md), [Python parity and differences](docs/parity.md)
- [Docker development and acceptance](docs/development.md), [contract format](docs/contracts.md)
- [Design](docs/design.md), [implementation plan](docs/implementation-plan.md), [status](docs/status.md)
- [Security/testing policy](docs/testing.md), [sources](docs/sources.md)
- [Publication checklist](docs/publication.md), [future standalone extension](docs/extension-boundary.md)

Run `./scripts/test.sh` for pinned Docker acceptance and `./scripts/pack.sh` for a
local candidate archive/checksum. Neither command publishes anything. Repository:
https://github.com/vaslv/zenmoney-typescript. No remote writes are authorized here.
