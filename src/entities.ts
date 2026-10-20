import type {Integer,JsonObject,Account,Tag,Merchant} from './models.js';
import {ValidationError} from './errors.js';
import {jsonOptions,record,positiveInteger} from './protocol.js';
import {newId,currentTimestamp} from './builder-utils.js';
import {cloneJson,encodeJson} from './codec.js';
interface CatalogOptions {user:Integer;title:string;id?:string|null;now?:Integer|null;fields?:JsonObject}
export interface AccountOptions extends CatalogOptions {instrument:Integer;accountType?:Exclude<NonNullable<Account['type']>,'debt'>}
function base(options:CatalogOptions,isAccount=false):JsonObject {
  if(Object.keys(options).some(k=>![...['user','title','id','now','fields'],...(isAccount?['instrument','accountType']:[])].includes(k)))throw new ValidationError('unsupported_option');
  if(typeof options.title!=='string'||!options.title.trim())throw new ValidationError('invalid_title');
  return {id:newId(options.id),user:positiveInteger(options.user),title:options.title,changed:currentTimestamp(options.now)};
}
function extend(result:JsonObject,fields:JsonObject={}):JsonObject {
  const extra=cloneJson(fields);
  if(!record(extra))throw new ValidationError('invalid_fields');
  if(['id','user','title','changed'].some(k=>Object.hasOwn(extra,k)))throw new ValidationError('immutable_identity');
  const merged=Object.fromEntries([...Object.entries(result),...Object.entries(extra)]);
  encodeJson(merged);return merged;
}
export function account(options:AccountOptions):Account {
  const a=jsonOptions(options);const kind=a.accountType===undefined?'cash':a.accountType;
  if(!['cash','ccard','checking','loan','deposit','emoney'].includes(kind))throw new ValidationError('invalid_account_type');
  const result=extend({...base(a,true),role:null,instrument:positiveInteger(a.instrument),company:null,type:kind,syncID:null,
    balance:0,startBalance:0,creditLimit:null,inBalance:true,savings:false,enableCorrection:false,enableSMS:false,
    archive:false,private:false,balanceCorrectionType:'request',capitalization:null,percent:null,startDate:null,
    endDateOffset:null,endDateOffsetInterval:null,payoffStep:null,payoffInterval:null},a.fields);
  if(['loan','deposit'].includes(kind) && ['capitalization','percent','startDate','endDateOffset','endDateOffsetInterval'].some(k=>result[k]===null || result[k]===undefined))throw new ValidationError('missing_loan_parameters');
  return result as Account;
}
export function tag(options:CatalogOptions):Tag {
  const a=jsonOptions(options);
  return extend({...base(a),parent:null,icon:null,picture:null,color:null,showIncome:true,showOutcome:true,budgetIncome:true,
    budgetOutcome:true,required:false,archive:false,staticId:null},a.fields) as Tag;
}
export function merchant(options:CatalogOptions):Merchant {
  const a=jsonOptions(options);return extend({...base(a),mcc:null},a.fields) as Merchant;
}
