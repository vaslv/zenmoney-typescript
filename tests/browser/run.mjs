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
const exact = '{"amount":1.00000000000000000001,"id":9007199254740993}';
const browser = await chromium.launch(launch);
let version;
try {
  version = browser.version();
  const context = await browser.newContext();
  await context.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:') ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(site.url);
  const result = await page.evaluate(async ({api, exact}) => {
    const {precisionProbe, boundedFetch, sdkProbe, sdkRejectedProbe} = await import('/bundle.mjs');
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    check((await sdkProbe(api+'/sdk-cors')).includes('serverTimestamp'),'Browser SDK request failed');
    check(await sdkRejectedProbe(api+'/sdk'),'Installed SDK bypassed page CORS or retried');
    check(precisionProbe() === exact, 'Precision probe failed');
    check(await boundedFetch(api + '/cors') === exact, 'CORS request failed');
    let corsBlocked = false;
    try { await boundedFetch(api + '/api'); } catch { corsBlocked = true; }
    check(corsBlocked, 'Ordinary page bypassed CORS');
    return 'page passed';
  }, {api: api.url, exact});
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
      const result = await worker.evaluate(async ({url, permitted, exact}) => {
        const check = (condition, message) => { if (!condition) throw new Error(message); };
        const probe = globalThis.probe;
        if(permitted)check((await probe.sdkProbe(url+'/sdk')).includes('serverTimestamp'),'MV3 SDK request failed');
        else check(await probe.sdkRejectedProbe(url+'/sdk'),'Installed SDK bypassed MV3 permission or retried');
        check(probe.precisionProbe() === exact, 'MV3 precision probe failed');
        let body;
        try { body = await probe.boundedFetch(url + '/api'); } catch { body = null; }
        check(permitted ? body === exact : body === null, 'MV3 host permission behavior differs');
        if (permitted) {
          check((await probe.boundedFetch(url + '/limit')).length === 1024, 'Exact limit failed');
          for (const [path, options] of [['/over', {}], ['/stream', {}], ['/slow', {timeoutMs: 30}], ['/invalid-utf8', {}], ['/redirect', {}]]) {
            let rejected = false;
            try { await probe.boundedFetch(url + path, options); } catch { rejected = true; }
            check(rejected, 'Expected rejection: ' + path);
          }
          const controller = new AbortController();
          const pending = probe.boundedFetch(url + '/slow', {signal: controller.signal});
          setTimeout(() => controller.abort(), 30);
          let aborted = false;
          try { await pending; } catch { aborted = true; }
          check(aborted, 'Caller abort failed');
        }
        return 'worker passed';
      }, {url: api.url, permitted, exact});
      assert.equal(result, 'worker passed');
    } finally { await context.close(); }
  }
  assert.equal(api.calls.filter(path => path === '/redirect').length, 1);
  assert.equal(api.calls.filter(path => path === '/redirect-target').length, 0);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert(api.cancelled >= 3);
  console.log(JSON.stringify({browser: version, scenarios: ['page precision', 'page CORS permitted/denied',
    'MV3 host permission denied/granted', 'MV3 precision', 'bounded stream', 'strict UTF-8', 'timeout', 'caller abort', 'redirect without retry'], status: 'passed'}));
} finally { await rm(fixtureRoot, {recursive: true, force: true}); await api.close(); await site.close(); }
