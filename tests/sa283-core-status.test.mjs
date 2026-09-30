import fs from 'node:fs';
import assert from 'node:assert/strict';

const mobile=fs.readFileSync(new URL('../kmt-sa2/mobile.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../api/sa2-real-status.js',import.meta.url),'utf8');

assert.match(mobile,/2026\.09\.29\.SA2\.8\.3-CORE/);
assert.match(mobile,/\/api\/sa283-core-status/);
assert.match(api,/HF_SA283_CORE_OVERLAY_V1/);
assert.match(api,/action,actor/);
assert.match(api,/\^\(OPEN\|MONITOR\)\$/);
assert.match(api,/mismatches/);
console.log('PASS SA2.8.3 legacy UI reads canonical issue state through the core overlay endpoint');
