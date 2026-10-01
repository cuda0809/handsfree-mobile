import assert from 'node:assert/strict';import path from 'node:path';import fs from 'node:fs';import {fileURLToPath} from 'node:url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));
const config=JSON.parse(fs.readFileSync('vercel.json'));assert.deepEqual(config.builds.map(b=>b.src),['api/competition-pwa.js']);
const handler=(await import('../../api/competition-pwa.js')).default;
async function call(url,method='GET'){const result={headers:{}};await handler({url,method},{set statusCode(v){result.status=v},setHeader(k,v){result.headers[k]=v},end(body){result.body=body.toString()}});return result;}
assert.match((await call('/api/competition-pwa?path=')).body,/Hybrid 0.5/);
assert.equal((await call('/api/competition-pwa?path=clock')).status,200);
assert.equal((await call('/api/competition-pwa?path=api/sa2-real-status')).status,404);
assert.equal((await call('/api/competition-pwa?path=api/sa2-write','POST')).status,405);
const original=Date.now;try{Date.now=()=>Date.parse('2026-10-11T10:30:00+09:00');assert.equal((await call('/api/competition-pwa?path=')).status,410);assert.equal((await call('/api/competition-pwa?path=guest-data.js')).status,410);}finally{Date.now=original;}
console.log('PASS: preview builds only the competition handler; root/clock; operating APIs absent; writes blocked; server expiry.');
