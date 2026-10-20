# Evidence and sources

Inspected on 2026-10-20. Documentation describes the public protocol; local SDK
sources provide the implementation baseline. External pages can change, so S1
records the contract evidence and package hashes used in acceptance.

## Local reference

- zenmoney-python 0.7.0, repository https://github.com/vaslv/zenmoney-python
- Source snapshot and per-module SHA256: python-inventory.json.
- src/zenmoney_api/{__init__,client,protocol,models,entities,transactions,oauth,errors}.py
- docs/{coverage,architecture,basic-operations,live-results,live-validation}.md
- tests/{test_api,test_client,test_entities,test_universal,test_oauth_lifecycle}.py
- Existing ZenImport migration design: sibling ZenImportBackend/docs/popup-migration.md.

No private .local content or real account payloads were copied. Historical Python
live findings are not claimed as TypeScript live acceptance. SDK source, rather
than guesses from generic API patterns, defines the detailed baseline in parity.md.

## Official external sources

- [ZenMoney public API](https://github.com/zenmoney/ZenPlugins/wiki/ZenMoney-API):
  entity families, diff/suggest and authorization. The wiki is not evidence for
  private mobile bank-sync endpoints or a public-client OAuth flow.
- [Chrome cross-origin network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests):
  extension contexts need appropriate host permissions; content scripts follow
  different cross-origin restrictions. A browser-compatible SDK does not itself
  grant permission or change CORS policy.
- [TypeScript library compiler options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html):
  library emission must remain valid for the consumer runtime, including Node ESM
  relative imports. Retrieved through Context7 and checked on the official site.
- [TypeScript module reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html):
  package entry points and declaration resolution. Context7 provided the guidance
  about types conditions and matching emitted module formats.

Numeric representation, contracts, fixture ownership and stage sequencing are
project design decisions. Runtime/dependency exact version selection, parser
choice, npm name availability and publication authentication remain explicit S1/S8
checks; they were not verified by this documentation-only task.
