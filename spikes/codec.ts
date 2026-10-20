/** S1 feasibility implementation; not a public protocol codec. */
import {parse, stringify} from 'lossless-json';
import {ExactDecimal, decimal, MAX_NUMBER_LENGTH} from '../src/numbers.js';

export const MAX_DEPTH = 128;

// The dependency remains the grammar parser. This bounded lexical preflight also
// rejects equal duplicate keys, which its default duplicate handler accepts.
function preflight(text: string): void {
  const stack: {object: boolean; key: boolean; seen: Set<string>}[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      const start = i++;
      for (; i < text.length; i++) {
        if (text[i] === '\\') { i++; continue; }
        if (text[i] === '"') break;
      }
      const context = stack.at(-1);
      if (context?.object && context.key) {
        const key: unknown = JSON.parse(text.slice(start, i + 1));
        if (typeof key !== 'string' || context.seen.has(key)) throw new TypeError('Duplicate JSON key');
        context.seen.add(key);
        context.key = false;
      }
    } else if (ch === '{' || ch === '[') {
      if (stack.length >= MAX_DEPTH) throw new TypeError('JSON nesting exceeds limit');
      stack.push({object: ch === '{', key: ch === '{', seen: new Set()});
    } else if (ch === '}' || ch === ']') stack.pop();
    else if (ch === ',' && stack.at(-1)?.object) stack.at(-1)!.key = true;
    else if (ch === '-' || (ch !== undefined && ch >= '0' && ch <= '9')) {
      const start = i;
      while (i + 1 < text.length && /[\deE+.-]/.test(text[i + 1]!)) i++;
      if (i - start + 1 > MAX_NUMBER_LENGTH) throw new TypeError('JSON number exceeds limit');
    }
  }
}

export function decodeCandidate(text: string): unknown {
  preflight(text);
  return parse(text, undefined, {
    parseNumber: token => {
      if (/[.eE]/.test(token)) return decimal(token);
      const integer = BigInt(token);
      return integer >= BigInt(Number.MIN_SAFE_INTEGER) && integer <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(integer) : integer;
    },
    onDuplicateKey: () => { throw new TypeError('Duplicate JSON key'); },
  });
}

function validate(value: unknown, seen = new Set<object>(), depth = 0): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (value instanceof ExactDecimal) {
    if (Object.getPrototypeOf(value) !== ExactDecimal.prototype) throw new TypeError('Unsupported decimal subclass');
    return;
  }
  if (typeof value === 'bigint') {
    if (value.toString().length > MAX_NUMBER_LENGTH) throw new TypeError('JSON number exceeds limit');
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
      throw new TypeError('Expected a finite number with no unsafe integer conversion');
    }
    return;
  }
  if (typeof value !== 'object' || !value ||
      (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new TypeError('Unsupported JSON value');
  }
  if (depth >= MAX_DEPTH || seen.has(value)) throw new TypeError('Cyclic or excessive JSON nesting');
  seen.add(value);
  try {
    for (const key of Reflect.ownKeys(value)) {
      if (Array.isArray(value) && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor)) {
        throw new TypeError('Unsupported JSON property');
      }
      validate(descriptor.value, seen, depth + 1);
    }
    if (Array.isArray(value) && (Object.keys(value).length !== value.length ||
        Object.keys(value).some((key, index) => key !== String(index)))) throw new TypeError('Sparse or extended JSON array');
  } finally { seen.delete(value); }
}

export function encodeCandidate(value: unknown): string {
  validate(value);
  const result = stringify(value, undefined, undefined, [{
    test: item => item instanceof ExactDecimal,
    stringify: item => (item as ExactDecimal).toString(),
  }]);
  if (result === undefined) throw new TypeError('Unsupported JSON value');
  return result;
}
