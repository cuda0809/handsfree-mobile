import fs from 'node:fs';
import assert from 'node:assert/strict';

const entry=fs.readFileSync(new URL('../handsfree-operations/index.html',import.meta.url),'utf8');
const mobile=fs.readFileSync(new URL('../handsfree-renewal/mobile.js',import.meta.url),'utf8');
const login=fs.readFileSync(new URL('../handsfree-renewal/login.js',import.meta.url),'utf8');
const theme=fs.readFileSync(new URL('../handsfree-renewal/theme.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../handsfree-renewal/renewal.css',import.meta.url),'utf8');

assert.match(entry,/handsfree-renewal\/\?app=renewal12&mode=operations/);
assert.match(mobile,/function operationsMode\(\)/);
assert.match(mobile,/loginUrl\('required'\)/);
assert.match(mobile,/operationsMode\(\)\?'&mode=operations':''/);
assert.match(login,/operationsReturn/);
assert.match(login,/returnUrl\(true\)/);
assert.match(theme,/HandsFree 운영DB/);
assert.match(theme,/Operations 0\.1 · Renewal 0\.12/);
assert.match(css,/html\.operations-mode \.app/);
assert.match(css,/grid-template-areas: "top top" "demo main" "tabs main"/);

console.log('PASS Operations entry reuses the Renewal runtime, auth session and server data contract in a desktop program layout');
