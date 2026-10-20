import type {Integer} from './models.js';
import {ValidationError} from './errors.js';
import {nonempty,timestamp} from './protocol.js';
export function currentTimestamp(now?:Integer|null):Integer {return timestamp(now ?? Math.floor(Date.now()/1000));}
export function newId(id?:string|null):string {
  if(id!==null && id!==undefined)return nonempty(id);
  if(!globalThis.crypto?.randomUUID)throw new ValidationError('uuid_unavailable');
  return globalThis.crypto.randomUUID();
}
