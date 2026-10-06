import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/sa2-app.js';
import {sa2Cookie} from '../lib/sa2-auth.mjs';
test('signed read routes fail closed and never substitute catalog for unsupported Core',async()=>{
 const keys=['HF_REAL_APP_KEY','HF_REAL_READ_TOKEN','HF_REAL_READ_URL','HF_REAL_ALLOWED_USERS'];
 const saved=keys.map(k=>process.env[k]),fetch=globalThis.fetch;
 try{
  process.env.HF_REAL_APP_KEY='isolated-test-key';process.env.HF_REAL_READ_TOKEN='isolated-test-token';
  process.env.HF_REAL_READ_URL='https://fixture.invalid';process.env.HF_REAL_ALLOWED_USERS=JSON.stringify({'fixture@example.invalid':'writer'});
  const cookie=sa2Cookie({sub:'fixture',email:'SA2:fixture'}).split(';')[0];let calls=[];
  globalThis.fetch=async(url,opts)=>{const b=JSON.parse(opts.body),p=JSON.parse(b.signed);calls.push(p.action);return {ok:true,json:async()=>p.action==='core'?{ok:false,error:'unsupported_operation'}:{ok:true,records:[],generatedAt:'fixture'}};};
  async function req(action,authenticated=true){let code,data;const res={setHeader(){},status(v){code=v;return this;},json(v){data=v;}};await handler({method:'POST',headers:{host:'fixture.invalid',origin:'https://fixture.invalid',cookie:authenticated?cookie:''},body:{action}},res);return {code,data};}
  assert.equal((await req('plans',false)).code,401);assert.equal(calls.length,0);
  const bad=await req('core');assert.equal(bad.code,502);assert.equal(bad.data.error,'core_not_supported');assert.deepEqual(calls,['core']);
  const plans=await req('plans');assert.equal(plans.code,200);assert.deepEqual(plans.data.records,[]);assert.deepEqual(calls,['core','plans']);
 }finally{globalThis.fetch=fetch;keys.forEach((k,i)=>{if(saved[i]===undefined)delete process.env[k];else process.env[k]=saved[i];});}
});
