import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir, writeFile, readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startFakeApi} from '../fixtures/fake-api.mjs';

const args = ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking'];
const executablePath = process.env.CHROME_EXECUTABLE;
const launch = {...(executablePath ? {executablePath} : {}), headless: false, args};
const api = await startFakeApi();
const site = await startFakeApi();
const exactAmount='1.00000000000000000001';
const browser = await chromium.launch(launch);
let version;
try {
  version = browser.version();
  const context = await browser.newContext();
  await context.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:') ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(site.url);
  const result = await page.evaluate(async ({api, exactAmount}) => {
    const {sdkProbe, sdkRejectedProbe} = await import('/bundle.mjs');
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    check((await sdkProbe(api+'/sdk-cors')).includes(exactAmount),'Browser SDK exact readback failed');
    check(await sdkRejectedProbe(api+'/sdk'),'Installed SDK bypassed page CORS or retried');
    return 'page passed';
  }, {api: api.url, exactAmount});
  assert.equal(result, 'page passed');
  await context.close();
} finally { await browser.close(); }

const fixtureRoot = await mkdtemp(join(tmpdir(), 'zenmoney-mv3-'));
try {
  for (const permitted of [false, true]) {
    const path = join(fixtureRoot, permitted ? 'permitted' : 'unpermitted');
    await mkdir(path);
    const manifest = {manifest_version: 3, name: 'Synthetic ZenMoney transport probe', version: '0.0.1',
      background: {service_worker: 'worker.mjs', type: 'module'},
      ...(permitted ? {host_permissions: ['http://127.0.0.1/*']} : {})};
    await writeFile(join(path, 'manifest.json'), JSON.stringify(manifest));
    await writeFile(join(path, 'probe.mjs'), await readFile('.local/browser/browser.mjs'));
    await writeFile(join(path, 'worker.mjs'), `import * as probe from './probe.mjs'; globalThis.probe = probe;`);
    const context = await chromium.launchPersistentContext(join(path, 'profile'), {...launch,
      args: [...args, `--disable-extensions-except=${path}`, `--load-extension=${path}`]});
    try {
      const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', {timeout: 20000});
      const result = await worker.evaluate(async ({url, permitted, exactAmount}) => {
        const check = (condition, message) => { if (!condition) throw new Error(message); };
        const probe = globalThis.probe;
        if(permitted)check((await probe.sdkProbe(url+'/sdk')).includes(exactAmount),'MV3 SDK exact readback failed');
        else check(await probe.sdkRejectedProbe(url+'/sdk'),'Installed SDK bypassed MV3 permission or retried');
        if (permitted) {
          const endpoint=path=>url+'/sdk-failure/'+path;
          const expectFailure=async(path,options,category,code)=>{
            const result=await probe.sdkTransportProbe(endpoint(path),options);
            check(!result.ok && result.category===category && result.code===code && result.calls===1,
              'SDK failure mismatch '+path+': '+JSON.stringify(result));
          };
          const exact=await probe.sdkTransportProbe(endpoint('limit'),{maxResponseBytes:1024});
          check(exact.ok && exact.rawJson.length===1024 && exact.calls===1,'SDK exact response limit failed');
          await expectFailure('over',{maxResponseBytes:1024},'response','response_limit');
          await expectFailure('stream',{maxResponseBytes:1024},'response','response_limit');
          await expectFailure('slow',{timeoutMs:40},'transport','timeout');
          await expectFailure('body-slow',{timeoutMs:40},'transport','timeout');
          await expectFailure('invalid-utf8',{},'response','invalid_json');
          await expectFailure('redirect',{},'transport','network');
          await expectFailure('slow',{abortAfterMs:40},'transport','aborted');
          await expectFailure('slow',{closeAfterMs:40},'transport','aborted');
          const afterClose=await probe.sdkTransportProbe(endpoint('limit'),{maxResponseBytes:1024});
          check(afterClose.ok && afterClose.calls===1,'Closing one SDK client broke another');
        }
        return 'worker passed';
      }, {url: api.url, permitted, exactAmount});
      assert.equal(result, 'worker passed');
    } finally { await context.close(); }
  }
  for(const [path,count] of [['limit',2],['over',1],['stream',1],['slow',3],['body-slow',1],['invalid-utf8',1],['redirect',1]])
    assert.equal(api.calls.filter(item=>item==='/sdk-failure/'+path).length,count,'Unexpected SDK send count: '+path);
  assert.equal(api.calls.filter(path => path === '/sdk-failure/redirect-target').length, 0);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert(api.cancelled >= 3);
  console.log(JSON.stringify({browser: version, scenarios: ['installed SDK exact write/readback', 'page CORS permitted/denied',
    'MV3 host permission denied/granted', 'installed SDK exact/over response limit', 'installed SDK stream cancellation',
    'installed SDK strict UTF-8', 'installed SDK header/body timeout', 'installed SDK caller abort/close',
    'installed SDK redirect without retry'], status: 'passed'}));
} finally { await rm(fixtureRoot, {recursive: true, force: true}); await api.close(); await site.close(); }
