import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {loadCases, compare} from './common.mjs';
const cases = loadCases();
const manifest = JSON.parse(readFileSync('contracts/manifest.json', 'utf8'));
const rows = readFileSync(process.argv[2], 'utf8').trim().split('\n').map(JSON.parse);
assert.equal(rows.length, 2 * cases.length + Object.values(manifest.nativeChecks).flat().length, 'Unexpected runner records');
assert(rows.every(r => ['python-sync','python-async'].includes(r.runtime)), 'Unknown runtime');
for (const runtime of ['python-sync','python-async']) {
  compare(cases, rows.filter(r => r.runtime === runtime && !r.caseId.startsWith('native-')), runtime);
  for (const id of manifest.nativeChecks[runtime]) {
    const native = rows.filter(r => r.runtime === runtime && r.caseId === id);
    assert.equal(native.length, 1); assert.equal(native[0].error, 'validation'); assert.equal(native[0].status,'completed');
  }
}
console.log(`Validated ${cases.length} reviewed vectors in both installed Python clients and mandatory native input checks.`);
