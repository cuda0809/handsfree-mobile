import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import write from '../api/write.js';
import unlock from '../api/unlock.js';

// Isolated shadow fixtures: no network, credentials, or operating-sheet writes.
const original = { env: { ...process.env }, fetch: globalThis.fetch };
const response = () => ({ headers: {}, setHeader(k,v){this.headers[k]=v;}, status(v){this.code=v;return this;}, json(v){this.body=v;return this;} });
async function call(handler, req) { const res=response(); await handler(req,res); return res; }
const utilities = {
  formatDate(d,tz,f) { const day=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(d); return f==='yyyy-MM-dd'?day:f==='yyyy'?day.slice(0,4):f==='yyyyMMdd'?day.replaceAll('-',''):day+'-120000'; },
  getUuid:()=>crypto.randomUUID(), DigestAlgorithm:{SHA_256:'sha256'}, Charset:{UTF_8:'utf8'},
  computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()]
};
try {
  Object.assign(process.env,{HF_REAL_READ_URL:'https://example.invalid/canonical',HF_REAL_READ_TOKEN:'shadow-token',HF_REAL_APP_KEY:'shadow-key'});
  let calls=[];
  globalThis.fetch=async(url,options)=>{ calls.push({url,options});return {ok:true,status:200,text:async()=>JSON.stringify({ok:true,status:'EXCLUDED',applied:false,requestId:'shadow-1'})}; };
  assert.equal((await call(write,{method:'GET',headers:{}})).code,405);
  assert.equal((await call(write,{method:'POST',headers:{},body:{text:'test'}})).code,401);
  assert.equal(calls.length,0);
  assert.equal((await call(unlock,{method:'POST',body:{key:'wrong'}})).code,401);
  const login=await call(unlock,{method:'POST',body:{key:'shadow-key'}});
  assert.equal(login.code,200);
  assert.match(login.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Strict/);
  const headers={cookie:login.headers['Set-Cookie'].split(';')[0]};
  assert.equal((await call(write,{method:'POST',headers,body:{text:'  '}})).code,400);
  const res=await call(write,{method:'POST',headers,body:{text:'2026-09-14 shadow',targetHint:'ORDER-2'}});
  assert.equal(res.body.status,'EXCLUDED'); assert.equal(res.body.applied,false);
  assert.equal(calls[0].url,process.env.HF_REAL_READ_URL);
  const payload=JSON.parse(calls[0].options.body); assert.equal(payload.targetHint,'ORDER-2'); assert.equal(payload.op,'safe_write');
  globalThis.fetch=async()=>({ok:true,status:200,text:async()=>'<html>sign in</html>'});
  assert.equal((await call(write,{method:'POST',headers,body:{text:'test'}})).body.error,'upstream_invalid_json');
  console.log('WRITE/auth/cookie/canonical routing/error: PASS');

  const context=vm.createContext({Utilities:utilities,console,Date});
  vm.runInContext(readFileSync(new URL('../apps-script/HF_REAL_SAFE_WRITE_V08.gs',import.meta.url),'utf8'),context);
  const products=[['ORDER-A','테스트고객A','MODEL-A'],['ORDER-B','테스트고객B','MODEL-B']];
  const ss={getSheetByName(name){return {getSheetId:()=>name==='HF_SYS_운영안전'?1907002001:0,getLastRow:()=>6,getRange:()=>({getDisplayValues:()=>name==='제품마스터'?products:[['Excluded Actual Date','2026-09-14']]})};}};
  let shadowCount=0;
  for(let i=0;i<15;i++){
    const excluded=context.normalEvent_(ss,`2026-09-14 ORDER-A 테스트고객A MODEL-A 검수 이상준 ${i}`,1,{});
    assert.equal(excluded.excluded,true);assert.equal(excluded.safe,false);shadowCount++;
    const ambiguous=context.normalEvent_(ss,`2026-09-16 알수없는대상 작업 ${i}`,1,{});
    assert.equal(ambiguous.safe,false);shadowCount++;
    const candidate=context.normalEvent_(ss,`2026-09-16 ORDER-B 테스트고객B MODEL-B 검수 이상준 ${i}`,1,{});
    assert.equal(candidate.excluded,false);assert.equal(candidate.safe,true);assert.equal(candidate.orderId,'ORDER-B');shadowCount++;
  }
  assert.equal(context.splitEvents_('a;b\nc').length,3);
  console.log(`Classifier shadow: ${shadowCount}/45 PASS (in-memory only; live E2E not asserted)`);

  const rows=[];let held=false,allowLock=true,releases=0;
  const queue={getSheetId:()=>1907002003,getLastRow:()=>rows.length+1,getMaxRows:()=>100,
    getRange(row,col,height=1,width=1){return {
      getDisplayValues:()=>Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>String(rows[row+i-2]?.[col+j-1]??''))),
      getDisplayValue:()=>String(rows[row-2]?.[col-1]??''),
      setValues(values){assert.equal(held,true,'queue write must hold lock');rows[row-2]=values[0];}
    };}};
  const bridgeSS={getId:()=> '1maCCn4XQogypiVAn0GZeEZUclxR7A9cLc-03FRmDxZM',getSheetByName(name){if(name==='HF_DATA_입력대기열')return queue;if(name==='HF_DATA_입력정규화')return {getSheetId:()=>1907002006,getLastRow:()=>1};return {getSheetId:()=>1907002001,getLastRow:()=>1,getRange:()=>({getDisplayValues:()=>[['Field Input Safe Write','OPEN']]})};}};
  const bridge=vm.createContext({Utilities:utilities,Date,PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'shadow-token'})},SpreadsheetApp:{openById:()=>bridgeSS,flush(){}},LockService:{getScriptLock:()=>({tryLock(){held=allowLock;return held;},releaseLock(){held=false;releases++;}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}});
  vm.runInContext(readFileSync(new URL('../apps-script/HF_REAL_MOBILE_WRITE_BRIDGE_V1.gs',import.meta.url),'utf8'),bridge);
  const post=(targetHint,token='shadow-token')=>bridge.doPost({postData:{contents:JSON.stringify({op:'safe_write',token,text:'2026-09-14 shadow',targetHint})}});
  assert.equal(post('A','wrong').error,'unauthorized');assert.equal(rows.length,0);
  assert.equal(post('A').status,'QUEUED');assert.equal(rows.length,1);
  assert.equal(post('A').status,'DUPLICATE');assert.equal(rows.length,1);
  assert.equal(post('B').status,'QUEUED');assert.equal(rows.length,2);assert.equal(releases,3);
  allowLock=false;assert.equal(post('C').error,'queue_lock_busy');assert.equal(rows.length,2);
  assert.equal(held,false);
  console.log('Mobile bridge token/queue lock/target dedupe: PASS (mock service)');
} finally { process.env=original.env;globalThis.fetch=original.fetch; }
