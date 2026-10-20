# ADR 002: exact numeric primitive and lossless JSON candidate

Status: Accepted S1 feasibility result, 2026-10-20. Protocol integration is S3.

## Selection

Use lossless-json 4.3.2 behind an SDK-owned ExactDecimal value and codec interface.
The dependency is MIT licensed, has no runtime dependencies, supports custom numeric
parsing/stringification, and keeps __proto__ as an inert own property. Native
JSON.parse/JSON.stringify cannot meet the arbitrary precision contract. No new
arithmetic library is needed: the SDK does not perform currency math.

The library's duplicate handler rejects differing values but accepts equal duplicate
values before invoking the callback. Python rejects both. A small lexical preflight
therefore detects repeated decoded object keys before the library parses grammar.
It tracks quoted strings, escapes, container depth and numeric token length; it
never rewrites JSON and does not replace the dependency's grammar parser. Keep its
independent edge-case tests when implementing the production codec.

## Frozen number contract

- decimal(string) accepts a finite JSON number token and preserves its spelling.
- ExactDecimal is immutable and provides toString, equals and compare. It compares
  sign/coefficient/BigInt exponent without expanding huge exponent ranges.
- Number coercion and native JSON serialization throw; lossless serialization emits
  unquoted numeric tokens, never numeric strings.
- Decimal/exponent wire tokens become ExactDecimal; safe integer tokens become
  number and larger integer tokens become bigint. Unknown nested fields follow the
  same rule. Native JS finite fractional numbers retain their already existing
  shortest decimal value; unsafe integer numbers are rejected.
- Preserve null, missing and empty collections; no implicit rounding or epsilon.
- Reject nonfinite input, cycles, custom prototypes, accessors, symbols, undefined,
  sparse/extended arrays and invalid grammar. Do not run arbitrary toJSON hooks.

The public S1 package exports only ExactDecimal, decimal and MAX_NUMBER_LENGTH.
spikes/codec.ts and spikes/transport.ts are test-only prototypes and are not exported
or packed. Production error categories, complete protocol validation, the public
encodeJson/decodeJson and HTTP client remain later stages. TypeError in the primitive
must be incorporated into the S3 ValidationError policy before publication.

## Resource limits and explicit difference from Python

Maximum numeric token length: 4096 characters, including sign/fraction/exponent.
Maximum JSON container nesting: 128. Both are enforced before recursive parsing;
encoding uses the same depth limit and validates bigint token length. Exponents
are not expanded, and negative zero is mathematically equal to zero. These limits
are additional resource bounds compared with the Python SDK's interpreter limits;
record them in parity.md and runtime contract cases. Values over a limit must fail,
never be truncated, rounded or coerced to strings.

The S1 bundled codec prototype is 25,078 bytes, 6,394 bytes gzip before later protocol
code (esbuild, unminified bundle). This is a measurement, not a permanent bundle-size
promise; rerun scripts/build-spikes.mjs and measure its output after changes.

## Verified evidence

Node 22/24: nested long decimals, >2^53 integers, huge exponents, negative zero,
200 seeded comparison cases, duplicate equal/different/escaped keys, prototype keys,
malformed JSON, immutable values, unsupported input objects and boundary limits.
Browser/MV3: exact decimal/integer parsing and unquoted roundtrip on Chrome 120 and
current Chromium. Raw UTF-8 rejection and streamed response bounds are checked in
the transport prototype. Shared Python/TypeScript protocol parity remains S2 onward.
