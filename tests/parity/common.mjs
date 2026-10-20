import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import assert from 'node:assert/strict';

export function normalizeNumber(lexeme) {
  let [coefficient, exponent = '0'] = lexeme.toLowerCase().split('e');
  const sign = coefficient.startsWith('-') ? '-' : '';
  coefficient = coefficient.replace(/^-/, '');
  const fraction = coefficient.includes('.') ? coefficient.length - coefficient.indexOf('.') - 1 : 0;
  coefficient = coefficient.replace('.', '').replace(/^0+/, '');
  if (!coefficient) return '0';
  const digits = coefficient.replace(/0+$/, '');
  return sign + digits + 'e' + (BigInt(exponent) - BigInt(fraction) + BigInt(coefficient.length - digits.length));
}
export function canonical(node) {
  if (node.type === 'number') return {type: 'number', lexeme: normalizeNumber(node.lexeme)};
  if (node.type === 'object') return {type: 'object', entries: node.entries.map(([k,v]) => [k, canonical(v)]).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)};
  if (node.type === 'array') return {type: 'array', items: node.items.map(canonical)};
  return node;
}
function uniqueKeys(node) {
  if (node.type === 'object') {
    assert.equal(new Set(node.entries.map(([k]) => k)).size, node.entries.length, 'Duplicate tagged-tree key');
    for (const [, value] of node.entries) uniqueKeys(value);
  } else if (node.type === 'array') node.items.forEach(uniqueKeys);
}
export function loadCases() {
  const manifest = JSON.parse(readFileSync('contracts/manifest.json', 'utf8'));
  const schemaText = readFileSync('contracts/v1/schema.json', 'utf8');
  assert.equal(createHash('sha256').update(schemaText).digest('hex'), manifest.schemaSha256);
  const schema = JSON.parse(schemaText);
  const validate = new Ajv2020({strict: true}).compile(schema);
  assert.equal(new Set(manifest.cases.map(c => c.id)).size, manifest.cases.length, 'Duplicate case ID');
  assert.deepEqual(manifest.cases.map(c => c.id), [...manifest.cases.map(c => c.id)].sort());
  assert.deepEqual(readdirSync('contracts/v1/cases').sort(), manifest.cases.map(c => c.file.split('/').at(-1)).sort());
  const cases = manifest.cases.map(entry => {
    assert(/^v1\/cases\/[A-Za-z0-9-]+\.json$/.test(entry.file), 'Invalid fixture path');
    const text = readFileSync('contracts/' + entry.file, 'utf8');
    assert.equal(createHash('sha256').update(text).digest('hex'), entry.sha256, entry.id + ' hash');
    const c = JSON.parse(text);
    assert(validate(c), JSON.stringify(validate.errors));
    assert.equal(c.id, entry.id);
    uniqueKeys(c.input); uniqueKeys(c.expect.requests);
    if (c.expect.result) uniqueKeys(c.expect.result);
    for (const event of c.events) if (!event.disconnect) assert.notEqual('body' in event, 'bodyBase64' in event, 'Exactly one response body');
    return c;
  });
  const coverage = JSON.parse(readFileSync('contracts/coverage.json', 'utf8'));
  assert.deepEqual(Object.keys(coverage.features).sort(), Array.from({length:23},(_,i)=>'P'+String(i+1).padStart(2,'0')));
  for (const [feature, record] of Object.entries(coverage.features)) {
    const ids = cases.filter(c => c.featureIds.includes(feature)).map(c=>c.id).sort();
    assert.deepEqual([...record.cases].sort(),ids,'Coverage differs from fixture feature IDs: '+feature);
    assert(record.typeOnly || ids.length>0,'Uncovered feature '+feature);
  }
  const inventory=JSON.parse(readFileSync('docs/python-inventory.json','utf8'));
  for(const declaration of inventory.modules['models.py'].declarations) {
    assert.deepEqual(coverage.modelFields[declaration.name],Object.keys(declaration.fields),'Missing model field mapping');
  }
  return cases;
}
export function compare(cases, results, runtime) {
  assert.equal(results.length, cases.length, runtime + ' missing or extra results');
  assert.equal(new Set(results.map(r => r.caseId)).size, results.length, 'Duplicate result ID');
  for (const c of cases) {
    const actual = results.find(r => r.caseId === c.id);
    assert(actual, runtime + ' missing ' + c.id);
    assert.equal(actual.runtime, runtime);
    assert.equal(actual.status, 'completed', c.id + ' incomplete runner');
    assert.deepEqual(actual.featureIds,c.featureIds,c.id + ' feature mapping');
    assert.deepEqual(canonical(actual.requests), canonical(c.expect.requests), runtime + ' requests ' + c.id);
    if (c.expect.error) { assert.equal(actual.error, c.expect.error, runtime + ' error ' + c.id); assert.equal(actual.statusCode,c.expect.statusCode, runtime + ' HTTP status ' + c.id); }
    else { assert.equal(actual.error, undefined, runtime + ' unexpected error ' + c.id); assert.deepEqual(canonical(actual.result), canonical(c.expect.result), runtime + ' result ' + c.id); }
  }
}
