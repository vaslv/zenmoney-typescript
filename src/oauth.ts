import {decodeJson,encodeJson} from './codec.js';
import {ClientClosedError,ResponseError,ValidationError} from './errors.js';
import type {Integer} from './models.js';
import {record} from './protocol.js';
import {API_ORIGIN,Transport,nativeOptions,type TransportOptions} from './transport.js';
import type {RequestOptions} from './client.js';

export interface AuthorizationOptions {clientId:string;redirectUri:string;state:string}
export interface CallbackOptions {expectedState:string}
export interface OAuthOptions extends Omit<TransportOptions,'maxResponseBytes'> {clientId:string;clientSecret:string;redirectUri:string}
export interface TokenOptions {accessToken:string;tokenType?:'bearer';expiresIn?:Integer|null;refreshToken?:string|null}
function text(value:unknown):asserts value is string {
  if(typeof value!=='string'||!value)throw new ValidationError('invalid_oauth_input');
  encodeJson(value);
}
function form(values:Record<string,string>):string {
  return Object.entries(values).map(([key,value])=>[key,value].map(v=>encodeURIComponent(v).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase()).replace(/%20/g,'+')).join('=')).join('&');
}
export function authorizationUrl(options:AuthorizationOptions):string {
  const a=nativeOptions(options,['clientId','redirectUri','state']);
  text(a.clientId);text(a.redirectUri);text(a.state);
  return API_ORIGIN+'/oauth2/authorize/?'+form({response_type:'code',client_id:a.clientId,redirect_uri:a.redirectUri,state:a.state});
}
export function callbackCode(callbackUrl:string,options:CallbackOptions):string {
  const a=nativeOptions(options,['expectedState']);text(a.expectedState);
  if(typeof callbackUrl!=='string')throw new ValidationError('invalid_oauth_callback');
  encodeJson(callbackUrl);
  let query:URLSearchParams;
  try{query=new URL(callbackUrl,'https://callback.invalid').searchParams;}catch{throw new ValidationError('invalid_oauth_callback');}
  const states=query.getAll('state'),codes=query.getAll('code');
  if(states.length!==1||states[0]!==a.expectedState)throw new ValidationError('oauth_state_mismatch');
  if(query.has('error')||codes.length!==1||!codes[0])throw new ResponseError('oauth_authorization_incomplete');
  return codes[0];
}
/** Explicit credential access is intentional; ordinary serialization is redacted. */
export class OAuthToken {
  readonly #access:string;readonly #expires:Integer|null;readonly #refresh:string|null;
  constructor(options:TokenOptions) {
    const a=nativeOptions(options,['accessToken','tokenType','expiresIn','refreshToken']);text(a.accessToken);
    if(/[\s\u001c-\u001f\u0085]/u.test(a.accessToken)||a.tokenType!==undefined&&a.tokenType!=='bearer')throw new ValidationError('invalid_oauth_token');
    const expires=a.expiresIn??null;
    if(expires!==null&&(typeof expires!=='bigint'&&(typeof expires!=='number'||!Number.isSafeInteger(expires))||expires<0))throw new ValidationError('invalid_oauth_lifetime');
    if(a.refreshToken!==undefined&&a.refreshToken!==null)text(a.refreshToken);
    this.#access=a.accessToken;this.#expires=expires;this.#refresh=a.refreshToken??null;Object.freeze(this);
  }
  get accessToken():string{return this.#access;}
  get tokenType():'bearer'{return 'bearer';}
  get expiresIn():Integer|null{return this.#expires;}
  get refreshToken():string|null{return this.#refresh;}
  toString():string{return 'OAuthToken [redacted]';}
  toJSON():{type:string;redacted:true}{return {type:'OAuthToken',redacted:true};}
  [Symbol.for('nodejs.util.inspect.custom')]():string{return this.toString();}
}
function parseToken(raw:Uint8Array):OAuthToken {
  const data=decodeJson(raw);
  if(!record(data)||typeof data.token_type!=='string'||data.token_type.toLowerCase()!=='bearer')throw new ResponseError('invalid_oauth_token');
  try {return new OAuthToken({accessToken:data.access_token as string,tokenType:'bearer',expiresIn:(data.expires_in??null) as Integer|null,refreshToken:(data.refresh_token??null) as string|null});}
  catch{throw new ResponseError('invalid_oauth_token');}
}
export class OAuthClient {
  readonly #id:string;readonly #secret:string;readonly #redirect:string;readonly #transport:Transport;
  constructor(options:OAuthOptions) {
    const a=nativeOptions(options,['clientId','clientSecret','redirectUri','fetch','timeoutMs']);
    text(a.clientId);text(a.clientSecret);text(a.redirectUri);
    this.#id=a.clientId;this.#secret=a.clientSecret;this.#redirect=a.redirectUri;
    this.#transport=new Transport({...(a.fetch===undefined?{}:{fetch:a.fetch}),...(a.timeoutMs===undefined?{}:{timeoutMs:a.timeoutMs}),maxResponseBytes:1024*1024});
  }
  get isClosed():boolean{return this.#transport.isClosed;}
  close():void{this.#transport.close();}
  authorizationUrl(options:Pick<AuthorizationOptions,'state'>):string {
    const a=nativeOptions(options,['state']);return authorizationUrl({clientId:this.#id,redirectUri:this.#redirect,state:a.state});
  }
  exchangeCode(code:string,options:RequestOptions={}):Promise<OAuthToken>{return this.#request('authorization_code',code,options);}
  refresh(refreshToken:string,options:RequestOptions={}):Promise<OAuthToken>{return this.#request('refresh_token',refreshToken,options);}
  async #request(grant:string,value:string,options:RequestOptions):Promise<OAuthToken> {
    if(this.isClosed)throw new ClientClosedError();text(value);
    const a=nativeOptions(options,['signal']);
    const fields={grant_type:grant,client_id:this.#id,client_secret:this.#secret,...(grant==='authorization_code'?{code:value,redirect_uri:this.#redirect}:{refresh_token:value})};
    return parseToken(await this.#transport.request('/oauth2/token/',form(fields),undefined,a.signal));
  }
}
