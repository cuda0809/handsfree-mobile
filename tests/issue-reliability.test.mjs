import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const flow=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
const mobile=fs.readFileSync('kmt-sa2/mobile.js','utf8');
function run(c,start,end,src=flow){vm.runInContext(src.slice(src.indexOf(start),src.indexOf(end,src.indexOf(start))),c);}
test('ambiguous input retains draft and explains the required process choice; thrown submit unlocks',async()=>{
 for(const mode of ['decision','throw']){
  const field={value:'완료했음'},button={disabled:false},status={};let draft,previews=0;
  const c=vm.createContext({main:{querySelector:s=>s.includes('text=')?field:s.includes('status=')?status:button},saveTodayDraft:(k,v)=>draft=v,previewUnifiedEvent:()=>previews++,submitUnifiedEvent:async()=>{assert.equal(button.disabled,true);if(mode==='throw')throw Error('failed');return {ok:false,error:'decision_required'};}});
  run(c,'async function saveTodayIssue(','function openUnifiedEvent(');await c.saveTodayIssue('x');
  assert.equal(button.disabled,false);assert.equal(draft,'완료했음');assert.equal(field.value,draft);
  assert.match(status.textContent,mode==='decision'?/공정.*선택/:/초안을 보관/);assert.equal(previews,mode==='decision'?1:0);
 }
});
test('local history keeps missing equipment and general inputs, respects known team scope',()=>{
 const c=vm.createContext({notes:()=>[{id:1,orderId:'gone'},{id:2,orderId:'other'},{id:3}],items:[{orderId:'other'}],teamMatches:()=>false});
 run(c,'function visibleNotes(', '\n',mobile);assert.deepEqual(Array.from(c.visibleNotes(),x=>x.id),[1,3]);
});
test('receipt sweeps reach entries beyond the first five without resending',async()=>{
 const checked=[];const c=vm.createContext({notes:()=>Array.from({length:7},(_,id)=>({id,status:'unknown'})),checkEventReceipt:async id=>checked.push(id)});
 run(c,'let eventReceiptSweep=','function editLocalNote(');
 await c.reconcileEventReceipts();await c.reconcileEventReceipts();assert.deepEqual(checked,[0,1,2,3,4,5,6,0,1,2]);
});
test('NOT_FOUND and receipt read failure preserve uncertain status without a false saved claim',async()=>{
 for(const fail of [false,true]){
  const note={id:'n',status:'unknown',requestId:'only-an-id'};
  const c=vm.createContext({notes:()=>[note],updateNote:(id,p)=>Object.assign(note,p),appCall:async()=>{if(fail)throw Error('offline');return {status:'NOT_FOUND'};},appError:()=> '조회 실패'});
  run(c,'async function checkEventReceipt(','const eventReceiptTimers');await c.checkEventReceipt('n',true);
  assert.equal(note.status,'unknown');assert.doesNotMatch(note.ack,/서버 저장 응답 확인|서버 요청 전송/);
 }
});
test('verification failure does not promote unknown submission to saved',async()=>{
 const note={id:'n',status:'unknown'};const c=vm.createContext({notes:()=>[note],updateNote:(id,p)=>Object.assign(note,p),appCall:async()=>{throw Error('offline');}});
 run(c,'async function verifyEventNote(','async function syncProgressIssue(');assert.equal(await c.verifyEventNote('n'),false);assert.equal(note.status,'unknown');assert.match(note.ack,/저장 여부를 확인하지 못/);
});
test('closing an issue retains its equipment card and uses the protected renderer',()=>{
 let renders=0;const c=vm.createContext({items:[{orderId:'p',issueId:'i',process:'조립'}],coreProcessFromState:()=> '조립',corePriorityFromState:()=> 'normal',itemIdentity:x=>x.orderId,renderCoreScreen:()=>renders++});
 run(c,'function applyIssueReceiptLocal(','async function saveIssue(');c.applyIssueReceiptLocal({issueId:'i',issueStatus:'CLOSED',state:'조립 완료'});
 assert.equal(c.items.length,1);assert.equal(c.items[0].issueStatus,'CLOSED');assert.equal(renders,1);
});
test('general issue receipt outage retains save evidence, draft, and releases button',async()=>{
 const field={value:'공통 업무'},button={disabled:false},status={};let list=[];
 const c=vm.createContext({$:id=>id==='generalIssueText'?field:id==='generalIssueStatus'?status:button,unresolvedSameInput:()=>false,navigator:{onLine:true},crypto:{randomUUID:()=> 'n'},notes:()=>list,persist:(k,v)=>{if(k==='notes')list=v;},KEY:'notes',updateNote:(id,p)=>Object.assign(list.find(x=>x.id===id),p),api:async()=>({applied:true,status:'WRITTEN',requestId:'r'}),appCall:async()=>{throw Error('offline');}});
 run(c,'function receiptState(','const appReceiptBase');run(c,'async function saveGeneralIssue(','let todayIssueRecognition=');await c.saveGeneralIssue();
 assert.equal(button.disabled,false);assert.equal(field.value,'공통 업무');assert.equal(list[0].status,'saved_unverified');assert.match(status.textContent,/저장 응답은 받았습니다/);
});
test('refresh wrapper uses protected render; older event is visible and server history is accessible',()=>{
 const wrapper=flow.slice(flow.indexOf('const eventRefreshBase='),flow.indexOf('\nhome();',flow.indexOf('const eventRefreshBase=')));
 assert.match(wrapper,/renderCoreScreen/);assert.doesNotMatch(wrapper,/todayIssues\(/);
 const cards=flow.slice(flow.indexOf('function todayIssues('),flow.indexOf('function generalIssueForm('));
 assert.match(cards,/전체 서버 이력/);assert.doesNotMatch(cards,/recentEventAt.*===.*today/);
});
test('superseded submission verifies exact server history without reverting the current project',async()=>{
 for(const mismatch of [false,true]){
  const p={orderId:'p',projectId:'project',state:'테스트 진행',contentEvidence:{requestId:'new'}};
  const e={id:'old-E01',orderId:'p',status:'WRITTEN',raw:'조립 완료'};
  const c=vm.createContext({items:[{...p}],coreReadGeneration:0,projectHistoryCache:new Map(),coreCacheSave(){},renderCoreScreen(){},appCall:async b=>b.action==='core'?{ok:true,projects:[p]}:{orderId:'p',events:[{...e,requestId:mismatch?'wrong':'old'}]}});
  run(c,'async function readBackSubmittedProject(','async function verifyEventNote(');
  const promise=c.readBackSubmittedProject({orderId:'p',stateSyncVersion:'natural-v3',displayState:'조립 완료'},'old',{events:[e]});
  if(mismatch)await assert.rejects(promise,/history_mismatch/);else assert.equal((await promise).historical,true);
  assert.equal(c.items[0].state,'테스트 진행');
 }
});
