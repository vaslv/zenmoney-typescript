import {readdir,readFile,stat} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import assert from 'node:assert/strict';
const files=['README.md','AGENTS.md','CHANGELOG.md'];
async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const name=join(path,entry.name);if(entry.isDirectory())await walk(name);else if(name.endsWith('.md'))files.push(name);}}
await walk('docs');let links=0;
for(const file of files){const text=await readFile(file,'utf8');for(const [,link] of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  if(/^[a-z]+:|^#/i.test(link))continue;
  const path=decodeURIComponent(link.split('#')[0]);if(!path)continue;
  assert((await stat(resolve(dirname(file),path))).isFile(),`Broken link in ${file}`);links++;
}}
console.log(`Documentation links verified: ${links} across ${files.length} files.`);
