import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../kmt-sa2/app-flow.js',import.meta.url),'utf8');
const section=source.slice(source.indexOf('async function syncProgressIssue('),source.indexOf('async function verifyIssueReceipt('));
let rows,calls,current,items,failAfterApply;
const context=vm.createContext({
 crypto:{randomUUID:()=> 'issue-request-1'},
 notes:()=>rows,
 updateNote:(id,patch)=>Object.assign(rows.find(row=>row.id===id),patch),
 appError:()=> '연결 결과 확인 필요',
 readPending:null,
 get items(){return items;},
 set items(value){items=value;},
 applyIssueReceiptLocal(){},
 refresh:async()=>{items=[{issueId:current.issueId,orderId:current.orderId,state:current.state}];return true;},
 appCall:async body=>{
  calls.push(body);
  if(body.action==='issue')return {...current};
  if(body.action==='edit'){
   assert.equal(body.nextAction,'기존 다음 행동');
   assert.equal(body.status,'OPEN');
   current={...current,state:body.state,revision:'rev-2',requestId:body.requestId};
   if(failAfterApply)throw Error('network');
   return {status:'APPLIED',issueId:body.issueId,orderId:body.orderId,state:body.state,nextAction:body.nextAction,issueStatus:body.status,revision:'rev-2',requestId:body.requestId};
  }
  if(body.action==='receipt')return {status:'APPLIED',issueId:current.issueId,orderId:current.orderId,state:current.state,nextAction:current.nextAction,issueStatus:current.status,revision:current.revision,requestId:body.requestId};
 }
});
vm.runInContext(section,context);

function fresh(){
 rows=[{id:'note-1',issueId:'ISSUE-1',orderId:'P-1',text:'새 진행 상황\n상세 설명',displayState:'새 진행 상황',status:'saved_unverified',eventVerifiedAt:'now'}];
 calls=[];items=[];failAfterApply=false;
 current={issueId:'ISSUE-1',orderId:'P-1',state:'이전 상태',nextAction:'기존 다음 행동',status:'OPEN',revision:'rev-1'};
}

fresh();
assert.equal(await context.syncProgressIssue('note-1'),true);
assert.equal(calls.filter(call=>call.action==='edit').length,1);
assert.equal(calls.find(call=>call.action==='edit').state,'새 진행 상황');
assert.match(calls.find(call=>call.action==='edit').reason,/새 진행 상황/);
assert.equal(rows[0].status,'applied');
assert.ok(rows[0].verifiedAt);
assert.match(rows[0].ack,/다음 행동·일정은 그대로/);

fresh();failAfterApply=true;
assert.equal(await context.syncProgressIssue('note-1'),false);
assert.equal(rows[0].status,'partial');
failAfterApply=false;
assert.equal(await context.syncProgressIssue('note-1'),true);
assert.equal(calls.filter(call=>call.action==='edit').length,1);
assert.equal(rows[0].status,'applied');

console.log('PASS one progress submission updates current display, preserves next action, verifies readback and never resends an ambiguous edit');
