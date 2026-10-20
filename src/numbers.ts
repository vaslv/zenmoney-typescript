import {ValidationError} from './errors.js';
/** An exact JSON decimal token; arithmetic and currency rounding are caller policy. */
const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
export const MAX_NUMBER_LENGTH = 4096;

type Parts = {sign: -1 | 0 | 1; digits: string; exponent: bigint};

function parts(value: string): Parts {
  const [mantissa = '', exponent = '0'] = value.toLowerCase().split('e');
  const unsigned = mantissa.replace(/^-/, '');
  const fraction = unsigned.includes('.') ? unsigned.length - unsigned.indexOf('.') - 1 : 0;
  const coefficient = unsigned.replace('.', '').replace(/^0+/, '');
  if (!coefficient) return {sign: 0, digits: '0', exponent: 0n};
  const digits = coefficient.replace(/0+$/, '');
  return {sign: value.startsWith('-') ? -1 : 1, digits,
    exponent: BigInt(exponent) - BigInt(fraction) + BigInt(coefficient.length - digits.length)};
}

export class ExactDecimal {
  readonly #lexeme: string;
  readonly #parts: Parts;

  constructor(value: string) {
    if (typeof value !== 'string' || value.trim() !== value || value.length > MAX_NUMBER_LENGTH || !JSON_NUMBER.test(value)) {
      throw new ValidationError('invalid_decimal');
    }
    this.#lexeme = value;
    this.#parts = Object.freeze(parts(value));
    Object.freeze(this);
  }

  toString(): string { return this.#lexeme; }

  /** Compare without expanding exponents or converting through floating point. */
  compare(other: ExactDecimal): -1 | 0 | 1 {
    const a = this.#parts;
    const b = other.#parts;
    if (a.sign !== b.sign) return a.sign < b.sign ? -1 : 1;
    if (a.sign === 0) return 0;
    const orderA = BigInt(a.digits.length) + a.exponent;
    const orderB = BigInt(b.digits.length) + b.exponent;
    let result: -1 | 0 | 1;
    if (orderA !== orderB) result = orderA < orderB ? -1 : 1;
    else {
      const length = Math.max(a.digits.length, b.digits.length);
      const left = a.digits.padEnd(length, '0');
      const right = b.digits.padEnd(length, '0');
      result = left === right ? 0 : left < right ? -1 : 1;
    }
    return a.sign < 0 ? result === 0 ? 0 : result === 1 ? -1 : 1 : result;
  }

  equals(other: ExactDecimal): boolean { return this.compare(other) === 0; }

  valueOf(): never { throw new ValidationError('implicit_decimal_coercion'); }

  toJSON(): never { throw new ValidationError('use_lossless_encoder'); }
}

export function decimal(value: string): ExactDecimal { return new ExactDecimal(value); }
