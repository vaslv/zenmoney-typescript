import assert from 'node:assert/strict';
import {test} from 'node:test';
import {decodeJson as decode, encodeJson as encode, ResponseError, ValidationError} from '../../dist/index.js';
import {MAX_DEPTH} from '../../dist/codec.js';

test('nested decimals and large integers roundtrip without precision loss', () => {
  const raw = '{"a":1.00000000000000000001,"b":9007199254740993,"c":[-1e99999,1e-99999,42],"tag":null}';
  const data = decode(raw);
  assert.equal(data.a.toString(), '1.00000000000000000001');
  assert.equal(data.b, 9007199254740993n);
  assert.equal(data.c[2], 42);
  assert.equal(encode(data), raw);
  assert.equal(encode({v: 0.1 + 0.2}), '{"v":0.30000000000000004}');
  assert.throws(() => encode({v: Number.MAX_SAFE_INTEGER + 1}));
});
test('all duplicate keys are rejected, including equal, escaped and nested keys', () => {
  for (const raw of ['{"a":1,"a":1}', '{"a":1,"a":2}', '{"a":null,"\\u0061":null}',
    '{"outer":{"x":[],"x":[]}}', '{"__proto__":{},"__proto__":{}}', '{"a":[{},{}],"a":2}']) {
    assert.throws(() => decode(raw), ResponseError);
  }
  assert.equal(encode(decode('{"a":{"a":1},"b":{"a":1}}')), '{"a":{"a":1},"b":{"a":1}}');
});
test('prototype keys stay inert and remain serializable data', () => {
  const data = decode('{"__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}}}');
  assert.equal(Object.getPrototypeOf(data), Object.prototype);
  assert.equal(Object.hasOwn(data, '__proto__'), true);
  assert.equal({}.polluted, undefined);
  assert.equal(encode(data), '{"__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}}}');
});
test('null, absent and empty values remain distinct', () => {
  const data = decode('{"null":null,"array":[],"zero":0}');
  assert.equal(Object.hasOwn(data, 'missing'), false);
  assert.equal(data.null, null);
  assert.deepEqual(data.array, []);
  assert.equal(encode(data), '{"null":null,"array":[],"zero":0}');
});
test('invalid syntax and nonfinite numeric tokens are rejected', () => {
  for (const raw of ['NaN', 'Infinity', '{"a":01}', '[1,]', '{"a":}', '{"a":"x}', '{"a":undefined}', '1 2']) {
    assert.throws(() => decode(raw));
  }
});
test('unsupported caller objects cannot invoke coercion or custom accessors', () => {
  const cycle = {}; cycle.x = cycle;
  const extended = []; extended.extra = 1;
  const hiddenHole = Array(1); hiddenHole.extra = 1;
  const getter = Object.defineProperty({}, 'x', {enumerable: true, get() { throw new Error('Getter invoked'); }});
  for (const value of [undefined, Symbol('x'), () => {}, NaN, Infinity, new Date(), cycle, getter, extended, hiddenHole,
    {x: undefined}, [undefined], Array(2), {[Symbol('x')]: 1}]) assert.throws(() => encode(value));
});
test('nesting and numeric limits reject before recursive parse/encode', () => {
  assert.doesNotThrow(() => decode('['.repeat(MAX_DEPTH) + '0' + ']'.repeat(MAX_DEPTH)));
  assert.throws(() => decode('['.repeat(MAX_DEPTH + 1) + '0' + ']'.repeat(MAX_DEPTH + 1)), ResponseError);
  assert.throws(() => decode('1'.repeat(4097)), ResponseError);
  assert.throws(() => encode(10n ** 4096n), ValidationError);
});
test('punctuation and escapes inside strings do not affect preflight structure', () => {
  const data = {a: '{"a":1,"a":1}', b: ['[]{}', '\\"', 'e1234'], '"': 1};
  assert.equal(encode(decode(JSON.stringify(data))), JSON.stringify(data));
});
test('decoded Unicode must be safe for a lossless JSON roundtrip', () => {
  for(const raw of ['"\\ud800"','"\\udc00"','{"future":"\\ud800"}',
    '{"\\udc00":1}','{"nested":[{"future":"\\ud800"}]}']) {
    assert.throws(() => decode(raw), ResponseError);
    assert.throws(() => decode(new TextEncoder().encode(raw)), ResponseError);
  }
  for(const raw of ['"\\ud83d\\ude00"','{"\\ud83d\\ude00":"\\ud83d\\ude00"}',
    '{"future":"\\\\ud800"}']) assert.equal(encode(decode(raw)), JSON.stringify(JSON.parse(raw)));
});
