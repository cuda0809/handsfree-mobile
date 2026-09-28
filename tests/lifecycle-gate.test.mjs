import assert from 'node:assert/strict';
import handler from '../api/lifecycle.js';
import {encodePerson} from '../lib/person-auth.mjs';
process.env.HF_REAL_APP_KEY='test-key';
process.env.HF_REAL_ALLOWED_USERS=JSON.stringify({'owner@gmail.com':'owner','reader@gmail.com':'reader'});
process.env.HF_REAL_READ_TOKEN='test-token';process.env.HF_REAL_READ_URL='https://example.com';
let calls=0,payload;globalThis.fetch=async(url,options)=>{calls++;payload=JSON.parse(options.body);return {ok:true,json:async()=>({ok:true,status:'APPLIED'})};};
async function run(email,origin='https://preview.example'){
 const res={setHeader(){},status(c){this.code=c;return this;},json(b){this.body=b;}};
 await handler({method:'POST',headers:{origin,host:'preview.example',cookie:email?'hf_person='+encodePerson({email,sub:'1',exp:Date.now()/1000+60}):''},body:{action:'edit',orderId:'P-1',target:'T',date:'2026-10-01'}},res);return res;
}
assert.equal((await run(null)).code,401);
assert.equal((await run('unknown@gmail.com')).code,403);
assert.equal((await run('owner@gmail.com','https://other.example')).code,403);
assert.equal((await run('reader@gmail.com')).code,403);assert.equal(calls,0);
const r=await run('owner@gmail.com');assert.equal(r.code,200);assert.equal(calls,1);
assert.equal(payload.op,'light_schedule');assert.equal(JSON.parse(payload.signed).actor.email,'owner@gmail.com');assert.ok(payload.signature);
globalThis.fetch=async()=>({ok:true,json:async()=>({ok:false,error:'stale_record'})});
assert.equal((await run('owner@gmail.com')).code,409);
console.log('PASS schedule API personal roles, signed payload, fixed operation, origin and conflict handling');
