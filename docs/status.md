# Progress and decisions

## 2026-10-20 — S0

User-approved approach: B, TypeScript-native API with full Python functionality and
shared protocol checks. User authorized creating the local project and detailed
implementation documentation. No remote creation, push, tags or publication.

Created documentation-only project and public Python declaration/field inventory.
No package.json, runtime SDK implementation, dependency installation or product
integration has been added. S1–S8 are planned, not started.

Detailed design status: DRAFT, pending user review. No blocking product questions
for S1; the numeric-parser/runtime spike and registry ownership are explicit gates.

Validation completed:
- All 11 relative Markdown links resolve across 12 Markdown documents.
- JSON inventory parses and all eight source-module SHA256 values match the Python
  snapshot. Runtime source has no diff between v0.7.0 and reference HEAD.
- Public functions, methods, model fields, module declarations and __all__ are
  inventoried; actual case-level coverage remains an S1/S2 deliverable.
- Documentation is English; no runtime SDK code, tokens or live payloads were added.
- Independent specification review: two rounds, two material issues found and
  fixed, zero remaining blockers, final PASS (9/10). Fixes explicitly cover native
  redirect error differences and mandatory non-JSON input tests.
- Git staged whitespace check passed.

No Docker/runtime/real API tests were run or claimed: there is no SDK implementation
at S0. Existing Python/backend/Chrome runtime files and production data are unchanged.
No remotes, tags, pushes or publication. S0 documentation is ready for user approval;
S1 is the next implementation stage.
