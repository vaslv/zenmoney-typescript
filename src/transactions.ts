import {currentTimestamp,newId} from './builder-utils.js';
import type {Integer,Numeric,JsonObject,Transaction,TransactionOptions as SharedOptions} from './models.js';
import {cloneJson,encodeJson} from './codec.js';
import {ExactDecimal,decimal} from './numbers.js';
import {ValidationError} from './errors.js';
import {jsonOptions,record,nonempty,positiveInteger,timestamp,DELETABLE,type DeletableKind} from './protocol.js';

type BaseOptions=Omit<SharedOptions,'id'|'now'> & {id?:string|null;now?:Integer|null};
export type TransactionOptions=BaseOptions & {incomeAccount:string;outcomeAccount:string;incomeInstrument:Integer;outcomeInstrument:Integer;income:Numeric;outcome:Numeric};
export type SimpleOptions=BaseOptions & {account:string;instrument:Integer;amount:Numeric};
export type TransferOptions=BaseOptions & {fromAccount:string;toAccount:string;fromInstrument:Integer;toInstrument:Integer;amountOut:Numeric;amountIn:Numeric};
export type DebtAction='lend'|'borrow'|'repay'|'collect';
export type DebtOptions=Omit<BaseOptions,'payee'> & {action:DebtAction;account:string;debtAccount:string;instrument:Integer;amount:Numeric;payee:string};

const nullableFields=['merchant','originalPayee','reminderMarker','opIncome','opIncomeInstrument','opOutcome','opOutcomeInstrument','latitude','longitude','qrCode','source','incomeBankID','outcomeBankID'] as const;
const optionalFields=[...nullableFields,'viewed','mcc','hold','deleted'] as const;
const baseKeys=['user','date','categories','payee','comment','merchant','id','now'] as const;
const coreKeys=['incomeAccount','outcomeAccount','incomeInstrument','outcomeInstrument','income','outcome'];

function numeric(value:unknown):ExactDecimal {
  if(value instanceof ExactDecimal)return value;
  if(typeof value==='bigint')return decimal(String(value));
  if(typeof value==='number' && Number.isFinite(value) && (!Number.isInteger(value)||Number.isSafeInteger(value)))return decimal(String(value));
  throw new ValidationError('invalid_amount');
}
function amount(value:unknown,positive=false):Numeric {
  const comparison=numeric(value).compare(decimal('0'));
  if(comparison<0 || positive && comparison===0)throw new ValidationError('invalid_amount');
  return value as Numeric;
}
function isoDate(value:unknown):string {
  if(typeof value!=='string' || value.length!==10 || !/^\d{4}-\d{2}-\d{2}$/.test(value))throw new ValidationError('invalid_date');
  const [year=0,month=0,day=0]=value.split('-').map(Number);
  const leap=year%4===0 && (year%100!==0 || year%400===0);
  const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(year<1||month<1||month>12||day<1||day>(days[month-1]??0))throw new ValidationError('invalid_date');
  return value;
}
function only(value:object,keys:readonly string[]):void {
  const allowed=new Set(keys);if(Object.keys(value).some(key=>!allowed.has(key)))throw new ValidationError('unsupported_option');
}
function optionalText(value:unknown):void {if(value!==null && typeof value!=='string')throw new ValidationError('invalid_text');}

export function transaction(options:TransactionOptions):Transaction {
  const a=jsonOptions(options);
  const input=a as unknown as JsonObject;
  const allowed=new Set<string>([...baseKeys,...coreKeys,...optionalFields]);
  if(Object.keys(a).some(k=>!allowed.has(k)))throw new ValidationError('unsupported_transaction_field');
  if(a.categories!==undefined && a.categories!==null && (!Array.isArray(a.categories)||a.categories.some(t=>typeof t!=='string'||!t)))throw new ValidationError('invalid_categories');
  const stamp=currentTimestamp(a.now);
  const result:JsonObject=Object.fromEntries(nullableFields.map(k=>[k,null]));
  Object.assign(result,{viewed:true,mcc:null,id:newId(a.id),created:stamp,changed:stamp,user:positiveInteger(a.user),deleted:false,hold:false,
    date:isoDate(a.date),incomeAccount:nonempty(a.incomeAccount),outcomeAccount:nonempty(a.outcomeAccount),
    incomeInstrument:positiveInteger(a.incomeInstrument),outcomeInstrument:positiveInteger(a.outcomeInstrument),
    income:amount(a.income),outcome:amount(a.outcome),tag:a.categories??null,payee:a.payee??null,comment:a.comment??null,merchant:a.merchant??null});
  for(const name of optionalFields)if(Object.hasOwn(input,name))result[name]=input[name];
  for(const name of ['payee','comment','merchant','originalPayee','reminderMarker','qrCode','source','incomeBankID','outcomeBankID'])optionalText(result[name]);
  for(const name of ['opIncome','opOutcome']) {
    if(result[name]!==null)amount(result[name]);
    if((result[name]===null)!==(result[name+'Instrument']===null))throw new ValidationError('unpaired_original_amount');
    if(result[name+'Instrument']!==null)positiveInteger(result[name+'Instrument']);
  }
  for(const [name,limit] of [['latitude','90'],['longitude','180']] as const)if(result[name]!==null) {
    const value=numeric(result[name]);
    if(value.compare(decimal('-'+limit))<0 || value.compare(decimal(limit))>0)throw new ValidationError('invalid_coordinate');
  }
  if(typeof result.deleted!=='boolean' || result.hold!==null && typeof result.hold!=='boolean' || typeof result.viewed!=='boolean')throw new ValidationError('invalid_flags');
  if(result.mcc!==null)timestamp(result.mcc);
  encodeJson(result);return result as Transaction;
}
export function expense(options:SimpleOptions):Transaction {
  const a=jsonOptions(options);only(a,[...baseKeys,...optionalFields,'account','instrument','amount']);
  const {account,instrument,amount:input,...rest}=a;
  return transaction({...rest,incomeAccount:account,outcomeAccount:account,incomeInstrument:instrument,outcomeInstrument:instrument,income:0,outcome:amount(input,true)});
}
export function income(options:SimpleOptions):Transaction {
  const a=jsonOptions(options);only(a,[...baseKeys,...optionalFields,'account','instrument','amount']);
  const {account,instrument,amount:input,...rest}=a;
  return transaction({...rest,incomeAccount:account,outcomeAccount:account,incomeInstrument:instrument,outcomeInstrument:instrument,income:amount(input,true),outcome:0});
}
export function transfer(options:TransferOptions):Transaction {
  const a=jsonOptions(options);only(a,[...baseKeys,...optionalFields,'fromAccount','toAccount','fromInstrument','toInstrument','amountOut','amountIn']);
  const {fromAccount,toAccount,fromInstrument,toInstrument,amountOut,amountIn,...rest}=a;
  if(fromAccount===toAccount)throw new ValidationError('same_transfer_account');
  return transaction({...rest,incomeAccount:toAccount,outcomeAccount:fromAccount,incomeInstrument:toInstrument,outcomeInstrument:fromInstrument,income:amount(amountIn,true),outcome:amount(amountOut,true)});
}
export function debt(options:DebtOptions):Transaction {
  const a=jsonOptions(options);only(a,[...baseKeys,...optionalFields,'action','account','debtAccount','instrument','amount']);
  const {action,account,debtAccount,instrument,amount:input,payee,...rest}=a;
  if(!['lend','borrow','repay','collect'].includes(action))throw new ValidationError('invalid_debt_action');
  if(typeof payee!=='string'||!payee.trim())throw new ValidationError('missing_counterparty');
  const outgoing=action==='lend'||action==='repay';
  return transfer({...rest,payee,fromAccount:outgoing?account:debtAccount,toAccount:outgoing?debtAccount:account,
    fromInstrument:instrument,toInstrument:instrument,amountOut:input,amountIn:input});
}
export function update<T extends JsonObject>(entity:T,fields:JsonObject,options:{now?:Integer|null}={}):T {
  const a=jsonOptions(options);only(a,['now']);
  const copied=cloneJson(entity);const changes=cloneJson(fields);
  if(!record(copied)||!record(changes))throw new ValidationError('invalid_update');
  if(['id','user','created','changed'].some(k=>Object.hasOwn(changes,k)))throw new ValidationError('immutable_identity');
  const result=Object.fromEntries([...Object.entries(copied),...Object.entries(changes),['changed',currentTimestamp(a.now)]]);
  encodeJson(result);return result as T;
}
export function deletion(kind:DeletableKind,id:string,options:{user:Integer;now?:Integer|null}):JsonObject {
  const a=jsonOptions(options);only(a,['user','now']);
  if(!(DELETABLE as readonly string[]).includes(kind))throw new ValidationError('invalid_deletion_kind');
  return {object:kind,id:nonempty(id),user:positiveInteger(a.user),stamp:currentTimestamp(a.now)};
}
export function clearBudget(budget:JsonObject,options:{now?:Integer|null}={}):JsonObject {
  return update(budget,{income:0,outcome:0,incomeLock:false,outcomeLock:false},options);
}
