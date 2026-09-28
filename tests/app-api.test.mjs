import assert from 'node:assert/strict';import crypto from 'node:crypto';import handler from '../api/app.js';import {encodePerson} from '../lib/person-auth.mjs';
Object.assign(process.env,{HF_REAL_APP_KEY:'test',HF_REAL_READ_TOKEN:'test-token',HF_REAL_READ_URL:'https://example.invalid/exec',HF_REAL_ALLOWED_USERS:'{"writer@test":"writer","reader@test":"reader"}'});
let bodies=[];globalThis.fetch=async(url,o)=>{bodies.push(JSON.parse(o.body));return {ok:true,json:async()=>({ok:true,projects:[]})};};
async function call(email,body){const req={method:'POST',headers:{host:'app.test',origin:'https://app.test',...(email?{cookie:'hf_person='+encodePerson({email,sub:'123',exp:Date.now()/1000+100})}:{})},body};const res={setHeader(){},status(c){this.code=c;return this},json(b){this.body=b}};await handler(req,res);return res;}
assert.equal((await call(null,{action:'catalog'})).code,401);assert.equal((await call('reader@test',{action:'edit'})).code,403);assert.equal(bodies.length,0);
assert.equal((await call('reader@test',{action:'catalog',actor:{email:'spoof'}})).code,200);const b=bodies[0];assert.equal(b.op,'light_app');assert.equal(JSON.parse(b.signed).actor.email,'reader@test');assert.equal(b.signature,crypto.createHmac('sha256','test-token').update(b.signed).digest('base64url'));assert.equal((await call('writer@test',{action:'edit',state:'x'.repeat(1001)})).code,400);
console.log('PASS app personal auth, read-only role, trusted actor signature and field bounds');

