# Local release candidate handoff

Version: 0.1.0, unpublished/private. Reference: zenmoney-python 0.7.0.
Repository: https://github.com/vaslv/zenmoney-typescript.

The implementation stages S1–S7 and the ordered full-review remediation F1–F7
are complete, with separate local conventional commits for the runtime, guidance,
browser-acceptance and final review changes. Offline evidence is in status.md,
reviews/ and the contract manifest. Publication is S8 and remains separately
authorized. There is no published npm version or remote CI result to link yet.

## Candidate scope

Full supported public Python capability mapping, implemented as an asynchronous
TypeScript API: exact codec/models, diff/suggest, catalog and financial builders,
updates/deletions/budget clearing, explicit confidential OAuth and safe lifecycle.
Shared wire expectations are independent of SDK outputs. Intentional runtime and
resource differences are listed in parity.md. This is not an assertion about
undocumented/private ZenMoney functionality or every possible service combination.

## Ready locally

- Pinned dependency/runtime locks, 124 shared synthetic vectors in three runners,
  56 Node unit tests in each pinned runtime, exact model-field checks, native
  HTTP/security tests and installed consumers.
- Current Chromium/Chrome 120, ordinary-page CORS and granted/missing MV3 permission.
  Installed-package transport failure paths cover size, streaming, invalid UTF-8,
  timeout, cancellation, client close and redirect refusal.
- Build/test/pack-only GitHub workflow with read-only repository permission.
- Local npm tarball and SHA256SUMS, rebuilt after the full-review remediation.
- English README, recipes, OAuth/server-only guidance and unknown-write-outcome rules.

The two intentional Python differences uncovered by the review (reserved account
builder fields and decoded unpaired surrogates) are recorded in both parity.md and
the contract manifest. The prior S7 result file remains a historical snapshot.
The current local `private:true` tarball is `zenmoney-typescript-0.1.0.tgz`
(17,838 bytes; 27 allowlisted files). Its SHA-256 is
`af9d77375070204b63875188146a23f279153d42754a9671de95164097445e5c`.
It was rebuilt byte-for-byte from a clean archive of the reviewed runtime commit
`bc5b081` and from the final working tree. The tarball and `SHA256SUMS` are under
ignored `.local/release/`; they are not a published package.

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

Synthetic acceptance is complete. A separately authorized Node 22 test-account
run verified live diff reads, forceFetch, Suggest for one/list, and one owned 1 VND
expense followed by deletion and independent balance restoration. See status.md.
This is limited live evidence, not full live parity; registered-app OAuth and
direct Chrome extension connectivity remain unverified. Before replacing
production ZenImport's Python transport, perform the separately authorized
extension/API connectivity scenario, then design the local storage/domain/migration
layer described in extension-boundary.md. This SDK does not itself provide
durable deduplication, bank connectors, a local database or optional-backend mode.
