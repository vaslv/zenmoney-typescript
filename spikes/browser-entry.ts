import {decimal} from '../src/index.js';
import {decodeCandidate, encodeCandidate} from './codec.js';
import {boundedFetch} from './transport.js';
export {boundedFetch};
export function precisionProbe(): string {
  const decoded = decodeCandidate('{"amount":1.00000000000000000001,"id":9007199254740993}');
  if (!decimal('1.00').equals(decimal('1e0'))) throw new Error('Exact comparison failed');
  return encodeCandidate(decoded);
}

import {ZenMoneyClient,transactions,decimal as exact,decodeJson,type Transaction} from 'zenmoney-typescript';
export async function sdkProbe(url:string):Promise<string> {
  const client=new ZenMoneyClient({token:'TEST_BEARER_NOT_A_SECRET',fetch:(_url,init)=>fetch(url,init)});
  try {
    await client.readDiff();
    const item=transactions.expense({user:1,date:'2026-01-15',account:'a',instrument:1,amount:exact('1.00000000000000000001'),id:'synthetic-browser',now:1,viewed:false});
    const write=await client.upsert('transaction',[item]);
    const echoed=decodeJson(write.data.wire as string) as {transaction:{outcome:{toString():string};viewed:boolean}[]};
    if(echoed.transaction[0]?.outcome.toString()!=='1.00000000000000000001'||echoed.transaction[0]?.viewed!==false)throw new Error('Installed SDK changed financial data');
    const readback=await client.readDiff();
    const saved=(readback.data.transaction as Transaction[]).find(t=>t.id===item.id);
    if(saved?.outcome?.toString()!=='1.00000000000000000001'||saved?.viewed!==false)throw new Error('Installed SDK readback failed');
    return readback.rawJson;
  } finally {client.close();}
}
export async function sdkRejectedProbe(url:string):Promise<boolean> {
  let calls=0;
  const client=new ZenMoneyClient({token:'TEST_BEARER_NOT_A_SECRET',fetch:(_url,init)=>{calls++;return fetch(url,init);}});
  try{await client.readDiff();return false;}
  catch(error){return typeof error==='object'&&error!==null&&'category' in error&&error.category==='transport'&&calls===1;}
  finally{client.close();}
}
