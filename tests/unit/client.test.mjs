import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {ZenMoneyClient,TransportError,HTTPError,ResponseError,ClientClosedError,ValidationError,transactions} from '../../dist/index.js';
const token='TEST_BEARER_NOT_A_SECRET';
async function local(handler,run) {
  const sockets=new Set();
  const server=createServer(handler);server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  try{await run(url);}finally{for(const s of sockets)s.destroy();await new Promise(resolve=>server.close(resolve));}
}
const response=()=>new Response('{"serverTimestamp":10,"future":{"amount":1.00000000000000000001}}');
test('client retains raw response/extensions and never advances a hidden cursor',async()=>{
  const sent=[];const client=new ZenMoneyClient({token,clock:()=>123,fetch:async(url,init)=>{
    assert.equal(url,'https://api.zenmoney.ru/v8/diff/');assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');
    assert.equal(init.headers.Authorization,'Bearer '+token);sent.push(JSON.parse(init.body));return response();}});
  const diff=await client.readDiff();assert.equal(diff.data.future.amount.toString(),'1.00000000000000000001');
  assert(diff.rawJson.includes('1.00000000000000000001'));await client.readDiff();
  assert.equal(sent.length,2);assert(sent.every(x=>x.serverTimestamp===0 && x.currentClientTimestamp===123));client.close();
});
test('input failures are sanitized before network or getters execute',async()=>{
  let calls=0;const fetch=async()=>{calls++;return response();};
  for(const config of [{token:''},{token:'bad token'},{token,timeoutMs:0},{token,maxResponseBytes:true},{token,fetch:12}])assert.throws(()=>new ZenMoneyClient(config),ValidationError);
  const client=new ZenMoneyClient({token,fetch});
  const options={get serverTimestamp(){calls++;throw new Error('SECRET_INPUT');}};
  await assert.rejects(client.diff(options),ValidationError);
  await assert.rejects(client.diff({serverTimestamp:null}),ValidationError);
  assert.equal(calls,0);client.close();
});
test('abort, timeout and close settle even when injected fetch ignores its signal',{timeout:5000},async()=>{
  let calls=0;const never=()=>{calls++;return new Promise(()=>{});};
  const client=new ZenMoneyClient({token,fetch:never,timeoutMs:20});
  await assert.rejects(client.readDiff(),e=>e instanceof TransportError && e.code==='timeout');
  const aborted=new AbortController();aborted.abort();
  await assert.rejects(client.readDiff({signal:aborted.signal}),e=>e.code==='aborted');assert.equal(calls,1);
  const other=new ZenMoneyClient({token,fetch:never,timeoutMs:null});
  const one=other.readDiff();const two=other.readDiff();setTimeout(()=>other.close(),20);
  await assert.rejects(one,e=>e.code==='aborted');await assert.rejects(two,e=>e.code==='aborted');
  assert(other.isClosed);other.close();await assert.rejects(other.readDiff(),ClientClosedError);client.close();
});
test('stream byte limits and invalid UTF-8 are enforced and cancelled',{timeout:5000},async()=>{
  let cancelled=0;
  const client=new ZenMoneyClient({token,maxResponseBytes:4,fetch:async()=>new Response(new ReadableStream({
    start(controller){controller.enqueue(new Uint8Array(5));},cancel(){cancelled++;}}))});
  await assert.rejects(client.readDiff(),e=>e instanceof ResponseError && e.code==='response_limit');assert.equal(cancelled,1);client.close();
  const invalid=new ZenMoneyClient({token,fetch:async()=>new Response(new Uint8Array([0xc3,0x28]))});
  await assert.rejects(invalid.readDiff(),ResponseError);invalid.close();
});
test('real redirects never forward credentials or follow a second request',{timeout:5000},async()=>{
  const calls=[];
  await local((req,res)=>{calls.push(req.url);res.writeHead(302,{Location:'/target'});res.end();},async(url)=>{
    const client=new ZenMoneyClient({token,fetch:(_url,options)=>fetch(url+'/source',options)});
    await assert.rejects(client.readDiff(),TransportError);client.close();
  });assert.deepEqual(calls,['/source']);
});
test('lost write acknowledgement causes one send and can be reconciled by explicit read',{timeout:5000},async()=>{
  let writes=0;let saved;
  await local((req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
    const data=JSON.parse(body);
    if(data.transaction){writes++;saved=data.transaction[0];req.socket.destroy();}
    else{res.end(JSON.stringify({serverTimestamp:10,transaction:[saved]}));}
  });},async(url)=>{
    const client=new ZenMoneyClient({token,fetch:(_url,options)=>fetch(url,options)});
    const item=transactions.expense({user:1,date:'2026-01-15',id:'owned-fixture',now:1,account:'a',instrument:1,amount:1});
    await assert.rejects(client.upsert('transaction',[item]),TransportError);assert.equal(writes,1);
    const diff=await client.readDiff();assert.equal(diff.data.transaction[0].id,item.id);assert.equal(writes,1);client.close();
  });
});
test('HTTP/network failures do not retain credential-bearing causes or bodies',async()=>{
  for(const mode of ['http','network']) {
    const client=new ZenMoneyClient({token,fetch:async()=>{if(mode==='network')throw new Error('SECRET_RESPONSE');return new Response('SECRET_RESPONSE',{status:500});}});
    try{await client.readDiff();assert.fail();}catch(error){
      assert(mode==='http'?error instanceof HTTPError:error instanceof TransportError);
      if(mode==='http')assert.equal(error.statusCode,500);
      assert(!JSON.stringify(error).includes('SECRET'));assert(!error.stack.includes('SECRET'));assert.equal(error.cause,undefined);
    }client.close();
  }
});

test('same-turn close or abort cancels before dispatch even with a signal-ignoring fetch',async()=>{
  for(const mode of ['close','abort']) {
    let calls=0;const controller=new AbortController();
    const client=new ZenMoneyClient({token,fetch:async()=>{calls++;return response();}});
    const pending=client.readDiff({signal:controller.signal});
    if(mode==='close')client.close();else controller.abort();
    await assert.rejects(pending,e=>e.code==='aborted');assert.equal(calls,0);client.close();
  }
});
test('external fetch errors are sanitized even if they masquerade as SDK errors',async()=>{
  const client=new ZenMoneyClient({token,fetch:async()=>{const e=new ResponseError();e.message='SECRET_EXTERNAL';throw e;}});
  try{await client.readDiff();assert.fail();}catch(error){assert(error instanceof TransportError);assert(!error.stack.includes('SECRET_EXTERNAL'));}client.close();
});

test('upsert rejects nonstring kinds before computed-key coercion',async()=>{
  let coercions=0;let requests=0;
  const client=new ZenMoneyClient({token,fetch:async()=>{requests++;return response();}});
  const kind={toString(){coercions++;throw new Error('SECRET_KIND');}};
  await assert.rejects(client.upsert(kind,[]),ValidationError);
  await assert.rejects(client.upsert('user',[]),ValidationError);
  assert.equal(coercions,0);assert.equal(requests,0);client.close();
});

test('large finite timeouts do not overflow the platform timer',async()=>{
  const client=new ZenMoneyClient({token,timeoutMs:1e100,fetch:async()=>{await new Promise(r=>setTimeout(r,10));return response();}});
  assert.equal((await client.readDiff()).serverTimestamp,10);client.close();
});
