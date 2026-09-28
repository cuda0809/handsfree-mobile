// Only the existing isolated copy is writable by this verifier.
function verifyLightAppIsolated(){
 var id='1vPLZCBdloeOK52Xm6nQmIyfhzvMtCoblXW2w0a7wFSo';if(id===HF_SPREADSHEET_ID)throw Error('production_test_forbidden');
 var ss=SpreadsheetApp.openById(id);if(ss.getName()!=='HF_LIGHT_V1_일정검증_격리사본_20260928')throw Error('wrong_test_copy');
 var issue='ISS-20260907-014',s=hfAppIssueSnapshot_(ss),v=hfAppIssueView_(s,issue),before=hfAppIssueRecord_(s,issue).row;
 var b={action:'edit',issueId:issue,orderId:v.orderId,expected:v.revision,state:v.state==='격리 검증 완료'?'격리 재검증 완료':'격리 검증 완료',nextAction:'격리 사본 저장·재조회 확인',status:'OPEN',reason:'Light v1 상태 수정 격리 검증',requestId:Utilities.getUuid(),actor:{sub:'isolated-editor-verifier',email:Session.getEffectiveUser().getEmail()}};
 var lock=LockService.getScriptLock();lock.waitLock(8000);try{
 var r=hfAppIssueApply_(ss,b),again=hfAppIssueApply_(ss,b),fresh=hfAppIssueSnapshot_(ss),after=hfAppIssueRecord_(fresh,issue).row;
 if(r.requestId!==again.requestId||fresh.audit.filter(function(x){return x[0]===b.requestId;}).length!==1||after[16]!==b.state||after[18]!==b.nextAction||after[0]!==before[0]||after[3]!==before[3]||after[7]!==before[7])throw Error('verification_failed');
 var stale=false;try{hfAppIssueBuild_(fresh,Object.assign({},b,{requestId:Utilities.getUuid()}),new Date().toISOString());}catch(e){stale=e.message==='stale_record';}if(!stale)throw Error('stale_guard_failed');
 console.log(JSON.stringify({ok:true,test:'APP_ISSUE_ISOLATED_PASS',requestId:b.requestId,state:after[16],nextAction:after[18],identityPreserved:true,auditOnce:true,duplicateNoWrite:true,staleBlocked:true,productionTouched:false}));
 }finally{lock.releaseLock();}
}
function activateLightApp(){PropertiesService.getScriptProperties().setProperty('HF_LIGHT_APP_OPEN','OPEN');console.log('HF_LIGHT_APP_OPEN=OPEN');}
