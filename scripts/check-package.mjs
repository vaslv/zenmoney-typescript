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
assert.deepEqual(Object.keys(sdk).sort(), ['ExactDecimal', 'MAX_NUMBER_LENGTH', 'decimal']);
await writeFile(cwd + '/empty.d.ts', '');
await writeFile(cwd + '/consumer.ts', `import {decimal, type ExactDecimal} from 'zenmoney-typescript';\nconst value: ExactDecimal = decimal('1.23');\nvalue.equals(decimal('123e-2'));\n// @ts-expect-error decimal intentionally requires exact text\ndecimal(1.23);\n`);
for (const options of [['--module', 'NodeNext', '--moduleResolution', 'NodeNext'], ['--module', 'ESNext', '--moduleResolution', 'Bundler']]) {
  execFileSync(resolve('node_modules/.bin/tsc'), ['--strict', '--noEmit', '--target', 'ES2022', '--types', './empty.d.ts', ...options, 'consumer.ts'],
    {cwd, encoding: 'utf8', stdio: 'pipe'});
}
console.log(JSON.stringify({package: pack.filename, files: pack.files.length, consumers: ['NodeNext', 'Bundler'], status: 'passed'}));
