import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const mobile=fs.readFileSync(new URL('../kmt/mobile.js',import.meta.url),'utf8');
const flow=fs.readFileSync(new URL('../kmt/app-flow.js',import.meta.url),'utf8');
let list=[],calls=[],writes=0,online=true,readOK=true,historyMatch=true,html='',shown=0;
let receipt={ok:true,status:'WRITTEN',applied:true,requestId:'HF-1',events:[{id:'HF-1-E01',status:'WRITTEN',orderId:'P-1',raw:'latest'}]};
const els={inputTarget:{value:'P-1'},draft:{value:'latest'},inputHint:{},sheetBody:{insertAdjacentHTML(){},querySelector:()=>({})},issueSaveButton:{disabled:false},issueSaveHint:{isConnected:true}};
const c=vm.createContext({crypto:{randomUUID:()=>`submission-${writes++}-unique-id`},navigator:{get onLine(){return online;}},notes:()=>list,updateNote:(id,p)=>Object.assign(list.find(r=>r.id===id),p),persist:(k,a)=>{list=a;},KEY:'notes',DRAFT:'draft',localStorage:{removeItem(){}},readStore:()=>null,$:id=>els[id],editingNoteId:null,saveNote(){},receiptDetail(){},input(){},appInputBase(){},readPending:null,items:[],screen:'home',home(){},work(){},esc:String,heading:(...a)=>a.join(' '),open:s=>{html=s;},toast:s=>{html=s;},scheduleErrors:{},refresh:async()=>readOK,showIssueReceipt:()=>shown++,appCall:async b=>{calls.push(b);if(b.action==='receipt')return receipt;if(b.action==='history')return {orderId:b.orderId,events:historyMatch?receipt.events.map(e=>({...e,requestId:receipt.requestId})):[]};if(b.action==='issue')return c.current;},api:async(p,b)=>{calls.push(b);return receipt;}});
function run(src,start,end){vm.runInContext(src.slice(src.indexOf(start),end?src.indexOf(end,src.indexOf(start)):undefined),c);}
run(flow,'function appError(','function appFailure(');
run(flow,'function receiptState(','const appReceiptBase');
run(flow,'function canSendNote(','\nhome();');
run(mobile,'async function sendNote(','async function refreshAndShow');
run(flow,'function editLocalNote(','function canSendNote(');
const fresh=()=>{list=[{id:'local-1',submissionId:'submission-original',target:'P-1',text:'old',status:'draft',createdAt:'2026-09-29'}];calls=[];online=true;historyMatch=true;readOK=true;};
fresh();c.editingNoteId='local-1';await c.saveEditedAndSend();assert.equal(list[0].text,'latest');assert.equal(list[0].revisions[0].text,'old');assert.notEqual(list[0].submissionId,'submission-original');assert.equal(list[0].status,'applied');assert.ok(list[0].verifiedAt);assert.equal(calls.filter(x=>x.op==='safe_write').length,1);assert.equal(calls[0].text,'P-1 latest');await c.sendNote('local-1');assert.equal(calls.filter(x=>x.op==='safe_write').length,1);
console.log('PASS edited latest text, one explicit write, original retention, new submission and receipt/history readback');
fresh();online=false;c.editingNoteId='local-1';await c.saveEditedAndSend();assert.equal(list[0].text,'latest');assert.equal(list[0].status,'draft');assert.equal(calls.length,0);
fresh();historyMatch=false;await c.sendNote('local-1');assert.equal(list[0].status,'saved_unverified');assert.ok(!list[0].verifiedAt);
fresh();readOK=false;await c.sendNote('local-1');assert.equal(list[0].status,'saved_unverified');
console.log('PASS offline edit preservation and failed/mismatched readback stays pending');
fresh();list[0].status='unknown';assert.equal(c.canSendNote(list[0],true),false);list.push({id:'copy',status:'draft',copiedFrom:'local-1'});await c.sendNote('copy');assert.equal(calls.length,0);
fresh();list[0].status='applied';assert.equal(c.canSendNote(list[0],true),false);
for(const [status,error,pattern] of [[401,'personal_login_required',/개인 Google 로그인/],[403,'forbidden',/권한/],[401,'unauthorized',/로그인 상태/]]){fresh();c.api=async()=>{throw Object.assign(Error(error),{status,data:{error}});};await c.sendNote('local-1');assert.equal(list[0].status,'rejected');assert.match(list[0].ack,pattern);assert.doesNotMatch(list[0].ack,/만료/);}
fresh();c.api=async()=>{throw Error('network');};await c.sendNote('local-1');assert.equal(list[0].status,'unknown');
console.log('PASS unresolved ancestor and old unverified receipt blocked; login/permission/network distinguished');
run(mobile,'const labels=','function receiptDetail(');fresh();list.push({id:'done',status:'applied',verifiedAt:'now',target:'saved',text:'history',createdAt:'2026-09-29'});c.showInbox();assert.ok(html.indexOf('확인 필요')<html.indexOf('old'));assert.ok(html.indexOf('저장 완료')<html.indexOf('history'));assert.equal(list.length,2);
run(flow,'function applyIssueReceiptLocal(','async function saveIssue(');c.items=[{id:0,issueId:'closed'},{id:1,issueId:'remaining'}];c.applyIssueReceiptLocal({issueId:'closed',issueStatus:'CLOSED'});assert.equal(c.items[0].id,0);assert.equal(c.items[0].issueId,'remaining');
const d={status:'APPLIED',issueId:'remaining',orderId:'P-1',state:'new',nextAction:'next',issueStatus:'OPEN'};c.current={...d,status:'OPEN'};c.items=[{...d,id:0}];readOK=true;await c.verifyIssueReceipt(d);assert.equal(shown,1);c.current.state='other';await c.verifyIssueReceipt(d);assert.equal(shown,1);assert.match(html,/재조회 확인 필요/);c.current={...d,status:'OPEN'};readOK=false;await c.verifyIssueReceipt(d);assert.equal(shown,1);
console.log('PASS inbox separation preserves records; closing reindexes remaining issue; state success requires both reads');

