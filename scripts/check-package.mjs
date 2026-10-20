import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const npm = (args, cwd = process.cwd()) => execFileSync('npm', args, {cwd, encoding: 'utf8', env: {...process.env, npm_config_update_notifier: 'false'}});
await mkdir('.local/package-check', {recursive: true});
const [pack] = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', '.local/package-check']));
for (const {path} of pack.files) assert(/^(dist\/[^/]+\.(js|d\.ts)|README\.md|LICENSE|package\.json)$/.test(path), `Unexpected package file: ${path}`);
const cwd = resolve('.local/package-check/consumer');
await mkdir(cwd, {recursive: true});
await writeFile(cwd + '/package.json', JSON.stringify({private: true, type: 'module'}));
npm(['install', '--ignore-scripts', '--offline', '--no-audit', '--no-fund', resolve('.local/package-check', pack.filename)], cwd);
execFileSync('node', ['--input-type=module', '-e',
  "import {decimal} from 'zenmoney-typescript'; if (!decimal('1.00').equals(decimal('1e0'))) throw new Error('Root export resolution failed');"],
  {cwd, encoding: 'utf8', stdio: 'pipe'});
const modulePath = resolve(cwd, 'node_modules/zenmoney-typescript/dist/index.js');
const sdk = await import(pathToFileURL(modulePath).href);
assert.equal(sdk.decimal('1.00').equals(sdk.decimal('1e0')), true);
assert(Object.keys(sdk).includes('encodeJson'));
assert(Object.keys(sdk).includes('entityKey'));
assert(!Object.keys(sdk).includes('decodeCandidate'));
await writeFile(cwd + '/empty.d.ts', '');
await writeFile(cwd + '/consumer.ts', `import {decimal, type ExactDecimal} from 'zenmoney-typescript';\nconst value: ExactDecimal = decimal('1.23');\nvalue.equals(decimal('123e-2'));\n// @ts-expect-error decimal intentionally requires exact text\ndecimal(1.23);\n`);
for (const options of [['--module', 'NodeNext', '--moduleResolution', 'NodeNext'], ['--module', 'ESNext', '--moduleResolution', 'Bundler']]) {
  execFileSync(resolve('node_modules/.bin/tsc'), ['--strict', '--noEmit', '--target', 'ES2022', '--types', './empty.d.ts', ...options, 'consumer.ts'],
    {cwd, encoding: 'utf8', stdio: 'pipe'});
}

const required=['ZenMoneyClient','OAuthClient','OAuthToken','authorizationUrl','callbackCode','ExactDecimal','decimal','encodeJson','decodeJson','entityKey','KINDS','WRITABLE','DELETABLE','FORCE_FETCH','transactions','entities','ZenMoneyError','HTTPError','ValidationError','ResponseError','TransportError','ClientClosedError'];
assert.deepEqual(Object.keys(sdk).sort(),[...required,'MAX_NUMBER_LENGTH'].sort());
const requestLog=[];
const client=new sdk.ZenMoneyClient({token:'TEST_BEARER_NOT_A_SECRET',clock:()=>1,fetch:async(url,init)=>{
  assert.equal(url,'https://api.zenmoney.ru/v8/diff/');requestLog.push(sdk.decodeJson(init.body));return new Response('{"serverTimestamp":1}');}});
const transaction=sdk.transactions.expense({user:1,date:'2026-01-15',account:'a',instrument:1,amount:sdk.decimal('1.00000000000000000001'),id:'fixture',now:1,viewed:false});
await client.upsert('transaction',[transaction]);client.close();assert.equal(requestLog.length,1);
assert.equal(requestLog[0].transaction[0].outcome.toString(),'1.00000000000000000001');
assert.equal(requestLog[0].transaction[0].viewed,false);
const closed=new sdk.OAuthClient({clientId:'TEST_APP',clientSecret:'TEST_SECRET',redirectUri:'https://example.invalid/callback'});closed.close();assert(closed.isClosed);
await writeFile(cwd+'/sdk-consumer.ts',`import {ZenMoneyClient,OAuthClient,transactions,entities,decimal,type Transaction,type Diff,type Integer} from 'zenmoney-typescript';
const value:Transaction=transactions.transfer({user:1,date:'2026-01-15',fromAccount:'a',toAccount:'b',fromInstrument:1,toInstrument:2,amountOut:decimal('1.1'),amountIn:2n});
const account=entities.account({user:1,title:'Example',instrument:1});
const client=new ZenMoneyClient({token:'TEST_BEARER_NOT_A_SECRET'});
const result:Promise<Diff>=client.upsert('transaction',[value]);
const cursor:Integer=1n;
void result;void account;void cursor;void OAuthClient;
// @ts-expect-error readonly collection cannot be written
client.upsert('user',[]);
// @ts-expect-error helper flags are booleans
transactions.expense({user:1,date:'2026-01-15',account:'a',instrument:1,amount:1,viewed:'false'});
`);
for(const options of [['--module','NodeNext','--moduleResolution','NodeNext'],['--module','ESNext','--moduleResolution','Bundler']])execFileSync(resolve('node_modules/.bin/tsc'),['--strict','--noEmit','--target','ES2022','--types','./empty.d.ts',...options,'sdk-consumer.ts'],{cwd,encoding:'utf8',stdio:'pipe'});

console.log(JSON.stringify({package: pack.filename, files: pack.files.length, consumers: ['NodeNext', 'Bundler'], status: 'passed'}));
