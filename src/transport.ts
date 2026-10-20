import {ClientClosedError,HTTPError,ResponseError,TransportError,ValidationError,ZenMoneyError} from './errors.js';
import {record} from './protocol.js';
export const API_ORIGIN='https://api.zenmoney.ru';
export interface TransportOptions {fetch?:typeof globalThis.fetch;timeoutMs?:number|null;maxResponseBytes?:number}
/** Read descriptors without invoking accessors; native callback/signal values stay intact. */
export function nativeOptions<T extends object>(value:T,allowed:readonly string[]):T {
  try {
    if(!record(value))throw new ValidationError();
    const entries:[string,unknown][]=[];
    for(const key of Reflect.ownKeys(value)) {
      const descriptor=Object.getOwnPropertyDescriptor(value,key)!;
      if(typeof key!=='string'||!allowed.includes(key)||!descriptor.enumerable||!('value' in descriptor))throw new ValidationError();
      if(descriptor.value!==undefined)entries.push([key,descriptor.value]);
    }
    return Object.fromEntries(entries) as T;
  }catch{throw new ValidationError('invalid_options');}
}
export class Transport {
  readonly #fetch:typeof fetch | undefined;
  readonly #timeout:number|null;
  readonly #limit:number;
  #closed=false;
  readonly #active=new Set<()=>void>();
  constructor(options:TransportOptions={}) {
    const a=nativeOptions(options,['fetch','timeoutMs','maxResponseBytes']);
    if(a.fetch!==undefined && typeof a.fetch!=='function')throw new ValidationError('invalid_fetch');
    const timeout=a.timeoutMs===undefined?60000:a.timeoutMs;
    if(timeout!==null && (typeof timeout!=='number'||!Number.isFinite(timeout)||timeout<=0))throw new ValidationError('invalid_timeout');
    const limit=a.maxResponseBytes===undefined?64*1024*1024:a.maxResponseBytes;
    if(typeof limit!=='number'||!Number.isSafeInteger(limit)||limit<=0)throw new ValidationError('invalid_response_limit');
    this.#fetch=a.fetch;this.#timeout=timeout;this.#limit=limit;
  }
  get isClosed():boolean{return this.#closed;}
  close():void {if(this.#closed)return;this.#closed=true;for(const abort of this.#active)abort();}
  async request(path:'/v8/diff/'|'/v8/suggest/'|'/oauth2/token/',body:string,token?:string,signal?:AbortSignal):Promise<Uint8Array> {
    if(this.#closed)throw new ClientClosedError();
    if(signal!==undefined && !(signal instanceof AbortSignal))throw new ValidationError('invalid_signal');
    const controller=new AbortController();
    let reason:'network'|'timeout'|'aborted'='aborted';
    const abort=(code:'timeout'|'aborted')=>{if(!controller.signal.aborted){reason=code;controller.abort();}};
    const external=()=>abort('aborted');
    let rejectAbort:(error:TransportError)=>void=()=>{};
    const aborted=new Promise<never>((_,reject)=>{rejectAbort=reject;});
    void aborted.catch(()=>{});
    const reject=()=>rejectAbort(new TransportError(reason));
    controller.signal.addEventListener('abort',reject,{once:true});
    this.#active.add(external);
    signal?.addEventListener('abort',external,{once:true});
    let timer:ReturnType<typeof setTimeout>|undefined;
    if(this.#timeout!==null) {
      const duration=this.#timeout;const start=performance.now();
      const tick=()=>{const remaining=duration-(performance.now()-start);
        if(remaining<=0)abort('timeout');else timer=setTimeout(tick,Math.min(Math.ceil(remaining),2147483647));};
      timer=setTimeout(tick,Math.min(Math.ceil(duration),2147483647));
    }
    let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
    try {
      if(signal?.aborted)external();
      if(controller.signal.aborted)throw new TransportError(reason);
      const fetcher=this.#fetch??globalThis.fetch;
      if(typeof fetcher!=='function')throw new TransportError('network');
      const headers:Record<string,string>={'Content-Type':path==='/oauth2/token/'?'application/x-www-form-urlencoded':'application/json'};
      if(token!==undefined)headers.Authorization='Bearer '+token;
      const pending=Promise.resolve().then(async()=>{
        if(controller.signal.aborted)throw new TransportError(reason);
        try {return await fetcher(API_ORIGIN+path,{method:'POST',headers,body,redirect:'error',credentials:'omit',signal:controller.signal});}
        catch {throw new TransportError(controller.signal.aborted?reason:'network');}
      }).then(response=>{
        if(controller.signal.aborted){void response.body?.cancel().catch(()=>{});throw new TransportError(reason);}return response;
      });
      const response=await Promise.race([pending,aborted]);
      if(!Number.isInteger(response.status)||response.status<100||response.status>599)throw new ResponseError('invalid_http_status');
      if(response.status!==200){void response.body?.cancel().catch(()=>{});throw new HTTPError(response.status);}
      if(!response.body)return new Uint8Array();
      reader=response.body.getReader();
      const chunks:Uint8Array[]=[];let size=0;
      while(true) {
        const next=await Promise.race([reader.read().catch(()=>{throw new TransportError(controller.signal.aborted?reason:'network');}),aborted]);
        if(next.done)break;
        size+=next.value.byteLength;
        if(size>this.#limit)throw new ResponseError('response_limit');
        chunks.push(next.value);
      }
      const output=new Uint8Array(size);let offset=0;
      for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length;}
      return output;
    }catch(error){
      if(error instanceof ZenMoneyError)throw error;
      throw new TransportError(controller.signal.aborted?reason:'network');
    }finally{
      if(timer!==undefined)clearTimeout(timer);
      this.#active.delete(external);signal?.removeEventListener('abort',external);
      controller.signal.removeEventListener('abort',reject);
      if(reader){void reader.cancel().catch(()=>{});reader.releaseLock();}
    }
  }
}
