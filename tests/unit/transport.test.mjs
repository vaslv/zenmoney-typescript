import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boundedFetch} from '../../.local/browser/transport.mjs';
import {startFakeApi} from '../fixtures/fake-api.mjs';

test('fetch prototype bounds streams and cleans up aborts without retries', async () => {
  const api = await startFakeApi();
  try {
    assert.match(await boundedFetch(api.url + '/api'), /1\.00000000000000000001/);
    assert.equal((await boundedFetch(api.url + '/limit')).length, 1024);
    await assert.rejects(boundedFetch(api.url + '/over'), /limit/);
    await assert.rejects(boundedFetch(api.url + '/stream'), /limit/);
    await assert.rejects(boundedFetch(api.url + '/slow', {timeoutMs: 30}));
    const controller = new AbortController();
    const request = boundedFetch(api.url + '/slow', {signal: controller.signal});
    setTimeout(() => controller.abort(), 30);
    await assert.rejects(request);
    await assert.rejects(boundedFetch(api.url + '/invalid-utf8'));
    await assert.rejects(boundedFetch(api.url + '/redirect'));
    assert.equal(api.calls.filter(path => path === '/redirect').length, 1);
    assert.equal(api.calls.filter(path => path === '/redirect-target').length, 0);
    assert.equal(api.calls.filter(path => path === '/stream').length, 1);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert(api.cancelled >= 3);
  } finally { await api.close(); }
});
