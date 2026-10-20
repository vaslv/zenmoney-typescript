import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('.local/browser', {recursive: true});
for (const [name, entry] of Object.entries({codec: 'spikes/codec.ts', transport: 'spikes/transport.ts', browser: 'spikes/browser-entry.ts'})) {
  const result = await build({entryPoints: [entry], bundle: true, format: 'esm', platform: 'browser', target: 'chrome120',
    outfile: `.local/browser/${name}.mjs`, metafile: true});
  if (Object.keys(result.metafile.inputs).some(name => name.startsWith('node:'))) throw new Error('Node import in browser bundle');
}
