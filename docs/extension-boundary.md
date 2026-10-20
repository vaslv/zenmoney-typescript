# Later standalone ZenImport integration (outside SDK scope)

## Product decisions already confirmed

Default is local browser storage with no server deployment. Exactly one local or
server mode is active for a dataset. Configuring a fresh server can migrate local
data before switching. A used server is joined without import or database merge.
The user accepted this behavior explicitly on 2026-10-20.

The connection form may offer a migration checkbox, defaulted on when local history
exists and the destination is fresh. Verify destination/account/schema before moving,
finish/check in-flight writes, pause source, export full state, import, verify and
only then activate the destination. Failure or unknown import result is recovered
by checking durable destination state, not blindly reactivating both writers.

A retained local copy is a backup, not current data. Switching back requires a new
server→browser move. A nonempty old browser database is not automatically merged
or overwritten; design a backed-up replacement flow before implementing reverse
migration. Joining a used server must clearly explain that local-only history is
not uploaded. No distributed lock between disconnected copies is promised.

## Separate future design decisions

- Storage engine (IndexedDB vs SQLite/WASM etc.), persistence quotas, eviction,
  private-profile behavior and explicit backups. Identical physical DB format is
  not yet selected; complete lossless logical-state migration is required.
- Browser background lifetime, durable checkpoints, leases, crash recovery and
  long capture jobs; popup closure must not lose delivery state.
- Shared domain engine or cross-language business-rule tests to keep matching,
  transfer ownership, categorization and delivery aligned with Python backend.
- Browser token storage, account verification, permissions and explicit lifecycle
  on uninstall/profile reset; no embedded confidential OAuth client secret.
- Portable versioned migration carrying bank identities, mappings, history,
  coverage, mirror, generated UUIDs, uncertain attempts, receipts, tombstones and
  exclusions. Credentials stay outside the archive.
- Recovery when the destination import succeeded but activation acknowledgement
  was lost; clean-destination precondition must be enforced transactionally.

Do not add these features to the API SDK. Do not claim an SDK prevents duplicates:
it only avoids hidden retries and preserves exact objects. ZenImport's durable
journal, reconciliation and single-writer activation provide that behavior.

## Handoff gate after SDK acceptance

Before committing to browser storage architecture, run a separately authorized
read-only real ZenMoney request from a minimal extension with the exact API host
permission, using a test token. Verify distribution bundle/CSP and service-worker
context. Ordinary web page CORS success/failure is not an extension-permission test.
Then agree on the local domain-engine/storage/migration design. No bank/UI/backend
production changes are part of this SDK preparation task.
