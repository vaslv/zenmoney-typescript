# ADR 001: pinned S1 toolchain and runtime scope

Status: Accepted for S1, 2026-10-20.

Use ESM with .js relative imports and declaration emission, TypeScript 5.9.3,
strict checking, no implicit ambient Node types, ES2022 language/library target.
Minimum TypeScript consumer: 5.9.3; both NodeNext and Bundler consumer fixtures are
compiled at that version. Later support for another compiler requires its own check.
CommonJS output is outside the initial scope. No unimplemented HTTP API is exported.

Pinned tools: lossless-json 4.3.2 (MIT), esbuild 0.28.2 (MIT), Playwright 1.64.1
(Apache-2.0), @types/node 22.19.0 (MIT), TypeScript 5.9.3 (Apache-2.0).
package-lock.json supplies exact transitive versions and integrity hashes.
The compiler is deliberately selected for the declared consumer baseline rather
than automatically upgraded to the newest compiler major.

| Environment | Version | Immutable image |
|---|---|---|
| Node 22 | 22.23.3 | node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 |
| Node 24 | 24.22.0 | node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 |
| Python | 3.12.15 | python:3.12-slim-bookworm@sha256:34386ef0cb081344d7ec1c103ba398e6e9f64e9ab3a1509accc92a4e24a07258 |
| Browser harness | Playwright 1.64.1, image Node 24.21.0 | mcr.microsoft.com/playwright:v1.64.1-noble@sha256:7852dc5a7d72f5fe458a597d690f6c42fbc8e9e26ddfa95f8e6ef552558d9bbf |

The listed digests are multi-platform indexes; Docker chooses the corresponding
immutable platform manifest. Node and Python were checked on Linux arm64. Browser
checks use current Chromium 156.0.8078.4 on arm64, plus Chrome for Testing
120.0.6099.109 on Linux amd64 (emulated on the development machine).

The Chrome 120 archive URL is pinned in Dockerfile.chrome120 and its SHA256 is
bcb22c5242aabf184c6fadd86ee58b3ae35739177edac9de3938ed33791d4ddf.
It comes from Google's Chrome for Testing download index. The old browser is used
only in a disposable offline fixture with synthetic data. No bank session is opened.
A real Chrome 120 test passed; the minimum was not silently raised.

Build stages may download dependencies; runtime checks use --network none and only
loopback local HTTP servers. Test containers use --init for Xvfb signal handling,
a read-only root and writable temporary filesystems. XDG cache/config paths are
under /tmp so Chromium can initialize crash handling in the read-only container.
No Docker socket or host financial folder is mounted in test containers.

Python baseline is an installed PyPI wheel, not a copied source tree. Its hash,
release commit, approved source commit and module hashes are in python-baseline.json.
All eight runtime modules matched. requirements.reference.txt hash-locks the wheel
and its transitive dependencies; no floating resolver runs during offline checks.
