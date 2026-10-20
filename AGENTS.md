# zenmoney-typescript

Communicate with the user in Russian. Keep repository documentation, source,
comments, examples, errors, and commit descriptions in English.

This is an independent SDK for the public ZenMoney API. Read README.md and
all linked design documents before implementation. Execute stages sequentially;
record exact verification commands/results and local commits in docs/status.md.
The current repository is documentation only: do not claim working SDK support.

Do not add Chrome APIs, DOM dependencies, storage, bank connectors, transaction
matching, category prediction, or background synchronization to the SDK.
Do not change sibling projects without task authorization. Read their AGENTS.md
before touching them. The Python reference is pinned in docs/python-inventory.json.
Never read/copy private .local data or tokens to build shared fixtures.

Use synthetic data and Docker for acceptance. Mock API tests must not reach real
ZenMoney. Live tests require an agreed test-account scenario and separate approval.
Never embed secrets in source, images, logs, examples, npm tarballs, or CI artifacts.
Do not create tags, push, publish, or create a remote repository without explicit
permission for the action. Use local conventional commits: type(scope): imperative
lowercase English description, no final period. Verify the title before/after commit.

Keep the chosen TypeScript-friendly API and cross-language semantic parity.
Differences must be explicit in docs/parity.md and contract metadata, never hidden
in test adapters. Do not automatically retry writes, silently round money, discard
unknown response fields, or infer that a failed HTTP response means no write occurred.
Use Context7 for current library/tool documentation before choosing/configuring
versions. Pin tool/dependency versions and commit the lockfile during stage S1.
