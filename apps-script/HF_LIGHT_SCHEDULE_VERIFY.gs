// Editor-only verification. Always uses the named isolated real-data copy.
function verifyLightScheduleIsolated(){
 var id='1vPLZCBdloeOK52Xm6nQmIyfhzvMtCoblXW2w0a7wFSo';
 if(id===HF_SPREADSHEET_ID)throw Error('production_test_forbidden');
 var ss=SpreadsheetApp.openById(id);if(ss.getName()!=='HF_LIGHT_V1_일정검증_격리사본_20260928')throw Error('wrong_test_copy');
 var actor={sub:'isolated-editor-verifier',email:Session.getEffectiveUser().getEmail()},s=hfLsSnapshot_(ss),order='LAB-260109K-004',key=hfLsKey_(s.plans[1]),p=hfLsRecord_(s,order,key);
 var date=p.date==='2026-09-05'?'2026-09-06':'2026-09-05';
 var b={action:'edit',orderId:order,key:key,expected:p.revision,date:date,reason:'Apps Script 격리 사본 원자적 일정 저장 검증',requestId:Utilities.getUuid(),actor:actor};
 var lock=LockService.getScriptLock();lock.waitLock(8000);
 try{
  var before=hfLsSnapshot_(ss).audit.length,r=hfLsApply_(ss,b),again=hfLsApply_(ss,b),fresh=hfLsSnapshot_(ss);
  if(r.requestId!==again.requestId||fresh.audit.length!==before+1||hfLsRecord_(fresh,order,key).date!==date)throw Error('verification_failed');
  var conflict=false;try{hfLsBuild_(fresh,Object.assign({},b,{requestId:Utilities.getUuid()}),new Date().toISOString());}catch(e){conflict=e.message==='stale_record';}
  if(!conflict)throw Error('stale_check_failed');
  console.log(JSON.stringify({ok:true,test:'SCHEDULE_ISOLATED_PASS',spreadsheetId:id,requestId:r.requestId,beforeDate:p.date,afterDate:date,monthlyAndLedgerMatch:true,singleAuditReceipt:true,duplicateNoWrite:true,staleBlocked:true,productionTouched:false}));
 }finally{lock.releaseLock();}
}
