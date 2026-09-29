/* Completes existing Light v1 screens using personal, signed server requests. */
let appIssues=[],appProjects=[],appReport=null,appIssue=null,editingNoteId=null;
const appCall=b=>api('/api/sa2-app',b,55000);
function appError(e){if(!e.status&&!e.data)return '연결 실패 또는 응답 미확인입니다. 자동 재전송하지 않습니다.';const code=e.data?.error||e.message;return ({unauthorized:'로그인 상태를 확인할 수 없습니다. 개인 로그인을 다시 확인하세요.',invalid_identity:'개인 인증을 확인하지 못했습니다. 다시 로그인하세요.',identity_denied:'개인 인증 또는 허용 계정을 확인하세요.',invalid_origin:'앱 주소와 인증 출처 설정을 확인하세요.',personal_login_required:'사용자 등록이 필요합니다.',activation_required:'사용자 등록이 필요합니다.',forbidden:'이 계정의 권한을 확인하세요.',stale_record:'다른 변경이 있습니다. 최신 내용을 다시 열어 수정하세요.',project_mismatch:'프로젝트 연결을 확인하세요.',ambiguous_receipt:'같은 내용의 요청이 여러 건입니다. 요청 번호로 확인하세요.',invalid_reason:'변경 사유를 입력하세요.',invalid_next_action:'다음 행동을 입력하세요.',no_change:'변경한 내용이 없습니다.',edit_gate_closed:'수정 기능 연결을 확인 중입니다.'})[code]||scheduleErrors[code]||'연결 결과를 확인하지 못했습니다. 잠시 후 다시 확인하세요.';}
function appFailure(el,e){if(el?.isConnected)el.innerHTML=esc(appError(e))+(e.status===401?' <a href="./login.html">사용자 등록</a>':'');}
function appDay(v){if(/^\d{5}(?:\.\d+)?$/.test(String(v)))return new Date(Date.UTC(1899,11,30)+Math.floor(Number(v))*86400000).toISOString().slice(0,10);return String(v||'');}
function appQuantity(v){const n=Number(String(v).replaceAll(',',''));if(!String(v).trim()||!Number.isFinite(n)||n<0)throw Error('invalid_report');return n;}
reports=function(){return '<section><div class="section-title"><h2>생산 · 지원 집계</h2></div><div class="report-links"><button onclick="productionReport(\'month\')">▥ 월간생산량<small>선택한 한 달의 실제 납품 ›</small></button><button onclick="productionReport(\'year\')">▤ 연간생산량<small>선택한 한 해의 실제 납품 ›</small></button><button onclick="supportReport(\'month\')">⇄ 월간 타부서지원<small>선택한 한 달의 지원 기록 ›</small></button><button onclick="supportReport(\'year\')">⇄ 연간 타부서지원<small>선택한 한 해의 지원 기록 ›</small></button></div></section>';};
productionReport=async function(mode){await loadAppReport(mode);};
supportReport=async function(period='month'){await loadAppReport('support-'+period);};
async function loadAppReport(mode){const title=mode==='support-month'?'월간 타부서지원':mode==='support-year'?'연간 타부서지원':mode==='month'?'월간생산량':'연간생산량';open(heading('생산 · 지원 집계',title)+'<div id="appReportResult">원본 집계를 불러오는 중…</div>');const el=$('appReportResult');try{const d=await appCall({action:'reports'});if(!el.isConnected)return;appReport={mode,data:d};renderAppReport();}catch(e){appFailure(el,e);}}
function renderAppReport(){
 const el=$('appReportResult');if(!el||!appReport)return;const {mode,data}=appReport;
 try{
  const support=mode.startsWith('support-'),monthly=mode==='month'||mode==='support-month';
  const rows=(support?data.support:mode==='month'?data.monthly:data.annual).slice(1).filter(r=>r[0]&&r[1]);
  const rowYear=r=>support?appDay(r[0]).slice(0,4):String(r[0]),rowMonth=r=>support?Number(appDay(r[0]).slice(5,7)):Number(r[1]);
  const years=[...new Set(rows.map(rowYear).filter(Boolean))].sort().reverse();
  const year=$('reportYear')?.value||years[0]||'';
  const months=monthly?[...new Set(rows.filter(r=>rowYear(r)===year).map(rowMonth).filter(n=>n>=1&&n<=12))].sort((a,b)=>b-a):[];
  const requestedMonth=Number($('reportMonth')?.value),month=months.includes(requestedMonth)?requestedMonth:(months[0]||0);
  const selected=rows.filter(r=>rowYear(r)===year&&(!monthly||rowMonth(r)===month));
  let body;
  if(support){
   const shown=selected.filter(r=>r[11]==='Y'&&r[8]==='확정'),groups={};shown.forEach(r=>{const k=r[9]||r[1];groups[k]=(groups[k]||0)+1;});
   body='<div class="action-box">확정된 타부서 지원 <b>'+shown.length+'건</b></div>'+Object.entries(groups).map(([k,v])=>'<span class="chip">'+esc(k)+' '+v+'건</span>').join('')+shown.map(r=>'<article class="item"><b>'+esc(appDay(r[0]))+' · '+esc(r[9]||r[1])+'</b><p>'+esc(r[2])+' '+esc(r[3])+'</p><p>'+esc(r[4])+'</p><small>참여자 '+esc(r[5]||'미기록')+'</small></article>').join('')+(!shown.length?'<p>선택한 기간의 지원 기록이 없습니다.</p>':'')+'<p class="note">원본에서 확정되고 운영현황 표시가 Y인 기록을 건수로 집계합니다. 지원시간은 원본에 없어 표시하지 않습니다.</p>';
  }else{
   const byModel=new Map();selected.forEach(r=>{const name=r[mode==='month'?2:1],qty=appQuantity(r[mode==='month'?3:2]);byModel.set(name,(byModel.get(name)||0)+qty);});
   const total=[...byModel.values()].reduce((a,b)=>a+b,0);
   body=selected.length?'<div class="action-box">실제 납품 집계 <b>'+total+'대</b></div><table class="report-table"><thead><tr><th>장비</th><th>대수</th></tr></thead><tbody>'+[...byModel].map(([k,v])=>'<tr><td>'+esc(k)+'</td><td>'+v+'</td></tr>').join('')+'</tbody></table>':'<p>선택한 기간의 집계 기록이 없습니다.</p>';
   body+='<p class="note">원본 납품 집계표 기준 · B팀 · 실제 납품일 · 수리/PT 제외. 계획 진행률을 완료 실적으로 계산하지 않습니다.</p>';
  }
  el.innerHTML='<div class="report-controls"><label>연도<select id="reportYear" onchange="renderAppReport()">'+years.map(y=>'<option '+(y===year?'selected':'')+'>'+esc(y)+'</option>').join('')+'</select></label>'+(monthly?'<label>월<select id="reportMonth" onchange="renderAppReport()">'+months.map(m=>'<option value="'+m+'" '+(month===m?'selected':'')+'>'+m+'월</option>').join('')+'</select></label>':'')+'</div>'+body;
 }catch(e){appFailure(el,e);}
}
const appWorkBase=work;
work=function(f='all',query=''){appWorkBase(f,query);main.insertAdjacentHTML('afterbegin','<button class="secondary" onclick="allProjects()">전체 프로젝트 · 계획 · 이력</button>');};
async function getAppProjects(){const d=await appCall({action:'catalog'});if(!Array.isArray(d.projects))throw Error('invalid_catalog');appIssues=d.issues||[];appProjects=d.projects;return appProjects;}
async function allProjects(prefix='',purpose='detail'){
 open(heading('프로젝트',prefix?'장비를 선택하세요':'전체 프로젝트','발주번호를 기준으로 일정과 이력을 연결합니다')+'<div id="projectResults">프로젝트를 불러오는 중…</div>');const el=$('projectResults');
 try{const rows=await getAppProjects();if(!el.isConnected)return;const selected=rows.filter(x=>!prefix||x.orderId.startsWith(prefix));
  el.innerHTML=selected.map(x=>'<button class="item" data-project="'+esc(x.orderId)+'" data-purpose="'+esc(purpose)+'"><b>'+esc(x.customer)+' · '+esc(x.model)+'</b><p>'+esc(x.orderId)+'</p><small>'+esc(x.state)+' · PM '+esc(x.pm||'미등록')+'</small></button>').join('')||'<p>연결된 프로젝트가 없습니다.</p>';
  el.querySelectorAll('[data-project]').forEach(button=>button.onclick=()=>openProject(button.dataset.project,button.dataset.purpose));
 }catch(e){appFailure(el,e);}
}
function openProject(orderId,purpose='detail'){
 const p=appProjects.find(x=>x.orderId===orderId);if(!p)return;
 if(purpose==='schedule')return scheduleReport(p);if(purpose==='input')return input(p);
 open(heading('프로젝트',p.customer,p.model)+'<p>'+esc(p.orderId)+'</p><p>납기 '+esc(p.due||'미등록')+' · '+esc(p.state)+'</p><button id="projectPlan" class="primary">계획일정</button><button id="projectInput" class="secondary">진행 내용 입력</button><button id="projectHistory" class="secondary">Event · 변경이력</button>');
 appIssues.filter(x=>['OPEN','MONITOR','CLOSED'].includes(x.status)&&(x.orderId===p.orderId||(x.orderId.includes('*')&&p.orderId.startsWith(x.orderId.replace(/\*.*$/,''))))).forEach(x=>{const b=document.createElement('button');b.className='secondary';b.textContent=x.status+' · '+x.state+' · 상태 수정';b.onclick=()=>editIssue(x.issueId);$('sheetBody').appendChild(b);});
 $('projectPlan').onclick=()=>scheduleReport(p);$('projectInput').onclick=()=>input(p);$('projectHistory').onclick=()=>projectHistory(p.orderId);
}
const appScheduleBase=scheduleReport;
scheduleReport=function(id){const x=typeof id==='object'?id:items[id];if(x?.orderId?.includes('*'))return allProjects(x.orderId.replace(/\*.*$/,''),'schedule');return appScheduleBase(id);};
const appInputBase=input;
input=function(id){const x=typeof id==='object'?id:items[id];if(x?.orderId?.includes('*'))return allProjects(x.orderId.replace(/\*.*$/,''),'input');editingNoteId=null;return appInputBase(id);};
const appItemBase=openItem;
openItem=function(id){appItemBase(id);const x=items[id];if(!x)return;const box=$('sheetBody');box.insertAdjacentHTML('beforeend','<button id="issueEditButton" class="secondary">현재 상태 · 다음 행동 수정</button><button id="issueHistoryButton" class="secondary">Event · 변경이력</button>');$('issueEditButton').onclick=()=>editIssue(x.issueId);$('issueHistoryButton').onclick=()=>projectHistory(x.orderId);};
async function projectHistory(orderId){open(heading('Event · 변경이력',orderId)+'<div id="historyResult">서버 기록을 불러오는 중…</div>');const el=$('historyResult');try{const d=await appCall({action:'history',orderId});if(!el.isConnected)return;
 el.innerHTML='<h3>변경이력</h3>'+d.changes.map(r=>'<article class="item"><b>'+esc(r.kind==='schedule'?'일정 변경':'현재 상태 변경')+'</b><p>'+esc(r.kind==='schedule'?appDay(r.before[3])+' → '+appDay(r.after[3]):r.before[16]+' → '+r.after[16])+'</p><p>'+esc(r.reason)+'</p><small>'+esc(r.at)+' · '+esc(r.actor)+'<br>'+esc(r.id)+'</small></article>').join('')+(!d.changes.length?'<p>기록된 변경이력이 없습니다.</p>':'')+'<h3>Event</h3>'+d.events.map(r=>'<article class="item"><b>'+esc(r.type)+' · '+esc(r.status)+'</b><p>'+esc(r.raw)+'</p><small>'+esc(r.at)+' · '+esc(r.actor||'과거 기록: 입력자 직접 기록 없음')+'<br>'+esc(r.requestId)+'</small></article>').join('')+(!d.events.length?'<p>연결된 Event 기록이 없습니다.</p>':'');
 }catch(e){appFailure(el,e);}}
async function editIssue(issueId){open(heading('상태 수정',issueId)+'<div id="issueEditResult">최신 상태를 불러오는 중…</div>');const el=$('issueEditResult');try{const d=await appCall({action:'issue',issueId});if(!el.isConnected)return;if(!['OPEN','MONITOR','CLOSED'].includes(d.status)){el.textContent='취소된 과거 이슈는 수정할 수 없습니다. 변경이력에서 확인하세요.';appIssue=null;return;}appIssue=d;
 el.innerHTML='<p>'+esc(d.customer)+' · '+esc(d.model)+'<br>'+esc(d.orderId)+'</p><label>현재 상태<input id="issueState" maxlength="80" value="'+esc(d.state)+'"></label><label>다음 행동<textarea id="issueNext" maxlength="500">'+esc(d.nextAction)+'</textarea></label><label>이슈 관리 상태<select id="issueStatus">'+[['OPEN','진행 중'],['MONITOR','관찰 중'],['CLOSED','종결']].map(([v,t])=>'<option value="'+v+'" '+(d.status===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label><label>변경 사유<textarea id="issueReason" maxlength="500"></textarea></label><p id="issueSaveHint" role="status"></p><button id="issueSaveButton" class="primary" onclick="saveIssue()">변경 내용 확인 후 저장</button><button class="secondary" onclick="checkIssueReceipt()">이 기기의 마지막 상태 저장 결과 확인</button>';
 }catch(e){appFailure(el,e);}}
function applyIssueReceiptLocal(d){const i=items.findIndex(x=>x.issueId===d.issueId);if(d.issueStatus==='CLOSED'){if(i>=0)items.splice(i,1);}else if(i>=0){items[i]={...items[i],state:d.state,nextAction:d.nextAction,issueStatus:d.issueStatus,sourceLatestUpdate:new Date().toISOString()};}items=items.map((x,id)=>({...x,id}));if(screen==='home')home();if(screen==='work')work(filter,$('search')?.value||'');}
async function saveIssue(){if(!appIssue||$('issueSaveButton')?.disabled)return;if(readStore('hf-issue-pending',null))return toast('이전 상태 저장 결과부터 확인하세요. 자동 재전송하지 않습니다.');const body={action:'edit',issueId:appIssue.issueId,orderId:appIssue.orderId,expected:appIssue.revision,state:$('issueState').value.trim(),nextAction:$('issueNext').value.trim(),status:$('issueStatus').value,reason:$('issueReason').value.trim(),requestId:crypto.randomUUID()};const hint=$('issueSaveHint');if(!body.state||!body.reason||(!body.nextAction&&body.status!=='CLOSED')){hint.textContent='현재 상태, 다음 행동, 변경 사유를 확인하세요.';return;}try{persist('hf-issue-pending',body);}catch{hint.textContent='요청을 기기에 보관하지 못해 전송하지 않았습니다.';return;}$('issueSaveButton').disabled=true;hint.textContent='저장 결과 확인 중…';try{const d=await appCall(body);await verifyIssueReceipt(d);}catch(e){if([400,401,403,409].includes(e.status))localStorage.removeItem('hf-issue-pending');if(hint.isConnected){hint.textContent=appError(e);$('issueSaveButton').hidden=true;}}}
function showIssueReceipt(d){if(d.status!=='APPLIED')throw Error('unconfirmed');try{localStorage.removeItem('hf-issue-pending');}catch{}open(heading('현재 상태 저장 완료',d.state,d.orderId)+'<p>다음 행동 '+esc(d.nextAction||'없음')+'</p><p>'+esc(d.reason)+'</p><p class="alert">앱의 현재 업무 화면에도 수정 내용을 반영했습니다.</p><p class="note">'+esc(d.actor)+'<br>'+esc(d.requestId)+'</p><button id="savedIssueHistory" class="secondary">변경이력 확인</button>');$('savedIssueHistory').onclick=()=>projectHistory(d.orderId);}
async function checkIssueReceipt(){const b=readStore('hf-issue-pending',null);if(!b)return toast('확인할 상태 저장 요청이 없습니다.');try{const d=await appCall({action:'receipt',issueId:b.issueId,requestId:b.requestId});if(d.status==='APPLIED'){await verifyIssueReceipt(d);}else toast('저장 이력이 아직 확인되지 않습니다. 자동 재전송하지 않습니다.');}catch(e){toast(appError(e));}}
function receiptState(d){if(d.applied&&/REVIEW|EXCLUDED|FAILED/.test(d.status))return 'partial';if(/FAILED|PROCESSING/.test(d.status))return 'unknown';return /REVIEW/.test(d.status)?'review':d.applied?'saved_unverified':/EXCLUDED/.test(d.status)?'excluded':/DUPLICATE/.test(d.status)?'duplicate':'received';}
const appReceiptBase=receiptDetail;
receiptDetail=function(id){appReceiptBase(id);const r=notes().find(x=>x.id===id);if(!r)return;if(r.copiedFrom)$('sheetBody').insertAdjacentHTML('beforeend','<p class="note">원문 보관 번호 '+esc(r.copiedFrom)+'</p>');if(r.revisions?.length)$('sheetBody').insertAdjacentHTML('beforeend','<details><summary>기기에 보관한 수정 이력</summary>'+r.revisions.map(v=>'<p>'+esc(v.target)+'<br>'+esc(v.text)+'</p>').join('')+'</details>');if(r.status!=='draft'){$('sheetBody').insertAdjacentHTML('beforeend','<button id="serverReceiptButton" class="secondary">서버 저장 결과 다시 확인</button>');$('serverReceiptButton').onclick=()=>checkEventReceipt(id);}if(r.status!=='sending'){$('sheetBody').insertAdjacentHTML('beforeend','<button id="editLocalNote" class="secondary">'+(['draft','rejected'].includes(r.status)?'내용 수정하기':'내용 수정 후 새로 접수')+'</button>');$('editLocalNote').onclick=()=>editLocalNote(id);}};
async function checkEventReceipt(id){const r=notes().find(x=>x.id===id);if(!r)return false;try{const d=await appCall({action:'receipt',requestId:r.requestId||'',submissionId:r.submissionId||r.id,text:`${r.target} ${r.text}`,targetHint:r.target});if(d.status==='NOT_FOUND'){updateNote(id,{status:'received',ack:'서버 요청 번호는 받았지만 저장 기록은 아직 확인되지 않았습니다. 자동 재전송하지 않습니다.',respondedAt:new Date().toISOString()});receiptDetail(id);return false;}updateNote(id,{status:receiptState(d),requestId:d.requestId||r.requestId,ack:d.ack||r.ack||'서버 저장 결과를 확인했습니다.',respondedAt:new Date().toISOString()});if(d.applied)await verifyEventNote(id,d);receiptDetail(id);return true;}catch(e){updateNote(id,{ack:appError(e)});receiptDetail(id);return false;}}
function editLocalNote(id){const r=notes().find(x=>x.id===id);if(!r||r.status==='sending')return;if(!canSendNote(r,true))return;let editId=id;if(!['draft','rejected'].includes(r.status)){try{const edit={id:crypto.randomUUID(),target:r.target,text:r.text,status:'draft',createdAt:new Date().toISOString(),copiedFrom:r.id};edit.submissionId=edit.id;const list=notes();list.unshift(edit);persist(KEY,list);editId=edit.id;}catch{return toast('수정본을 새 입력으로 만들지 못했습니다.');}}appInputBase();const e=notes().find(x=>x.id===editId);$('inputTarget').value=e.target;$('draft').value=e.text;editingNoteId=editId;$('sheetBody').querySelector('button.primary').textContent='기기에만 보관';$('sheetBody').insertAdjacentHTML('beforeend','<p class="alert">대상과 수정 내용을 확인한 뒤 보내세요. 업무이력으로 접수하며 현재 상태·다음 행동·일정은 별도 화면에서 변경합니다.</p><button id="sendEditedNote" class="primary" onclick="saveEditedAndSend()">수정한 내용 서버로 보내기</button>');}
const appSaveNoteBase=saveNote;
saveNote=function(){if(!editingNoteId)return appSaveNoteBase();const id=editingNoteId,r=notes().find(x=>x.id===id);if(!r||!['draft','rejected'].includes(r.status))return;const target=$('inputTarget').value.trim(),text=$('draft').value.trim();if(!target||!text){$('inputHint').textContent='입력 대상과 진행 내용을 모두 작성하세요.';return;}try{updateNote(id,{revisions:[...(r.revisions||[]),{target:r.target,text:r.text,at:r.updatedAt||r.createdAt,submissionId:r.submissionId}],verifiedAt:'',target,text,status:'draft',submissionId:crypto.randomUUID(),requestId:'',ack:'',respondedAt:'',updatedAt:new Date().toISOString()});localStorage.removeItem(DRAFT);editingNoteId=null;receiptDetail(id);return id;}catch{toast('수정 내용을 기기에 저장하지 못했습니다.');}};
function canSendNote(r,editing=false){
 const unresolved=['sending','unknown','received','duplicate','saved_unverified','partial','review'];
 const parent=r.copiedFrom&&notes().find(x=>x.id===r.copiedFrom);
 if((editing&&(unresolved.includes(r.status)||(r.status==='applied'&&!r.verifiedAt)))||(r.copiedFrom&&(!parent||unresolved.includes(parent.status)||(parent.status==='applied'&&!parent.verifiedAt)))){toast('이전 요청의 서버 결과부터 확인하세요. 중복 방지를 위해 수정본 전송을 보류합니다.');return false;}
 return true;
}
async function saveEditedAndSend(){if(!editingNoteId)return;const id=saveNote();if(id)await sendNote(id);}
async function verifyEventNote(id,receipt){
 const r=notes().find(x=>x.id===id);if(!r)return;
 try{
  const d=receipt||await appCall({action:'receipt',requestId:r.requestId||'',submissionId:r.submissionId||r.id});
  if(receiptState(d)!=='saved_unverified'){updateNote(id,{status:receiptState(d),verifiedAt:''});return false;}
  if(!d.requestId||(r.requestId&&d.requestId!==r.requestId)||!Array.isArray(d.events)||!d.events.length||d.events.some(e=>e.status!=='WRITTEN'||!e.orderId))throw Error('receipt_unconfirmed');
  for(const orderId of new Set(d.events.map(e=>e.orderId))){
   const h=await appCall({action:'history',orderId});
   if(h.orderId!==orderId||!Array.isArray(h.events)||d.events.filter(e=>e.orderId===orderId).some(e=>!h.events.some(x=>x.id===e.id&&x.requestId===d.requestId&&x.raw===e.raw&&x.status==='WRITTEN')))throw Error('history_mismatch');
  }
  if(readPending)await readPending;
  if(!await refresh())throw Error('refresh_failed');
  updateNote(id,{status:'applied',requestId:d.requestId,verifiedAt:new Date().toISOString(),ack:'업무이력 저장과 서버 재조회가 일치합니다. 현재 상태·다음 행동·일정은 자동 변경하지 않았습니다.'});return true;
 }catch(e){updateNote(id,{status:'saved_unverified',verifiedAt:'',ack:'서버 저장 응답은 받았지만 재조회 일치를 확인하지 못했습니다. 저장 결과 다시 확인을 눌러주세요. 자동 재전송하지 않습니다.'});return false;}
}
async function verifyIssueReceipt(d){
 if(d.status!=='APPLIED')throw Error('unconfirmed');
 try{
  const current=await appCall({action:'issue',issueId:d.issueId});
  if(current.issueId!==d.issueId||current.orderId!==d.orderId||current.state!==d.state||current.nextAction!==d.nextAction||current.status!==d.issueStatus)throw Error('readback_mismatch');
  if(readPending)await readPending;
  if(!await refresh())throw Error('refresh_failed');
  const shown=items.find(x=>x.issueId===d.issueId);
  if(d.issueStatus==='CLOSED'?!!shown:!shown||shown.orderId!==d.orderId||shown.state!==d.state||shown.nextAction!==d.nextAction||shown.issueStatus!==d.issueStatus)throw Error('readback_mismatch');
  applyIssueReceiptLocal(d);showIssueReceipt(d);
 }catch{open(heading('현재 상태 저장 응답 확인','재조회 확인 필요',d.orderId)+'<p class="alert">서버 저장 응답은 받았지만 최신 조회값과의 일치를 확인하지 못했습니다. 자동 재전송하지 않습니다.</p><button class="secondary" onclick="checkIssueReceipt()">서버 저장 결과 다시 확인</button>');}
}
home();
