import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

for (const page of ['index.html', 'real-v08/index.html']) {
  test(`${page}: inline scripts compile before browser initialization`, () => {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    const scripts = [...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)];
    assert.ok(scripts.length > 0);
    for (const [, source] of scripts) new Script(source, { filename: page });
  });
}

test('kmt/login.js: mobile Google account selection uses FedCM and returns to HandsFree', () => {
  const source = readFileSync(new URL('../kmt/login.js', import.meta.url), 'utf8');
  new Script(source, { filename: 'kmt/login.js' });
  assert.match(source, /use_fedcm_for_button:true/);
  assert.match(source, /button_auto_select:false/);
  assert.match(source, /location\.replace\('\/kmt\/'\)/);
});


test('kmt processing edits keep a stable local record but use a fresh server submission id', () => {
  const mobile = readFileSync(new URL('../kmt/mobile.js', import.meta.url), 'utf8');
  const appFlow = readFileSync(new URL('../kmt/app-flow.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../kmt/sw.js', import.meta.url), 'utf8');
  new Script(mobile, { filename: 'kmt/mobile.js' });
  new Script(appFlow, { filename: 'kmt/app-flow.js' });
  new Script(sw, { filename: 'kmt/sw.js' });
  assert.match(mobile, /submissionId:r\.submissionId\|\|r\.id/);
  assert.match(appFlow, /submissionId:crypto\.randomUUID\(\)/);
  assert.match(appFlow, /applyIssueReceiptLocal/);
  assert.match(sw, /fetch\(event\.request,\{cache:'no-store'\}\)/);
});
