import {ValidationError, ResponseError} from './errors.js';
import {ExactDecimal,decimal} from './numbers.js';
import {cloneJson,copyJson,encodeJson,decodeJson} from './codec.js';
import type {Integer, JsonObject} from './models.js';
export const KINDS = Object.freeze(['instrument','company','user','account','tag','merchant','budget','reminder','reminderMarker','transaction','country'] as const);
export const FORCE_FETCH = Object.freeze(['instrument','company','user','account','tag','merchant','budget','reminder','reminderMarker','transaction'] as const);
export const WRITABLE = Object.freeze(['account','tag','merchant','budget','reminder','reminderMarker','transaction'] as const);
export const DELETABLE = Object.freeze(['account','tag','merchant','reminder','reminderMarker','transaction'] as const);
export type WritableKind = typeof WRITABLE[number];
export type DeletableKind = typeof DELETABLE[number];
export type FetchKind = typeof FORCE_FETCH[number];
export type Changes = Partial<Record<WritableKind,readonly JsonObject[]>>;
export interface Diff {data: JsonObject & {serverTimestamp: Integer}; rawJson:string; serverTimestamp:Integer}
export function record(value: unknown): value is JsonObject {
  return value!==null && typeof value==='object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value)===Object.prototype || Object.getPrototypeOf(value)===null);
}
export function integer(value: unknown): value is Integer {return typeof value==='bigint' || (typeof value==='number' && Number.isSafeInteger(value));}
export function timestamp(value: unknown): Integer {
  if(!integer(value) || value<0) throw new ValidationError('invalid_timestamp');return value;
}
export function positiveInteger(value:unknown): Integer {
  if(!integer(value) || value<=0) throw new ValidationError('invalid_identifier');return value;
}
export function nonempty(value:unknown): string {
  if(typeof value!=='string' || !value) throw new ValidationError('empty_identifier');return value;
}
export function truthy(value: unknown): boolean {
  if(value instanceof ExactDecimal) return !value.equals(decimal('0'));
  if(Array.isArray(value)) return value.length>0;
  if(record(value)) return Object.keys(value).length>0;
  return Boolean(value);
}
export function entityKey(kind:string,item:JsonObject): string {
  try {item=copyJson(item);} catch {throw new ResponseError('invalid_entity');}
  if(!record(item)) throw new ResponseError('invalid_entity');
  if(kind==='budget') {
    if(!integer(item.user) || item.user<=0 || typeof item.date!=='string' ||
      (item.tag!==null && typeof item.tag!=='string')) throw new ResponseError('invalid_budget_key');
    return encodeJson([item.user,item.date,item.tag]).replace(/[\u007f-\uffff]/g,ch=>'\\u'+ch.charCodeAt(0).toString(16).padStart(4,'0'));
  }
  if((typeof item.id!=='string' && !integer(item.id)) || item.id==='') throw new ResponseError('invalid_entity_key');
  return String(item.id);
}
export function decodeDiff(raw:string | Uint8Array,cursor:Integer): Diff {
  const data=decodeJson(raw);
  if(!record(data) || !integer(data.serverTimestamp) || data.serverTimestamp<0 || truthy(data.error)) throw new ResponseError('invalid_diff');
  for(const kind of KINDS) {
    const rows=data[kind] ?? [];
    if(kind in data && !Array.isArray(rows) || data[kind]===null) throw new ResponseError('invalid_collection');
    for(const row of rows as JsonObject[]) entityKey(kind,row);
  }
  const deletions=data.deletion ?? [];
  if(!Array.isArray(deletions) || data.deletion===null) throw new ResponseError('invalid_deletions');
  for(const row of deletions) if(!record(row) || typeof row.object!=='string' || (typeof row.id!=='string' && !integer(row.id))) throw new ResponseError('invalid_deletion');
  if(data.serverTimestamp<cursor) throw new ResponseError('cursor_regression');
  return {data:data as Diff['data'],rawJson:typeof raw==='string'?raw:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),serverTimestamp:data.serverTimestamp};
}
export interface DiffOptions {serverTimestamp?:Integer; changes?:Changes; deletions?:readonly JsonObject[]; forceFetch?:readonly FetchKind[]}
export function jsonOptions<T extends object>(value:T):T {
  try {
    if(!record(value)) throw new ValidationError();
    const result:JsonObject=Object.create(null) as JsonObject;
    for(const key of Reflect.ownKeys(value)) {
      const descriptor=Object.getOwnPropertyDescriptor(value,key)!;
      if(typeof key!=='string' || !descriptor.enumerable || !('value' in descriptor)) throw new ValidationError();
      if(descriptor.value!==undefined) Object.defineProperty(result,key,{value:descriptor.value,enumerable:true});
    }
    return copyJson(result) as T;
  } catch {throw new ValidationError('invalid_options');}
}
export function diffPayload(options:DiffOptions,now:Integer): JsonObject {
  options=jsonOptions(options);
  const payload:JsonObject={serverTimestamp:timestamp(options.serverTimestamp === undefined ? 0 : options.serverTimestamp),currentClientTimestamp:timestamp(now)};
  if(options.forceFetch!==undefined) {
    if(!Array.isArray(options.forceFetch) || options.forceFetch.some(k=>!FORCE_FETCH.includes(k))) throw new ValidationError('invalid_force_fetch');
    payload.forceFetch=[...new Set(options.forceFetch)];
  }
  if(options.changes!==undefined) {
    if(!record(options.changes)) throw new ValidationError('invalid_changes');
    for(const [kind,rows] of Object.entries(options.changes)) {
      if(!(WRITABLE as readonly string[]).includes(kind) || !Array.isArray(rows)) throw new ValidationError('invalid_changes');
      const seen=new Set<string>();
      payload[kind]=rows.map(row=>{
        if(!record(row)) throw new ValidationError('invalid_entity');
        let key:string;
        try {key=entityKey(kind,row);} catch {throw new ValidationError('invalid_entity');}
        if(kind!=='budget' && typeof row.id!=='string' || seen.has(key)) throw new ValidationError('duplicate_entity');
        seen.add(key);timestamp(row.changed);positiveInteger(row.user);return cloneJson(row);
      });
    }
  }
  if(options.deletions!==undefined) {
    if(!Array.isArray(options.deletions)) throw new ValidationError('invalid_deletions');
    const seen=new Set<string>();
    payload.deletion=options.deletions.map(row=>{
      if(!record(row) || !(DELETABLE as readonly unknown[]).includes(row.object)) throw new ValidationError('invalid_deletion');
      nonempty(row.id);timestamp(row.stamp);positiveInteger(row.user);
      const key=encodeJson([row.object,row.id]);
      if(seen.has(key) || (payload[row.object as string] as JsonObject[] | undefined)?.some(t=>t.id===row.id)) throw new ValidationError('conflicting_deletion');
      seen.add(key);return cloneJson(row);
    });
  }
  encodeJson(payload);return payload;
}
export function suggestPayload(value:unknown): JsonObject | JsonObject[] {
  if(!record(value) && !(Array.isArray(value) && value.length && value.every(record))) throw new ValidationError('invalid_suggestion');
  return cloneJson(value) as JsonObject | JsonObject[];
}
export function decodeSuggestion(raw:string | Uint8Array,request:JsonObject | JsonObject[]):JsonObject | JsonObject[] {
  const result=decodeJson(raw);
  if(Array.isArray(request)) {
    if(!Array.isArray(result) || result.length!==request.length || result.some(x=>!record(x) || truthy(x.error))) throw new ResponseError('invalid_suggestion');
  } else if(!record(result) || truthy(result.error)) throw new ResponseError('invalid_suggestion');
  return result as JsonObject | JsonObject[];
}
