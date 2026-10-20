import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
assert.equal(pkg.private, true);
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
