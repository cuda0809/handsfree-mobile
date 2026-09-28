import assert from 'node:assert/strict';
import handler from '../api/write.js';
import {encodePerson} from '../lib/person-auth.mjs';
Object.assign(process.env,{HF_REAL_APP_KEY:'test',HF_REAL_READ_TOKEN:'test',HF_REAL_READ_URL:'https://example.invalid/exec',HF_REAL_ALLOWED_USERS:'{"writer@gmail.com":"writer","reader@gmail.com":"reader"}'});
let calls=[];globalThis.fetch=async(url,o)=>{calls.push(JSON.parse(o.body));return {ok:true,text:async()=>JSON.stringify({ok:true,applied:false,status:'EXCLUDED',requestId:'HF-test'})};};
async function call(email,extra={}){const req={method:'POST',headers:{host:'app.test',origin:'https://app.test',...(email?{cookie:'hf_person='+encodePerson({email,sub:'123',exp:Date.now()/1000+100})}:{})},body:{text:'2026-09-14 excluded test',requester:'spoofed',targetHint:'test'},...extra};const res={setHeader(){},status(c){this.code=c;return this},json(b){this.body=b;}};await handler(req,res);return res;}
assert.equal((await call(null)).code,401);assert.equal((await call('reader@gmail.com')).code,403);assert.equal((await call('denied@gmail.com')).code,403);assert.equal(calls.length,0);
const r=await call('writer@gmail.com');assert.equal(r.code,200);assert.equal(r.body.status,'EXCLUDED');assert.equal(calls[0].requester,'writer@gmail.com');assert.equal(calls[0].op,'safe_write');
globalThis.fetch=async()=>({ok:true,text:async()=>JSON.stringify({ok:false,error:'safe_write_failed',requestId:'HF-uncertain',status:'FAILED'})});assert.equal((await call('writer@gmail.com')).body.requestId,'HF-uncertain');
globalThis.fetch=async()=>{throw Error('private secret')};assert.equal((await call('writer@gmail.com')).body.error,'upstream_unavailable');
assert.equal((await call('writer@gmail.com',{headers:{host:'app.test',origin:'https://evil.test'}})).code,403);
console.log('PASS personal WRITE roles, server actor, origin, receipt preservation and safe errors');
