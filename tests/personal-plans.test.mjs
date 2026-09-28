import assert from 'node:assert/strict';
import handler from '../api/plans.js';
import {encodePerson} from '../lib/person-auth.mjs';
process.env.HF_REAL_APP_KEY='test-key';
process.env.HF_REAL_READ_URL='https://example.com/read';
process.env.HF_REAL_READ_TOKEN='test-token';
process.env.HF_REAL_ALLOWED_USERS=JSON.stringify({'reader@gmail.com':'reader'});
let calls=[];
globalThis.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true,plans:[['id'],['a',2026,9,'2026-09-01','P-1'],['b',2026,9,'2026-09-02','P-10']]})};};
async function run(email,body={orderId:'P-1',op:'kmt_edit'}){
 const res={setHeader(k,v){this[k]=v;},status(s){this.code=s;return this;},json(b){this.body=b;}};
 const cookie=email?'hf_person='+encodePerson({email,sub:'123',exp:Date.now()/1000+60}):'';
 await handler({method:'POST',headers:{cookie},body},res);return res;
}
assert.equal((await run(null)).code,401);
assert.equal((await run('unknown@gmail.com')).code,403);
assert.equal(calls.length,0);
const result=await run('reader@gmail.com');
assert.equal(result.code,200);assert.equal(result['Cache-Control'],'no-store');
assert.equal(result.body.plans.length,1);assert.equal(result.body.plans[0][0],'a');
assert.equal(result.body.editingAvailable,false);assert.equal(calls[0].op,'kmt_read');
assert.equal((await run('reader@gmail.com',{orderId:' '})).code,400);
process.env.HF_REAL_ALLOWED_USERS='{}';
assert.equal((await run('reader@gmail.com')).code,403);assert.equal(calls.length,1);
console.log('PASS personal plans: authentication, revocation, exact project, fixed read operation, no cache');
