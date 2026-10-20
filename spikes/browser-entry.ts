import {decimal} from '../src/index.js';
import {decodeCandidate, encodeCandidate} from './codec.js';
import {boundedFetch} from './transport.js';
export {boundedFetch};
export function precisionProbe(): string {
  const decoded = decodeCandidate('{"amount":1.00000000000000000001,"id":9007199254740993}');
  if (!decimal('1.00').equals(decimal('1e0'))) throw new Error('Exact comparison failed');
  return encodeCandidate(decoded);
}

import {ZenMoneyClient} from '../src/client.js';
export async function sdkProbe(url:string):Promise<string> {
  const client=new ZenMoneyClient({token:'TEST_BEARER_NOT_A_SECRET',fetch:(_url,init)=>fetch(url,init)});
  try {return (await client.readDiff()).rawJson;} finally {client.close();}
}
