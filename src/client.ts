import {encodeJson} from './codec.js';
import {ValidationError} from './errors.js';
import type {Integer,JsonObject} from './models.js';
import {decodeDiff,diffPayload,suggestPayload,decodeSuggestion,type Diff,type DiffOptions,type WritableKind,timestamp,WRITABLE} from './protocol.js';
import {Transport,nativeOptions,type TransportOptions} from './transport.js';
export interface ClientOptions extends TransportOptions {token:string;clock?:()=>Integer}
export interface RequestOptions {signal?:AbortSignal}
export type ExchangeOptions=DiffOptions & RequestOptions;
export class ZenMoneyClient {
  readonly #token:string;
  readonly #transport:Transport;
  readonly #clock:()=>Integer;
  constructor(options:ClientOptions) {
    const a=nativeOptions(options,['token','fetch','clock','timeoutMs','maxResponseBytes']);
    if(typeof a.token!=='string'||!a.token||/[\s\u001c-\u001f\u0085]/u.test(a.token))throw new ValidationError('invalid_token');
    if(a.clock!==undefined && typeof a.clock!=='function')throw new ValidationError('invalid_clock');
    this.#token=a.token;this.#clock=a.clock??(()=>Math.floor(Date.now()/1000));
    const {token:_,clock:__,...transport}=a;void _;void __;
    this.#transport=new Transport(transport);
  }
  get isClosed():boolean{return this.#transport.isClosed;}
  close():void{this.#transport.close();}
  async diff(options:ExchangeOptions={}):Promise<Diff> {
    const {signal,...data}=nativeOptions(options,['serverTimestamp','changes','deletions','forceFetch','signal']);
    let now:Integer;try{now=timestamp(this.#clock());}catch{throw new ValidationError('invalid_clock');}
    const payload=diffPayload(data,now);
    return decodeDiff(await this.#transport.request('/v8/diff/',encodeJson(payload),this.#token,signal),payload.serverTimestamp as Integer);
  }
  async readDiff(options:Pick<ExchangeOptions,'serverTimestamp'|'forceFetch'|'signal'>={}):Promise<Diff> {
    const a=nativeOptions(options,['serverTimestamp','forceFetch','signal']);return this.diff(a);
  }
  async upsert(kind:WritableKind,entities:readonly JsonObject[],options:Pick<ExchangeOptions,'serverTimestamp'|'signal'>={}):Promise<Diff> {
    const a=nativeOptions(options,['serverTimestamp','signal']);
    if(typeof kind!=='string'||!(WRITABLE as readonly string[]).includes(kind))throw new ValidationError('invalid_write_kind');
    return this.diff({...a,changes:{[kind]:entities}});
  }
  async delete(deletions:readonly JsonObject[],options:Pick<ExchangeOptions,'serverTimestamp'|'signal'>={}):Promise<Diff> {
    const a=nativeOptions(options,['serverTimestamp','signal']);return this.diff({...a,deletions});
  }
  async suggest(value:JsonObject,options?:RequestOptions):Promise<JsonObject>;
  async suggest(value:readonly JsonObject[],options?:RequestOptions):Promise<JsonObject[]>;
  async suggest(value:JsonObject|readonly JsonObject[],options:RequestOptions={}):Promise<JsonObject|JsonObject[]> {
    const a=nativeOptions(options,['signal']);const payload=suggestPayload(value);
    return decodeSuggestion(await this.#transport.request('/v8/suggest/',encodeJson(payload),this.#token,a.signal),payload);
  }
}
