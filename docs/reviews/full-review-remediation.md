# Full-review remediation and final local review

Date: 2026-10-20. Baseline: `6a0e25c`. Runtime remediation: `b956535` through
`bc5b081`. The independent full-project review is retained outside this repository
in the task workspace; this document records the follow-up source review and
offline acceptance, not a second independent or live-service review.

| Finding | Resolution | Commit | Focused evidence |
|---|---|---|---|
| R1 account field bypass | Reserve `fields.type` and `fields.instrument` in the account builder | `7b30d89` | Builder tests reject all three reproductions and retain valid cash/deposit records |
| R2 decoded surrogate | Validate decoded keys and values before returning response data | `b956535` | Codec and client tests reject escaped lone surrogates and accept valid pairs |
| R3 browser prototype coverage | Exercise installed SDK transport in page and MV3 contexts | `bc5b081` | Chrome 120 and Chromium 156 test size, streaming, UTF-8, timeout, abort, close, redirects and request counts |
| R4 quadratic conflict check | Index write identities per kind before checking deletions | `439ecbc` | Protocol conflict tests plus representative Docker batch comparison |
| R5 integer type normalization | Copy validated caller objects without converting ExactDecimal lexemes | `609c19d` | Protocol and builder tests reject decimal `1`, `1.0` and `1e0` in integer positions |
| R6 budget documentation | Name protected fields and preserve budget composite keys in the example | `1b0bb1d` | Compiled example and native update/key test |

Final source inspection checked the Unicode validation path, account constructor
and low-level write boundary, ExactDecimal preservation and immutable copy,
per-kind conflict sets, and installed-package browser import alias. Shared wire
fixtures and Python adapters were not changed. The two deliberate Python runtime
differences are explicit in parity.md and `contracts/manifest.json`.

The full pinned Docker matrix from a clean `git archive` of `bc5b081` passed:
56 Node unit tests each on Node 22.23.3 and 24.22.0; 124 shared vectors in both
installed Python clients and the packed TypeScript SDK; eight mandatory native
TypeScript checks; package/type consumers; Chromium 156.0.8078.4 and Chrome
120.0.6099.109 browser/MV3 acceptance. All test containers used `--network none`
with a synthetic loopback API. The final metadata/documentation changes are
checked by a second full Docker matrix before the F7 commit. The package tarball
was reproduced byte-for-byte from the clean archive and final working tree; its
27-file allowlist and SHA256SUMS were checked. The current artifact hash is recorded
in release-candidate.md.

No material unresolved finding from R1–R6 remains in the offline scope. This
does not establish live ZenMoney behavior, registered OAuth acceptance, remote CI,
npm ownership, or authorization to push, tag or publish. The package remains
`private:true` and all financial/production data remains untouched.
