import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import handler from '../api/real-status.js';

const oldEnv = { ...process.env };
const oldFetch = globalThis.fetch;
process.env.HF_REAL_READ_URL = 'https://script.google.com/macros/s/configured-test/exec';
process.env.HF_REAL_READ_TOKEN = 'test-token';
process.env.HF_REAL_APP_KEY = 'test-app-key';

function response() {
  return {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

async function run(req) {
  const res = response();
  await handler(req, res);
  return res;
}

try {
  let calls = [];
  globalThis.fetch = async url => {
    calls.push(url);
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ ok: true, schema: 'HF_REAL_READ_V2', currentStatus: [{ issueId: 'I-1', state: '진행중' }] }) };
  };
  assert.equal((await run({ headers: {} })).code, 401);
  assert.equal(calls.length, 0);

  const exp = Math.floor(Date.now() / 1000) + 60;
  const sig = crypto.createHmac('sha256', process.env.HF_REAL_APP_KEY).update(`hf-real:${exp}`).digest('hex');
  const req = { headers: { cookie: `hf_real_session=${exp}.${sig}` } };
  let res = await run(req);
  assert.equal(res.code, 200);
  assert.equal(res.body.live, true);
  assert.equal(res.body.currentStatus[0].issueId, 'I-1');
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0]).pathname, new URL(process.env.HF_REAL_READ_URL).pathname);

  calls = [];
  globalThis.fetch = async url => {
    calls.push(url);
    return { ok: false, status: 500, headers: { get: () => 'text/html' }, text: async () => '<html>failed</html>' };
  };
  res = await run(req);
  assert.equal(res.code, 502);
  assert.equal(res.body.live, false);
  assert.equal(calls.length, 1);

  process.env.HF_REAL_READ_URL = '';
  assert.equal((await run(req)).code, 503);
  console.log('real-status routing/auth/failure: PASS');
} finally {
  globalThis.fetch = oldFetch;
  process.env = oldEnv;
}
