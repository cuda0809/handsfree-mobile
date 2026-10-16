import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/sa2-media.js';
import {sa2Cookie} from '../lib/sa2-auth.mjs';
test('photo API enforces method, origin, session and bounded signed metadata before upstream',async()=>{
 const before={...process.env};Object.assign(process.env,{HF_REAL_APP_KEY:'fixture-key',HF_REAL_ALLOWED_USERS:'{"fixture@example.test":"writer"}'});delete process.env.HF_SA2_WRITER_EMAIL;delete process.env.HF_REAL_READ_TOKEN;
 const cookie=sa2Cookie({sub:'fixture',email:'SA2:fixture',label:'검증'},'fixture-key').split(';')[0];
 const base={action:'media-save',orderId:'260728A-064',requestId:'12345678-12345678',issueId:'PHI-12345678-12345678',issueTitle:'검증',memo:'격리 검사',mime:'image/jpeg',data:Buffer.from([255,216,255,217]).toString('base64')};
 async function call(body,patch={}){const res={setHeader(){},status(v){this.code=v;return this;},json(v){this.body=v;return this;}};await handler({method:'POST',headers:{host:'fixture.test',origin:'https://fixture.test',cookie},body,...patch},res);return res;}
 try{
  assert.equal((await call(base,{method:'GET'})).code,405);
  assert.equal((await call(base,{headers:{host:'fixture.test',origin:'https://evil.test',cookie}})).code,403);
  assert.equal((await call(base,{headers:{host:'fixture.test',origin:'https://fixture.test'}})).code,401);
  for(const patch of [{mime:'image/png'},{data:'invalid'},{memo:'x'.repeat(1001)},{requestId:'short'},{resume:'yes'}])assert.equal((await call({...base,...patch})).code,400);
  const valid=await call(base);assert.equal(valid.code,503);assert.equal(valid.body.error,'not_configured');
 }finally{for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);}
});
