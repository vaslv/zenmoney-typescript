import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as sdk from '../../dist/index.js';
import {diffPayload,decodeDiff,decodeSuggestion,suggestPayload} from '../../dist/protocol.js';

test('public codec preserves unknown data, rejects unsafe types and sanitizes errors', () => {
  const raw='{"unknown":{"__proto__":{"x":1},"v":1.000000000000000000001},"i":9007199254740993}';
  const data=sdk.decodeJson(raw);
  assert.equal(sdk.encodeJson(data),raw);
  assert.equal({}.x,undefined);
  for(const value of [undefined,NaN,Infinity,()=>{},Symbol('x'),{a:undefined},new Date(), '\ud800']) {
    assert.throws(()=>sdk.encodeJson(value),sdk.ValidationError);
  }
  for(const raw of ['{"SECRET":1,"SECRET":2}',new Uint8Array([0xc3,0x28]),'NaN']) {
    try { sdk.decodeJson(raw);assert.fail('Accepted malformed JSON'); }
    catch(error) {assert(error instanceof sdk.ResponseError);assert(!JSON.stringify(error).includes('SECRET'));assert(!error.stack.includes('SECRET'));}
  }
});
test('diff validates identity, composite budgets, duplicates and deletion conflicts', () => {
  const entity={id:'x',user:1,changed:1,unknown:{v:sdk.decimal('1.01')}};
  const result=diffPayload({changes:{account:[entity]}},2);
  result.account[0].unknown.v='changed';
  assert.equal(entity.unknown.v.toString(),'1.01');
  for(const options of [{serverTimestamp:null},{serverTimestamp:true},{changes:{user:[entity]}},{changes:{account:[entity,entity]}},
    {deletions:[{object:'budget',id:'x',user:1,stamp:1}]},{changes:{account:[entity]},deletions:[{object:'account',id:'x',user:1,stamp:1}]}]) {
    assert.throws(()=>diffPayload(options,2),sdk.ValidationError);
  }
  assert.deepEqual(diffPayload({forceFetch:['account','account','tag']},2).forceFetch,['account','tag']);
  assert.throws(()=>diffPayload({forceFetch:['country']},2));
});
test('mixed batches index conflicts by kind without changing identity rules',()=>{
  const changes=Array.from({length:1000},(_,i)=>({id:'write-'+i,user:1,changed:1}));
  const deletions=Array.from({length:1000},(_,i)=>({object:'transaction',id:'delete-'+i,user:1,stamp:1}));
  const payload=diffPayload({changes:{transaction:changes},deletions},2);
  assert.equal(payload.transaction.length,1000);assert.equal(payload.deletion.length,1000);
  assert.throws(()=>diffPayload({changes:{transaction:changes},deletions:[...deletions,{object:'transaction',id:'write-999',user:1,stamp:1}]},2),sdk.ValidationError);
  assert.throws(()=>diffPayload({changes:{transaction:changes},deletions:[deletions[0],deletions[0]]},2),sdk.ValidationError);
  assert.throws(()=>diffPayload({changes:{transaction:[changes[0],changes[0]]}},2),sdk.ValidationError);
  const different=diffPayload({changes:{account:[changes[0]]},deletions:[{object:'transaction',id:changes[0].id,user:1,stamp:1}]},2);
  assert.equal(different.account[0].id,different.deletion[0].id);
});
test('response identities and cursors remain exact and strict', () => {
  assert.equal(decodeDiff('{"serverTimestamp":9007199254740993}',0).serverTimestamp,9007199254740993n);
  for(const raw of ['{"serverTimestamp":1.0}','{"serverTimestamp":true}','{"serverTimestamp":1,"account":null}',
    '{"serverTimestamp":1,"transaction":[{"id":true}]}','{"serverTimestamp":1,"deletion":null}'])assert.throws(()=>decodeDiff(raw,0),sdk.ResponseError);
  assert.deepEqual(decodeDiff('{"serverTimestamp":1,"error":{}}',0).data.error,{});
});
test('suggest objects and arrays preserve shape, reject empty and malformed lists', () => {
  assert.throws(()=>suggestPayload([]),sdk.ValidationError);
  assert.throws(()=>decodeSuggestion('[]',[{}]),sdk.ResponseError);
  assert.throws(()=>decodeSuggestion('[{"error":"bad"}]',[{}]),sdk.ResponseError);
  assert.deepEqual(decodeSuggestion('{"future":1}',{}),{future:1});
});

test('exported rules are immutable and accessors cannot run during validation', () => {
  for(const list of [sdk.KINDS,sdk.WRITABLE,sdk.DELETABLE,sdk.FORCE_FETCH])assert.throws(()=>list.push('country'));
  let calls=0;
  const entity={id:'x',user:1,get changed(){calls++;throw new Error('TEST_SECRET_INPUT');}};
  assert.throws(()=>diffPayload({changes:{account:[entity]}},1),sdk.ValidationError);
  const options={get serverTimestamp(){calls++;throw new Error('TEST_SECRET_INPUT');}};
  assert.throws(()=>diffPayload(options,1),sdk.ValidationError);
  assert.equal(calls,0);
  class Custom extends Array {}
  assert.throws(()=>sdk.encodeJson(new Custom(1,2)),sdk.ValidationError);
});
test('integer boundaries reject decimal objects regardless of their spelling',()=>{
  for(const lexeme of ['1','1.0','1e0']) {
    const value=sdk.decimal(lexeme);
    assert.throws(()=>diffPayload({serverTimestamp:value},1),sdk.ValidationError);
    assert.throws(()=>diffPayload({changes:{budget:[{user:value,date:'2026-01-01',tag:null,changed:1}]}},1),sdk.ValidationError);
    assert.throws(()=>diffPayload({changes:{account:[{id:'a',user:value,changed:1}]}},1),sdk.ValidationError);
  }
  assert.equal(diffPayload({serverTimestamp:1n},2).serverTimestamp,1n);
  assert.equal(sdk.entityKey('budget',{user:1n,date:'2026-01-01',tag:null}),'[1,"2026-01-01",null]');
});
