/* Completes existing Light v1 screens using personal, signed server requests. */
let appIssues=[],appProjects=[],appReport=null,appIssue=null,editingNoteId=null;
const appCall=b=>api('/api/app',b,55000);
function appError(e){const code=e.data?.error||e.message;return ({personal_login_required:'개인 Google 로그인이 필요합니다.',forbidden:'이 계정의 권한을 확인하세요.',stale_record:'다른 변경이 있습니다. 최신 내용을 다시 열어 수정하세요.',project_mismatch:'프로젝트 연결을 확인하세요.',ambiguous_receipt:'같은 내용의 요청이 여러 건입니다. 요청 번호로 확인하세요.',invalid_reason:'변경 사유를 입력하세요.',invalid_next_action:'다음 행동을 입력하세요.',no_change:'변경한 내용이 없습니다.',edit_gate_closed:'수정 기능 연결을 확인 중입니다.'})[code]||scheduleErrors[code]||'연결 결과를 확인하지 못했습니다. 잠시 후 다시 확인하세요.';}
function appFailure(el,e){if(el?.isConnected)el.innerHTML=esc(appError(e))+(e.status===401?' <a href="./login.html">개인 로그인</a>':'');}
function appDay(v){if(/^\d{5}(?:\.\d+)?$/.test(String(v)))return new Date(Date.UTC(1899,11,30)+Math.floor(Number(v))*86400000).toISOString().slice(0,10);return String(v||'');}
function appQuantity(v){const n=Number(String(v).replaceAll(',',''));if(!String(v).trim()||!Number.isFinite(n)||n<0)throw Error('invalid_report');return n;}
reports=function(){return '<section><div class="section-title"><h2>생산 · 지원 집계</h2></div><div class="report-links"><button onclick="productionReport(\'month\')">▥ 월간생산량<small>실제 납품 집계 ›</small></button><button onclick="productionReport(\'year\')">▤ 연간생산량<small>연도별 기록 ›</small></button><button onclick="supportReport()">⇄ 타부서지원<small>지원 기록 조회 ›</small></button></div></section>';};
productionReport=async function(mode){await loadAppReport(mode);};
supportReport=async function(){await loadAppReport('support');};
async function loadAppReport(mode){open(heading('생산 · 지원 집계',mode==='support'?'타부서지원':mode==='month'?'월간생산량':'연간생산량')+'<div id="appReportResult">원본 집계를 불러오는 중…</div>');const el=$('appReportResult');try{const d=await appCall({action:'reports'});if(!el.isConnected)return;appReport={mode,data:d};renderAppReport();}catch(e){appFailure(el,e);}}
function renderAppReport(){
 const el=$('appReportResult');if(!el||!appReport)return;const {mode,data}=appReport;
 try{
  const rows=(mode==='support'?data.support:mode==='month'?data.monthly:data.annual).slice(1).filter(r=>r[0]&&r[1]);
  const years=[...new Set(rows.map(r=>mode==='support'?appDay(r[0]).slice(0,4):String(r[0])))].sort().reverse();
  const year=$('reportYear')?.value||years[0]||'',month=$('reportMonth')?.value||'all';
  const selected=rows.filter(r=>(mode==='support'?appDay(r[0]).slice(0,4):String(r[0]))===year&&(mode!=='month'||month==='all'||Number(r[1])===Number(month)));
  let body;
  if(mode==='support'){
   const shown=selected.filter(r=>r[11]==='Y'&&r[8]==='확정'),groups={};shown.forEach(r=>{const k=r[9]||r[1];groups[k]=(groups[k]||0)+1;});
   body='<p>원본에서 표시 대상으로 확정한 지원·납품 기록 '+shown.length+'건</p>'+Object.entries(groups).map(([k,v])=>'<span class="chip">'+esc(k)+' '+v+'건</span>').join('')+shown.map(r=>'<article class="item"><b>'+esc(appDay(r[0]))+' · '+esc(r[9]||r[1])+'</b><p>'+esc(r[2])+' '+esc(r[3])+'</p><p>'+esc(r[4])+'</p><small>참여자 '+esc(r[5]||'미기록')+'</small></article>').join('')+(!shown.length?'<p>선택한 연도의 집계 기록이 없습니다.</p>':'')+'<p class="note">지원시간은 원본에 기록되어 있지 않아 건수로 표시합니다.</p>';
  }else{
   const byModel=new Map();selected.forEach(r=>{const name=r[mode==='month'?2:1],qty=appQuantity(r[mode==='month'?3:2]);byModel.set(name,(byModel.get(name)||0)+qty);});
   const total=[...byModel.values()].reduce((a,b)=>a+b,0);
   body=selected.length?'<div class="action-box">실제 납품 집계 <b>'+total+'대</b></div><table class="report-table"><thead><tr><th>장비</th><th>대수</th></tr></thead><tbody>'+[...byModel].map(([k,v])=>'<tr><td>'+esc(k)+'</td><td>'+v+'</td></tr>').join('')+'</tbody></table>':'<p>선택한 기간의 집계 기록이 없습니다.</p>';
   body+='<p class="note">원본 납품 집계표 기준 · B팀 · 실제 납품일 · 수리/PT 제외. 계획 진행률을 완료 실적으로 계산하지 않습니다.</p>';
  }
  el.innerHTML='<div class="report-controls"><label>연도<select id="reportYear" onchange="renderAppReport()">'+years.map(y=>'<option '+(y===year?'selected':'')+'>'+esc(y)+'</option>').join('')+'</select></label>'+(mode==='month'?'<label>월<select id="reportMonth" onchange="renderAppReport()"><option value="all">전체 월</option>'+Array.from({length:12},(_,i)=>'<option value="'+(i+1)+'" '+(Number(month)===i+1?'selected':'')+'>'+(i+1)+'월</option>').join('')+'</select></label>':'')+'</div>'+body;
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
 appIssues.filter(x=>x.orderId===p.orderId||(x.orderId.includes('*')&&p.orderId.startsWith(x.orderId.replace(/\*.*$/,'')))).forEach(x=>{const b=document.createElement('button');b.className='secondary';b.textContent=x.status+' · '+x.state+' · 상태 수정';b.onclick=()=>editIssue(x.issueId);$('sheetBody').appendChild(b);});
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
async function editIssue(issueId){open(heading('상태 수정',issueId)+'<div id="issueEditResult">최신 상태를 불러오는 중…</div>');const el=$('issueEditResult');try{const d=await appCall({action:'issue',issueId});if(!el.isConnected)return;appIssue=d;
 el.innerHTML='<p>'+esc(d.customer)+' · '+esc(d.model)+'<br>'+esc(d.orderId)+'</p><label>현재 상태<input id="issueState" maxlength="80" value="'+esc(d.state)+'"></label><label>다음 행동<textarea id="issueNext" maxlength="500">'+esc(d.nextAction)+'</textarea></label><label>이슈 관리 상태<select id="issueStatus">'+[['OPEN','진행 중'],['MONITOR','관찰 중'],['CLOSED','종결']].map(([v,t])=>'<option value="'+v+'" '+(d.status===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label><label>변경 사유<textarea id="issueReason" maxlength="500"></textarea></label><p id="issueSaveHint" role="status"></p><button id="issueSaveButton" class="primary" onclick="saveIssue()">변경 내용 확인 후 저장</button><button class="secondary" onclick="checkIssueReceipt()">이 기기의 마지막 상태 저장 결과 확인</button>';
 }catch(e){appFailure(el,e);}}
async function saveIssue(){if(!appIssue)return;const body={action:'edit',issueId:appIssue.issueId,orderId:appIssue.orderId,expected:appIssue.revision,state:$('issueState').value.trim(),nextAction:$('issueNext').value.trim(),status:$('issueStatus').value,reason:$('issueReason').value.trim(),requestId:crypto.randomUUID()};const hint=$('issueSaveHint');if(!body.state||!body.reason||(!body.nextAction&&body.status!=='CLOSED')){hint.textContent='현재 상태, 다음 행동, 변경 사유를 확인하세요.';return;}try{persist('hf-issue-pending',body);}catch{hint.textContent='요청을 기기에 보관하지 못해 전송하지 않았습니다.';return;}$('issueSaveButton').disabled=true;hint.textContent='저장 결과 확인 중…';try{showIssueReceipt(await appCall(body));await refresh();}catch(e){if(hint.isConnected){hint.textContent=appError(e);$('issueSaveButton').hidden=true;}}}
function showIssueReceipt(d){if(d.status!=='APPLIED')throw Error('unconfirmed');try{localStorage.removeItem('hf-issue-pending');}catch{}open(heading('현재 상태 저장 완료',d.state,d.orderId)+'<p>다음 행동 '+esc(d.nextAction||'없음')+'</p><p>'+esc(d.reason)+'</p><p class="note">'+esc(d.actor)+'<br>'+esc(d.requestId)+'</p><button id="savedIssueHistory" class="secondary">변경이력 확인</button>');$('savedIssueHistory').onclick=()=>projectHistory(d.orderId);}
async function checkIssueReceipt(){const b=readStore('hf-issue-pending',null);if(!b)return toast('확인할 상태 저장 요청이 없습니다.');try{const d=await appCall({action:'receipt',issueId:b.issueId,requestId:b.requestId});if(d.status==='APPLIED')showIssueReceipt(d);else toast('저장 이력이 아직 확인되지 않습니다. 자동 재전송하지 않습니다.');}catch(e){toast(appError(e));}}
function receiptState(d){if(d.applied&&/REVIEW|EXCLUDED|FAILED/.test(d.status))return 'partial';if(/FAILED|PROCESSING/.test(d.status))return 'unknown';return /REVIEW/.test(d.status)?'review':d.applied?'applied':/EXCLUDED/.test(d.status)?'excluded':/DUPLICATE/.test(d.status)?'duplicate':'received';}
const appReceiptBase=receiptDetail;
receiptDetail=function(id){appReceiptBase(id);const r=notes().find(x=>x.id===id);if(!r)return;if(r.status!=='draft'){$('sheetBody').insertAdjacentHTML('beforeend','<button id="serverReceiptButton" class="secondary">서버 저장 결과 다시 확인</button>');$('serverReceiptButton').onclick=()=>checkEventReceipt(id);}if(['draft','rejected'].includes(r.status)){$('sheetBody').insertAdjacentHTML('beforeend','<button id="editLocalNote" class="secondary">내용 수정하기</button>');$('editLocalNote').onclick=()=>editLocalNote(id);}};
async function checkEventReceipt(id){const r=notes().find(x=>x.id===id);if(!r)return;try{const d=await appCall({action:'receipt',requestId:r.requestId||'',submissionId:r.id,text:`${r.target} ${r.text}`,targetHint:r.target});if(d.status==='NOT_FOUND')return toast('서버 기록이 아직 확인되지 않습니다. 자동 재전송하지 않습니다.');updateNote(id,{status:receiptState(d),requestId:d.requestId,ack:d.ack,respondedAt:new Date().toISOString()});receiptDetail(id);}catch(e){toast(appError(e));}}
function editLocalNote(id){const r=notes().find(x=>x.id===id);if(!r||!['draft','rejected'].includes(r.status))return;appInputBase();$('inputTarget').value=r.target;$('draft').value=r.text;editingNoteId=id;}
const appSaveNoteBase=saveNote;
saveNote=function(){if(!editingNoteId)return appSaveNoteBase();const id=editingNoteId,r=notes().find(x=>x.id===id);if(!r||!['draft','rejected'].includes(r.status))return;const target=$('inputTarget').value.trim(),text=$('draft').value.trim();if(!target||!text){$('inputHint').textContent='입력 대상과 진행 내용을 모두 작성하세요.';return;}try{updateNote(id,{target,text,status:'draft',requestId:'',ack:''});localStorage.removeItem(DRAFT);editingNoteId=null;receiptDetail(id);}catch{toast('수정 내용을 기기에 저장하지 못했습니다.');}};
home();
