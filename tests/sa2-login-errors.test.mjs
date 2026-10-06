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
test('login UI distinguishes server failure from PIN denial and retains input',async()=>{
 const source=readFileSync(new URL('../kmt-sa2/login.js',import.meta.url),'utf8');
 for(const error of ['not_configured','pin_denied','invalid_origin','server_error','too_many_attempts','timeout']){
  const elements=Object.fromEntries(['status','setup','logout','displayName','pin','activateBtn'].map(k=>[k,{hidden:false,value:k==='pin'?'1234':k==='displayName'?'Fixture':''}]));
  let navigated=false;
  const context={document:{getElementById:k=>elements[k],querySelectorAll:()=>[]},AbortController,setTimeout,clearTimeout,
   location:{replace:()=>{navigated=true;}},fetch:async()=>{if(error==='timeout')throw Object.assign(new Error('timeout'),{name:'AbortError'});return {ok:false,status:error==='too_many_attempts'?429:error==='pin_denied'?401:503,json:async()=>({ok:false,error})};}};
  vm.createContext(context);vm.runInContext(source,context);
  await new Promise(resolve=>setImmediate(resolve));
  await elements.activateBtn.onclick();
  assert.equal(navigated,false);assert.equal(elements.pin.value,'1234');assert.equal(elements.activateBtn.disabled,false);
  const message=elements.status.textContent;
  if(error==='not_configured')assert.match(message,/설정이 누락/);
  else if(error==='pin_denied')assert.match(message,/PIN이 일치하지/);
  else if(error==='too_many_attempts')assert.match(message,/시도 횟수/);
  else if(error==='timeout')assert.match(message,/시간이 초과/);
  else assert.doesNotMatch(message,/PIN이 일치하지/);
 }
});
