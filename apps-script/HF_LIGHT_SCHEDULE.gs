/* Daily plan moves. No doGet/doPost; add one dispatch call to the existing bridge.
 * Deployment gate defaults CLOSED. No tokens or account defaults in this module. */
var HF_LS = {plan:'HF_DATA_계획원장',month:'월간계획_메인',audit:'HF_LIGHT_일정감사',auditId:1907280001,
  headers:['Request_ID','At','Project_ID','Record_Key','Actor_Sub','Actor_Email','Before','After','Reason','Payload_Hash','Status','Receipt']};
function hfLsFail_(code){throw new Error(code);}
function hfLsHash_(value){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(value),Utilities.Charset.UTF_8)).replace(/=+$/,'');}
function hfLsDay_(value){
  if(Object.prototype.toString.call(value)==='[object Date]')return Utilities.formatDate(value,'Asia/Seoul','yyyy-MM-dd');
  if(typeof value==='number')return new Date(Date.UTC(1899,11,30)+Math.round(value)*86400000).toISOString().slice(0,10);
  var s=String(value||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)hfLsFail_('invalid_date');return s;
}
function hfLsSerial_(s){return (Date.parse(hfLsDay_(s))-Date.UTC(1899,11,30))/86400000;}
function hfLsKey_(row){return JSON.stringify([String(row[0]),String(row[12]),String(row[13])]);}
function hfLsCell_(id,row,col,value){
  var v=value===''?{}:{userEnteredValue:typeof value==='number'?{numberValue:value}:{stringValue:String(value)}};
  return {updateCells:{range:{sheetId:id,startRowIndex:row,endRowIndex:row+1,startColumnIndex:col,endColumnIndex:col+1},rows:[{values:[v]}],fields:'userEnteredValue'}};
}
function hfLsSnapshot_(ss){
  // Read through the same API used to commit. SpreadsheetApp can retain stale
  // cached cells after a REST batchUpdate in the same execution.
  var meta=Sheets.Spreadsheets.get(ss.getId(),{fields:'sheets(properties)'}).sheets.map(function(x){return x.properties;});
  var p=meta.find(function(x){return x.title===HF_LS.plan;}),m=meta.find(function(x){return x.title===HF_LS.month;}),a=meta.find(function(x){return x.title===HF_LS.audit;});
  if(!p||!m||p.sheetId!==1167293203||m.sheetId!==1001001)hfLsFail_('invalid_structure');
  var ranges=["'"+HF_LS.plan+"'!A1:P"+p.gridProperties.rowCount,"'"+HF_LS.month+"'!A1:AK"+m.gridProperties.rowCount];
  if(a)ranges.push("'"+HF_LS.audit+"'!A1:L"+a.gridProperties.rowCount);
  var values=Sheets.Spreadsheets.Values.batchGet(ss.getId(),{ranges:ranges,valueRenderOption:'UNFORMATTED_VALUE',dateTimeRenderOption:'SERIAL_NUMBER'}).valueRanges;
  var formulas=Sheets.Spreadsheets.Values.batchGet(ss.getId(),{ranges:ranges,valueRenderOption:'FORMULA'}).valueRanges;
  function rows(name,width,formula){var index=name===HF_LS.plan?0:name===HF_LS.month?1:2,source=(formula?formulas:values)[index];if(!source)return [];return (source.values||[]).map(function(r){return Array.from({length:width},function(_,i){var v=r[i]===undefined?'':r[i];return formula?(typeof v==='string'&&v.charAt(0)==='='?v:''):v;});});}
  var audit=rows(HF_LS.audit,12,false);if(audit.length&&JSON.stringify(audit[0])!==JSON.stringify(HF_LS.headers))hfLsFail_('invalid_audit_structure');
  return {plans:rows(HF_LS.plan,16,false),planFormulas:rows(HF_LS.plan,16,true),monthly:rows(HF_LS.month,37,false),monthFormulas:rows(HF_LS.month,37,true),planId:p.sheetId,monthId:m.sheetId,auditId:a?a.sheetId:HF_LS.auditId,audit:audit,sheetIds:meta.map(function(x){return x.sheetId;})};
}
function hfLsRecord_(s,orderId,key){
  var found=[];s.plans.forEach(function(r,i){if(i&&hfLsKey_(r)===key)found.push({row:r,index:i});});
  if(found.length!==1)hfLsFail_(found.length?'ambiguous_record':'target_missing');
  var p=found[0],r=p.row;if(r[4]!==orderId)hfLsFail_('project_mismatch');
  var rows=[];s.monthly.forEach(function(r,i){if(i>=5&&r[0]===orderId)rows.push(i);});
  if(rows.length!==1)hfLsFail_('monthly_project_missing');
  var y=Number(s.monthly[2][1]),mo=Number(s.monthly[2][4]);
  if(!Number.isInteger(y)||!Number.isInteger(mo)||mo<1||mo>12)hfLsFail_('invalid_month');
  var start=new Date(Date.UTC(y,mo-1,1)).toISOString().slice(0,10),day=hfLsDay_(r[3]),offset=hfLsSerial_(day)-hfLsSerial_(start);
  if(offset<0||offset>=31||r[13]!==HF_LS.month)hfLsFail_('outside_edit_month');
  var ri=rows[0],col=6+offset,mrow=s.monthly[ri];
  if(String(mrow[col]||'')!==String(r[10]||'')||!r[10])hfLsFail_('source_mismatch');
  if((s.monthFormulas[ri]||[])[col])hfLsFail_('formula_cell');
  var revision=hfLsHash_([r,s.monthly[2],mrow,s.monthFormulas[ri],s.planFormulas[p.index]]);
  return {row:r,index:p.index,monthRow:ri,oldCol:col,start:start,date:day,revision:revision,key:key};
}
function hfLsList_(s,orderId){
  return s.plans.slice(1).filter(function(r){return r[4]===orderId;}).map(function(r){
    var key=hfLsKey_(r),base={key:key,recordId:r[0],orderId:r[4],sourceMonth:r[12],process:r[10],editable:false};
    try{base.date=hfLsDay_(r[3]);var p=hfLsRecord_(s,orderId,key);base.revision=p.revision;base.editable=true;base.minDate=p.start;base.maxDate=new Date(Date.parse(p.start)+30*86400000).toISOString().slice(0,10);}
    catch(e){base.blockedReason=e.message;}return base;
  });
}
function hfLsPayloadHash_(b){return hfLsHash_([b.orderId,b.key,b.expected,b.date,b.reason,b.actor.sub,b.actor.email]);}
function hfLsReceipt_(s,b){
  var matches=s.audit.slice(1).filter(function(r){return r[0]===b.requestId;});
  if(!matches.length)return null;if(matches.length!==1)hfLsFail_('ambiguous_receipt');
  var r=matches[0];if(r[2]!==b.orderId||r[4]!==b.actor.sub)hfLsFail_('forbidden');
  if(b.action==='edit'&&r[9]!==hfLsPayloadHash_(b))hfLsFail_('request_conflict');
  return JSON.parse(r[11]);
}
function hfLsBuild_(s,b,now){
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(b.requestId||''))hfLsFail_('invalid_request_id');
  var receipt=hfLsReceipt_(s,b);if(receipt)return {receipt:receipt,requests:[]};
  if(typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>500)hfLsFail_('invalid_reason');
  var p=hfLsRecord_(s,b.orderId,b.key);if(p.revision!==b.expected)hfLsFail_('stale_record');
  var date=hfLsDay_(b.date),offset=hfLsSerial_(date)-hfLsSerial_(p.start),newCol=6+offset;
  if(offset<0||offset>=31)hfLsFail_('outside_edit_month');if(date===p.date)hfLsFail_('no_change');
  if(s.monthly[p.monthRow][newCol])hfLsFail_('destination_occupied');
  if((s.monthFormulas[p.monthRow]||[])[newCol])hfLsFail_('formula_cell');
  [1,2,3,14,15].forEach(function(c){if((s.planFormulas[p.index]||[])[c])hfLsFail_('formula_cell');});
  if(s.plans.some(function(r,i){return i!==p.index&&i>0&&r[4]===b.orderId&&r[12]===p.row[12]&&r[13]===p.row[13]&&r[10]===p.row[10]&&hfLsDay_(r[3])===date;}))hfLsFail_('destination_occupied');
  var after=p.row.slice(),memo='Light v1 '+b.requestId+' · '+b.reason.trim();
  after[1]=Number(date.slice(0,4));after[2]=Number(date.slice(5,7));after[3]=hfLsSerial_(date);after[14]=memo;after[15]=now;
  receipt={ok:true,status:'APPLIED',requestId:b.requestId,orderId:b.orderId,key:b.key,beforeDate:p.date,date:date,actor:b.actor.email,reason:b.reason.trim()};
  var requests=[hfLsCell_(s.monthId,p.monthRow,p.oldCol,''),hfLsCell_(s.monthId,p.monthRow,newCol,p.row[10])];
  [1,2,3,14,15].forEach(function(c){requests.push(hfLsCell_(s.planId,p.index,c,after[c]));});
  if(!s.audit.length){
    if(s.sheetIds.indexOf(s.auditId)>=0)hfLsFail_('audit_id_collision');
    requests.push({addSheet:{properties:{sheetId:s.auditId,title:HF_LS.audit,gridProperties:{rowCount:1000,columnCount:12,frozenRowCount:1}}}});
    requests.push({updateCells:{start:{sheetId:s.auditId,rowIndex:0,columnIndex:0},rows:[{values:HF_LS.headers.map(function(v){return {userEnteredValue:{stringValue:v}};})}],fields:'userEnteredValue'}});
  }
  var audit=[b.requestId,now,b.orderId,b.key,b.actor.sub,b.actor.email,JSON.stringify(p.row),JSON.stringify(after),b.reason.trim(),hfLsPayloadHash_(b),'APPLIED',JSON.stringify(receipt)];
  requests.push({appendCells:{sheetId:s.auditId,rows:[{values:audit.map(function(v){return {userEnteredValue:{stringValue:String(v)}};})}],fields:'userEnteredValue'}});
  return {requests:requests,receipt:receipt};
}
function hfLsBatch_(ss,requests){
  var r=UrlFetchApp.fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(ss.getId())+':batchUpdate',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},payload:JSON.stringify({requests:requests}),muteHttpExceptions:true});
  if(r.getResponseCode()<200||r.getResponseCode()>=300){
    var detail={};try{detail=JSON.parse(r.getContentText()).error||{};}catch(ignore){}
    console.log(JSON.stringify({check:'schedule_batch',http:r.getResponseCode(),status:detail.status||'',reasons:(detail.details||[]).map(function(x){return x.reason||'';})}));
    hfLsFail_('schedule_write_failed');
  }
}
function hfLsApply_(ss,b){
  var s=hfLsSnapshot_(ss),built=hfLsBuild_(s,b,new Date().toISOString());
  if(!built.requests.length)return built.receipt;
  hfLsBatch_(ss,built.requests);
  var fresh=hfLsSnapshot_(ss),receipt=hfLsReceipt_(fresh,b),record=hfLsRecord_(fresh,b.orderId,b.key);
  if(!receipt||record.date!==b.date)hfLsFail_('pending_verification');return receipt;
}
function hfLsActor_(body,ss){
  var secret=PropertiesService.getScriptProperties().getProperty(HF_TOKEN_KEY),message=body.signed,signature=body.signature;
  if(!secret||typeof message!=='string'||message.length>6000||typeof signature!=='string')hfLsFail_('forbidden');
  var mac=Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(message,secret,Utilities.Charset.UTF_8)).replace(/=+$/,'');
  if(mac.length!==signature.length)hfLsFail_('forbidden');var diff=0;for(var i=0;i<mac.length;i++)diff|=mac.charCodeAt(i)^signature.charCodeAt(i);if(diff)hfLsFail_('forbidden');
  var b=JSON.parse(message),a=b.actor,now=Date.now()/1000;
  if(!a||typeof a.sub!=='string'||!a.sub||typeof a.email!=='string'||!Number.isFinite(a.exp)||a.exp<=now||a.exp>now+180)hfLsFail_('forbidden');
  var permissions=ss.getSheetByName('HF_SYS_권한관리');if(!permissions)hfLsFail_('forbidden');
  var allowed=permissions.getRange(1,1,permissions.getLastRow(),3).getDisplayValues().filter(function(r){return r[1].toLowerCase()===a.email&&/^(Owner|Writer\b|Reader\b)/i.test(r[2]);});
  if(b.action==='edit'&&allowed.length===1&&!/^(Owner|Writer\b)/i.test(allowed[0][2]))hfLsFail_('forbidden');
  if(allowed.length!==1)hfLsFail_('forbidden');return b;
}
function hfLightScheduleDispatch_(body){
  var ss=SpreadsheetApp.openById(HF_SPREADSHEET_ID),b=hfLsActor_(body,ss);
  if(typeof b.orderId!=='string'||!b.orderId||b.orderId.length>100)hfLsFail_('invalid_project_id');
  var lock=LockService.getScriptLock();if(!lock.tryLock(8000))hfLsFail_('busy');
  try{
    if(b.action==='plans')return {ok:true,orderId:b.orderId,records:hfLsList_(hfLsSnapshot_(ss),b.orderId),editingAvailable:PropertiesService.getScriptProperties().getProperty('HF_LIGHT_SCHEDULE_OPEN')==='OPEN'};
    if(b.action==='receipt')return hfLsReceipt_(hfLsSnapshot_(ss),b)||{ok:true,status:'NOT_FOUND',requestId:b.requestId};
    if(b.action!=='edit')hfLsFail_('unsupported_operation');
    if(PropertiesService.getScriptProperties().getProperty('HF_LIGHT_SCHEDULE_OPEN')!=='OPEN')hfLsFail_('edit_gate_closed');
    return hfLsApply_(ss,b);
  }finally{lock.releaseLock();}
}
