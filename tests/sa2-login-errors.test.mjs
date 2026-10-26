import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import handler from '../api/sa2-auth.js';

const originalKey=process.env.HF_REAL_APP_KEY;
function restore(){if(originalKey===undefined)delete process.env.HF_REAL_APP_KEY;else process.env.HF_REAL_APP_KEY=originalKey;}
async function request(method,body,origin='https://test.example'){
 const headers={};let status,data;
 const res={setHeader(k,v){headers[k]=v;},status(s){status=s;return this;},json(d){data=d;return this;}};
 await handler({method,body,headers:{host:'test.example',origin,'x-forwarded-for':'login-test'}},res);
 return {status,data,headers};
}
test('missing session configuration is explicit and never issues a cookie',async()=>{
 try{delete process.env.HF_REAL_APP_KEY;
  for(const [method,body] of [['GET',undefined],['POST',{action:'activate',name:'Fixture',pin:'invalid'}]]){
   const r=await request(method,body);assert.equal(r.status,503);assert.equal(r.data.error,'not_configured');assert.equal(r.headers['Set-Cookie'],undefined);
  }
  assert.equal((await request('POST',{action:'activate'},'https://other.example')).status,403);
 }finally{restore();}
});
test('configured authentication still rejects invalid PIN',async()=>{
 try{process.env.HF_REAL_APP_KEY='isolated-unit-test-only';
  assert.equal((await request('GET')).data.user,null);
  const r=await request('POST',{action:'activate',name:'Fixture',pin:'invalid'});
  assert.equal(r.status,401);assert.equal(r.data.error,'pin_denied');assert.equal(r.headers['Set-Cookie'],undefined);
 }finally{restore();}
});
