import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import worker from './dist/server/index.js';
const END=Date.parse('2026-10-11T10:30:00+09:00');
const original=Date.now;
try{
 Date.now=()=>END-1;
 for(const route of ['/','/mobile.js','/theme.js','/schedule.js','/app-flow.js','/guest-data.js','/guest-mode.js','/manifest.webmanifest','/sw.js','/icon-192.png','/icon-512.png','/clock']){const res=await worker.fetch(new Request('https://demo.test'+route));assert.equal(res.status,200,route);assert.equal(res.headers.get('cache-control'),'no-store');}
 const clock=await (await worker.fetch(new Request('https://demo.test/clock'))).json();assert.deepEqual(clock,{now:END-1,expiresAt:END});
 for(const method of ['POST','PUT','DELETE','PATCH'])assert.equal((await worker.fetch(new Request('https://demo.test/api/write',{method}))).status,405);
 assert.equal((await worker.fetch(new Request('https://demo.test/api/real-status'))).status,404);
 Date.now=()=>END;
 for(const route of ['/','/index.html','/mobile.js','/guest-data.js','/clock'])assert.equal((await worker.fetch(new Request('https://demo.test'+route))).status,410,route);
 assert.match(await (await worker.fetch(new Request('https://demo.test/'))).text(),/사용기간이 종료/);
 Date.now=()=>END+86400000;assert.equal((await worker.fetch(new Request('https://demo.test/'))).status,410);
 const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest'));assert.equal(manifest.display,'standalone');assert.deepEqual(manifest.icons.map(x=>x.sizes),['192x192','512x512']);assert.equal(manifest.scope,'./');
 for(const name of ['mobile.js','theme.js','schedule.js','app-flow.js','guest-data.js','guest-mode.js']){const source=fs.readFileSync(name,'utf8');new vm.Script(source);assert.doesNotMatch(source,/script\.google|supabase|HF_REAL_|https:\/\//i);}
 const mobile=fs.readFileSync('mobile.js','utf8');assert.match(mobile,/async function api\(path,body\)\{return guestApi\(path,body\);\}/);assert.doesNotMatch(mobile,/fetch\(/);
 assert.match(fs.readFileSync('sw.js','utf8'),/Never cache documents/);
 console.log('PASS: routes, read-only methods, no operating APIs, server expiry before/at/after boundary, manifest, application syntax, no external integrations.');
}finally{Date.now=original;}
