# Publication plan — not yet authorized

Repository created by the user: https://github.com/vaslv/zenmoney-typescript.
The local origin is configured; no push is authorized by this planning task.
Proposed npm package: zenmoney-typescript. Its availability and ownership are not
verified. Confirm them at release time; do not create registry packages during S0.
If npm name is occupied, agree on a scoped name rather than silently changing it.

Use MIT with existing author attribution. Initial target 0.1.0, independently of
Python 0.7.0. Full feature parity is a release gate, not a promise that versions
will be synchronized across languages. Mark the SDK's stability honestly.

## Before asking to publish

- Complete S1–S7 and independent code review; prepare the actual reviewed commit.
- Inspect current official npm/GitHub publishing documentation and authentication
  options. Prefer short-lived trusted CI publishing where supported; otherwise
  use a scoped local credential without exposing it in commands, logs or files.
- Set package name/version/repository/license/exports/types/files/engines metadata;
  emit ESM and declarations. Keep private:true until release preparation.
- Use an allowlist for dist, README, LICENSE and selected user docs. Exclude tests,
  fixtures with credentials (none allowed), source journals, .env, .local and reports.
- Build once from the exact commit with pinned dependencies, create the npm .tgz,
  produce SHA256SUMS, install the exact tarball in clean consumers, inspect contents.
- Provide proposed GitHub/tag/npm URLs, artifact names/hashes and actual CI results
  in the publication request. No automatic release from a normal main push.

## After separate permission

Push the reviewed commits, create/send the approved version tag, run approved
publication steps. Publish only the tested artifact, avoiding a lifecycle hook that
rebuilds different content during publish. Publish a GitHub Release containing the
same tarball and checksums. CI failures block release rather than being ignored.
If publishing partially fails, inspect remote state before retrying; never overwrite
an immutable version or move a public tag to another commit.

Check public npm metadata/tarball integrity, download and compare the tarball, clean
install the exact version and run type/runtime smoke tests. Confirm tag commit,
release asset hashes and any registry provenance. Record the result in status.md.
Do not infer that a successful upload alone proves the installed package works.

Publishing the SDK does not authorize changing or releasing ZenImportChrome,
ZenImportBackend or zenmoney-python. SDK integration is a later separate stage.
