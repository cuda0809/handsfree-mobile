/* Light v1 personal application queries and audited issue-state edits. Uses HF_LIGHT_SCHEDULE helpers. */
var HF_APP={audit:'HF_LIGHT_상태감사',auditId:1907280002,issue:'HF_DATA_이슈원장'};
function hfAppRows_(ss,name,cols){var sh=ss.getSheetByName(name);if(!sh){if(name===HF_LS.audit||name===HF_APP.audit)return [];hfLsFail_('missing_table');}return sh.getLastRow()?sh.getRange(1,1,sh.getLastRow(),Math.min(cols,sh.getMaxColumns())).getDisplayValues():[];}
function hfAppCatalog_(ss){return hfAppRows_(ss,'제품마스터',12).slice(4).filter(function(r){return r[0];}).map(function(r){return {orderId:r[0],customer:r[1],model:r[2],due:r[3],pm:r[8],state:r[9]||'상태 미등록'};});}
function hfAppCore_(ss){
 var rows=hfAppRows_(ss,'HF_CORE_통합운영',40);if(rows.length<2)return [];
 var projects=rows.slice(1).filter(function(r){return r[1];}).map(function(r){return {
  projectId:r[0],orderId:r[1],team:r[2],customer:r[3],model:r[4],qty:r[5],due:r[6],pm:r[7],
  designOwner:r[8],buyer:r[9],productionOwner:r[10],qualityOwner:r[11],designState:r[12],
  purchaseProgress:r[18],missingCount:r[19],materialState:r[20],assemblyState:r[21],electricalState:r[22],
  programState:r[23],inspectionState:r[24],deliveryState:r[25],process:r[26],state:r[27],nextAction:r[28],
  currentIssue:r[29],recentEvent:r[30],recentEventAt:r[31],planAssembly:r[32],planElectrical:r[33],
  planProgram:r[34],planInspection:r[35],planDelivery:r[36],actualDelivery:r[37],confidence:r[38],updatedAt:r[39]
 };});
 var events=hfAppRows_(ss,'HF_DATA_입력정규화',23).slice(1),today=Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd');
 return hfAppCurrentEvidence_(hfAppDeliveryEvidence_(projects,events,hfAppRows_(ss,'업무이력',9).slice(7),today),events,today);
}
// Confirmed, precisely linked field events are operational evidence, not local drafts.
// This read projection preserves Core/RAW, manual Next_Action, and shipping history.
function hfAppCurrentEvidence_(projects,events,today){
 var byJob={},latest={},content={};projects.forEach(function(p){byJob[p.orderId]=p;});
 events.forEach(function(e){
  if(e[17]!=='WRITTEN'||e[2]!=='FIELD_INPUT'||e[7]!=='일일작업'||!e[20]||e[15]!==e[20])return;
  var p=byJob[e[20]],date=hfAppDeliveryDay_(e[6]);if(!p||p.team!=='B'||!date||date>today||date==='2026-09-14')return;
  var raw=String(e[3]||''),jobs=raw.match(/(?:[A-Z]{2,4}-)?\d{6}[A-Z]-\d{3}(?:-\d+)?/g)||[];
  if(!jobs.length||jobs.some(function(j){return j!==p.orderId;}))return;
  var text=String(e[10]||'').replace(/^[·\s]+/,'').trim();
  var request=String(e[22]||e[0]||'').replace(/-E\d+$/,''),stamp=String(e[1]||''),c=content[p.orderId];
  if(text&&(!c||stamp>c.stamp)){c=content[p.orderId]={requestId:request,stamp:stamp,date:date,lines:[],ids:[]};}
  if(text&&c&&c.requestId===request){c.lines.push(text);c.ids.push(e[0]);if(date>c.date)c.date=date;}
  var match=text.match(/^(조립|마감조립|전장|배선|프로그램|검수)\s*(완료|진행(?:\s*중)?|중)(?:\s+(?:20\d{2}[-/.])?\d{1,2}[-/.]\d{1,2})?\s*$/);
  if(!match)return;
  var stamp=String(e[1]||''),prior=latest[p.orderId];
  if(!prior||date>prior.date||date===prior.date&&stamp>prior.stamp)latest[p.orderId]={date:date,stamp:stamp,state:match[1]+' '+match[2],process:/전장|배선/.test(match[1])?'전장':match[1],id:e[0],raw:text};
 });
 var projected=projects.map(function(p){
  var e=latest[p.orderId];if(!e||p.actualDelivery||/출고\s*완료|납품\s*완료|출고\s*대기/.test(p.state||''))return p;
  // Generic collection timestamps do not establish a newer business state.
  var currentDay=hfAppDeliveryDay_(p.since||p.stateSince),eventDay=String(p.recentEventAt||'').slice(0,10);
  if(currentDay>e.date||eventDay>e.date)return p;
  function stage(v){return /출고|납품/.test(v)?5:/검수|테스트|시험/.test(v)?4:/프로그램/.test(v)?3:/전장|배선/.test(v)?2:/조립/.test(v)?1:0;}
  if(stage(p.state||'')>stage(e.state))return p;
  // A newer explicit Core state remains authoritative (including same-day edits).
  if(String(p.recentEventAt||'')>e.stamp)return p;
  var out={};Object.keys(p).forEach(function(k){out[k]=p[k];});
  out.state=e.state;out.process=e.process;out.since=e.date;out.recentEvent=e.raw;out.recentEventAt=e.stamp;out.updatedAt=e.stamp;
  out.stateEvidence={source:'확정 Event',entryId:e.id,businessDate:e.date};return out;
 });
 return projected.map(function(p){
  var c=content[p.orderId];if(!c||String(p.recentEventAt||'')>c.stamp||hfAppDeliveryDay_(p.since||p.stateSince)>c.date)return p;
  var out={};Object.keys(p).forEach(function(k){out[k]=p[k];});
  out.currentIssue=c.lines.join('\n');out.recentEvent=out.currentIssue;out.recentEventAt=c.stamp;out.updatedAt=c.stamp;
  out.contentEvidence={source:'확정 Event',requestId:c.requestId,entryIds:c.ids,businessDate:c.date};return out;
 });
}
// READ projection only: keep the Core value and raw journals intact.
function hfAppDeliveryDay_(v){
 var s=String(v||'').trim(),m=s.match(/^(\d{2}|20\d{2})[-/.]\s*(\d{1,2})[-/.]\s*(\d{1,2})$/);if(!m)return '';
 var d=(m[1].length===2?'20'+m[1]:m[1])+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2);
 return Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d?d:'';
}
function hfAppDeliveryEvidence_(projects,events,journal,today){
 var candidates={},blocked={},byId={};projects.forEach(function(p){byId[p.orderId]=p;byId[p.projectId]=p;});
 function cancellation(raw,linked){
  if(!/(?:출고|납품).*(?:취소|철회|아님|오류)|(?:취소|철회).*(?:출고|납품)/.test(String(raw||'')))return;
  var jobs=String(raw||'').match(/(?:[A-Z]{2,4}-)?\d{6}[A-Z]-\d{3}(?:-\d+)?/g)||[];jobs=jobs.filter(function(j,i,a){return a.indexOf(j)===i;});
  var p=byId[linked]||(jobs.length===1?byId[jobs[0]]:null);
  if(p&&p.team==='B'&&jobs.length<=1&&(!jobs.length||jobs[0]===p.orderId))blocked[p.orderId]=true;
 }
 function inspect(raw,linked,businessDay,source,sourceRef,manual){
  raw=String(raw||'');
  if(!/(?:출고|납품)\s*완료/.test(raw)||/예정|계획|대기|미완료|미출고|취소|철회|반품|재출고|부분|일부|외주|입고|반출|아직|아님|하지\s*않|안\s*됨|테스트\s*입력|검증용|\d{3}-\*/.test(raw))return;
  var jobs=raw.match(/(?:[A-Z]{2,4}-)?\d{6}[A-Z]-\d{3}(?:-\d+)?/g)||[];
  jobs=jobs.filter(function(j,i,a){return a.indexOf(j)===i;});
  var p=byId[linked]||(jobs.length===1?byId[jobs[0]]:null);
  if(!p||p.team!=='B'||jobs.length>1||(jobs.length===1&&jobs[0]!==p.orderId))return;
  if(Number(p.qty)>1&&!/전량|전체/.test(raw))return;
  var business=hfAppDeliveryDay_(businessDay),clean=raw.replace(/(?:[A-Z]{2,4}-)?\d{6}[A-Z]-\d{3}(?:-\d+)?/g,'').replace(/(20\d{2})년\s*/g,'$1-').replace(/(\d{1,2})월\s*(\d{1,2})일/g,'$1-$2'),dates=[],re=/(?:^|[^\d])(?:(20\d{2}|\d{2})[-/.]\s*)?(\d{1,2})[-/.]\s*(\d{1,2})(?!\d)/g,match;
  while((match=re.exec(clean))){var year=match[1]||(business?business.slice(0,4):'');if(!year)return;var date=hfAppDeliveryDay_(year+'-'+match[2]+'-'+match[3]);if(!date)return;dates.push(date);}
  if(!dates.length&&manual&&business)dates.push(business);
  dates=dates.filter(function(d,i,a){return a.indexOf(d)===i;});
  if(dates.length!==1||dates[0]>today)return;
  (candidates[p.orderId]||(candidates[p.orderId]=[])).push({date:dates[0],source:source,sourceRef:sourceRef});
 }
 events.forEach(function(r,i){if(r[7]==='일반이슈'||((r[7]==='타팀지원'||r[7]==='기타')&&!r[20]&&!r[15])||r[17]!=='WRITTEN'||r[14]!=='확정'||String(r[6]||'').slice(0,10)==='2026-09-14')return;cancellation(r[3],r[20]||r[15]);inspect(r[3],r[20]||r[15],r[6],'Event','HF_DATA_입력정규화!'+(i+2)+' · '+r[0],false);});
 journal.forEach(function(r,i){if(r[8]!=='확정'||r[7]==='현장입력'||String(r[0]||'').slice(0,10)==='2026-09-14')return;var raw=String(r[4]||'')+' '+String(r[6]||'')+(r[1]==='출고완료'?' 출고완료':'');cancellation(raw,'');inspect(raw,'',r[0],'일지','업무이력!'+(i+8),true);});
 return projects.map(function(p){
  if(p.team!=='B')return p;
  var evidence=candidates[p.orderId]||[],dates=evidence.map(function(e){return e.date;}).filter(function(d,i,a){return a.indexOf(d)===i;}),current=hfAppDeliveryDay_(p.actualDelivery),review='';
  if(dates.length>1||(current&&dates.some(function(d){return d!==current;})))review='실출고일 기록 충돌 · 원본 확인 필요';
  if(!current&&dates.length===1&&/출고\s*대기|보관\s*중/.test(String(p.state||'')+' '+String(p.deliveryState||'')))review='출고완료 기록과 현재 대기 상태 충돌 · 확인 필요';
  if(blocked[p.orderId])review='출고 취소·정정 기록 존재 · 실제 출고일 확인 필요';
  var actual=current||(!review&&dates.length===1?dates[0]:p.actualDelivery);
  return Object.assign({},p,{actualDelivery:actual,actualDeliveryEvidence:evidence,actualDeliveryReview:review});
 });
}
function hfAppPlanOverview_(ss){
 var sh=ss.getSheetByName('HF_DATA_계획원장');
 if(!sh||sh.getSheetId()!==1167293203)hfLsFail_('invalid_structure');
 var rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,16).getValues():[];
 return rows.filter(function(r){return r[0]&&r[4];}).map(function(r){
  var month=Object.prototype.toString.call(r[12])==='[object Date]'?Utilities.formatDate(r[12],'Asia/Seoul','yyyy-MM'):String(r[12]||'').trim();
  if(month&&!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))hfLsFail_('invalid_source_month');
  return {recordId:String(r[0]),orderId:String(r[4]),date:hfLsDay_(r[3]),process:String(r[10]||''),sourceMonth:month,
   status:String(r[11]||''),source:String(r[13]||''),sourceRef:String(r[14]||''),updatedAt:String(r[15]||'')};
 });
}
function hfAppReceipt_(ss,b){
 var rows=hfAppRows_(ss,'HF_DATA_입력대기열',15).slice(1),matches=[];
 rows.forEach(function(r){if(r[3]!==b.actor.email)return;var p;try{p=JSON.parse(r[4]);}catch(e){return;}
  if(b.requestId?r[0]===b.requestId:b.submissionId&&p.submissionId===b.submissionId)matches.push(r);
 });
 if(!matches.length&&!b.requestId&&b.text)matches=rows.filter(function(r){if(r[3]!==b.actor.email)return false;try{var p=JSON.parse(r[4]);return p.raw===b.text&&String(p.targetHint||'')===String(b.targetHint||'');}catch(e){return false;}});
 if(matches.length>1)hfLsFail_('ambiguous_receipt');if(!matches.length)return {ok:true,status:'NOT_FOUND'};
 var r=matches[0],events=hfAppRows_(ss,'HF_DATA_입력정규화',23).slice(1).filter(function(x){return x[0].indexOf(r[0]+'-E')===0;});
 var statuses=events.map(function(x){return x[17];}),status=statuses.indexOf('FAILED')>=0?'FAILED':statuses.indexOf('REVIEW')>=0?'REVIEW':statuses.indexOf('EXCLUDED')>=0?'EXCLUDED':statuses.indexOf('WRITTEN')>=0?'WRITTEN':r[5];
 return {ok:true,status:status,applied:statuses.indexOf('WRITTEN')>=0,requestId:r[0],ack:[r[14],r[11]].filter(Boolean).join(' · '),events:events.map(function(x){return {id:x[0],status:x[17],orderId:x[20]||'',raw:x[3]};})};
}
function hfAppHistory_(ss,order){
 if(typeof order!=='string'||!order||order.length>100)hfLsFail_('project_mismatch');
 var issueIds=hfAppRows_(ss,HF_APP.issue,19).slice(1).filter(function(r){return r[3]===order;}).map(function(r){return r[0];});
 var events=hfAppRows_(ss,'HF_DATA_입력정규화',23).slice(1).filter(function(r){return r[20]?r[20]===order:r[15]===order||issueIds.indexOf(r[15])>=0;}).map(function(r){return {id:r[0],at:r[1],raw:r[3],type:r[7],status:r[17],actor:r[21]||'',requestId:r[22]||r[0].replace(/-E\d+$/,''),projectId:r[20]||'',source:'Event'};});
 var changes=[];[HF_LS.audit,HF_APP.audit].forEach(function(name){hfAppRows_(ss,name,12).slice(1).filter(function(r){return r[2]===order;}).forEach(function(r){var before,after;try{before=JSON.parse(r[6]);after=JSON.parse(r[7]);}catch(e){return;}
  changes.push({id:r[0],at:r[1],actor:r[5],reason:r[8],status:r[10],kind:name===HF_LS.audit?'schedule':'issue',before:before,after:after});});});
 return {ok:true,orderId:order,events:events.reverse(),changes:changes.reverse()};
}
function hfAppIssueSnapshot_(ss){
 var meta=Sheets.Spreadsheets.get(ss.getId(),{fields:'sheets(properties)'}).sheets.map(function(x){return x.properties;}),p=meta.find(function(x){return x.title===HF_APP.issue;}),a=meta.find(function(x){return x.title===HF_APP.audit;});
 if(!p||p.sheetId!==391424214)hfLsFail_('invalid_structure');
 var ranges=["'"+HF_APP.issue+"'!A1:S"+p.gridProperties.rowCount];if(a)ranges.push("'"+HF_APP.audit+"'!A1:L"+a.gridProperties.rowCount);
 var values=Sheets.Spreadsheets.Values.batchGet(ss.getId(),{ranges:ranges,valueRenderOption:'UNFORMATTED_VALUE',dateTimeRenderOption:'SERIAL_NUMBER'}).valueRanges;
 var formulas=Sheets.Spreadsheets.Values.batchGet(ss.getId(),{ranges:[ranges[0]],valueRenderOption:'FORMULA'}).valueRanges[0].values||[];
 var rows=(values[0].values||[]).map(function(r){return Array.from({length:19},function(_,i){return r[i]===undefined?'':r[i];});}),audit=a?(values[1].values||[]):[];
 if(a&&audit.length&&JSON.stringify(audit[0])!==JSON.stringify(HF_LS.headers))hfLsFail_('invalid_audit_structure');
 return {rows:rows,formulas:formulas,issueId:p.sheetId,audit:audit,auditId:a?a.sheetId:HF_APP.auditId,sheetIds:meta.map(function(x){return x.sheetId;})};
}
function hfAppIssueRecord_(s,id){var hits=[];s.rows.forEach(function(r,i){if(i&&r[0]===id)hits.push({row:r,index:i});});if(hits.length!==1)hfLsFail_(hits.length?'ambiguous_record':'target_missing');return hits[0];}
function hfAppIssueView_(s,id){var p=hfAppIssueRecord_(s,id),r=p.row;return {ok:true,issueId:r[0],orderId:r[3],customer:r[4],model:r[5],status:r[8],state:r[16],nextAction:r[18],revision:hfLsHash_(r)};}
function hfAppIssueReceipt_(s,b){var hits=s.audit.slice(1).filter(function(r){return r[0]===b.requestId;});if(!hits.length)return null;if(hits.length!==1)hfLsFail_('ambiguous_receipt');var r=hits[0];if(r[4]!==b.actor.sub)hfLsFail_('forbidden');if(b.action==='edit'&&r[9]!==hfAppIssueHash_(b))hfLsFail_('request_conflict');return JSON.parse(r[11]);}
function hfAppIssueHash_(b){return hfLsHash_([b.issueId,b.orderId,b.expected,b.state,b.nextAction,b.status,b.reason,b.actor.sub,b.actor.email]);}
function hfAppIssueBuild_(s,b,now){
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(b.requestId||''))hfLsFail_('invalid_request_id');var receipt=hfAppIssueReceipt_(s,b);if(receipt)return {requests:[],receipt:receipt};
 if(typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>500)hfLsFail_('invalid_reason');
 if(typeof b.state!=='string'||!b.state.trim()||b.state.length>80)hfLsFail_('invalid_state');
 if(typeof b.nextAction!=='string'||b.nextAction.length>500)hfLsFail_('invalid_next_action');
 if(['OPEN','MONITOR','CLOSED'].indexOf(b.status)<0)hfLsFail_('invalid_status');
 var p=hfAppIssueRecord_(s,b.issueId),before=p.row;if(before[3]!==b.orderId)hfLsFail_('project_mismatch');if(hfLsHash_(before)!==b.expected)hfLsFail_('stale_record');
 if(b.status!=='CLOSED'&&!b.nextAction.trim()&&String(before[18]||'').trim())hfLsFail_('invalid_next_action');
 var after=before.slice(),day=Utilities.formatDate(new Date(now),'Asia/Seoul','yyyy-MM-dd');
 after[16]=b.state.trim();after[18]=b.nextAction.trim();after[8]=b.status;if(after[16]===before[16]&&after[18]===before[18]&&after[8]===before[8])hfLsFail_('no_change');
 after[9]=day;if(after[16]!==before[16])after[17]=day;after[11]=b.status==='CLOSED'?day:'';after[13]=b.status==='CLOSED'?false:true;
 var cols=[8,9,11,13,16,17,18],requests=[];cols.forEach(function(c){if(typeof (s.formulas[p.index]||[])[c]==='string'&&s.formulas[p.index][c].charAt(0)==='=')hfLsFail_('formula_cell');if(after[c]!==before[c]){var req=hfLsCell_(s.issueId,p.index,c,after[c]);if(typeof after[c]==='boolean')req.updateCells.rows[0].values[0].userEnteredValue={boolValue:after[c]};requests.push(req);}});
 if(!s.audit.length){if(s.sheetIds.indexOf(s.auditId)>=0)hfLsFail_('audit_id_collision');requests.push({addSheet:{properties:{sheetId:s.auditId,title:HF_APP.audit,gridProperties:{rowCount:1000,columnCount:12,frozenRowCount:1}}}});requests.push({updateCells:{start:{sheetId:s.auditId,rowIndex:0,columnIndex:0},rows:[{values:HF_LS.headers.map(function(v){return {userEnteredValue:{stringValue:v}};})}],fields:'userEnteredValue'}});}
 receipt={ok:true,status:'APPLIED',requestId:b.requestId,issueId:b.issueId,orderId:b.orderId,state:after[16],nextAction:after[18],issueStatus:after[8],actor:b.actor.email,reason:b.reason.trim()};
 var audit=[b.requestId,now,b.orderId,b.issueId,b.actor.sub,b.actor.email,JSON.stringify(before),JSON.stringify(after),b.reason.trim(),hfAppIssueHash_(b),'APPLIED',JSON.stringify(receipt)];
 requests.push({appendCells:{sheetId:s.auditId,rows:[{values:audit.map(function(v){return {userEnteredValue:{stringValue:String(v)}};})}],fields:'userEnteredValue'}});return {requests:requests,receipt:receipt,after:after};
}
function hfAppIssueApply_(ss,b){var built=hfAppIssueBuild_(hfAppIssueSnapshot_(ss),b,new Date().toISOString());if(!built.requests.length)return built.receipt;hfLsBatch_(ss,built.requests);var fresh=hfAppIssueSnapshot_(ss),receipt=hfAppIssueReceipt_(fresh,b);if(!receipt||JSON.stringify(hfAppIssueRecord_(fresh,b.issueId).row)!==JSON.stringify(built.after))hfLsFail_('pending_verification');return receipt;}
function hfLightAppDispatch_(body){
 var ss=SpreadsheetApp.openById(HF_SPREADSHEET_ID),b=hfLsActor_(body,ss);
 if(b.action==='core')return {ok:true,projects:hfAppCore_(ss),generatedAt:new Date().toISOString()};
 if(b.action==='plans')return {ok:true,records:hfAppPlanOverview_(ss),generatedAt:new Date().toISOString()};
 if(b.action==='catalog')return {ok:true,projects:hfAppCatalog_(ss),issues:hfAppRows_(ss,HF_APP.issue,19).slice(1).filter(function(r){return r[0];}).map(function(r){return {issueId:r[0],orderId:r[3],status:r[8],state:r[16]};})};
 if(b.action==='reports')return {ok:true,annual:hfAppRows_(ss,'HF_DATA_납품집계',5),monthly:hfAppRows_(ss,'HF_DATA_납품월집계',6),support:hfAppRows_(ss,'HF_DATA_지원이력',12),generatedAt:new Date().toISOString()};
 if(b.action==='history')return hfAppHistory_(ss,b.orderId);
 if(b.action==='receipt'&&!b.issueId)return hfAppReceipt_(ss,b);
 var lock=LockService.getScriptLock();if(!lock.tryLock(8000))hfLsFail_('busy');try{
  if(b.action==='receipt')return hfAppIssueReceipt_(hfAppIssueSnapshot_(ss),b)||{ok:true,status:'NOT_FOUND'};
  if(b.action==='issue')return hfAppIssueView_(hfAppIssueSnapshot_(ss),b.issueId);
  if(b.action!=='edit')hfLsFail_('unsupported_operation');if(PropertiesService.getScriptProperties().getProperty('HF_LIGHT_APP_OPEN')!=='OPEN')hfLsFail_('edit_gate_closed');return hfAppIssueApply_(ss,b);
 }finally{lock.releaseLock();}
}
function hfAppPriorSubmission_(ss,body,raw,requester,targetHint){
 var id=String(body.submissionId||'');if(!id)return null;if(!/^[a-zA-Z0-9-]{16,80}$/.test(id))hfLsFail_('invalid_submission_id');
 var found=hfAppRows_(ss,'HF_DATA_입력대기열',15).slice(1).filter(function(r){if(r[3]!==requester)return false;try{return JSON.parse(r[4]).submissionId===id;}catch(e){return false;}});
 if(found.length>1)hfLsFail_('ambiguous_receipt');if(!found.length)return null;var previous=JSON.parse(found[0][4]);if(previous.raw!==raw||String(previous.targetHint||'')!==targetHint)hfLsFail_('request_conflict');
 return hfAppReceipt_(ss,{requestId:found[0][0],actor:{email:requester}});
}
