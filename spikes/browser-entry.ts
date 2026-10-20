import {decimal} from '../src/index.js';
import {decodeCandidate, encodeCandidate} from './codec.js';
import {boundedFetch} from './transport.js';
export {boundedFetch};
export function precisionProbe(): string {
  const decoded = decodeCandidate('{"amount":1.00000000000000000001,"id":9007199254740993}');
  if (!decimal('1.00').equals(decimal('1e0'))) throw new Error('Exact comparison failed');
  return encodeCandidate(decoded);
}
