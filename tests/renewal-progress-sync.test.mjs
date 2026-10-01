import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../handsfree-renewal/app-flow.js',import.meta.url),'utf8');
const section=source.slice(source.indexOf('async function syncProgressIssue('),source.indexOf('async function verifyIssueReceipt('));
let rows,calls,current,visibleItems,failAfterApply;
const context=vm.createContext({
 crypto:{randomUUID:()=> 'issue-request-renewal-1'},
 notes:()=>rows,
 updateNote:(id,patch)=>Object.assign(rows.find(row=>row.id===id),patch),
 appError:()=> '연결 결과 확인 필요',
 readPending:null,
 get items(){return visibleItems;},
 set items(value){visibleItems=value;},
 applyIssueReceiptLocal(){},
 refresh:async()=>{
  visibleItems=[{issueId:current.issueId,orderId:current.orderId,state:current.state,nextAction:current.nextAction}];
  context.items=visibleItems;
  return true;
 },
 appCall:async body=>{
  calls.push(body);
  if(body.action==='issue')return {...current};
  if(body.action==='edit'){
   assert.equal(body.state,'조립 완료');
   assert.equal(body.nextAction,'전장 배선 시작');
   assert.equal(body.status,'OPEN');
   current={...current,state:body.state,nextAction:body.nextAction,revision:'rev-2',requestId:body.requestId};
   if(failAfterApply)throw Error('network');
   return {status:'APPLIED',issueId:body.issueId,orderId:body.orderId,state:body.state,nextAction:body.nextAction,issueStatus:body.status,revision:'rev-2',requestId:body.requestId};
  }
  if(body.action==='receipt')return {status:'APPLIED',issueId:current.issueId,orderId:current.orderId,state:current.state,nextAction:current.nextAction,issueStatus:current.status,revision:current.revision,requestId:body.requestId};
 }
});
vm.runInContext(section,context);

function fresh(){
 rows=[{id:'note-r1',issueId:'ISSUE-R1',orderId:'P-R1',text:'조립 완료\n전장 배선 시작',displayState:'조립 완료',nextAction:'전장 배선 시작',status:'saved_unverified',eventVerifiedAt:'now'}];
 calls=[];visibleItems=[];context.items=visibleItems;failAfterApply=false;
 current={issueId:'ISSUE-R1',orderId:'P-R1',state:'조립 진행',nextAction:'조립 완료 확인',status:'OPEN',revision:'rev-1'};
}

fresh();
assert.equal(await context.syncProgressIssue('note-r1'),true);
assert.equal(calls.filter(call=>call.action==='edit').length,1);
assert.equal(rows[0].status,'applied');
assert.ok(rows[0].verifiedAt);
assert.match(rows[0].ack,/업무이력·현재상태·다음행동/);

fresh();failAfterApply=true;
assert.equal(await context.syncProgressIssue('note-r1'),false);
assert.equal(rows[0].status,'partial');
failAfterApply=false;
assert.equal(await context.syncProgressIssue('note-r1'),true);
assert.equal(calls.filter(call=>call.action==='edit').length,1);
assert.equal(rows[0].status,'applied');

fresh();current={...current,state:'조립 완료',nextAction:'전장 배선 시작',revision:'rev-existing'};
assert.equal(await context.syncProgressIssue('note-r1'),true);
assert.equal(calls.filter(call=>call.action==='edit').length,0);

console.log('PASS Renewal writes state and next action together, verifies both readbacks, and never resends an ambiguous edit');
