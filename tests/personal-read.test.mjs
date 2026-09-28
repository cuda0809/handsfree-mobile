import assert from 'node:assert/strict';
import handler from '../api/real-status.js';
import {encodePerson} from '../lib/person-auth.mjs';
process.env.HF_REAL_APP_KEY='test-key';process.env.HF_REAL_READ_URL='https://example.com/read';process.env.HF_REAL_READ_TOKEN='test-token';
process.env.HF_REAL_ALLOWED_USERS='{"test@gmail.com":"reader"}';
let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,text:async()=>JSON.stringify({ok:true,currentStatus:[{orderId:'P-1'}]})};};
async function run(p){const r={setHeader(){},status(c){this.code=c;return this;},json(b){this.body=b;}};await handler({headers:{cookie:'hf_person='+encodePerson(p)}},r);return r;}
const p={email:'test@gmail.com',sub:'123',exp:Date.now()/1000+60};
assert.equal((await run(p)).code,200);assert.equal(calls,1);
assert.equal((await run({...p,email:'denied@gmail.com'})).code,401);
assert.equal((await run({...p,exp:1})).code,401);
process.env.HF_REAL_ALLOWED_USERS='{}';assert.equal((await run(p)).code,401);assert.equal(calls,1);
console.log('PASS personal READ, disallowed/revoked/expired sessions blocked before upstream');
