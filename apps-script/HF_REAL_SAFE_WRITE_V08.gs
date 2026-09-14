/** HandsFree REAL 0.8 SAFE WRITE
 * 운영수정센터 = 수정/정정 요청 전용(원본 직접 수정 금지)
 * 현장입력 = 신규 기록 전용(Queue -> 자동분류 -> 원본형식 SAFE WRITE)
 * 기존 HF_REAL_LIVE_READ_V2 Apps Script 프로젝트에 새 .gs 파일로 추가한 뒤
 * setupHandsFreeSafeWrite()를 1회 실행한다.
 */

const HF_SW = Object.freeze({
  VERSION:'HF_REAL_SAFE_WRITE_V08',
  SSID:'1maCCn4XQogypiVAn0GZeEZUclxR7A9cLc-03FRmDxZM',
  TZ:'Asia/Seoul',
  SHEET:{CORRECTION:'운영수정센터',FIELD:'현장입력',QUEUE:'HF_DATA_입력대기열',NORM:'HF_DATA_입력정규화',WORK:'업무이력',RETURN:'반출일지',PRODUCT:'제품마스터',SAFETY:'HF_SYS_운영안전'},
  ID:{CORRECTION:390914001,FIELD:390914002,QUEUE:1907002003,NORM:1907002006,WORK:464453564,SAFETY:1907002001,MONTHLY:1001001},
  FIRST:5,LAST:34,INPUT_COL:1,STATUS_COL:11,DRAFT_FIRST:36,
  PEOPLE:['이상준','이성호','조용인','장현준','김은국','노진호','김정기','이기환','이승혜','김태경','이현지','이강석','양석원','이재한','이영주']
});

function setupHandsFreeSafeWrite(){
  const ss=SpreadsheetApp.openById(HF_SW.SSID); assertStructure_(ss);
  deleteTriggers_('hfSafeWriteOnEdit'); deleteTriggers_('processHandsFreeSafeWriteQueue');
  ScriptApp.newTrigger('hfSafeWriteOnEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('processHandsFreeSafeWriteQueue').timeBased().everyMinutes(1).create();
  setSafety_(ss,'Field Input Safe Write','OPEN · 현장입력 신규기록만 자동반영 · 운영수정센터 원본수정 금지');
  getSheet_(ss,HF_SW.SHEET.FIELD,HF_SW.ID.FIELD).getRange('A3').setValue('SAFE WRITE 활성 · Enter 확정 → Queue → 자동분류 → 원본형식 기록 · 애매한 내용은 검토대기');
  return {ok:true,version:HF_SW.VERSION,message:'SAFE WRITE 설치 완료'};
}

function disableHandsFreeSafeWrite(){
  const ss=SpreadsheetApp.openById(HF_SW.SSID);
  deleteTriggers_('hfSafeWriteOnEdit'); deleteTriggers_('processHandsFreeSafeWriteQueue');
  setSafety_(ss,'Field Input Safe Write','PREPARED · 설치트리거 비활성 · 자동반영 중지');
  getSheet_(ss,HF_SW.SHEET.FIELD,HF_SW.ID.FIELD).getRange('A3').setValue('SAFE WRITE 준비모드 · 원문은 Queue와 정규화 원장에 보존 · 애매한 내용은 원본에 쓰지 않고 검토대기');
  return {ok:true};
}

function deleteTriggers_(name){
  ScriptApp.getProjectTriggers().forEach(t=>{if(t.getHandlerFunction()===name) ScriptApp.deleteTrigger(t);});
}

function hfSafeWriteOnEdit(e){
  if(!e||!e.range) return;
  const r=e.range,s=r.getSheet(),name=s.getName();
  if(r.getColumn()!==HF_SW.INPUT_COL||r.getRow()<HF_SW.FIRST||r.getRow()>HF_SW.LAST) return;
  if(name!==HF_SW.SHEET.FIELD&&name!==HF_SW.SHEET.CORRECTION) return;
  const raw=String(e.value==null?r.getDisplayValue():e.value).trim(); if(!raw) return;
  const ss=e.source||SpreadsheetApp.openById(HF_SW.SSID); assertStructure_(ss);
  const source=name===HF_SW.SHEET.FIELD?'FIELD_INPUT':'CORRECTION_CENTER';
  const q=enqueue_(ss,{source,raw,inputSheet:name,inputRow:r.getRow()});
  if(q.duplicate){setInputStatus_(s,r.getRow(),'중복');return;}
  setInputStatus_(s,r.getRow(),'Queue등록');
  try{processHandsFreeSafeWriteQueue();}catch(err){console.error(err);}
}

function enqueue_(ss,input){
  const q=getSheet_(ss,HF_SW.SHEET.QUEUE,HF_SW.ID.QUEUE),now=new Date();
  const dedupe=sha256_([input.source,Utilities.formatDate(now,HF_SW.TZ,'yyyyMMdd'),norm_(input.raw)].join('|'));
  const prior=findDedupe_(q,dedupe),id='HF-'+Utilities.formatDate(now,HF_SW.TZ,'yyyyMMdd-HHmmss')+'-'+Utilities.getUuid().slice(0,8);
  const payload=JSON.stringify({version:HF_SW.VERSION,source:input.source,inputSheet:input.inputSheet,inputRow:input.inputRow,raw:input.raw});
  if(prior){
    appendQueue_(q,[id,dt_(now),input.source,requester_(),payload,'DUPLICATE',dedupe,1,'','',dt_(now),'동일 원문 당일 중복 감지','',priority_(input.raw),'중복 입력으로 원본 미반영']);
    return {duplicate:true};
  }
  appendQueue_(q,[id,dt_(now),input.source,requester_(),payload,'QUEUED',dedupe,0,'','','','','',priority_(input.raw),'Queue 등록 완료']);
  return {duplicate:false};
}

function appendQueue_(sh,v){const row=blankRow_(sh,2,1);ensureRows_(sh,row);sh.getRange(row,1,1,15).setValues([v]);return row;}
function findDedupe_(sh,key){const last=sh.getLastRow();if(last<2)return 0;const v=sh.getRange(2,7,last-1,1).getDisplayValues();for(let i=v.length-1;i>=0;i--)if(String(v[i][0])===key)return i+2;return 0;}

function processHandsFreeSafeWriteQueue(){
  const lock=LockService.getScriptLock(); if(!lock.tryLock(8000)) return {ok:false,reason:'LOCK_BUSY'};
  try{
    const ss=SpreadsheetApp.openById(HF_SW.SSID); assertStructure_(ss);
    const q=getSheet_(ss,HF_SW.SHEET.QUEUE,HF_SW.ID.QUEUE),last=q.getLastRow(); if(last<2)return {ok:true,processed:0};
    const rows=q.getRange(2,1,last-1,15).getValues(); let n=0;
    rows.forEach((row,i)=>{if(['RECEIVED','QUEUED'].includes(String(row[5]||''))){processQueueRow_(ss,q,i+2,row);n++;}});
    return {ok:true,processed:n};
  }finally{lock.releaseLock();}
}

function processQueueRow_(ss,q,rowNo,row){
  const id=String(row[0]||''),payloadText=String(row[4]||'');
  q.getRange(rowNo,6).setValue('PROCESSING');q.getRange(rowNo,8).setValue(Number(row[7]||0)+1);q.getRange(rowNo,9).setValue('HF_SAFE_WRITE');q.getRange(rowNo,10).setValue(dt_(new Date()));
  try{
    const p=JSON.parse(payloadText),raw=String(p.raw||'').trim();if(!raw)throw new Error('EMPTY_PAYLOAD');
    const result=p.source==='CORRECTION_CENTER'?processCorrection_(ss,p,id):p.source==='FIELD_INPUT'?processField_(ss,p,id):(()=>{throw new Error('UNKNOWN_SOURCE');})();
    q.getRange(rowNo,6).setValue('DONE');q.getRange(rowNo,11).setValue(dt_(new Date()));q.getRange(rowNo,12).setValue(result.summary||'처리완료');q.getRange(rowNo,13).clearContent();q.getRange(rowNo,15).setValue(result.ack||'처리완료');
  }catch(err){
    q.getRange(rowNo,6).setValue('FAILED');q.getRange(rowNo,11).setValue(dt_(new Date()));q.getRange(rowNo,13).setValue(String(err&&err.message?err.message:err));
    try{const p=JSON.parse(payloadText),sh=ss.getSheetByName(p.inputSheet);if(sh)setInputStatus_(sh,Number(p.inputRow),'오류');}catch(_){}
  }finally{q.getRange(rowNo,9).clearContent();}
}

function processCorrection_(ss,p,id){
  const sh=getSheet_(ss,HF_SW.SHEET.CORRECTION,HF_SW.ID.CORRECTION),raw=String(p.raw||'').trim(),project=resolveProject_(ss,raw),row=draftRow_(sh);
  sh.getRange(row,1,1,12).setValues([['검토대기',correctionType_(raw),issueOrOrder_(raw,project),project.customer||'',project.model||'',raw,'자연어 수정요청 · 원본 자동수정 금지',requester_(),new Date(),'자동분류 완료 · 사람 검토 후 반영','',raw]]);
  sh.getRange(row,9).setNumberFormat('yyyy-mm-dd'); setInputStatus_(sh,Number(p.inputRow),'검토대기');
  return {summary:`수정요청 ${id} → ${row}행 검토대기`,ack:'수정/정정은 원본을 바꾸지 않고 검토대기로 저장'};
}

function draftRow_(sh){
  const first=HF_SW.DRAFT_FIRST,last=Math.max(sh.getLastRow(),first),v=sh.getRange(first,1,Math.max(last-first+1,1),12).getDisplayValues();
  for(let i=0;i<v.length;i++)if(!v[i].slice(1).some(x=>String(x).trim()))return first+i;return last+1;
}
function correctionType_(raw){const t=norm_(raw);if(/다음조치|다음행동|후속/.test(t))return'다음조치';if(/일정|연기|미뤄|당겨|납기|날짜/.test(t))return'일정';if(/담당|담당자/.test(t))return'담당자';if(/종결|완료처리|닫아|close/.test(t))return'이슈종결';if(/발주|잡넘버|job|연결/.test(t))return'발주연결';if(/공정|조립|전장|프로그램|검수|테스트|가공|셋팅|세팅/.test(t))return'공정';if(/상태|대기|진행|수정중|확인중|점검대기/.test(t))return'현재상태';return'기타';}

function processField_(ss,p,id){
  const input=getSheet_(ss,HF_SW.SHEET.FIELD,HF_SW.ID.FIELD),raw=String(p.raw||'').trim();
  if(!fieldOpen_(ss)){const e=normalEvent_(ss,raw,1,p);e.safe=false;e.reason='SAFE_WRITE_NOT_OPEN';const nr=appendNorm_(ss,e,id);setNormStatus_(ss,nr,'REVIEW',e.reason);setInputStatus_(input,Number(p.inputRow),'검토대기');return{summary:'SAFE WRITE 미개방 → 검토대기',ack:'원본 미반영'};}
  const parts=splitEvents_(raw),results=[];
  parts.forEach((line,i)=>{
    const e=normalEvent_(ss,line,i+1,p),nr=appendNorm_(ss,e,id);
    if(e.excluded){setNormStatus_(ss,nr,'EXCLUDED',e.reason);results.push('EXCLUDED');return;}
    if(!e.safe){setNormStatus_(ss,nr,'REVIEW',e.reason);results.push('REVIEW');return;}
    if(e.type==='재입고완료'){
      const rr=updateReturn_(ss,e);if(!rr.ok){setNormStatus_(ss,nr,'REVIEW',rr.reason);results.push('REVIEW');return;}
      setNormStatus_(ss,nr,'WRITTEN',`반출일지 ${rr.row}행 갱신`);results.push('WRITTEN');return;
    }
    const wr=writeWork_(ss,e);if(!wr.ok){setNormStatus_(ss,nr,'FAILED',wr.reason);throw new Error(wr.reason);}
    setNormStatus_(ss,nr,'WRITTEN',`업무이력 ${wr.row}행`);results.push('WRITTEN');
  });
  let ui='원본반영';if(results.includes('REVIEW'))ui='검토대기';else if(results.includes('EXCLUDED'))ui='제외';setInputStatus_(input,Number(p.inputRow),ui);
  return {summary:`현장입력 ${parts.length}건 · 반영 ${results.filter(x=>x==='WRITTEN').length} · 검토 ${results.filter(x=>x==='REVIEW').length} · 제외 ${results.filter(x=>x==='EXCLUDED').length}`,ack:ui};
}

function splitEvents_(raw){const a=String(raw).split(/\r?\n|;/).map(x=>x.trim()).filter(Boolean);return a.length?a:[String(raw).trim()];}

function normalEvent_(ss,line,index,p){
  const now=new Date(),project=resolveProject_(ss,line),type=workType_(line),people=extractPeople_(line),date=parseDate_(line,now),excludedDate=safety_(ss,'Excluded Actual Date')||'2026-09-14',dateKey=Utilities.formatDate(date,HF_SW.TZ,'yyyy-MM-dd');
  const excluded=dateKey===excludedDate,conf=confidence_(type,project,people,line),safe=!excluded&&highConfidence_(type,project,people,conf),reason=excluded?`EXCLUDED_DATE:${excludedDate}`:safe?'':'LOW_CONFIDENCE_OR_AMBIGUOUS_TARGET';
  return {receivedAt:now,source:'FIELD_INPUT',raw:line,eventIndex:index,target:type==='재입고완료'?'반출일지':'업무이력',date,type,customer:project.customer||'',model:project.model||'',orderId:project.orderId||'',work:workContent_(line,project,people),people:people.join(', '),link:issueOrOrder_(line,project),confidence:conf,safe,excluded,reason,inputSheet:p.inputSheet,inputRow:p.inputRow};
}

function workType_(raw){const t=norm_(raw);if(/재입고완료|수정품.*입고완료|반출품.*입고완료/.test(t))return'재입고완료';if(/출고완료|납품완료/.test(t))return'출고완료';if(/불량|문제|이상|소음|끼임|동심|재가공|고장|파손/.test(t))return'불량발생';if(/일정.*변경|연기|미뤄|당겨|재조정/.test(t))return'일정변경';if(/지연|대기|미입고|발주누락|누락/.test(t))return'지연사유';if(/외주입고/.test(t))return'외주입고';if(/(^|[^a-z])pt([^a-z]|$)|pt지원/.test(t))return'PT';if(/a\/s|as지원|a\/s지원/.test(t))return'A/S';if(/출장/.test(t))return'출장';if(/반차/.test(t))return'반차';if(/연차/.test(t))return'연차';if(/타팀지원|지원/.test(t))return'타팀지원';if(/검수/.test(t))return'검수';return'일일작업';}

function resolveProject_(ss,raw){
  const sh=getSheet_(ss,HF_SW.SHEET.PRODUCT,null),last=Math.max(sh.getLastRow(),5),rows=sh.getRange(5,1,last-4,3).getDisplayValues(),t=compact_(raw);let best=null,score=0,tie=false;
  rows.forEach(r=>{const o=String(r[0]||'').trim(),c=String(r[1]||'').trim(),m=String(r[2]||'').trim();if(!o&&!c&&!m)return;let s=0,oc=compact_(o),cc=compact_(c),mc=compact_(m);if(oc&&t.includes(oc))s+=8;if(mc&&mc.length>=4&&t.includes(mc))s+=4;if(cc&&cc.length>=2&&t.includes(cc))s+=3;if(s>score){score=s;best={orderId:o,customer:c,model:m};tie=false;}else if(s>0&&s===score&&best){if(compact_(best.customer)!==cc||compact_(best.model)!==mc)tie=true;}});
  return !best||score<3||tie?{orderId:'',customer:'',model:'',ambiguous:true,score}:{...best,ambiguous:false,score};
}

function issueOrOrder_(raw,p){const m=String(raw).match(/ISS-\d{8}-\d{3}/i);if(m)return m[0].toUpperCase();const t=norm_(raw);if(/트루메카|대덕전자|pdm\s*-?\s*1kv/.test(t))return'ISS-20260910-033';if(/미코|kdm\s*-?\s*150/.test(t))return'ISS-20260907-014';if(/오랜드바이오|pdm\s*-?\s*300c/.test(t))return'ISS-20260907-017';if(/한국재료연구원|krm\s*-?\s*100d2/.test(t))return'ISS-20260910-032';if(/데모기|apm\s*-?\s*20k|연속순환믹서/.test(t))return'ISS-20260910-034';return p.orderId||'';}
function extractPeople_(raw){return HF_SW.PEOPLE.filter(n=>String(raw).includes(n));}

function parseDate_(raw,fallback){let m=String(raw).match(/(20\d{2})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/);if(m)return validDate_(+m[1],+m[2],+m[3],fallback);m=String(raw).match(/(?:^|\s)(\d{1,2})[\/.\-](\d{1,2})(?:\s|$)/);if(m)return validDate_(+Utilities.formatDate(fallback,HF_SW.TZ,'yyyy'),+m[1],+m[2],fallback);return fallback;}
function validDate_(y,m,d,f){const x=new Date(y,m-1,d,12,0,0);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d?x:f;}
function confidence_(type,p,people,raw){let s=.25;if(p&&!p.ambiguous){if(p.orderId)s+=.25;if(p.customer)s+=.15;if(p.model)s+=.15;}if(type!=='일일작업')s+=.10;if(people.length)s+=.10;if(String(raw).length>=8)s+=.05;return Math.min(.99,Number(s.toFixed(2)));}
function highConfidence_(type,p,people,c){if(['연차','반차'].includes(type))return people.length>0&&c>=.45;if(['출장','PT','A/S','타팀지원'].includes(type))return(people.length>0||(p&&!p.ambiguous))&&c>=.55;if(type==='재입고완료')return p&&!p.ambiguous&&(p.orderId||p.model)&&c>=.65;return p&&!p.ambiguous&&(p.customer||p.model||p.orderId)&&c>=.65;}
function workContent_(raw,p,people){let t=String(raw).trim();[p.orderId,p.customer,p.model].concat(people).forEach(v=>{if(v)t=t.replace(v,' ');});t=t.replace(/\s+/g,' ').trim();return t||String(raw).trim();}

function appendNorm_(ss,e,id){
  const sh=getSheet_(ss,HF_SW.SHEET.NORM,HF_SW.ID.NORM),row=blankRow_(sh,2,1);ensureRows_(sh,row);const eid=id+'-E'+String(e.eventIndex).padStart(2,'0'),dedupe=sha256_([e.source,Utilities.formatDate(e.date,HF_SW.TZ,'yyyy-MM-dd'),norm_(e.raw)].join('|'));
  sh.getRange(row,1,1,20).setValues([[eid,dt_(e.receivedAt),e.source,e.raw,e.eventIndex,e.target,e.date,e.type,e.customer,e.model,e.work,e.people,e.raw,'현장입력',e.safe?'확정':'검토',e.link,e.confidence,e.excluded?'EXCLUDED':e.safe?'NORMALIZED':'REVIEW',dedupe,e.reason||'']]);sh.getRange(row,7).setNumberFormat('yyyy-mm-dd');return row;
}
function setNormStatus_(ss,row,status,note){const sh=getSheet_(ss,HF_SW.SHEET.NORM,HF_SW.ID.NORM);sh.getRange(row,18).setValue(status);if(note)sh.getRange(row,20).setValue(note);}

function writeWork_(ss,e){
  const sh=getSheet_(ss,HF_SW.SHEET.WORK,HF_SW.ID.WORK),row=blankRow_(sh,8,1);ensureRows_(sh,row);const src=sh.getRange(Math.max(8,row-1),1,1,9),dst=sh.getRange(row,1,1,9);src.copyTo(dst,SpreadsheetApp.CopyPasteType.PASTE_FORMAT,false);src.copyTo(dst,SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION,false);dst.clearContent();dst.setValues([[e.date,e.type,e.customer,e.model,e.work,e.people,e.raw,'현장입력','확정']]);sh.getRange(row,1).setNumberFormat('yyyy-mm-dd');SpreadsheetApp.flush();const c=dst.getDisplayValues()[0],ok=String(c[1])===e.type&&String(c[6])===e.raw&&String(c[7])==='현장입력';return ok?{ok:true,row}:{ok:false,row,reason:'업무이력 저장 재검증 불일치'};
}

function updateReturn_(ss,e){
  const sh=getSheet_(ss,HF_SW.SHEET.RETURN,null),last=Math.max(sh.getLastRow(),4);if(last<4)return{ok:false,reason:'반출일지 데이터 없음'};const v=sh.getRange(4,1,last-3,15).getDisplayValues(),o=compact_(e.orderId),m=compact_(e.model),cand=[];
  v.forEach((r,i)=>{const jm=compact_(r[2]),matched=(o&&jm.includes(o))||(m&&jm.includes(m));if(matched&&!String(r[11]).trim()&&!String(r[12]).trim())cand.push(i+4);});
  if(cand.length!==1)return{ok:false,reason:cand.length?'재입고 대상 반출건이 복수라 자동확정 불가':'재입고 대상 미완료 반출건을 찾지 못함'};
  const row=cand[0];sh.getRange(row,12).setValue(e.date).setNumberFormat('yyyy. M. d');const note=sh.getRange(row,15),prev=String(note.getDisplayValue()||'').trim(),stamp='현장입력 재입고완료 '+Utilities.formatDate(e.date,HF_SW.TZ,'yyyy-MM-dd');note.setValue(prev?prev+' · '+stamp:stamp);SpreadsheetApp.flush();return sh.getRange(row,12).getValue()?{ok:true,row}:{ok:false,row,reason:'반출일지 저장 실패'};
}

function assertStructure_(ss){if(ss.getId()!==HF_SW.SSID)throw new Error('SAFE_GATE_SPREADSHEET_ID_MISMATCH');getSheet_(ss,HF_SW.SHEET.WORK,HF_SW.ID.WORK);getSheet_(ss,'월간계획_메인',HF_SW.ID.MONTHLY);getSheet_(ss,HF_SW.SHEET.QUEUE,HF_SW.ID.QUEUE);getSheet_(ss,HF_SW.SHEET.FIELD,HF_SW.ID.FIELD);getSheet_(ss,HF_SW.SHEET.CORRECTION,HF_SW.ID.CORRECTION);getSheet_(ss,HF_SW.SHEET.NORM,HF_SW.ID.NORM);getSheet_(ss,HF_SW.SHEET.SAFETY,HF_SW.ID.SAFETY);return true;}
function getSheet_(ss,name,id){const sh=ss.getSheetByName(name);if(!sh)throw new Error('MISSING_SHEET:'+name);if(id!=null&&sh.getSheetId()!==id)throw new Error('SHEET_ID_MISMATCH:'+name);return sh;}
function fieldOpen_(ss){return /^OPEN\b/.test(safety_(ss,'Field Input Safe Write'));}
function safety_(ss,key){const sh=getSheet_(ss,HF_SW.SHEET.SAFETY,HF_SW.ID.SAFETY),v=sh.getRange(1,1,sh.getLastRow(),2).getDisplayValues();for(let i=0;i<v.length;i++)if(String(v[i][0])===key)return String(v[i][1]||'');return'';}
function setSafety_(ss,key,val){const sh=getSheet_(ss,HF_SW.SHEET.SAFETY,HF_SW.ID.SAFETY),v=sh.getRange(1,1,sh.getLastRow(),1).getDisplayValues();for(let i=0;i<v.length;i++)if(String(v[i][0])===key){sh.getRange(i+1,2).setValue(val);return;}throw new Error('SAFETY_KEY_NOT_FOUND:'+key);}
function setInputStatus_(sh,row,status){if(sh&&row)sh.getRange(row,HF_SW.STATUS_COL).setValue(status);}
function blankRow_(sh,start,col){const n=Math.max(sh.getMaxRows()-start+1,1),v=sh.getRange(start,col,n,1).getDisplayValues();for(let i=0;i<v.length;i++)if(!String(v[i][0]||'').trim())return start+i;return sh.getMaxRows()+1;}
function ensureRows_(sh,row){if(row>sh.getMaxRows())sh.insertRowsAfter(sh.getMaxRows(),Math.max(100,row-sh.getMaxRows()));}
function requester_(){try{return Session.getActiveUser().getEmail()||'FIELD_USER';}catch(_){return'FIELD_USER';}}
function priority_(raw){return /긴급|즉시|오늘중|납기임박|출고막힘|라인정지/.test(norm_(raw))?'HIGH':'NORMAL';}
function norm_(v){return String(v==null?'':v).toLowerCase().replace(/\s+/g,' ').trim();}
function compact_(v){return String(v==null?'':v).toLowerCase().replace(/[\s\-_/().·]/g,'').trim();}
function sha256_(text){const b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(text),Utilities.Charset.UTF_8);return b.map(x=>('0'+(x<0?x+256:x).toString(16)).slice(-2)).join('');}
function dt_(d){return Utilities.formatDate(d,HF_SW.TZ,'yyyy-MM-dd HH:mm:ss z');}

// 무변경 분류 테스트: Queue/원본/정규화 원장에 쓰지 않는다.
function testHandsFreeSafeWriteClassifier(){
  const ss=SpreadsheetApp.openById(HF_SW.SSID);assertStructure_(ss);
  return ['미코 KDM-150 수정품 확인 후 조립 재개','오랜드바이오 PDM-300C 에어칠러 입고대기','이상준 연차'].map((raw,i)=>{const e=normalEvent_(ss,raw,i+1,{inputSheet:'TEST',inputRow:0});return{raw,type:e.type,customer:e.customer,model:e.model,orderId:e.orderId,confidence:e.confidence,safeToWrite:e.safe,excluded:e.excluded};});
}
