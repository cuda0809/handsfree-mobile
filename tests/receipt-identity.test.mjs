import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../apps-script/HF_LIGHT_APP.gs',import.meta.url),'utf8');
function fixture(){
  const queue=Array(15).fill('');
  Object.assign(queue,{0:'request-old',3:'writer@example.invalid',4:JSON.stringify({submissionId:'submission-old-0001',raw:'JOB 조립 완료',targetHint:'JOB'}),5:'DONE'});
  const event=Array(23).fill('');
  Object.assign(event,{0:'request-old-E01',3:'JOB 조립 완료',17:'WRITTEN',20:'JOB'});
  const c=vm.createContext({hfAppRows_:(_ss,name)=>name==='HF_DATA_입력대기열'?[[],queue]:[[],event],hfLsFail_:message=>{throw Error(message);}});
  vm.runInContext(source,c);
  c.hfAppRows_=(_ss,name)=>name==='HF_DATA_입력대기열'?[[],queue]:[[],event];
  return {c,queue,event,body:{actor:{email:'writer@example.invalid'},text:'JOB 조립 완료',targetHint:'JOB'}};
}
test('unreceived request cannot inherit a previous identical-text save',()=>{
  const {c,body}=fixture();
  const r=c.hfAppReceipt_({}, {...body,submissionId:'submission-new-0002'});
  assert.equal(r.status,'NOT_FOUND');
  assert.notEqual(r.applied,true);
});
test('received submission recovers its original receipt after response loss',()=>{
  const {c,body}=fixture();
  const r=c.hfAppReceipt_({}, {...body,submissionId:'submission-old-0001'});
  assert.equal(r.requestId,'request-old');assert.equal(r.status,'WRITTEN');assert.equal(r.events.length,1);
});
test('explicit missing request ID never falls back to matching text',()=>{
  const {c,body}=fixture();assert.equal(c.hfAppReceipt_({}, {...body,requestId:'request-missing'}).status,'NOT_FOUND');
});
test('legacy text-only lookup remains compatible and requester isolated',()=>{
  const {c,body}=fixture();assert.equal(c.hfAppReceipt_({},body).requestId,'request-old');
  assert.equal(c.hfAppReceipt_({}, {...body,actor:{email:'other@example.invalid'}}).status,'NOT_FOUND');
});

test('member receipt identity preserves exact submission isolation after login migration',()=>{
  const {c,queue,body}=fixture();
  c.hfMemberRequester_=actor=>actor.queueIdentity||actor.email;
  queue[3]='HFU-007|이상준';
  const member={...body,actor:{email:'writer@example.invalid',queueIdentity:'HFU-007|이상준'}};
  assert.equal(c.hfAppReceipt_({}, {...member,submissionId:'submission-old-0001'}).requestId,'request-old');
  assert.equal(c.hfAppReceipt_({}, {...member,submissionId:'submission-new-0002'}).status,'NOT_FOUND');
  assert.equal(c.hfAppReceipt_({}, {...member,actor:{...member.actor,queueIdentity:'HFU-002|다른팀장'},submissionId:'submission-old-0001'}).status,'NOT_FOUND');
});
