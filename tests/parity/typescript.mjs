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
  try {
    let result;
    switch(c.operation) {
      case 'codec.decode':result=sdk.decodeJson(a.bodyBase64 ? Uint8Array.from(Buffer.from(a.bodyBase64,'base64')) : a.raw);break;
      case 'codec.encode':result=sdk.decodeJson(sdk.encodeJson(a.value));break;
      case 'protocol.entityKey':result=sdk.entityKey(a.kind,a.entity);break;
      case 'protocol.decodeDiff':result=protocol.decodeDiff(a.raw,a.cursor);break;
      default:throw new Error('Required TypeScript operation not implemented: '+c.operation);
    }
    row.result=encode(result);
  } catch(error) {
    if(!(error instanceof sdk.ZenMoneyError))throw error;
    row.error=error.category;
    if(error instanceof sdk.HTTPError)row.statusCode=error.statusCode;
  }
  results.push(row);
}
compare(cases,results,'typescript');
console.log(`TypeScript stage ${manifest.stage}: ${cases.length} shared vectors passed against independent expectations.`);
