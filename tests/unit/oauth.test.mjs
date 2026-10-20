import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspect} from 'node:util';
import {OAuthClient,OAuthToken,authorizationUrl,callbackCode,ResponseError,ValidationError,ClientClosedError,TransportError} from '../../dist/index.js';
const options={clientId:'APP',clientSecret:'TEST_SECRET',redirectUri:'https://example.invalid/callback'};
const body='{"access_token":"TEST_ACCESS","token_type":"Bearer","expires_in":9007199254740993,"refresh_token":"TEST_REFRESH"}';
test('OAuth forms are explicit and repeated calls retain transport until close',async()=>{
  const forms=[];const fetch=async(url,init)=>{
    assert.equal(url,'https://api.zenmoney.ru/oauth2/token/');assert.equal(init.headers.Authorization,undefined);
    assert.equal(init.headers['Content-Type'],'application/x-www-form-urlencoded');forms.push(Object.fromEntries(new URLSearchParams(init.body)));return new Response(body);};
  const client=new OAuthClient({...options,fetch});
  const first=await client.exchangeCode('code +&');const next=await client.refresh(first.refreshToken);
  assert.deepEqual(forms,[{grant_type:'authorization_code',client_id:'APP',client_secret:'TEST_SECRET',code:'code +&',redirect_uri:options.redirectUri},{grant_type:'refresh_token',client_id:'APP',client_secret:'TEST_SECRET',refresh_token:'TEST_REFRESH'}]);
  assert.equal(next.accessToken,'TEST_ACCESS');assert.equal(next.expiresIn,9007199254740993n);assert.equal(next.tokenType,'bearer');
  client.close();client.close();assert(client.isClosed);await assert.rejects(client.refresh('x'),ClientClosedError);
  // Closing one client never closes caller-owned global or injected fetch.
  const other=new OAuthClient({...options,fetch});await other.refresh('x');other.close();assert.equal(forms.length,3);
});
test('OAuth callback enforces exactly one state/code and rejects error callbacks',()=>{
  const url=authorizationUrl({clientId:'APP~*',redirectUri:'https://example.invalid/?x=1',state:' +&й'});
  assert(url.endsWith('state=+%2B%26%D0%B9'));assert(url.includes('client_id=APP~%2A'));
  assert.equal(callbackCode('/?state=s&code=a%2Bb',{expectedState:'s'}),'a+b');
  for(const query of ['state=s&state=s&code=c','state=bad&code=c','code=c','state=&code=c'])assert.throws(()=>callbackCode('/?'+query,{expectedState:'s'}),ValidationError);
  for(const query of ['state=s&code=','state=s&code=a&code=b','state=s&code=a&error='])assert.throws(()=>callbackCode('/?'+query,{expectedState:'s'}),ResponseError);
});
test('OAuth token and client representations never include stored credentials',async()=>{
  const client=new OAuthClient({...options,fetch:async()=>new Response(body)});const token=await client.refresh('x');
  for(const value of [token,client])for(const logged of [String(value),JSON.stringify(value),inspect(value)])assert(!/TEST_(ACCESS|REFRESH|SECRET)/.test(logged));
  assert.equal(token.refreshToken,'TEST_REFRESH');assert(Object.isFrozen(token));client.close();
});
test('OAuth rejects invalid token wire shapes with sanitized response errors',async()=>{
  for(const invalid of [{},{access_token:'bad token',token_type:'bearer'},{access_token:'x',token_type:'basic'},{access_token:'x',token_type:'bearer',expires_in:-1},{access_token:'x',token_type:'bearer',expires_in:1.5},{access_token:'x',token_type:'bearer',refresh_token:''}]) {
    const client=new OAuthClient({...options,fetch:async()=>new Response(JSON.stringify(invalid))});await assert.rejects(client.refresh('x'),ResponseError);client.close();
  }
  assert.throws(()=>new OAuthToken({accessToken:'x',expiresIn:true}),ValidationError);
});
test('OAuth bounds responses and close cancels without retries',{timeout:5000},async()=>{
  let calls=0;const client=new OAuthClient({...options,timeoutMs:null,fetch:()=>{calls++;return new Promise(()=>{});}});
  const pending=client.refresh('x');await new Promise(r=>setTimeout(r,10));client.close();await assert.rejects(pending,e=>e instanceof TransportError && e.code==='aborted');assert.equal(calls,1);
  const closed=new OAuthClient(options);closed.close();await assert.rejects(closed.exchangeCode('x'),ClientClosedError);
  const huge=new OAuthClient({...options,fetch:async()=>new Response('x'.repeat(1024*1024+1))});await assert.rejects(huge.refresh('x'),e=>e.code==='response_limit');huge.close();
});
test('OAuth validates input without reading getters or disclosing their values',async()=>{
  let calls=0;const client=new OAuthClient({...options,fetch:async()=>{calls++;return new Response(body);}});
  await assert.rejects(client.exchangeCode(''),ValidationError);
  assert.throws(()=>client.authorizationUrl({get state(){calls++;throw Error('SECRET');}}),ValidationError);
  assert.equal(calls,0);client.close();
});
