import fs from 'node:fs';import vm from 'node:vm';import test from 'node:test';import assert from 'node:assert/strict';
const source=fs.readFileSync('kmt-sa2/app-flow.js','utf8'),helpers=fs.readFileSync('kmt-sa2/issue-recovery.js','utf8');
const body=(id='old',job='A')=>({action:'edit',requestId:id,issueId:'ISS-'+job,orderId:job,state:'검수 완료',nextAction:'출고 확인',status:'OPEN',reason:'현장 확인',expected:'revision'});
const receipt=b=>({ok:true,status:'APPLIED',requestId:b.requestId,issueId:b.issueId,orderId:b.orderId,state:b.state,nextAction:b.nextAction,issueStatus:b.status,reason:b.reason});
function harness(legacy=null,currentJob='A'){
 const store=new Map(legacy?[['hf-issue-pending',structuredClone(legacy)]]:[]),calls=[],controls={issueSaveButton:{disabled:false,isConnected:true},issueSaveHint:{isConnected:true},issueState:{value:'출고 대기'},issueNext:{value:'포장'},issueStatus:{value:'OPEN'},issueReason:{value:'새로운 현장 내용'}};let html='';
 const c=vm.createContext({Date,readStore:(k,f)=>store.has(k)?structuredClone(store.get(k)):f,persist:(k,v)=>store.set(k,structuredClone(v)),localStorage:{removeItem:k=>store.delete(k)},appIssue:{issueId:'ISS-'+currentJob,orderId:currentJob,revision:'revision'},$:id=>controls[id],crypto:{randomUUID:()=> 'new-request'},appCall:async b=>{calls.push(b);if(b.action==='receipt')return legacy?receipt(legacy):{status:'NOT_FOUND'};return receipt(b);},showIssueReceiptPending(){},setTimeout(){},appError:()=> '응답 실패',heading:(...v)=>v.join(' '),esc:String,open:s=>html=s,toast:s=>html=s});
 vm.runInContext(helpers,c);const start=source.indexOf('async function saveIssue(');vm.runInContext(source.slice(start,source.indexOf('function showIssueReceiptPending(',start)),c);
 return {c,store,calls,controls,html:()=>html};
}
test('unrelated unresolved state request is archived and never blocks the next job',async()=>{
 const old=body('old','B'),h=harness(old);h.c.appCall=async b=>{h.calls.push(b);return b.action==='edit'?receipt(b):{status:'NOT_FOUND'};};await h.c.saveIssue();
 assert.equal(h.calls.filter(b=>b.action==='edit').length,1);assert.equal(h.calls[0].orderId,'A');const records=h.c.issueRequestHistory();assert.equal(records.find(x=>x.requestId==='old').phase,'pending');assert.equal(records.find(x=>x.requestId==='new-request').phase,'confirmed');assert.equal(h.store.has('hf-issue-pending'),false);assert.equal(h.controls.issueSaveButton.disabled,false);
});
test('previous exact saved request unlocks a new edit even when its view was not refreshed',async()=>{
 const h=harness(body());await h.c.saveIssue();assert.deepEqual(h.calls.map(b=>b.action),['receipt','edit']);assert.equal(h.c.issueRequestHistory().filter(x=>x.phase==='confirmed').length,2);
});
test('unknown or mismatched previous state cannot be resubmitted; the new draft is preserved',async()=>{
 for(const mode of ['missing','mismatch','offline']){const h=harness(body());h.c.appCall=async b=>{h.calls.push(b);if(mode==='offline')throw Error('offline');return mode==='missing'?{status:'NOT_FOUND'}:{...receipt(body()),orderId:'OTHER'};};await h.c.saveIssue();assert.equal(h.calls.some(x=>x.action==='edit'),false);assert.equal(h.controls.issueReason.value,'새로운 현장 내용');assert.equal(h.store.get('hf-issue-drafts-v1')['ISS-A'].reason,'새로운 현장 내용');assert.equal(h.c.issueRequestHistory()[0].phase,'pending');assert.equal(h.controls.issueSaveButton.disabled,false);}
});
test('saved reply stays confirmed when view refresh fails and an older reply cannot clear a newer cursor',async()=>{
 const old=body(),h=harness(old);h.c.confirmIssueRequest(receipt(old));const newer=body('newer','B');h.c.rememberIssueRequest(newer,'pending');h.store.set('hf-issue-pending',newer);h.c.appCall=async()=>{throw Error('read unavailable')};
 const start=source.indexOf('async function verifyIssueReceipt(');vm.runInContext(source.slice(start,source.indexOf('function hybridProjectMatch(',start)),h.c);await h.c.verifyIssueReceipt(receipt(old));assert.equal(h.c.issueRequestHistory().find(r=>r.requestId==='old').phase,'confirmed');assert.equal(h.store.get('hf-issue-pending').requestId,'newer');assert.match(h.html(),/서버 저장 이력 확인/);assert.match(h.html(),/새 수정은 가능합니다/);
});
test('closed equipment can remain visible and still pass exact state readback',async()=>{
 const b={...body(),status:'CLOSED',nextAction:''},h=harness(b);let shown=0;Object.assign(h.c,{items:[{issueId:b.issueId,orderId:b.orderId,state:b.state,nextAction:'',issueStatus:'CLOSED'}],readPending:null,refresh:async()=>true,appCall:async()=>({...receipt(b),status:'CLOSED'}),applyIssueReceiptLocal(){},showIssueReceipt(){shown++;}});const start=source.indexOf('async function verifyIssueReceipt(');vm.runInContext(source.slice(start,source.indexOf('function hybridProjectMatch(',start)),h.c);await h.c.verifyIssueReceipt(receipt(b));assert.equal(shown,1);
});
test('only exact journal request, job, raw lines and all-WRITTEN proof allows editing while view lags',()=>{
 const h=harness(),r={id:'local',orderId:'260714A-054',target:'260714A-054 · 고객 · DCM',text:'FAT 진행 완료\n[공정 확인] 검수 진행',status:'saved_unverified',eventType:'PROGRESS',requestId:'REQ'};
 const d={applied:true,status:'WRITTEN',requestId:'REQ',events:r.text.split('\n').map((v,i)=>({id:'REQ-E0'+(i+1),raw:r.target+' '+v,orderId:r.orderId,status:'WRITTEN'}))};
 assert.equal(h.c.eventJournalConfirmed(r,d),true);for(const patch of [{requestId:'OTHER'},{events:[{...d.events[0],orderId:'OTHER'},d.events[1]]},{events:[d.events[0]]},{events:[{...d.events[0],raw:'wrong'},d.events[1]]}])assert.equal(h.c.eventJournalConfirmed(r,{...d,...patch}),false);
 let records=[r];Object.assign(h.c,{notes:()=>records});const start=source.indexOf('function canSendNote(');vm.runInContext(source.slice(start,source.indexOf('async function saveEditedAndSend(',start)),h.c);assert.equal(h.c.canSendNote(r,true),false);r.eventVerifiedAt='confirmed';assert.equal(h.c.canSendNote(r,true),true);records.push({id:'copy',copiedFrom:'local',status:'draft'});assert.equal(h.c.canSendNote(records[1]),true);r.status='sending';assert.equal(h.c.canSendNote(records[1]),false);
});
test('old-login receipt can be recovered from authorized history using exact request identity, never text alone',async()=>{
 const h=harness(),r={orderId:'260714A-054',target:'260714A-054 · 고객 · DCM',text:'FAT 진행 완료\n[공정 확인] 검수 진행',status:'saved_unverified',eventType:'PROGRESS',requestId:'HF-20261023-103405-a473a2e6'};
 const events=r.text.split('\n').map((v,i)=>({id:r.requestId+'-E0'+(i+1),requestId:r.requestId,projectId:r.orderId,raw:r.target+' '+v,status:'WRITTEN'}));
 h.c.appCall=async b=>{assert.equal(b.action,'history');assert.equal(b.orderId,r.orderId);return {orderId:r.orderId,events:events.toReversed()}};
 assert.equal((await h.c.recoverJournalFromHistory(r)).receiptSource,'history');assert.equal(await h.c.recoverJournalFromHistory({...r,requestId:'missing'}),null);assert.equal(await h.c.recoverJournalFromHistory({...r,requestId:''}),null);
 h.c.appCall=async()=>({orderId:r.orderId,events:[{...events[0],raw:'different'},events[1]]});assert.equal(await h.c.recoverJournalFromHistory(r),null);
});
test('same text with a changed explicit process is a new correction only after prior journal proof',()=>{
 const h=harness(),r={orderId:'JOB',originalText:'FAT 완료',text:'FAT 완료\n[공정 확인] 검수 진행',displayState:'검수 진행',status:'saved_unverified'};h.c.notes=()=>[r];const start=source.indexOf('function unresolvedSameInput(');vm.runInContext(source.slice(start,source.indexOf('function previewUnifiedEvent(',start)),h.c);
 assert.equal(h.c.unresolvedSameInput('JOB','FAT 완료',false,'검수 완료'),r);r.eventVerifiedAt='confirmed';assert.equal(h.c.unresolvedSameInput('JOB','FAT 완료',false,'검수 완료'),undefined);assert.equal(h.c.unresolvedSameInput('JOB','FAT 완료',false,'검수 진행'),r);
});
test('installation information distinguishes native APK from home-screen web app without changing either',()=>{
 for(const [agent,standalone,expected] of [['Android HandsFreeNative/2.8.6',false,'설치형 Android 앱'],['Android',true,'홈 화면에 설치한 웹 앱'],['Android; wv)',false,'Android 앱 내부 화면'],['Chrome',false,'웹브라우저']]){const c=vm.createContext({navigator:{userAgent:agent},window:{matchMedia:()=>({matches:standalone})}});vm.runInContext(helpers,c);assert.ok(c.handsFreeInstallation().label.includes(expected));assert.ok(c.handsFreeInstallation().icon);}
});
