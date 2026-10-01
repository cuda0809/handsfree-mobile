import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const mobile=readFileSync(new URL('../kmt-sa2/mobile.js',import.meta.url),'utf8');
const mobileSw=readFileSync(new URL('../kmt-sa2/sw.js',import.meta.url),'utf8');
const desktop=readFileSync(new URL('../handsfree-desktop/desktop.js',import.meta.url),'utf8');
const desktopSw=readFileSync(new URL('../handsfree-desktop/sw.js',import.meta.url),'utf8');

test('mobile shell serves cached assets immediately and refreshes them in background',()=>{
  assert.match(mobileSw,/caches\.match\(event\.request,\{ignoreSearch:true\}\)/);
  assert.match(mobileSw,/event\.waitUntil\(update\.catch/);
  assert.match(mobileSw,/fetch\(event\.request,\{cache:'no-store'\}\)/);
  assert.doesNotMatch(mobileSw,/event\.respondWith\(caches\.open\(CACHE\)\.then\(async c=>\{try\{const fresh=await fetch/);
});

test('mobile asset version checks do not compete with first-screen data load',()=>{
  assert.match(mobile,/if\(readPending\)\{scheduleLiveUpdateCheck\(5000\);return;\}/);
  assert.match(mobile,/scheduleLiveUpdateCheck\(12000\)/);
  assert.match(mobile,/setInterval\(\(\)=>scheduleLiveUpdateCheck\(0\),180000\)/);
  assert.doesNotMatch(mobile,/setTimeout\(checkForLiveUpdate,2500\)/);
});

test('desktop renders live status before warming the full project catalog',()=>{
  assert.match(desktop,/const status=await api\('\/api\/sa2-real-status'\)/);
  assert.match(desktop,/render\(\);const warm=\(\)=>loadCatalog\(true\)/);
  assert.match(desktop,/requestIdleCallback\(warm,\{timeout:1200\}\)/);
  assert.doesNotMatch(desktop,/const \[status,catalog\]=await Promise\.all\(/);
});

test('desktop catalog warmup is deduplicated',()=>{
  assert.match(desktop,/let catalogPending=null/);
  assert.match(desktop,/if\(catalogPending\)return catalogPending/);
  assert.match(desktop,/finally\(\(\)=>\{catalogPending=null;\}\)/);
});

test('desktop shell also uses cache-first response with background revalidation',()=>{
  assert.match(desktopSw,/caches\.match\(event\.request,\{ignoreSearch:true\}\)/);
  assert.match(desktopSw,/event\.waitUntil\(update\.catch/);
  assert.match(desktopSw,/pathname\.startsWith\('\/api\/'\)/);
});
