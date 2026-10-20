import {readFileSync} from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadCases,compare,canonical,normalizeNumber} from '../parity/common.mjs';

test('schema, fixture hashes and canonical number comparison are validated', () => {
  const cases=loadCases(); assert(cases.length>=80);
  assert.equal(normalizeNumber('1.000e10000000000000000'),'1e10000000000000000');
  assert.deepEqual(canonical({type:'number',lexeme:'-0e123'}),{type:'number',lexeme:'0'});
});
test('comparator rejects independent wrong results and incomplete runners', () => {
  const c={id:'control',expect:{requests:{type:'array',items:[]},result:{type:'object',entries:[['amount',{type:'number',lexeme:'1'}],['from',{type:'string',value:'a'}],['to',{type:'string',value:'b'}],['viewed',{type:'boolean',value:false}],['future',{type:'null'}]]}}};
  const good={caseId:'control',runtime:'control',status:'completed',requests:c.expect.requests,result:c.expect.result};
  assert.doesNotThrow(()=>compare([c],[good],'control'));
  for (const mutate of [r=>r.result.entries[0][1].lexeme='2',r=>r.result.entries[1][1].value='b',r=>r.result.entries.pop(),r=>r.result.entries[3][1].value=true,r=>r.requests.items.push({type:'null'})]) {
    const bad=structuredClone(good); mutate(bad); assert.throws(()=>compare([c],[bad],'control'));
  }
  assert.throws(()=>compare([c],[],'control'));
  assert.throws(()=>compare([c],[good,good],'control'));
});

test('form duplicates and wrong HTTP status are observable mismatches', () => {
  const request={type:'array',items:[{type:'array',items:[{type:'string',value:'grant_type'},{type:'string',value:'refresh_token'}]}]};
  const c={id:'form',expect:{requests:request,error:'http',statusCode:500}};
  const result={caseId:'form',runtime:'test',status:'completed',requests:request,error:'http',statusCode:500};
  compare([c],[result],'test');
  assert.throws(()=>compare([c],[{...result,statusCode:400}],'test'));
  const duplicate=structuredClone(result);duplicate.requests.items.push(duplicate.requests.items[0]);
  assert.throws(()=>compare([c],[duplicate],'test'));
});

test('fixture schema rejects unknown operations and malformed tagged values', () => {
  const validator=new Ajv2020({strict:true}).compile(JSON.parse(readFileSync('contracts/v1/schema.json','utf8')));
  const good=loadCases()[0];
  assert(validator(good));
  for (const mutate of [c=>c.operation='codec.silentlyUnknown',c=>c.input={type:'number',lexeme:'NaN'},c=>c.expect.extra=true,c=>delete c.expect.requests]) {
    const bad=structuredClone(good);mutate(bad);assert.equal(validator(bad),false);
  }
});
