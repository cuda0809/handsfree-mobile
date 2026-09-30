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
async function loadAppReport(mode){const title=mode==='support'?'타부서 지원':'생산 실적';open(heading('생산 · 지원 집계',title)+'<div id="appReportResult">원본 집계를 불러오는 중…</div>');const el=$('appReportResult');try{const d=await appCall({action:'reports'});if(!el.isConnected)return;appReport={mode,data:d};renderAppReport();}catch(e){appFailure(el,e);}}
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
function groupProjectPlans(rows){const normalized=rows.map(row=>Array.isArray(row)?{date:appDay(row[3]),process:String(row[10]||'공정 미등록'),status:String(row[11]||'상태 미등록')}:{date:appDay(row.date),process:String(row.process||'공정 미등록'),status:String(row.status||row.sourceMonth||'계획')}).filter(r=>r.date),sorted=normalized.sort((a,b)=>a.date.localeCompare(b.date)),groups=[];for(const row of sorted){const date=row.date,process=row.process,last=groups.at(-1),next=last&&new Date(last.end+'T00:00:00Z').getTime()+86400000===new Date(date+'T00:00:00Z').getTime();if(last&&last.process===process&&next){last.end=date;last.status=row.status||last.status;}else groups.push({start:date,end:date,process,status:row.status||'계획'});}return groups;}
async function openProject(orderId,purpose='detail'){
 let p=appProjects.find(x=>x.orderId===orderId)||items.find(x=>x.orderId===orderId);if(!p)return toast('최신 프로젝트 목록을 다시 불러오세요.');
 if(purpose==='input')return input(p);
 open(heading('프로젝트',p.customer,p.model)+'<div id="projectOverview">전체 제작일정과 진행 기록을 불러오는 중…</div>');const el=$('projectOverview');
 try{const [plans,history]=await Promise.all([api('/api/sa2-lifecycle',{action:'plans',orderId:p.orderId}),appCall({action:'history',orderId:p.orderId})]);if(!el.isConnected)return;const planRows=Array.isArray(plans.records)?plans.records:Array.isArray(plans.plans)?plans.plans:[];if(plans.orderId!==p.orderId||!Array.isArray(history.events))throw Error('invalid_project');
  const stages=groupProjectPlans(planRows),events=history.events.slice().sort((a,b)=>String(a.at||'').localeCompare(String(b.at||''))),linked=items.find(x=>x.orderId===p.orderId)||p;
  const currentState=linked.state||p.state||'미등록',activeStage=Math.max(0,Math.min(stages.length-1,stages.findIndex(s=>norm(currentState).includes(norm(s.process))))),shownStages=(stages.length?stages.slice(0,5):[{process:'자재',start:'-'},{process:'조립',start:'-'},{process:'전장',start:'-'},{process:'검수',start:'-'},{process:'출고',start:'-'}]);
  el.innerHTML='<div class="hybrid-project-card"><small>'+esc(p.orderId)+' · PM '+esc(p.pm||'미등록')+'</small><h2>'+esc(p.customer)+' · '+esc(p.model)+'</h2><p>납기 '+esc(p.due||'미등록')+' · Core 원장 연결</p><div class="hybrid-state"><span>현재 상태 · '+esc(currentState)+'</span><span>'+esc(linked.priority===1?'우선 확인':linked.priority===3?'완료':'진행')+'</span></div></div><div class="hybrid-section"><b>전체 제작 일정</b><span>원본 계획</span></div><div class="hybrid-timeline">'+shownStages.map((s,i)=>'<div class="hybrid-step '+(i<activeStage?'done':i===activeStage?'now':'')+'"><i></i><b>'+esc(s.process)+'</b><small>'+esc(s.start)+(s.end&&s.end!==s.start?'~'+esc(s.end):'')+'</small></div>').join('')+'</div><div class="hybrid-write"><small>지금 하는 일</small><h3>'+esc(currentState)+'</h3><p>진행 내용만 간단히 남기면 현재 상태와 이력에 연결됩니다.</p><button id="projectInput">🎙 말하거나 직접 입력 <span style="float:right">＋</span></button></div><div class="hybrid-section"><b>진행 이력</b><span>입력 순서 · 원문 유지</span></div><div class="hybrid-log-list">'+(events.length?events.map(r=>'<div class="hybrid-log-row"><time>'+esc(String(r.at||'').replace('T',' ').slice(5,16))+'</time><i class="hybrid-dot"></i><div><b>'+esc(r.raw||'내용 없음')+'</b><p>'+esc(r.actor||'입력자 미기록')+'</p></div></div>').join(''):'<p class="empty">입력된 진행 내용이 없습니다.</p>')+'</div><button id="projectHistoryButton" class="secondary">변경 근거 · RAW 이력</button>';
  $('projectInput').onclick=()=>input(linked);$('projectHistoryButton').onclick=()=>projectHistory(p.orderId);
 }catch(e){appFailure(el,e);}
}
const appScheduleBase=scheduleReport;
scheduleReport=function(id){const x=typeof id==='object'?id:items[id];if(x?.orderId?.includes('*'))return allProjects(x.orderId.replace(/\*.*$/,''),'schedule');return appScheduleBase(id);};
const appInputBase=input;
input=function(id){const x=typeof id==='object'?id:items[id];if(x?.orderId?.includes('*'))return allProjects(x.orderId.replace(/\*.*$/,''),'input');editingNoteId=null;return appInputBase(id);};
const appItemBase=openItem;
openItem=function(id){appItemBase(id);const x=items[id];if(!x)return;const box=$('sheetBody');box.insertAdjacentHTML('beforeend','<button id="issueHistoryButton" class="secondary">전체 조립일정 · 진행이력</button>');$('issueHistoryButton').onclick=()=>openProject(x.orderId);};
async function projectHistory(orderId){open(heading('Event · 변경이력',orderId)+'<div id="historyResult">서버 기록을 불러오는 중…</div>');const el=$('historyResult');try{const d=await appCall({action:'history',orderId});if(!el.isConnected)return;
 el.innerHTML='<h3>변경이력</h3>'+d.changes.map(r=>'<article class="item"><b>'+esc(r.kind==='schedule'?'일정 변경':'현재 상태 변경')+'</b><p>'+esc(r.kind==='schedule'?appDay(r.before[3])+' → '+appDay(r.after[3]):r.before[16]+' → '+r.after[16])+'</p><p>'+esc(r.reason)+'</p><small>'+esc(r.at)+' · '+esc(r.actor)+'<br>'+esc(r.id)+'</small></article>').join('')+(!d.changes.length?'<p>기록된 변경이력이 없습니다.</p>':'')+'<h3>Event</h3>'+d.events.map(r=>'<article class="item"><b>'+esc(r.type)+' · '+esc(r.status)+'</b><p>'+esc(r.raw)+'</p><small>'+esc(r.at)+' · '+esc(r.actor||'과거 기록: 입력자 직접 기록 없음')+'<br>'+esc(r.requestId)+'</small></article>').join('')+(!d.events.length?'<p>연결된 Event 기록이 없습니다.</p>':'');
 }catch(e){appFailure(el,e);}}
async function editIssue(issueId){open(heading('상태 수정',issueId)+'<div id="issueEditResult">최신 상태를 불러오는 중…</div>');const el=$('issueEditResult');try{const d=await appCall({action:'issue',issueId});if(!el.isConnected)return;if(!['OPEN','MONITOR','CLOSED'].includes(d.status)){el.textContent='취소된 과거 이슈는 수정할 수 없습니다. 변경이력에서 확인하세요.';appIssue=null;return;}appIssue=d;
 el.innerHTML='<p>'+esc(d.customer)+' · '+esc(d.model)+'<br>'+esc(d.orderId)+'</p><label>현재 상태<input id="issueState" maxlength="80" value="'+esc(d.state)+'"></label><label>다음 행동<textarea id="issueNext" maxlength="500">'+esc(d.nextAction)+'</textarea></label><label>이슈 관리 상태<select id="issueStatus">'+[['OPEN','진행 중'],['MONITOR','관찰 중'],['CLOSED','종결']].map(([v,t])=>'<option value="'+v+'" '+(d.status===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label><label>변경 사유<textarea id="issueReason" maxlength="500"></textarea></label><p id="issueSaveHint" role="status"></p><button id="issueSaveButton" class="primary" onclick="saveIssue()">변경 내용 확인 후 저장</button><button class="secondary" onclick="checkIssueReceipt()">이 기기의 마지막 상태 저장 결과 확인</button>';
 }catch(e){appFailure(el,e);}}
function applyIssueReceiptLocal(d){const i=items.findIndex(x=>x.issueId===d.issueId);if(d.issueStatus==='CLOSED'){if(i>=0)items.splice(i,1);}else if(i>=0){items[i]={...items[i],state:d.state,nextAction:d.nextAction,issueStatus:d.issueStatus,sourceLatestUpdate:new Date().toISOString()};}items=items.map((x,id)=>({...x,id}));if(screen==='home')home();if(screen==='work')work(filter,$('search')?.value||'');if(screen==='delivery')delivery();if(screen==='projects')projects(filter);if(screen==='issues'&&typeof todayIssues==='function')todayIssues();}
async function saveIssue(){if(!appIssue||$('issueSaveButton')?.disabled)return;if(readStore('hf-issue-pending',null))return toast('이전 상태 저장 결과부터 확인하세요. 자동 재전송하지 않습니다.');const body={action:'edit',issueId:appIssue.issueId,orderId:appIssue.orderId,expected:appIssue.revision,state:$('issueState').value.trim(),nextAction:$('issueNext').value.trim(),status:$('issueStatus').value,reason:$('issueReason').value.trim(),requestId:crypto.randomUUID()};const hint=$('issueSaveHint');if(!body.state||!body.reason||(!body.nextAction&&body.status!=='CLOSED')){hint.textContent='현재 상태, 다음 행동, 변경 사유를 확인하세요.';return;}try{persist('hf-issue-pending',body);}catch{hint.textContent='요청을 기기에 보관하지 못해 전송하지 않았습니다.';return;}$('issueSaveButton').disabled=true;hint.textContent='서버 저장 중…';try{const d=await appCall(body);if(d.status!=='APPLIED')throw Error('unconfirmed');applyIssueReceiptLocal(d);showIssueReceiptPending(d);setTimeout(()=>verifyIssueReceipt(d),0);}catch(e){if([400,401,403,409].includes(e.status))localStorage.removeItem('hf-issue-pending');if(hint.isConnected){hint.textContent=appError(e);$('issueSaveButton').hidden=true;}}}
function showIssueReceiptPending(d){open(heading('서버 저장 성공',d.state,d.orderId)+'<p>다음 행동 '+esc(d.nextAction||'없음')+'</p><p>'+esc(d.reason)+'</p><p class="alert">화면에 바로 반영했습니다. 서버 원본을 다시 확인하고 있습니다.</p><p class="note">'+esc(d.requestId)+'</p>');}
function showIssueReceipt(d){if(d.status!=='APPLIED')throw Error('unconfirmed');try{localStorage.removeItem('hf-issue-pending');}catch{}open(heading('현재 상태 저장 완료',d.state,d.orderId)+'<p>다음 행동 '+esc(d.nextAction||'없음')+'</p><p>'+esc(d.reason)+'</p><p class="alert">앱의 현재 업무 화면에도 수정 내용을 반영했습니다.</p><p class="note">'+esc(d.actor)+'<br>'+esc(d.requestId)+'</p><button id="savedIssueHistory" class="secondary">변경이력 확인</button>');$('savedIssueHistory').onclick=()=>projectHistory(d.orderId);}
async function checkIssueReceipt(){const b=readStore('hf-issue-pending',null);if(!b)return toast('확인할 상태 저장 요청이 없습니다.');try{const d=await appCall({action:'receipt',issueId:b.issueId,requestId:b.requestId});if(d.status==='APPLIED'){await verifyIssueReceipt(d);}else toast('저장 이력이 아직 확인되지 않습니다. 자동 재전송하지 않습니다.');}catch(e){toast(appError(e));}}
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
  // /api/sa2-write returns applied=true only after SAFE WRITE has finished and the
  // normalized event is WRITTEN. On that known-success path, do not run a second
  // receipt/history verification chain before moving to the current-state readback.
  const directWriteAck=!!receipt&&d.applied===true&&d.status==='WRITTEN'&&!!d.requestId&&!Array.isArray(d.events);
  if(directWriteAck){
   updateNote(id,{status:'saved_unverified',requestId:d.requestId,eventVerifiedAt:new Date().toISOString(),ack:'업무이력 저장 완료. 현재 업무 카드 반영을 확인 중입니다.'});
   if(r.issueId)return await syncProgressIssue(id);
   if(readPending)await readPending;
   if(!await refresh())throw Error('refresh_failed');
   updateNote(id,{status:'applied',requestId:d.requestId,verifiedAt:new Date().toISOString(),ack:'업무이력 저장과 서버 재조회가 일치합니다.'});return true;
  }
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

function hybridProjectMatch(orderId){const id=String(orderId||''),exact=items.find(x=>x.orderId===id);if(exact)return exact;return items.find(x=>x.orderId?.includes('*')&&id.startsWith(x.orderId.replace(/\*.*$/,'')))||null;}
function hybridDueKey(v){const d=appDay(v);return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:'9999-12-31';}
const HYBRID_FLOW_STAGES=['자재','조립','전장','검수','출고'];
function hybridStageIndex(x){
 const text=norm([x.process,x.state,x.nextAction].join(' '));
 if(/출고완료|납품완료|출고대기|출고|포장/.test(text))return 4;
 if(/검수|점검|테스트|시험/.test(text))return 3;
 if(/갭세팅|마감조립|조립|본체|기구|프레임/.test(text))return 1;
 if(/전장|배선|전기|프로그램|프로그램밍|셋업/.test(text))return 2;
 if(/자재|입고|구매|발주/.test(text))return 0;
 return /조립/.test(norm(x.process))?1:/전장/.test(norm(x.process))?2:/검수/.test(norm(x.process))?3:/출고/.test(norm(x.process))?4:0;
}
function hybridStageFlow(x){
 const current=hybridStageIndex(x),complete=x.priority===3||/출고완료|납품완료/.test(String(x.state||''));
 return '<div class="hybrid-flow">'+HYBRID_FLOW_STAGES.map((name,i)=>{
   const cls=complete||i<current?'done':i===current?'now':'future';
   return '<div class="hybrid-stage '+cls+'"><i></i><b>'+name+'</b></div>';
 }).join('')+'</div><div class="hybrid-flow-now">현재 공정 · <b>'+HYBRID_FLOW_STAGES[current]+'</b>'+(complete?' · 완료':'')+'</div>';
}
function delivery(){
 active('delivery');screen='delivery';
 const selected=items.slice().sort((a,b)=>hybridDueKey(a.due).localeCompare(hybridDueKey(b.due))||(a.priority||9)-(b.priority||9));
 main.innerHTML='<div class="hybrid-page-head"><div><div class="hybrid-eyebrow">CUSTOMER PROMISES</div><h1>출고 약속</h1></div><button class="chip" onclick="refresh()">Core 새로고침</button></div><p class="hybrid-desc">이 화면은 현재 Core 데이터만 사용합니다. 탭을 여는 것만으로 추가 서버 조회를 하지 않습니다.</p><div id="deliveryList" class="hybrid-promise-list">'+
 (selected.length?selected.map(x=>{const due=appDay(x.due)||'납기 확인 필요',risk=x.priority===1;return '<button class="hybrid-promise-row" data-delivery-id="'+x.id+'"><span class="hybrid-promise-date">'+esc(due)+'<small>'+(risk?'우선 확인':x.priority===3?'완료':'진행')+'</small></span><b>'+esc(x.customer)+' · '+esc(x.model)+'</b><p>'+esc(x.state||'미등록')+(x.nextAction?' · 다음 '+esc(x.nextAction):'')+'</p>'+hybridStageFlow(x)+'</button>';}).join(''):'<p class="empty">현재 Core에 표시할 프로젝트가 없습니다.</p>')+
 '</div><button class="secondary" onclick="allProjects()">전체 프로젝트 원장 불러오기</button>';
 const el=$('deliveryList');el?.querySelectorAll('[data-delivery-id]').forEach(b=>b.onclick=()=>openItem(Number(b.dataset.deliveryId)));
}
function projects(mode='all'){
 active('projects');screen='projects';filter=mode;
 main.innerHTML='<div class="hybrid-page-head"><div><div class="hybrid-eyebrow">PROJECT LIFECYCLE</div><h1>프로젝트</h1></div><button class="chip" onclick="refresh()">Core 새로고침</button></div><p class="hybrid-desc">현재 관리 중인 Core 프로젝트는 추가 서버 조회 없이 바로 표시합니다.</p><input id="hybridProjectSearch" class="hybrid-search" placeholder="고객명 · 장비명 · 발주번호" oninput="renderHybridProjects()"><div class="tabs"><button class="chip '+(mode==='all'?'active':'')+'" onclick="projects(\'all\')">전체</button><button class="chip '+(mode==='urgent'?'active':'')+'" onclick="projects(\'urgent\')">우선순위 1</button></div><div id="hybridProjectList" class="hybrid-project-list"></div><button class="secondary" onclick="allProjects()">전체 프로젝트 원장 불러오기</button>';
 renderHybridProjects();
}
function renderHybridProjects(){const el=$('hybridProjectList');if(!el)return;const q=norm($('hybridProjectSearch')?.value||''),rows=items.filter(x=>{if(filter==='urgent'&&x.priority!==1)return false;return !q||norm([x.orderId,x.customer,x.model,x.state,x.pm].join(' ')).includes(q);});el.innerHTML=rows.map(x=>'<button class="hybrid-project-row" data-project-id="'+x.id+'"><b>'+esc(x.customer)+' · '+esc(x.model)+'</b><p>'+esc(x.orderId)+' · '+esc(x.state||'상태 미등록')+(x.due?' · 납기 '+esc(appDay(x.due)):'')+'</p></button>').join('')||'<p class="empty">일치하는 현재 프로젝트가 없습니다.</p>';el.querySelectorAll('[data-project-id]').forEach(b=>b.onclick=()=>openItem(Number(b.dataset.projectId)));}

function todayIssues(){
 active('issues');screen='issues';
 const activeRows=items.filter(x=>x.priority!==3&&!/^(출고완료|납품완료|완료)$/.test(String(x.state||''))).sort((a,b)=>(a.priority||9)-(b.priority||9));
 const todayKey=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
 const todayLocal=notes().filter(r=>r.eventOnly&&String(r.createdAt||'').slice(0,10)===todayKey);
 main.innerHTML='<div class="hybrid-page-head"><div><div class="hybrid-eyebrow">TODAY ISSUES</div><h1>오늘 이슈</h1></div><button class="chip" onclick="refresh()">Core 새로고침</button></div>'+
 '<p class="hybrid-desc">현재 진행 중인 장비에 오늘 발생한 이유·문제·변경사항을 기록합니다. 이 입력은 현재 상태를 덮어쓰지 않고 해당 Project ID의 Event 이력에 누적됩니다.</p>'+
 '<div class="today-issue-list">'+
 (activeRows.length?activeRows.map(x=>'<section class="today-issue-card"><div class="today-issue-head"><div><small>'+esc(x.orderId||x.issueId)+'</small><h3>'+esc(x.customer)+' · '+esc(x.model)+'</h3></div><span class="today-issue-priority p'+esc(x.priority||2)+'">P'+esc(x.priority||2)+'</span></div><p class="today-issue-state">현재 · '+esc(x.state||'미등록')+(x.nextAction?' <span>→ 다음 '+esc(x.nextAction)+'</span>':'')+'</p>'+(x.cause?'<p class="today-issue-cause">기존 사유 · '+esc(x.cause)+'</p>':'')+'<label class="today-issue-label">오늘 이슈 / 사유<textarea data-today-issue-text="'+esc(x.issueId)+'" maxlength="800" placeholder="예: 부품 미입고로 조립 대기, 센서값 이상 확인"></textarea></label><div class="today-issue-actions"><button class="chip" data-today-voice="'+esc(x.issueId)+'">🎙 음성</button><button class="primary" data-today-save="'+esc(x.issueId)+'">이슈 기록</button></div><p class="note" data-today-status="'+esc(x.issueId)+'"></p></section>').join(''):'<div class="empty">현재 진행 중인 장비가 없습니다.</div>')+
 '</div>'+
 '<div class="hybrid-section"><b>오늘 기록</b><span>'+todayLocal.length+'건</span></div>'+
 (todayLocal.length?todayLocal.slice(0,12).map(r=>'<button class="hybrid-record" data-note="'+esc(r.id)+'"><b>'+esc(r.target)+'</b><p>'+esc(r.text)+'</p><small>'+esc(new Date(r.createdAt).toLocaleString('ko-KR'))+' · '+esc(labels[r.status]||r.status)+'</small></button>').join(''):'<p class="empty">오늘 입력한 이슈가 없습니다.</p>')+
 '<button id="allInputHistory" class="secondary">전체 입력 이력 보기</button>';
 main.querySelectorAll('[data-today-save]').forEach(b=>b.onclick=()=>saveTodayIssue(b.dataset.todaySave));
 main.querySelectorAll('[data-today-voice]').forEach(b=>b.onclick=()=>voiceTodayIssue(b.dataset.todayVoice));
 main.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>receiptDetail(b.dataset.note));
 const history=$('allInputHistory');if(history)history.onclick=showInbox;
}
let todayIssueRecognition=null;
function voiceTodayIssue(issueId){
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 const field=main.querySelector('[data-today-issue-text="'+issueId+'"]');
 const status=main.querySelector('[data-today-status="'+issueId+'"]');
 if(!field)return;
 if(!Speech){if(status)status.textContent='이 브라우저는 음성 인식을 지원하지 않습니다. 키보드 음성 입력을 사용하세요.';return;}
 if(todayIssueRecognition){try{todayIssueRecognition.abort();}catch{}todayIssueRecognition=null;}
 const rec=new Speech();todayIssueRecognition=rec;rec.lang='ko-KR';rec.interimResults=false;
 rec.onresult=e=>{field.value=(field.value+' '+e.results[0][0].transcript).trim().slice(0,800);if(status)status.textContent='음성 입력됨 · 내용을 확인하고 이슈 기록을 누르세요.';};
 rec.onerror=()=>{if(status)status.textContent='음성 인식에 실패했습니다. 다시 시도하세요.';};
 rec.onend=()=>{todayIssueRecognition=null;};
 try{rec.start();if(status)status.textContent='듣고 있습니다…';}catch{todayIssueRecognition=null;if(status)status.textContent='마이크를 시작하지 못했습니다.';}
}
async function saveTodayIssue(issueId){
 const x=items.find(v=>v.issueId===issueId);
 const field=main.querySelector('[data-today-issue-text="'+issueId+'"]');
 const statusEl=main.querySelector('[data-today-status="'+issueId+'"]');
 if(!x||!field)return;
 const text=field.value.trim();
 if(!text){if(statusEl)statusEl.textContent='이유나 문제 내용을 입력하세요.';return;}
 if(navigator.onLine===false){if(statusEl)statusEl.textContent='오프라인입니다. 네트워크 연결 후 기록하세요.';return;}
 const id=crypto.randomUUID(),target=(x.orderId?x.orderId+' · ':'')+x.customer+' · '+x.model;
 const note={id,submissionId:id,target,text:'이슈/사유 · '+text,status:'sending',createdAt:new Date().toISOString(),issueId:x.issueId||'',orderId:x.orderId||'',displayState:'',nextAction:x.nextAction||'',issueStatus:x.issueStatus||'OPEN',eventOnly:true};
 try{const list=notes();list.unshift(note);persist(KEY,list);}catch{if(statusEl)statusEl.textContent='기기 기록 보관에 실패해 전송하지 않았습니다.';return;}
 const saveButton=main.querySelector('[data-today-save="'+issueId+'"]');if(saveButton)saveButton.disabled=true;
 if(statusEl)statusEl.textContent='프로젝트 이력에 기록 중…';
 try{
  const d=await api('/api/sa2-write',{op:'safe_write',submissionId:id,text:target+' 이슈/사유 · '+text,targetHint:target,source:'MOBILE|TODAY_ISSUE',requester:'Emotion'},55000);
  if(d.applied){
   updateNote(id,{status:'applied',requestId:d.requestId||'',ack:'오늘 이슈를 프로젝트 Event 이력에 기록했습니다.',respondedAt:new Date().toISOString(),verifiedAt:new Date().toISOString(),eventVerifiedAt:new Date().toISOString()});
   field.value='';
   if(statusEl)statusEl.textContent='기록 완료 · '+(x.orderId||x.issueId)+' 라이프사이클에 누적됨';
  }else{
   const state=/REVIEW/i.test(d.status)?'review':/EXCLUDED/i.test(d.status)?'excluded':/DUPLICATE/i.test(d.status)?'duplicate':'received';
   updateNote(id,{status:state,requestId:d.requestId||'',ack:d.ack||'서버 접수 결과를 확인하세요.',respondedAt:new Date().toISOString()});
   if(statusEl)statusEl.textContent='접수됨 · 처리 결과 확인 필요';
  }
 }catch(e){
  const rejected=[400,401,403].includes(e.status);
  try{updateNote(id,{status:rejected?'rejected':'unknown',requestId:e.data?.requestId||'',ack:appError(e),respondedAt:new Date().toISOString()});}catch{}
  if(statusEl)statusEl.textContent=rejected?appError(e):'응답을 확정하지 못했습니다. 중복 방지를 위해 자동 재전송하지 않습니다.';
 }finally{if(saveButton)saveButton.disabled=false;}
}

const eventRefreshBase=refresh;
refresh=async function(){const ok=await eventRefreshBase();if(screen==='issues')todayIssues();return ok;};
home();
