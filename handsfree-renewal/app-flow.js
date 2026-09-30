/* Completes existing Light v1 screens using personal, signed server requests. */
let appIssues=[],appProjects=[],appReport=null,appIssue=null,editingNoteId=null;
const appCall=b=>api('/api/sa2-app',b,55000);
function appError(e){if(!e.status&&!e.data)return '연결 실패 또는 응답 미확인입니다. 자동 재전송하지 않습니다.';const code=e.data?.error||e.message;return ({unauthorized:'로그인 상태를 확인할 수 없습니다. 개인 로그인을 다시 확인하세요.',invalid_identity:'개인 인증을 확인하지 못했습니다. 다시 로그인하세요.',identity_denied:'개인 인증 또는 허용 계정을 확인하세요.',invalid_origin:'앱 주소와 인증 출처 설정을 확인하세요.',personal_login_required:'사용자 등록이 필요합니다.',activation_required:'사용자 등록이 필요합니다.',forbidden:'이 계정의 권한을 확인하세요.',stale_record:'다른 변경이 있습니다. 최신 내용을 다시 열어 수정하세요.',project_mismatch:'프로젝트 연결을 확인하세요.',ambiguous_receipt:'같은 내용의 요청이 여러 건입니다. 요청 번호로 확인하세요.',invalid_reason:'변경 사유를 입력하세요.',invalid_next_action:'다음 행동을 입력하세요.',no_change:'변경한 내용이 없습니다.',edit_gate_closed:'수정 기능 연결을 확인 중입니다.'})[code]||scheduleErrors[code]||'연결 결과를 확인하지 못했습니다. 잠시 후 다시 확인하세요.';}
function appFailure(el,e){if(el?.isConnected)el.innerHTML=esc(appError(e))+(e.status===401?' <a href="./login.html">사용자 등록</a>':'');}
function appDay(v){if(/^\d{5}(?:\.\d+)?$/.test(String(v)))return new Date(Date.UTC(1899,11,30)+Math.floor(Number(v))*86400000).toISOString().slice(0,10);return String(v||'');}
function appQuantity(v){const n=Number(String(v).replaceAll(',',''));if(!String(v).trim()||!Number.isFinite(n)||n<0)throw Error('invalid_report');return n;}
reports=function(){return '<section><div class="section-title"><h2>생산 · 지원 집계</h2></div><div class="report-links compact"><button onclick="productionReport()">▥ 생산 실적<small>월별 누적 · 과거 연도 합계 ›</small></button><button onclick="supportReport()">⇄ 타부서 지원<small>월별 인원 · 연간 합계 ›</small></button></div></section>';};
productionReport=async function(){await loadAppReport('production');};
supportReport=async function(){await loadAppReport('support');};
async function loadAppReport(mode){if(!personalConnected)return login();const title=mode==='support'?'타부서 지원':'생산 실적';open(heading('생산 · 지원 집계',title)+'<div id="appReportResult">원본 집계를 불러오는 중…</div>');const el=$('appReportResult');try{const d=await appCall({action:'reports'});if(!el.isConnected)return;appReport={mode,data:d};renderAppReport();}catch(e){appFailure(el,e);}}
function renderAppReport(){
 const el=$('appReportResult');if(!el||!appReport)return;const {mode,data}=appReport;
 try{
  const support=mode==='support',monthly=(data.monthly||[]).slice(1).filter(r=>r[0]&&r[1]),annual=(data.annual||[]).slice(1).filter(r=>r[0]&&r[1]),supportRows=(data.support||[]).slice(1).filter(r=>r[0]);
  const years=[...new Set((support?supportRows.map(r=>appDay(r[0]).slice(0,4)):monthly.map(r=>String(r[0]))).filter(Boolean))].sort().reverse();
  const year=$('reportYear')?.value||years[0]||String(new Date().getFullYear());
  let body='';
  if(support){
   const selected=supportRows.filter(r=>appDay(r[0]).startsWith(year)&&r[11]==='Y'&&r[8]==='확정'),monthPeople=new Map(),allPeople=new Set();
   selected.forEach(r=>{const month=Number(appDay(r[0]).slice(5,7)),names=String(r[5]||'').split(/[,·/]+/).map(v=>v.trim()).filter(Boolean);if(!monthPeople.has(month))monthPeople.set(month,{people:new Set(),cases:0});const group=monthPeople.get(month);group.cases++;names.forEach(name=>{group.people.add(name);allPeople.add(name);});});
   body='<div class="action-box"><small>'+esc(year)+'년 타부서 지원</small><strong>'+allPeople.size+'명</strong><span>확정 '+selected.length+'건</span></div><h3>월별 지원 인원</h3><div class="month-list">'+Array.from({length:12},(_,i)=>i+1).map(m=>{const v=monthPeople.get(m);return '<div><b>'+m+'월</b><span>'+(v?v.people.size:0)+'명</span><small>'+(v?v.cases:0)+'건</small></div>';}).join('')+'</div><p class="note">월 인원은 참여자 이름의 중복을 제거한 인원수입니다. 연간 인원도 같은 사람의 중복을 제거합니다. 원본에서 확정되고 운영현황 표시가 Y인 기록만 포함합니다.</p>';
  }else{
   const selected=monthly.filter(r=>String(r[0])===year),byMonth=new Map();selected.forEach(r=>byMonth.set(Number(r[1]),(byMonth.get(Number(r[1]))||0)+appQuantity(r[3])));
   const currentYear=String(new Date().getFullYear()),lastDataMonth=Math.max(0,...byMonth.keys()),lastMonth=year===currentYear?Math.max(new Date().getMonth()+1,lastDataMonth):Math.max(12,lastDataMonth);let cumulative=0;
   const monthRows=Array.from({length:lastMonth},(_,i)=>i+1).map(m=>{const qty=byMonth.get(m)||0;cumulative+=qty;return '<tr><td>'+m+'월</td><td>'+qty+'대</td><td><b>'+cumulative+'대</b></td></tr>';}).join('');
   const annualTotals=new Map();annual.forEach(r=>{const y=String(r[0]);annualTotals.set(y,(annualTotals.get(y)||0)+appQuantity(r[2]));});
   const past=[...annualTotals].filter(([y])=>y<year).sort((a,b)=>b[0].localeCompare(a[0]));
   body='<div class="action-box"><small>'+esc(year)+'년 실제 납품 누적</small><strong>'+cumulative+'대</strong><span>'+lastMonth+'월까지</span></div><h3>월별 · 연간 누적</h3><table class="report-table"><thead><tr><th>월</th><th>월 생산</th><th>연간 누적</th></tr></thead><tbody>'+monthRows+'</tbody></table><h3>과거 연도 합계</h3>'+(past.length?'<div class="year-totals">'+past.map(([y,v])=>'<div><b>'+esc(y)+'년</b><strong>'+v+'대</strong></div>').join('')+'</div>':'<p>과거 연도 집계 기록이 없습니다.</p>')+'<p class="note">원본 납품 집계표 기준 · B팀 · 실제 납품일 · 수리/PT 제외. 계획 진행률은 생산 실적으로 계산하지 않습니다.</p>';
  }
  el.innerHTML='<div class="report-controls"><label>기준 연도<select id="reportYear" onchange="renderAppReport()">'+years.map(y=>'<option '+(y===year?'selected':'')+'>'+esc(y)+'</option>').join('')+'</select></label></div>'+body;
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
function groupProjectPlans(rows){const sorted=rows.slice().sort((a,b)=>appDay(a[3]).localeCompare(appDay(b[3]))),groups=[];for(const row of sorted){const date=appDay(row[3]),process=String(row[10]||'공정 미등록'),last=groups.at(-1),next=last&&new Date(last.end+'T00:00:00Z').getTime()+86400000===new Date(date+'T00:00:00Z').getTime();if(last&&last.process===process&&next){last.end=date;last.status=String(row[11]||last.status);}else groups.push({start:date,end:date,process,status:String(row[11]||'상태 미등록')});}return groups;}
async function openProject(orderId,purpose='detail'){
 if(!personalConnected)return login();
 let p=appProjects.find(x=>x.orderId===orderId)||items.find(x=>x.orderId===orderId);if(!p)return toast('최신 프로젝트 목록을 다시 불러오세요.');
 if(purpose==='input')return input(p);
 open(heading('프로젝트 전체 보기',p.customer,p.model)+'<p>'+esc(p.orderId)+'</p><div id="projectOverview">전체 조립일정과 진행 기록을 불러오는 중…</div>');const el=$('projectOverview');
 try{const [plans,history]=await Promise.all([api('/api/sa2-lifecycle',{action:'plans',orderId:p.orderId}),appCall({action:'history',orderId:p.orderId})]);if(!el.isConnected)return;if(plans.orderId!==p.orderId||!Array.isArray(plans.plans)||!Array.isArray(history.events))throw Error('invalid_project');
  const stages=groupProjectPlans(plans.plans),events=history.events.slice().sort((a,b)=>String(a.at||'').localeCompare(String(b.at||''))),linked=items.find(x=>x.orderId===p.orderId)||p;
  el.innerHTML='<div class="project-summary"><span>납기 '+esc(p.due||'미등록')+'</span><b>현재 '+esc(p.state||linked.state||'미등록')+'</b></div><h3>전체 조립일정</h3><p class="note">자재수령부터 출고까지 원본 계획에 등록된 공정만 표시합니다.</p><div class="timeline">'+(stages.length?stages.map(s=>'<p><b>'+esc(s.process)+'</b><small>'+esc(s.start)+(s.end!==s.start?' ~ '+esc(s.end):'')+' · '+esc(s.status)+'</small></p>').join(''):'<p>연결된 조립일정이 없습니다.</p>')+'</div><h3>진행 내용</h3><p class="note">서버에 입력된 순서대로 표시합니다.</p><div class="progress-history">'+(events.length?events.map(r=>'<article class="item"><p>'+esc(r.raw||'내용 없음')+'</p><small>'+esc(r.at||'시간 미기록')+' · '+esc(r.actor||'입력자 미기록')+'</small></article>').join(''):'<p>입력된 진행 내용이 없습니다.</p>')+'</div><button id="projectInput" class="primary">진행내용 입력</button>';
  $('projectInput').onclick=()=>input(linked);
 }catch(e){appFailure(el,e);}
}
const appScheduleBase=scheduleReport;
scheduleReport=function(id){if(!personalConnected)return login();const x=typeof id==='object'?id:items[id];if(x?.orderId?.includes('*'))return allProjects(x.orderId.replace(/\*.*$/,''),'schedule');return appScheduleBase(id);};
const appInputBase=input;
input=function(id){if(!personalConnected)return login();const x=typeof id==='object'?id:items[id];if(x?.orderId?.includes('*'))return allProjects(x.orderId.replace(/\*.*$/,''),'input');editingNoteId=null;return appInputBase(id);};
const appItemBase=openItem;
openItem=function(id){appItemBase(id);const x=items[id];if(!x)return;const box=$('sheetBody');box.insertAdjacentHTML('beforeend','<button id="issueHistoryButton" class="secondary">전체 조립일정 · 진행이력</button>');$('issueHistoryButton').onclick=()=>openProject(x.orderId);};
async function projectHistory(orderId){open(heading('Event · 변경이력',orderId)+'<div id="historyResult">서버 기록을 불러오는 중…</div>');const el=$('historyResult');try{const d=await appCall({action:'history',orderId});if(!el.isConnected)return;
 el.innerHTML='<h3>변경이력</h3>'+d.changes.map(r=>'<article class="item"><b>'+esc(r.kind==='schedule'?'일정 변경':'현재 상태 변경')+'</b><p>'+esc(r.kind==='schedule'?appDay(r.before[3])+' → '+appDay(r.after[3]):r.before[16]+' → '+r.after[16])+'</p><p>'+esc(r.reason)+'</p><small>'+esc(r.at)+' · '+esc(r.actor)+'<br>'+esc(r.id)+'</small></article>').join('')+(!d.changes.length?'<p>기록된 변경이력이 없습니다.</p>':'')+'<h3>Event</h3>'+d.events.map(r=>'<article class="item"><b>'+esc(r.type)+' · '+esc(r.status)+'</b><p>'+esc(r.raw)+'</p><small>'+esc(r.at)+' · '+esc(r.actor||'과거 기록: 입력자 직접 기록 없음')+'<br>'+esc(r.requestId)+'</small></article>').join('')+(!d.events.length?'<p>연결된 Event 기록이 없습니다.</p>':'');
 }catch(e){appFailure(el,e);}}
async function editIssue(issueId){open(heading('상태 수정',issueId)+'<div id="issueEditResult">최신 상태를 불러오는 중…</div>');const el=$('issueEditResult');try{const d=await appCall({action:'issue',issueId});if(!el.isConnected)return;if(!['OPEN','MONITOR','CLOSED'].includes(d.status)){el.textContent='취소된 과거 이슈는 수정할 수 없습니다. 변경이력에서 확인하세요.';appIssue=null;return;}appIssue=d;
 el.innerHTML='<p>'+esc(d.customer)+' · '+esc(d.model)+'<br>'+esc(d.orderId)+'</p><label>현재 상태<input id="issueState" maxlength="80" value="'+esc(d.state)+'"></label><label>다음 행동<textarea id="issueNext" maxlength="500">'+esc(d.nextAction)+'</textarea></label><label>이슈 관리 상태<select id="issueStatus">'+[['OPEN','진행 중'],['MONITOR','관찰 중'],['CLOSED','종결']].map(([v,t])=>'<option value="'+v+'" '+(d.status===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label><label>변경 사유<textarea id="issueReason" maxlength="500"></textarea></label><p id="issueSaveHint" role="status"></p><button id="issueSaveButton" class="primary" onclick="saveIssue()">변경 내용 확인 후 저장</button><button class="secondary" onclick="checkIssueReceipt()">이 기기의 마지막 상태 저장 결과 확인</button>';
 }catch(e){appFailure(el,e);}}
function applyIssueReceiptLocal(d){const i=items.findIndex(x=>x.issueId===d.issueId);if(d.issueStatus==='CLOSED'){if(i>=0)items.splice(i,1);}else if(i>=0){items[i]={...items[i],state:d.state,nextAction:d.nextAction,issueStatus:d.issueStatus,sourceLatestUpdate:new Date().toISOString()};}items=items.map((x,id)=>({...x,id}));if(screen==='home')home();if(screen==='work')work(filter,$('search')?.value||'');}
async function saveIssue(){if(!appIssue||$('issueSaveButton')?.disabled)return;if(readStore('handsfree-renewal-issue-pending',null))return toast('이전 상태 저장 결과부터 확인하세요. 자동 재전송하지 않습니다.');const body={action:'edit',issueId:appIssue.issueId,orderId:appIssue.orderId,expected:appIssue.revision,state:$('issueState').value.trim(),nextAction:$('issueNext').value.trim(),status:$('issueStatus').value,reason:$('issueReason').value.trim(),requestId:crypto.randomUUID()};const hint=$('issueSaveHint');if(!body.state||!body.reason||(!body.nextAction&&body.status!=='CLOSED')){hint.textContent='현재 상태, 다음 행동, 변경 사유를 확인하세요.';return;}try{persist('handsfree-renewal-issue-pending',body);}catch{hint.textContent='요청을 기기에 보관하지 못해 전송하지 않았습니다.';return;}$('issueSaveButton').disabled=true;hint.textContent='서버 저장 중…';try{const d=await appCall(body);if(d.status!=='APPLIED')throw Error('unconfirmed');applyIssueReceiptLocal(d);showIssueReceiptPending(d);setTimeout(()=>verifyIssueReceipt(d),0);}catch(e){if([400,401,403,409].includes(e.status))localStorage.removeItem('handsfree-renewal-issue-pending');if(hint.isConnected){hint.textContent=appError(e);$('issueSaveButton').hidden=true;}}}
function showIssueReceiptPending(d){open(heading('서버 저장 성공',d.state,d.orderId)+'<p>다음 행동 '+esc(d.nextAction||'없음')+'</p><p>'+esc(d.reason)+'</p><p class="alert">화면에 바로 반영했습니다. 서버 원본을 다시 확인하고 있습니다.</p><p class="note">'+esc(d.requestId)+'</p>');}
function showIssueReceipt(d){if(d.status!=='APPLIED')throw Error('unconfirmed');try{localStorage.removeItem('handsfree-renewal-issue-pending');}catch{}open(heading('현재 상태 저장 완료',d.state,d.orderId)+'<p>다음 행동 '+esc(d.nextAction||'없음')+'</p><p>'+esc(d.reason)+'</p><p class="alert">앱의 현재 업무 화면에도 수정 내용을 반영했습니다.</p><p class="note">'+esc(d.actor)+'<br>'+esc(d.requestId)+'</p><button id="savedIssueHistory" class="secondary">변경이력 확인</button>');$('savedIssueHistory').onclick=()=>projectHistory(d.orderId);}
async function checkIssueReceipt(){const b=readStore('handsfree-renewal-issue-pending',null);if(!b)return toast('확인할 상태 저장 요청이 없습니다.');try{const d=await appCall({action:'receipt',issueId:b.issueId,requestId:b.requestId});if(d.status==='APPLIED'){await verifyIssueReceipt(d);}else toast('저장 이력이 아직 확인되지 않습니다. 자동 재전송하지 않습니다.');}catch(e){toast(appError(e));}}
function receiptState(d){if(d.applied&&/REVIEW|EXCLUDED|FAILED/.test(d.status))return 'partial';if(/FAILED|PROCESSING/.test(d.status))return 'unknown';return /REVIEW/.test(d.status)?'review':d.applied?'saved_unverified':/EXCLUDED/.test(d.status)?'excluded':/DUPLICATE/.test(d.status)?'duplicate':'received';}
const appReceiptBase=receiptDetail;
function linkedIssueForNote(r){return items.find(x=>x.issueId&&(r.target.includes(x.orderId)||r.target.includes(x.customer)&&r.target.includes(x.model)));}
receiptDetail=function(id){appReceiptBase(id);const r=notes().find(x=>x.id===id);if(!r)return;if(r.copiedFrom)$('sheetBody').insertAdjacentHTML('beforeend','<p class="note">원문 보관 번호 '+esc(r.copiedFrom)+'</p>');if(r.revisions?.length)$('sheetBody').insertAdjacentHTML('beforeend','<details><summary>기기에 보관한 수정 이력</summary>'+r.revisions.map(v=>'<p>'+esc(v.target)+'<br>'+esc(v.text)+'</p>').join('')+'</details>');if(r.status!=='draft'){$('sheetBody').insertAdjacentHTML('beforeend','<button id="serverReceiptButton" class="secondary">서버 저장 결과 다시 확인</button>');$('serverReceiptButton').onclick=()=>checkEventReceipt(id);}if(r.status!=='sending'){$('sheetBody').insertAdjacentHTML('beforeend','<button id="editLocalNote" class="secondary">'+(['draft','rejected'].includes(r.status)?'내용 수정하기':'내용 수정 후 새로 접수')+'</button>');$('editLocalNote').onclick=()=>editLocalNote(id);}};
async function checkEventReceipt(id,silent=false){const r=notes().find(x=>x.id===id);if(!r)return false;try{const d=await appCall({action:'receipt',requestId:r.requestId||'',submissionId:r.submissionId||r.id,text:`${r.target} ${r.text}`,targetHint:r.target});if(d.status==='NOT_FOUND'){updateNote(id,{status:'received',ack:'서버 요청은 전송됐고 저장 기록을 계속 확인합니다. 자동 재전송하지 않습니다.',respondedAt:new Date().toISOString()});if(!silent)receiptDetail(id);return false;}updateNote(id,{status:receiptState(d),requestId:d.requestId||r.requestId,ack:d.ack||r.ack||'서버 저장 결과를 확인했습니다.',respondedAt:new Date().toISOString()});if(d.applied)await verifyEventNote(id,d);if(!silent)receiptDetail(id);return true;}catch(e){const current=notes().find(x=>x.id===id);const saved=!!current?.requestId||['saved_unverified','applied','partial'].includes(current?.status);updateNote(id,{ack:saved?(current.ack||'서버 저장 응답을 받았습니다.')+' 원본 재조회가 지연 중이며 새로고침할 때 자동으로 다시 확인합니다.':appError(e)});if(!silent)receiptDetail(id);return false;}}
const eventReceiptTimers=new Map();
function scheduleEventReceiptCheck(id,delay=0,silent=false){clearTimeout(eventReceiptTimers.get(id));eventReceiptTimers.set(id,setTimeout(async()=>{eventReceiptTimers.delete(id);await checkEventReceipt(id,silent);},delay));}
let eventReceiptSweep=null;
function reconcileEventReceipts(){if(eventReceiptSweep)return eventReceiptSweep;const pending=notes().filter(r=>['sending','unknown','received','saved_unverified'].includes(r.status)||(r.status==='partial'&&r.eventVerifiedAt&&r.issueId&&!r.issueVerifiedAt)).slice(0,5);eventReceiptSweep=(async()=>{for(const r of pending)await checkEventReceipt(r.id,true);})().finally(()=>{eventReceiptSweep=null;});return eventReceiptSweep;}
function editLocalNote(id){const r=notes().find(x=>x.id===id);if(!r||r.status==='sending')return;if(!canSendNote(r,true))return;let editId=id;if(!['draft','rejected'].includes(r.status)){try{const edit={id:crypto.randomUUID(),target:r.target,text:r.text,status:'draft',createdAt:new Date().toISOString(),copiedFrom:r.id,issueId:r.issueId||'',orderId:r.orderId||'',displayState:r.displayState||'',nextAction:r.nextAction||'',issueStatus:r.issueStatus||'OPEN'};edit.submissionId=edit.id;const list=notes();list.unshift(edit);persist(KEY,list);editId=edit.id;}catch{return toast('수정본을 새 입력으로 만들지 못했습니다.');}}appInputBase();const e=notes().find(x=>x.id===editId);$('inputTarget').value=e.target;$('draft').value=e.text;if($('inputIssueId'))$('inputIssueId').value=e.issueId||'';if($('inputOrderId'))$('inputOrderId').value=e.orderId||'';if($('inputNextAction'))$('inputNextAction').value=e.nextAction||'';if($('inputIssueStatus'))$('inputIssueStatus').value=e.issueStatus||'OPEN';editingNoteId=editId;$('sheetBody').querySelector('button.primary').textContent='기기에만 보관';$('sheetBody').insertAdjacentHTML('beforeend','<p class="alert">한 번 보내면 업무이력과 현재 업무 카드에 함께 반영합니다. 다음 행동·일정은 그대로 유지합니다.</p><button id="sendEditedNote" class="primary" onclick="saveEditedAndSend()">수정한 내용 서버로 보내고 반영</button>');}
const appSaveNoteBase=saveNote;
saveNote=function(){if(!editingNoteId)return appSaveNoteBase();const id=editingNoteId,r=notes().find(x=>x.id===id);if(!r||!['draft','rejected'].includes(r.status))return;const target=$('inputTarget').value.trim(),text=$('draft').value.trim();if(!target||!text){$('inputHint').textContent='입력 대상과 진행 내용을 모두 작성하세요.';return;}try{updateNote(id,{revisions:[...(r.revisions||[]),{target:r.target,text:r.text,at:r.updatedAt||r.createdAt,submissionId:r.submissionId}],verifiedAt:'',eventVerifiedAt:'',issueVerifiedAt:'',issueRequestId:'',issueSentAt:'',target,text,displayState:text.split(/\r?\n/).map(v=>v.trim()).find(Boolean)?.slice(0,80)||'',status:'draft',submissionId:crypto.randomUUID(),requestId:'',ack:'',respondedAt:'',updatedAt:new Date().toISOString()});localStorage.removeItem(DRAFT);editingNoteId=null;receiptDetail(id);return id;}catch{toast('수정 내용을 기기에 저장하지 못했습니다.');}};
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
  updateNote(id,{status:'saved_unverified',requestId:d.requestId,eventVerifiedAt:new Date().toISOString(),ack:'업무이력 저장을 확인했습니다. 현재 업무 카드 반영을 확인 중입니다.'});
  if(r.issueId)return await syncProgressIssue(id);
  if(readPending)await readPending;
  if(!await refresh())throw Error('refresh_failed');
  updateNote(id,{status:'applied',requestId:d.requestId,verifiedAt:new Date().toISOString(),ack:'업무이력 저장과 서버 재조회가 일치합니다.'});return true;
  }catch(e){const latest=notes().find(x=>x.id===id);updateNote(id,{status:'saved_unverified',verifiedAt:'',ack:(latest?.ack||'서버 저장 응답을 받았습니다.')+' 원본 재조회가 지연 중이며 새로고침할 때 자동으로 다시 확인합니다.'});return false;}
}
async function syncProgressIssue(id){
 const r=notes().find(x=>x.id===id);if(!r?.issueId||!r.displayState)return true;
 try{
  let current=await appCall({action:'issue',issueId:r.issueId});
  if(current.issueId!==r.issueId||current.orderId!==r.orderId)throw Error('project_mismatch');
  if(current.state===r.displayState){return await verifyProgressIssue(id,current);}
  let applied;
  if(r.issueSentAt){
   applied=await appCall({action:'receipt',issueId:r.issueId,requestId:r.issueRequestId});
   if(applied.status!=='APPLIED')throw Error('issue_receipt_unconfirmed');
  }else{
   const requestId=r.issueRequestId||crypto.randomUUID();
   updateNote(id,{issueRequestId:requestId,issueSentAt:new Date().toISOString()});
   applied=await appCall({action:'edit',issueId:r.issueId,orderId:r.orderId,expected:current.revision,state:r.displayState,nextAction:current.nextAction,status:current.status,reason:'진행내용 입력: '+r.text.slice(0,450),requestId});
   if(applied.status!=='APPLIED')throw Error('issue_unconfirmed');
   applyIssueReceiptLocal(applied);
  }
  return await verifyProgressIssue(id,applied);
 }catch(e){const latest=notes().find(x=>x.id===id);updateNote(id,{status:'partial',verifiedAt:'',ack:'업무이력은 저장됐지만 현재 업무 카드 반영을 확인하지 못했습니다. 서버 결과 다시 확인을 누르면 재조회하며 자동 재전송하지 않습니다. '+appError(e)});return false;}
}
async function verifyProgressIssue(id,d){
 const r=notes().find(x=>x.id===id);if(!r)return false;
 const current=d.revision&&d.state===r.displayState?d:await appCall({action:'issue',issueId:r.issueId});
 if(current.issueId!==r.issueId||current.orderId!==r.orderId||current.state!==r.displayState)throw Error('readback_mismatch');
 if(readPending)await readPending;
 if(!await refresh())throw Error('refresh_failed');
 const shown=items.find(x=>x.issueId===r.issueId);
 if(!shown||shown.orderId!==r.orderId||shown.state!==r.displayState)throw Error('readback_mismatch');
 updateNote(id,{status:'applied',verifiedAt:new Date().toISOString(),issueVerifiedAt:new Date().toISOString(),issueRequestId:d.requestId||r.issueRequestId||'',ack:'업무이력 저장과 현재 진행 표시를 서버 재조회로 확인했습니다. 다음 행동·일정은 그대로 유지했습니다.'});
 return true;
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
const eventRefreshBase=refresh;
refresh=async function(){const ok=await eventRefreshBase();if(ok&&!eventReceiptSweep)reconcileEventReceipts();return ok;};
setTimeout(()=>reconcileEventReceipts(),0);
home();
