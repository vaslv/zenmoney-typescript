import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ExactDecimal, decimal, MAX_NUMBER_LENGTH, ValidationError} from '../../dist/index.js';

test('exact numeric values compare without Number coercion', () => {
  for (const [a, b, expected] of [['1.00', '1e0', 0], ['-0', '0e20000', 0], ['0.001', '1e-3', 0],
    ['1.00000000000000000001', '1', 1], ['9007199254740993', '9007199254740992', 1],
    ['-9.2', '-9.19', -1], ['1e9007199254740993', '1e9007199254740992', 1], ['1e-99999', '0', 1],
    ['1.234', '1.24', -1], ['99', '1e2', -1], ['-1', '0', -1]]) {
    assert.equal(decimal(a).compare(decimal(b)), expected, `${a} vs ${b}`);
    assert.equal(decimal(a).equals(decimal(b)), expected === 0);
  }
});
test('invalid tokens and oversized lexemes cannot enter ExactDecimal', () => {
  for (const value of ['', 'NaN', 'Infinity', ' 1', '1 ', '1\n', '1\r\n', '0\u2028', '+1', '01', '.1', '1.', '1,2', '--1', '1e', 1, null]) {
    assert.throws(() => decimal(value), ValidationError);
  }
  assert.equal(decimal('1'.repeat(MAX_NUMBER_LENGTH)).toString().length, MAX_NUMBER_LENGTH);
  assert.throws(() => decimal('1'.repeat(MAX_NUMBER_LENGTH + 1)));
});
test('values are immutable and accidental lossy serialization is refused', () => {
  const value = new ExactDecimal('1.00000000000000000001');
  assert(Object.isFrozen(value));
  assert.throws(() => { value.extra = 2; });
  assert.throws(() => Number(value), ValidationError);
  assert.throws(() => JSON.stringify({value}), ValidationError);
  assert.equal(value.toString(), '1.00000000000000000001');
});
test('seeded exact coefficients survive exponent normalization', () => {
  let seed = 12479;
  for (let i = 0; i < 200; i++) {
    seed = (seed * 48271) % 2147483647;
    const sign = seed % 2 ? '-' : '';
    const digits = String(seed);
    const exponent = (seed % 500) - 250;
    assert(decimal(`${sign}${digits}00e${exponent - 2}`).equals(decimal(`${sign}${digits}e${exponent}`)));
  }
});
