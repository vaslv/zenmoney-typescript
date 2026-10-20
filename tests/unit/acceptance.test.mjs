import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {ZenMoneyClient,OAuthClient,ResponseError,decodeJson} from '../../dist/index.js';
test('raw diff preserves BOM/whitespace across bytes while the decoded object remains exact',async()=>{
  const raw='\uFEFF {"serverTimestamp":10,"extension":1.00000000000000000001}\n';
  assert.equal(decodeJson(raw).extension.toString(),'1.00000000000000000001');
  const c=new ZenMoneyClient({token:'TEST_BEARER_NOT_A_SECRET',fetch:async()=>new Response(new TextEncoder().encode(raw))});
  const diff=await c.readDiff();assert.equal(diff.rawJson,raw);c.close();
});
test('concurrent requests keep cancellation scoped and release listeners',async()=>{
  const abort=new AbortController();let added=0,removed=0;
  const add=abort.signal.addEventListener.bind(abort.signal),remove=abort.signal.removeEventListener.bind(abort.signal);
  abort.signal.addEventListener=(...args)=>{added++;return add(...args);};abort.signal.removeEventListener=(...args)=>{removed++;return remove(...args);};
  const c=new ZenMoneyClient({token:'TEST_BEARER_NOT_A_SECRET',fetch:async(_url,init)=>{const cursor=JSON.parse(init.body).serverTimestamp;if(cursor===0)await new Promise(r=>setTimeout(r,50));return new Response('{"serverTimestamp":10}');}});
  const one=c.readDiff({signal:abort.signal});const two=c.readDiff({serverTimestamp:1});abort.abort();await assert.rejects(one,e=>e.code==='aborted');assert.equal((await two).serverTimestamp,10);
  assert.equal(added,removed);c.close();
});
test('data and OAuth byte limits accept exact boundary and reject the next byte',async()=>{
  const raw='{"serverTimestamp":10}';
  for(const extra of ['', ' ']) {
    const c=new ZenMoneyClient({token:'TEST_BEARER_NOT_A_SECRET',maxResponseBytes:new TextEncoder().encode(raw).length,fetch:async()=>new Response(raw+extra)});
    if(extra)await assert.rejects(c.readDiff(),ResponseError);else assert.equal((await c.readDiff()).serverTimestamp,10);c.close();
  }
  const token='{"access_token":"TEST_ACCESS","token_type":"bearer"}';
  for(const size of [1024*1024,1024*1024+1]) {
    const c=new OAuthClient({clientId:'APP',clientSecret:'TEST_SECRET',redirectUri:'https://example.invalid',fetch:async()=>new Response(token+' '.repeat(size-token.length))});
    if(size>1024*1024)await assert.rejects(c.refresh('TEST_REFRESH'),ResponseError);else assert.equal((await c.refresh('TEST_REFRESH')).accessToken,'TEST_ACCESS');c.close();
  }
});
test('real chunked HTTP stream is bounded independently of content-length',{timeout:5000},async()=>{
  let closed=false;const server=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.write(' '.repeat(16));const timer=setInterval(()=>res.write(' '.repeat(16)),5);res.on('close',()=>{closed=true;clearInterval(timer);});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
  const c=new ZenMoneyClient({token:'TEST_BEARER_NOT_A_SECRET',maxResponseBytes:16,fetch:(_url,init)=>fetch(url,init)});
  try{await assert.rejects(c.readDiff(),e=>e.code==='response_limit');await new Promise(r=>setTimeout(r,30));assert(closed);}finally{c.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('all exported collection capabilities match the reviewed protocol and cannot be mutated',async()=>{
  const sdk=await import('../../dist/index.js');
  const kinds=['instrument','company','user','account','tag','merchant','budget','reminder','reminderMarker','transaction','country'];
  const force=['instrument','company','user','account','tag','merchant','budget','reminder','reminderMarker','transaction'];
  const writable=['account','tag','merchant','budget','reminder','reminderMarker','transaction'];
  const deletable=['account','tag','merchant','reminder','reminderMarker','transaction'];
  for(const [name,expected] of Object.entries({KINDS:kinds,FORCE_FETCH:force,WRITABLE:writable,DELETABLE:deletable})){
    assert.deepEqual(sdk[name],expected);assert(Object.isFrozen(sdk[name]));assert.throws(()=>sdk[name].push('future'),TypeError);
  }
});
