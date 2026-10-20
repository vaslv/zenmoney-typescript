import * as sdk from '../../dist/index.js';
import * as protocol from '../../dist/protocol.js';
import {loadCases,compare} from './common.mjs';
import {readFileSync} from 'node:fs';

function decode(node) {
  switch(node.type) {
    case 'null':return null;
    case 'boolean': case 'string':return node.value;
    case 'number':return sdk.decodeJson(node.lexeme);
    case 'array':return node.items.map(decode);
    case 'object':return Object.fromEntries(node.entries.map(([k,v])=>[k,decode(v)]));
    default:throw new Error('Invalid fixture tag');
  }
}
function encode(value) {
  if(value===null)return {type:'null'};
  if(typeof value==='string' || typeof value==='boolean')return {type:typeof value,value};
  if(typeof value==='number' || typeof value==='bigint' || value instanceof sdk.ExactDecimal)return {type:'number',lexeme:String(value)};
  if(Array.isArray(value))return {type:'array',items:value.map(encode)};
  return {type:'object',entries:Object.entries(value).map(([k,v])=>[k,encode(v)])};
}
const manifest=JSON.parse(readFileSync('contracts/manifest.json','utf8'));
const cases=loadCases().filter(c=>c.stage<=manifest.stage);
const results=[];
for(const c of cases) {
  const a=decode(c.input);
  const row={caseId:c.id,runtime:'typescript',featureIds:c.featureIds,status:'completed',requests:encode([])};
  let client;
  try {
    const requests=[];let eventIndex=0;
    const fetch=async(url,options)=>{
      const contentType=options.headers['Content-Type'];
      const body=contentType.includes('form-urlencoded') ? [...new URLSearchParams(options.body)].sort() : sdk.decodeJson(options.body);
      requests.push({method:options.method,url,headers:{'content-type':contentType,...(options.headers.Authorization?{authorization:options.headers.Authorization}:{})},body});
      row.requests=encode(requests);
      const event=c.events[eventIndex++];if(!event)throw new Error('Unexpected extra request');
      if(event.disconnect)throw new Error('Synthetic disconnect');
      const responseBody=event.bodyBase64?Buffer.from(event.bodyBase64,'base64'):event.body;
      return new Response(responseBody.length===0?null:responseBody,{status:event.status});
    };
    if(c.operation.startsWith('client.'))client=new sdk.ZenMoneyClient({token:'TEST_BEARER_NOT_A_SECRET',fetch,clock:()=>c.clock,...(a.config??{})});
    let result;
    switch(c.operation) {
      case 'codec.decode':result=sdk.decodeJson(a.bodyBase64 ? Uint8Array.from(Buffer.from(a.bodyBase64,'base64')) : a.raw);break;
      case 'codec.encode':result=sdk.decodeJson(sdk.encodeJson(a.value));break;
      case 'protocol.entityKey':result=sdk.entityKey(a.kind,a.entity);break;
      case 'protocol.decodeDiff':result=protocol.decodeDiff(a.raw,a.cursor);break;
      default:
        if(c.operation==='transactions.update')result=sdk.transactions.update(a.entity,a.fields,{now:a.now});
        else if(c.operation==='transactions.clearBudget')result=sdk.transactions.clearBudget(a.budget,{now:a.now});
        else if(c.operation==='transactions.deletion')result=sdk.transactions.deletion(a.kind,a.id,{user:a.user,now:a.now});
        else if(c.operation.startsWith('transactions.'))result=sdk.transactions[c.operation.split('.')[1]](a);
        else if(c.operation.startsWith('entities.'))result=sdk.entities[c.operation.split('.')[1]](a);
        else if(c.operation==='client.closed'){client.close();result=await client.readDiff();}
        else if(c.operation==='client.upsert')result=await client.upsert(a.kind,a.entities,{serverTimestamp:a.serverTimestamp});
        else if(c.operation==='client.delete')result=await client.delete(a.deletions,{serverTimestamp:a.serverTimestamp});
        else if(c.operation==='client.suggest')result=await client.suggest(a.transactions);
        else if(c.operation.startsWith('client.')){const {config,...options}=a;void config;result=await client[c.operation.split('.')[1]](options);}
        else throw new Error('Required TypeScript operation not implemented: '+c.operation);
    }
    if(c.operation.startsWith('client.') && c.operation!=='client.suggest')result=result.data;
    row.result=encode(result);
  } catch(error) {
    if(!(error instanceof sdk.ZenMoneyError))throw error;
    row.error=error.category;
    if(error instanceof sdk.HTTPError)row.statusCode=error.statusCode;
  }
  client?.close();
  results.push(row);
}
compare(cases,results,'typescript');
console.log(`TypeScript stage ${manifest.stage}: ${cases.length} shared vectors passed against independent expectations.`);
