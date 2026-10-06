import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const rules=createRequire(import.meta.url)('../kmt-sa2/production-rules.js');
const src=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
test('current issue filter uses evidence, not job year; storage and history cannot re-enter',()=>{
 const rows=[{orderId:'251210A-143-01',state:'출고대기',recentEvent:'과거 이슈'},
 {orderId:'25-REAL-WORK',state:'조립 진행'}, {orderId:'26-DONE',actualDelivery:'2026-09-22'},
 {orderId:'26-FUTURE',state:'조립 예정',planTimeline:[{date:'2026-10-12',process:'조립'}]},
 {orderId:'26-UNKNOWN',state:'상태 확인'}, {orderId:'26-WORK',state:'조립 진행'}];
 rows.forEach(x=>x.team='B');rows.push({orderId:'260319A-020',team:'A',state:'조립 진행'},{orderId:'260319A-021',team:'A',state:'납품 전 마무리 작업 중'});
 const c=vm.createContext({HfProductionRules:rules,operationalRows:()=>rows,productionClass:x=>rules.classify(x,'2026-10-06')});
 vm.runInContext(src.slice(src.indexOf('function isCompletedOperational('),src.indexOf('function latestUnifiedInputByOrder(')),c);
 assert.deepEqual(Array.from(c.currentProductionRows(),x=>x.orderId),['25-REAL-WORK','26-WORK']);
 assert.equal(c.projectBucket(rows[0]),'waiting');assert.equal(c.projectBucket(rows[2]),'completed');assert.equal(c.projectBucket(rows[4]),'review');
 assert.notEqual(rules.classify({actualDelivery:'작업번호 삭제'},'2026-10-06'),'출고완료');
 assert.notEqual(rules.classify({state:'출고완료 예정'},'2026-10-06'),'출고완료');
 assert.notEqual(rules.classify({actualDelivery:'2027-01-01'},'2026-10-06'),'출고완료');
 const today=src.slice(src.indexOf('function todayIssues('),src.indexOf('function generalIssueForm('));
 assert.match(today,/currentProductionRows\(\)/);assert.doesNotMatch(today,/items\.filter|merged\.set/);
 assert.match(src.slice(src.indexOf('function renderUnifiedHome('),src.indexOf('function projectMetaCache(')),/reports\(\)/);
});
const engine=fs.readFileSync('apps-script/HF_REAL_SAFE_WRITE_V08.gs','utf8');
test('general issue normalization never resolves equipment; excluded date and closed gate preserved',()=>{
 const c=vm.createContext({Date,HF_SW:{TZ:'Asia/Seoul'},Utilities:{formatDate:d=>d.toISOString().slice(0,10)},
 parseDate_:raw=>new Date(raw.includes('9/14')?'2026-09-14T00:00:00Z':'2026-10-06T00:00:00Z'),
 safety_:()=> '2026-09-14',extractPeople_:()=>['테스트인원'],resolveProject_(){throw Error('must not resolve project');}});
 vm.runInContext(engine.slice(engine.indexOf('function normalEvent_('),engine.indexOf('function workType_(')),c);
 vm.runInContext(engine.slice(engine.indexOf('function generalEvent_('),engine.indexOf('function resolveEventProject_(')),c);
 const p={channel:'MOBILE|GENERAL_EVENT|SA2:owner',targetHint:'GENERAL_ISSUE',requester:'fixture@example.test',inputSheet:'MOBILE',inputRow:0};
 for(const raw of ['B팀 2명 A팀 조립 지원','260727A-060-01 고객명 출고완료 언급','공통 안전점검']){
  const e=c.normalEvent_({},raw,1,p);assert.equal(e.safe,true);assert.ok(['기타','타팀지원'].includes(e.type));assert.equal(e.orderId,'');assert.equal(e.link,'');assert.equal(e.customer,'');assert.equal(e.model,'');assert.equal(e.raw,raw);
 }
 const excluded=c.normalEvent_({},'9/14 인원지원',1,p);assert.equal(excluded.excluded,true);assert.equal(excluded.safe,false);
 assert.equal(c.normalEvent_({},'일반 이슈',1,{...p,requester:''}).safe,false);
 assert.match(engine,/if\(!fieldOpen_\(ss\)\).*e.safe=false/);
});
test('general receipt requires every exact raw event, no project linkage; no equipment state write',async()=>{
 let note={id:'g1',eventType:'GENERAL',text:'인원지원',requestId:'req1'},updates=[];
 const c=vm.createContext({notes:()=>[note],receiptState:()=> 'saved_unverified',updateNote:(id,p)=>{updates.push(p);Object.assign(note,p);},Date});
 vm.runInContext(src.slice(src.indexOf('async function verifyEventNote('),src.indexOf('async function syncProgressIssue(')),c);
 const good={requestId:'req1',events:[{status:'WRITTEN',orderId:'',raw:'인원지원'}]};
 assert.equal(await c.verifyEventNote('g1',good),true);assert.equal(note.status,'applied');
 assert.equal(await c.verifyEventNote('g1',{...good,events:[{...good.events[0],orderId:'wrong-project'}]}),false);
 assert.equal(note.status,'saved_unverified');
 const general=src.slice(src.indexOf('async function saveGeneralIssue('),src.indexOf('let todayIssueRecognition='));
 assert.match(general,/GENERAL_ISSUE/);assert.doesNotMatch(general,/action:'edit'|syncProgressIssue|submitUnifiedEvent/);
});
test('isolated Queue -> normalization -> safety gate -> journal readback across 36 general examples',()=>{
 let gate=true,statuses=[],written=[];
 const c=vm.createContext({Date,HF_SW:{TZ:'Asia/Seoul',SHEET:{FIELD:'field',WORK:'work'},ID:{FIELD:1,WORK:2}},Utilities:{formatDate:d=>d.toISOString().slice(0,10)},
 parseDate_:raw=>new Date(raw.includes('9/14')?'2026-09-14T00:00:00Z':'2026-10-06T00:00:00Z'),safety_:()=> '2026-09-14',extractPeople_:()=>[],
 getSheet_:()=>({}),fieldOpen_:()=>gate,appendNorm_:(ss,e)=>{statuses.push({e});return statuses.length-1;},setNormStatus_:(ss,n,s)=>statuses[n].status=s,
 setInputStatus_(){},writeWork_:(ss,e)=>{written.push({...e});return {ok:true,row:8+written.length};},dt_:()=> 'now'});
 for(const [a,b]of [['function processQueueRow_(','function processCorrection_('],['function processField_(','function workType_('],['function generalEvent_(','function resolveEventProject_(']])vm.runInContext(engine.slice(engine.indexOf(a),engine.indexOf(b)),c);
 const queue=[];const q={getRange:(r,col)=>({setValue:v=>queue.push([col,v]),clearContent(){}})};
 for(let i=0;i<36;i++){
  gate=i%3!==0;const raw=i%3===1?'9/14 인원지원':'공통 업무 '+i;
  const p={source:'FIELD_INPUT',channel:'MOBILE|GENERAL_EVENT',targetHint:'GENERAL_ISSUE',raw,inputSheet:'MOBILE',inputRow:0};
  c.processQueueRow_({},q,i+2,['Q'+i,'','','fixture@example.test',JSON.stringify(p),'QUEUED','',0]);
 }
 assert.equal(statuses.filter(x=>x.status==='REVIEW').length,12);assert.equal(statuses.filter(x=>x.status==='EXCLUDED').length,12);assert.equal(statuses.filter(x=>x.status==='WRITTEN').length,12);
 assert.equal(written.length,12);assert.ok(written.every(e=>!e.orderId&&!e.link&&e.actor==='fixture@example.test'));
 assert.equal(queue.filter(([col,v])=>col===6&&v==='DONE').length,36);
});
