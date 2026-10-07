import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const rules=createRequire(import.meta.url)('../kmt-sa2/production-rules.js');
const source=fs.readFileSync('apps-script/HF_LIGHT_APP.gs','utf8');
const ctx=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function hfAppCurrentEvidence_'),source.indexOf('// READ projection only:')),ctx);
vm.runInContext(source.slice(source.indexOf('function hfAppDeliveryDay_'),source.indexOf('function hfAppDeliveryEvidence_')),ctx);
const job='260727A-060-02',today='2026-10-07';
const base={orderId:job,team:'B',state:'생산팀 조립자재 수령중',process:'조립',nextAction:'',updatedAt:'2026-10-03',recentEventAt:'2026-10-01 12:47:34 KST'};
function event(patch={}){const r=Array(23).fill('');Object.assign(r,{0:'REQ-E01',1:'2026-10-07 08:42:49 KST',2:'FIELD_INPUT',3:job+' 전장 완료 10/6',6:'2026-10-06',7:'일일작업',10:'· · 전장 완료 10/6',15:job,17:'WRITTEN',20:job},patch);return r;}
const run=(p,e)=>ctx.hfAppCurrentEvidence_([p],e,today)[0];
test('confirmed exact job event projects completion across devices without changing Core or manual next action',()=>{
 const e=event(),p={...base,nextAction:'개선품 확인'},before=JSON.stringify([p,e]);
 const out=run(p,[e]);assert.equal(out.state,'전장 완료');assert.equal(out.process,'전장');assert.equal(out.since,'2026-10-06');assert.equal(out.nextAction,'개선품 확인');assert.equal(out.stateEvidence.entryId,'REQ-E01');assert.equal(JSON.stringify([p,e]),before);
});
test('draft, failed, general, other equipment, future and older evidence cannot replace current state',()=>{
 for(const patch of [{17:'REVIEW'},{2:'GENERAL_EVENT'},{7:'기타'},{15:'OTHER'},{20:'OTHER'},{6:'2026-10-08'},{6:'2026-09-14'},{10:'전장 완료 예정'},{10:'전장 완료 아님'},{10:'전장 완료 여부 확인'},{3:job+' 260727A-060-03 전장 완료'}])assert.equal(run(base,[event(patch)]).state,base.state);
 for(const patch of [{team:'A'},{since:'2026-10-07'},{state:'검수 진행'},{recentEventAt:'2026-10-07 09:00:00 KST'},{actualDelivery:'2026-10-01'},{state:'출고완료'},{state:'출고대기'}])assert.equal(run({...base,...patch},[event()]).state,({...base,...patch}).state);
 assert.equal(run({...base,updatedAt:'2026-10-08'},[event()]).state,'전장 완료','a later collection does not roll confirmed business state back');
});
test('latest business date wins; late entry of older events does not roll progress back',()=>{
 const older=event({0:'OLD-E01',1:'2026-10-07 09:00:00 KST',6:'2026-10-05',10:'조립 완료 10/5'});
 assert.equal(run(base,[event(),older]).state,'전장 완료');
});
test('planned next action respects actual stage, preserved manual action and latest resolved schedule',()=>{
 const records=[{recordId:'BVERIFIED|1|a',sourceMonth:'2026-09',date:'2026-09-20',process:'검수',sourceRef:'old',status:'진행 중'},
 ...[['조립','2026-10-13'],['전장','2026-10-06'],['프로그램','2026-10-07'],['검수','2026-10-14'],['출고','2026-10-26']].map(([process,date],i)=>({recordId:'BVERIFIED|2|'+i,sourceMonth:'2026-10',process,date,sourceRef:'source',status:'진행 중'}))];
 const x={...base,...rules.resolve(records),state:'전장 완료'},before=JSON.stringify(x);
 assert.equal(rules.nextAction(x,today),'프로그램 · 2026-10-07');assert.equal(JSON.stringify(x),before);
 assert.equal(rules.nextAction({...x,nextAction:'추가 점검'},today),'추가 점검');
 assert.equal(rules.nextAction({...x,planSourceVerified:false},today),'다음 행동 확인 필요');
 assert.equal(rules.nextAction({...x,state:'전장 진행'},today),'전장 · 2026-10-06 (일정 경과 · 진행 확인)');
 assert.equal(rules.nextAction({...x,state:'출고완료'},today),'출고완료 · 이력 확인');
});
test('equipment receipt stays unverified when journal saved but current server state is stale',async()=>{
 const flow=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
 for(const fresh of [false,true]){
  const note={id:'n1',orderId:job,displayState:'전장 완료',stateSyncVersion:'natural-v3'};
  const c=vm.createContext({Date,notes:()=>[note],receiptState:()=> 'saved_unverified',updateNote:(_,p)=>Object.assign(note,p),readPending:null,refresh:async()=>true,
   items:[{orderId:job,state:fresh?'전장 완료':base.state,stateEvidence:fresh?{entryId:'REQ-E01'}:null,contentEvidence:fresh?{requestId:'REQ'}:null}]});
  vm.runInContext(flow.slice(flow.indexOf('async function verifyEventNote('),flow.indexOf('async function syncProgressIssue(')),c);
  assert.equal(await c.verifyEventNote('n1',{applied:true,status:'WRITTEN',requestId:'REQ'}),fresh);
  assert.equal(note.status,fresh?'applied':'saved_unverified');
 }
});
test('multiline issue reads back latest request without inventing state or overwriting manual action',()=>{
 const first=event({0:'NEW-E01',22:'NEW',6:'2026-10-06',10:'10/6 메인하우징 베어링 커버 조립 불가로 혜성 반출'});
 const second=event({0:'NEW-E02',22:'NEW',1:'2026-10-07 08:42:51 KST',6:'2026-10-07',10:'10/7 커버 입고 예정'});
 const p={...base,state:'조립 진행',since:'2026-10-01',nextAction:'담당자 확인'},before=JSON.stringify([p,first,second]);
 const out=run(p,[event({0:'OLD-E01',1:'2026-10-07 07:00:00 KST',10:'조립 진행'}),first,second]);
 assert.equal(out.currentIssue,first[10]+'\n'+second[10]);assert.equal(out.recentEvent,out.currentIssue);
 assert.equal(out.state,p.state);assert.equal(out.nextAction,p.nextAction);assert.equal(out.since,'2026-10-06');
 assert.deepEqual(Array.from(out.contentEvidence.entryIds),['NEW-E01','NEW-E02']);assert.equal(out.contentEvidence.requestId,'NEW');
 assert.equal(JSON.stringify([p,first,second]),before);
});
test('saved narrative receipt is not reported applied until exact request is visible',async()=>{
 const flow=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
 for(const fresh of [false,true]){
  const note={id:'n1',orderId:job,text:'커버 입고 예정'};
  const c=vm.createContext({Date,notes:()=>[note],receiptState:()=> 'saved_unverified',updateNote:(_,p)=>Object.assign(note,p),readPending:null,refresh:async()=>true,items:[{orderId:job,contentEvidence:{requestId:fresh?'NEW':'OLD'}}]});
  vm.runInContext(flow.slice(flow.indexOf('async function verifyEventNote('),flow.indexOf('async function syncProgressIssue(')),c);
  assert.equal(await c.verifyEventNote('n1',{applied:true,status:'WRITTEN',requestId:'NEW'}),fresh);
 }
});
