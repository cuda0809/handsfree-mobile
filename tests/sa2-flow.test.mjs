import fs from 'node:fs';
import assert from 'node:assert/strict';
import handler from '../api/sa2-write.js';
import {sa2Cookie} from '../lib/sa2-auth.mjs';

const mobile=fs.readFileSync(new URL('../kmt-sa2/mobile.js',import.meta.url),'utf8');
const flow=fs.readFileSync(new URL('../kmt-sa2/app-flow.js',import.meta.url),'utf8');
const schedule=fs.readFileSync(new URL('../kmt-sa2/schedule.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../kmt-sa2/sw.js',import.meta.url),'utf8');
const androidBuild=fs.readFileSync(new URL('../android/app/build.gradle',import.meta.url),'utf8');
const androidMain=fs.readFileSync(new URL('../android/app/src/main/java/com/handsfree/mobile/MainActivity.java',import.meta.url),'utf8');

assert.match(mobile,/BUILD='2026\.09\.29\.SA2\.5'/);
assert.match(mobile,/api\('\/api\/sa2-real-status'/);
assert.match(mobile,/api\('\/api\/sa2-write'/);
assert.match(mobile,/확인 필요/);
assert.match(mobile,/저장 완료/);
assert.match(mobile,/saved_unverified/);
assert.match(mobile,/function resumeRead\(/);
assert.doesNotMatch(mobile,/\/api\/sa2-plans/);
assert.match(flow,/api\('\/api\/sa2-app'/);
assert.match(flow,/async function verifyEventNote\(/);
assert.match(flow,/async function verifyIssueReceipt\(/);
assert.match(schedule,/api\('\/api\/sa2-lifecycle'/);
assert.match(schedule,/await showScheduleReceipt\(d\)/);
assert.match(schedule,/readback_mismatch/);
assert.match(sw,/kmt-sa2-prod-sa25/);
assert.match(sw,/startsWith\('kmt-sa2-prod-'\)/);
assert.match(androidBuild,/applicationId 'com\.handsfree\.mobile\.sa24'/);
assert.match(androidBuild,/versionCode 2/);
assert.match(androidBuild,/versionName 'SA2\.5-2026\.09\.29'/);
assert.match(androidMain,/\/kmt-sa2\/\?app=sa25/);

Object.assign(process.env,{
  HF_REAL_APP_KEY:'test-app-key',
  HF_REAL_READ_TOKEN:'test-read-token',
  HF_REAL_READ_URL:'https://example.invalid/exec'
});
const cookie=sa2Cookie({sub:'sa2-test',email:'SA2:테스트',label:'테스트'});
let calls=[];
globalThis.fetch=async(_url,options)=>{
  calls.push(JSON.parse(options.body));
  return {ok:true,text:async()=>JSON.stringify({ok:true,applied:true,status:'WRITTEN',requestId:'HF-SA2-test'})};
};
async function call({authorized=true,origin='https://app.test'}={}){
  const req={method:'POST',headers:{host:'app.test',origin,...(authorized?{cookie}: {})},body:{text:'격리 검증',submissionId:'sa2-test-submission-0001',requester:'spoofed'}};
  const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}};
  await handler(req,res);
  return res;
}
assert.equal((await call({authorized:false})).code,401);
assert.equal((await call({origin:'https://evil.test'})).code,403);
assert.equal(calls.length,0);
const ok=await call();
assert.equal(ok.code,200);
assert.equal(ok.body.status,'WRITTEN');
assert.equal(calls.length,1);
assert.equal(calls[0].requester,'SA2:테스트');
assert.equal(calls[0].submissionId,'sa2-test-submission-0001');
console.log('PASS SA2.5 auth, explicit write identity, readback UI contracts, resume refresh and cache update');
