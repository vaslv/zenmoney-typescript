import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {parse,stringify} from 'lossless-json';

export async function startFakeApi() {
  const calls = [];
  const stored=new Map();
  const sockets = new Set();
  let cancelled = 0;
  const server = createServer(async (req, res) => {
    calls.push(req.url);
    res.on('close', () => { if (!res.writableEnded) cancelled++; });
    if (req.url === '/bundle.mjs') {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(await readFile('.local/browser/browser.mjs')); return;
    }
    if (req.url === '/') { res.end('<!doctype html><title>Synthetic SDK fixture</title>'); return; }
    if(req.url?.startsWith('/sdk')) {
      if(req.url==='/sdk-cors')res.setHeader('Access-Control-Allow-Origin','*');
      if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','authorization,content-type');res.end();return;}
      let wire='';for await(const chunk of req)wire+=chunk.toString();
      const data=parse(wire);for(const item of data.transaction??[])stored.set(item.id,item);
      res.end(stringify({serverTimestamp:10,wire,transaction:[...stored.values()]}));return;
    }
    if (req.url === '/cors') res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.url === '/redirect') { res.writeHead(302, {Location: '/redirect-target'}); res.end(); return; }
    if (req.url === '/invalid-utf8') { res.end(Buffer.from([0xc3, 0x28])); return; }
    if (req.url === '/slow') {
      const timer = setTimeout(() => res.end('late'), 500);
      res.on('close', () => clearTimeout(timer)); return;
    }
    if (req.url === '/stream') {
      res.write('x'.repeat(1024));
      const timer = setInterval(() => res.write('x'.repeat(1024)), 10);
      res.on('close', () => clearInterval(timer)); return;
    }
    if (req.url === '/limit') { res.end('x'.repeat(1024)); return; }
    if (req.url === '/over') { res.end('x'.repeat(1025)); return; }
    if (req.url === '/redirect-target') { res.end('unexpected redirect target'); return; }
    res.setHeader('Content-Type', 'application/json');
    res.end('{"amount":1.00000000000000000001,"id":9007199254740993}');
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {url: `http://127.0.0.1:${server.address().port}`, calls, get cancelled() { return cancelled; },
    close: async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); }};
}
