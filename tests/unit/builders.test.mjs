import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transactions as t,entities as e,decimal,ValidationError,encodeJson,entityKey} from '../../dist/index.js';
const common={user:1,date:'2026-01-15',id:'x',now:1};
const options={...common,account:'a',instrument:1,amount:decimal('1.01')};
test('full transaction and catalog defaults preserve explicit flags and extensions',()=>{
  const item=t.expense({...options,categories:[],viewed:false,hold:null,opIncome:decimal('2.01'),opIncomeInstrument:2,latitude:decimal('-1.2')});
  assert.equal(item.viewed,false);assert.equal(item.hold,null);assert.deepEqual(item.tag,[]);
  assert.equal(item.opIncome.toString(),'2.01');assert.equal(item.latitude.toString(),'-1.2');
  const account=e.account({user:1,title:'Synthetic',id:'a',now:1,instrument:1,fields:JSON.parse('{"future":{"__proto__":{"safe":true}}}')});
  assert.equal(Object.hasOwn(account.future,'__proto__'),true);assert.equal({}.safe,undefined);
  assert.equal(e.tag({user:1,title:'Synthetic',id:'tag',now:1}).archive,false);
  assert.equal(e.merchant({user:1,title:'Synthetic',id:'payee',now:1}).mcc,null);
});
test('builders copy inputs, protect identities and reject silent option loss',()=>{
  const categories=['tag'];const original=t.expense({...options,categories});
  original.tag.push('other');assert.deepEqual(categories,['tag']);
  assert.throws(()=>t.expense({...options,incomeAccount:'unwanted'}),ValidationError);
  assert.throws(()=>e.account({user:1,title:'x',instrument:1,private:true}),ValidationError);
  assert.throws(()=>e.account({user:1,title:'x',instrument:1,fields:{id:'bad'}}),ValidationError);
  assert.throws(()=>t.update(null,{}),ValidationError);assert.throws(()=>t.update({},null),ValidationError);
  assert.throws(()=>e.tag({user:1,title:'x',fields:null}),ValidationError);
  assert.throws(()=>t.update({id:'a'},{id:'b'}),ValidationError);
  assert.equal(t.update({id:'a',future:{n:decimal('0.001')}},{comment:'new'},{now:2}).future.n.toString(),'0.001');
});
test('generic updates preserve only explicit identity fields, so budget keys need caller care',()=>{
  const budget={user:1,date:'2026-10-01',tag:'food',changed:1,income:0,outcome:100};
  const changed=t.update(budget,{outcome:200},{now:2});
  assert.equal(entityKey('budget',changed),entityKey('budget',budget));
  assert.equal(budget.outcome,100);assert.equal(changed.outcome,200);
  const moved=t.update(budget,{date:'2026-11-01',tag:'travel'},{now:2});
  assert.notEqual(entityKey('budget',moved),entityKey('budget',budget));
  assert.equal(t.update({id:'transaction',date:'2026-10-01'},{date:'2026-11-01'},{now:2}).date,'2026-11-01');
});
test('dates, amounts, paired fields and debt counterparties are validated before use',()=>{
  for(const date of ['0000-01-01','2025-02-29','2026-02-30','2026-13-01','2026-01-15\n','2026-01-15\r','2026-01-15\u2028'])assert.throws(()=>t.expense({...options,date}),ValidationError);
  assert.equal(t.expense({...options,date:'2024-02-29'}).date,'2024-02-29');
  for(const extra of [{amount:0},{amount:-1},{viewed:null},{mcc:-1},{longitude:181},{opIncome:1}])assert.throws(()=>t.expense({...options,...extra}),ValidationError);
  assert.throws(()=>t.debt({...options,action:'lend',debtAccount:'d',payee:' '}),ValidationError);
  assert.throws(()=>t.transfer({...common,fromAccount:'a',toAccount:'a',fromInstrument:1,toInstrument:1,amountOut:1,amountIn:1}),ValidationError);
});
test('loan parameters and deterministic drafts remain explicit',()=>{
  assert.throws(()=>e.account({user:1,title:'Loan',instrument:1,accountType:'loan'}),ValidationError);
  const loan=e.account({user:1,title:'Loan',instrument:1,accountType:'loan',id:'a',now:1,
    fields:{capitalization:false,percent:decimal('1.5'),startDate:'2026-01-01',endDateOffset:12,endDateOffsetInterval:'month'}});
  assert.equal(loan.type,'loan');assert.equal(loan.percent.toString(),'1.5');
  assert.equal(encodeJson(t.expense(options)),encodeJson(t.expense(options)));
});
test('account extension fields cannot replace validated type or instrument',()=>{
  const common={user:1,title:'Synthetic',instrument:1,id:'a',now:1};
  for(const fields of [{type:'loan'},{type:'debt'},{instrument:0}])
    assert.throws(()=>e.account({...common,fields}),ValidationError);
  assert.throws(()=>e.account({...common,accountType:'debt'}),ValidationError);
  assert.throws(()=>e.account({...common,accountType:'deposit'}),ValidationError);
  const deposit=e.account({...common,accountType:'deposit',fields:{capitalization:false,percent:decimal('1.5'),
    startDate:'2026-01-01',endDateOffset:12,endDateOffsetInterval:'month',future:'retained'}});
  assert.equal(deposit.type,'deposit');assert.equal(deposit.instrument,1);assert.equal(deposit.future,'retained');
  assert.equal(e.account({...common}).type,'cash');
});

test('all option bags reject unused keys and helper exports stay intentional',()=>{
  assert.throws(()=>e.tag({user:1,title:'x',instrument:7}),ValidationError);
  assert.throws(()=>e.merchant({user:1,title:'x',accountType:'loan'}),ValidationError);
  assert.throws(()=>t.update({}, {}, {now:1,unexpected:true}),ValidationError);
  assert.throws(()=>t.deletion('account','a',{user:1,now:1,unexpected:true}),ValidationError);
  assert.throws(()=>t.clearBudget({}, {now:1,unexpected:true}),ValidationError);
  assert.equal('newId' in t,false);assert.equal('currentTimestamp' in t,false);
});
test('builders reject decimal user, instrument and timestamp IDs regardless of spelling',()=>{
  for(const lexeme of ['1','1.0','1e0']) {
    const value=decimal(lexeme);
    assert.throws(()=>t.expense({...options,user:value}),ValidationError);
    assert.throws(()=>t.expense({...options,instrument:value}),ValidationError);
    assert.throws(()=>t.expense({...options,now:value}),ValidationError);
    assert.throws(()=>t.expense({...options,mcc:value}),ValidationError);
    assert.throws(()=>e.account({user:1,title:'x',instrument:value}),ValidationError);
  }
  const values={...options,categories:['tag'],amount:decimal('1.0')};
  const input=t.expense(values);
  assert.equal(input.outcome.toString(),'1.0');assert.deepEqual(input.tag,['tag']);
  assert.equal(values.categories.length,1);
});
