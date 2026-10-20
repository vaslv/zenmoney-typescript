import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
assert.equal(pkg.private, false, 'Release candidate must be publishable');
assert.equal(pkg.type, 'module');
assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
for (const [name, version] of Object.entries({...pkg.dependencies, ...pkg.devDependencies})) {
  assert(/^\d+\.\d+\.\d+$/.test(version), `Unpinned dependency: ${name}`);
  assert.equal(lock.packages[`node_modules/${name}`].version, version);
}
for (const [path, metadata] of Object.entries(lock.packages)) {
  if (path) assert(metadata.integrity?.startsWith('sha512-'), `Unhashed dependency: ${path}`);
}
console.log('Exact dependency versions and lockfile integrity verified.');

const inventory = JSON.parse(await readFile('docs/python-inventory.json', 'utf8'));
const mapping = JSON.parse(await readFile('docs/api-options.json', 'utf8'));
const expected = Object.entries(inventory.modules).flatMap(([name, module]) => module.declarations.map(declaration => `${name}:${declaration.name}`)).sort();
assert.deepEqual(mapping.declarations.map(item => item.python).sort(), expected);
console.log(`Declaration mappings verified: ${expected.length}.`);
const licenses={'lossless-json':'MIT',typescript:'Apache-2.0',esbuild:'MIT',playwright:'Apache-2.0','@types/node':'MIT',ajv:'MIT'};
for(const [name,license] of Object.entries(licenses)) {
  const installed=JSON.parse(await readFile('node_modules/'+name+'/package.json','utf8'));
  assert.equal(installed.license,license,'Unexpected dependency license: '+name);
}
console.log('Direct dependency license inventory verified.');

const contracts=JSON.parse(await readFile('contracts/manifest.json','utf8'));
assert.equal(contracts.stage,7,'Candidate acceptance requires all shared implementation stages');
const differences=contracts.runtimeDifferences;
assert.deepEqual(differences.map(item=>item.id).sort(),[
  'account-builder-reserved-fields','decoded-unpaired-surrogates',
]);
const parity=await readFile('docs/parity.md','utf8');
for(const item of differences){
  assert(/^P(0[1-9]|1[0-9]|2[0-3])$/.test(item.featureId));
  assert(item.reference && item.typescript && parity.includes(item.id),`Undocumented runtime difference: ${item.id}`);
  assert((await readFile(item.evidence,'utf8')).length>0,`Missing runtime difference evidence: ${item.id}`);
}
console.log(`Intentional runtime differences verified: ${differences.length}.`);
