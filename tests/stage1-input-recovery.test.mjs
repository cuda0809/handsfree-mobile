import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
const helpers=src.slice(src.indexOf('function todayDraftKey('),src.indexOf('function previewUnifiedEvent('));
function harness(){
 const store=new Map(),records=[],controls={generalIssueText:{value:'fixture general'},generalIssueStatus:{},generalIssueSave:{disabled:false}};
 let writes=0;
 const c=vm.createContext({readStore:(k,f)=>store.has(k)?structuredClone(store.get(k)):f,persist:(k,v)=>store.set(k,structuredClone(v)),
 todayIssueTarget:key=>({orderId:key==='OLD'||key==='NEW'?'JOB':key,customer:'fixture',model:'M',issueId:''}),notes:()=>records,
 $:k=>controls[k],navigator:{onLine:true},crypto:{randomUUID:()=> 'fixture-submission'},KEY:'notes',Date,
 updateNote:(id,p)=>Object.assign(records.find(r=>r.id===id),p),api:async()=>{writes++;throw Error('timeout');}});
 vm.runInContext(helpers,c);
 vm.runInContext(src.slice(src.indexOf('async function saveGeneralIssue('),src.indexOf('let todayIssueRecognition=')),c);
 return {c,store,records,controls,writes:()=>writes};
}
test('equipment draft survives new render context and issue ID replacement using stable job identity',()=>{
 const h=harness();h.c.saveTodayDraft('OLD','unsent draft');assert.equal(h.c.todayDraft('NEW'),'unsent draft');
 const next=harness();for(const [k,v]of h.store)next.store.set(k,v);assert.equal(next.c.todayDraft('NEW'),'unsent draft');
 next.c.saveTodayDraft('NEW','');assert.equal(next.c.todayDraft('OLD'),'');
});
test('general uncertain write retains original and cannot be resent after reopening',async()=>{
 const h=harness();h.c.persist('hf-general-issue-draft','fixture general');await h.c.saveGeneralIssue();
 assert.equal(h.writes(),1);assert.equal(h.records[0].status,'unknown');assert.equal(h.records[0].text,'fixture general');
 assert.equal(h.store.get('hf-general-issue-draft'),'fixture general');h.controls.generalIssueSave.disabled=false;
 await h.c.saveGeneralIssue();assert.equal(h.writes(),1);assert.match(h.controls.generalIssueStatus.textContent,/미확인/);
});
test('equipment and general unresolved records do not block unrelated targets or texts',()=>{
 const h=harness();h.records.push({orderId:'JOB',text:'same',status:'unknown'},{eventType:'GENERAL',orderId:'',text:'general',status:'sending'});
 assert.ok(h.c.unresolvedSameInput('JOB','same'));assert.equal(h.c.unresolvedSameInput('OTHER','same'),undefined);
 assert.equal(h.c.unresolvedSameInput('JOB','different'),undefined);assert.ok(h.c.unresolvedSameInput('','general',true));
 h.records[0].status='applied';assert.equal(h.c.unresolvedSameInput('JOB','same'),undefined);
});
test('equipment unresolved submission is rejected before any write or classification',async()=>{
 const h=harness();h.records.push({orderId:'JOB',text:'same',status:'unknown'});
 vm.runInContext(src.slice(src.indexOf('async function submitUnifiedEvent('),src.indexOf("let todayIssueOpenId=")),h.c);
 const result=await h.c.submitUnifiedEvent('OLD','same');assert.equal(result.partial,true);assert.equal(h.writes(),0);
});
test('state edit readback can complete with matching current data and fails closed on mismatch',async()=>{
 const d={status:'APPLIED',issueId:'ISS',orderId:'JOB',state:'전장 완료',nextAction:'프로그램',issueStatus:'OPEN'};
 let shown=0,pending=0;
 const c=vm.createContext({items:[{...d}],readPending:null,appCall:async()=>({...d,status:'OPEN'}),refresh:async()=>true,
 applyIssueReceiptLocal(){},showIssueReceipt(){shown++;},open(){pending++;},heading:()=>'',esc:String});
 vm.runInContext(src.slice(src.indexOf('async function verifyIssueReceipt('),src.indexOf('function hybridProjectMatch(')),c);
 await c.verifyIssueReceipt(d);assert.equal(shown,1);assert.equal(pending,0);
 c.items=[];await c.verifyIssueReceipt(d);assert.equal(shown,1);assert.equal(pending,1);
});
