import fs from 'node:fs';
import assert from 'node:assert/strict';

const entry=fs.readFileSync(new URL('../handsfree-operations/index.html',import.meta.url),'utf8');
const desktop=fs.readFileSync(new URL('../handsfree-desktop/desktop.js',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../handsfree-desktop/manifest.webmanifest',import.meta.url),'utf8');

assert.match(entry,/handsfree-desktop\//);
assert.doesNotMatch(entry,/handsfree-renewal/);
assert.match(desktop,/\/api\/sa2-real-status/);
assert.match(desktop,/\/api\/sa2-write/);
assert.match(desktop,/\/api\/sa2-auth/);
assert.match(manifest,/HandsFree PC/);

console.log('PASS Legacy operations entry routes to the installable PC program using the shared auth and server contracts');
