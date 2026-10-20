# Local release candidate handoff

Version: 0.1.0, unpublished/private. Reference: zenmoney-python 0.7.0.
Repository: https://github.com/vaslv/zenmoney-typescript.

The implementation stages S1–S7 are complete, with review after each stage and
local conventional commits. Offline evidence is in status.md, reviews/ and the
contract manifest. Publication is S8 and remains separately authorized. There is
no published npm version or remote CI result to link yet.

## Candidate scope

Full supported public Python capability mapping, implemented as an asynchronous
TypeScript API: exact codec/models, diff/suggest, catalog and financial builders,
updates/deletions/budget clearing, explicit confidential OAuth and safe lifecycle.
Shared wire expectations are independent of SDK outputs. Intentional runtime and
resource differences are listed in parity.md. This is not an assertion about
undocumented/private ZenMoney functionality or every possible service combination.

## Ready locally

- Pinned dependency/runtime locks, 124 shared synthetic vectors in three runners,
  exact model-field checks, native HTTP/security tests and installed consumers.
- Current Chromium/Chrome 120, ordinary-page CORS and granted/missing MV3 permission.
- Build/test/pack-only GitHub workflow with read-only repository permission.
- Local npm tarball and SHA256SUMS; reproducible from the reviewed source snapshot.
- English README, recipes, OAuth/server-only guidance and unknown-write-outcome rules.

## Explicit outstanding release gates

1. User authorizes the exact push/tag/GitHub Release/npm publication actions.
2. Confirm npm owner/name (anonymous 404 was only an availability observation).
3. Review changing private:true to false, retest that new release commit and rebuild
   its artifact. The current private candidate must not be uploaded as a release.
4. Run remote CI on that authorized commit and verify its status/artifacts.
5. Publish the reviewed artifact through the approved authentication method;
   verify registry install/integrity and GitHub tag/release attachments afterward.

See publication.md for operator details. No long-lived credential, publisher
configuration or automatic publish-on-push workflow has been installed.

## Separate product integration gate

Synthetic acceptance is complete. No live TypeScript API request or registered-app
OAuth flow is claimed. Before replacing production ZenImport's Python transport,
perform the separately authorized read-only extension/API connectivity scenario,
then design the local storage/domain/migration layer described in
extension-boundary.md. This SDK does not itself provide durable deduplication,
bank connectors, a local database or optional-backend mode.
