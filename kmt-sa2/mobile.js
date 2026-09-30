'use strict';
const BUILD='2026.09.29.SA2.8.3-CORE', KEY='kmt-notes-v1', DRAFT='kmt-draft-v1', CORE_CACHE_KEY='hf-core-status-v1';
const main=document.getElementById('main'),dialog=document.getElementById('detail');
let items=[],live=false,readPending=null,sourceDate='',lastRead='',screen='home',filter='all',returnFocus=null,readMessage='현재 상태를 불러오는 중…',recognition=null,installPrompt=null,readStale=false,lastReadErrorStatus=0,lastCoreAttempt=0;
const $=id=>document.getElementById(id);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function norm(s){return String(s||'').toLowerCase().replace(/[\s\-‐‑–—]/g,'');}
function heading(k,t,sub=''){return `<div class="sheet-head"><div><div class="eyebrow">${esc(k)}</div><h2>${esc(t)}</h2></div><button class="icon" aria-label="상세 닫기" onclick="dialog.close()">×</button></div><div class="sub">${esc(sub)}</div>`;}
function open(html){stopVoice();if(!dialog.open)returnFocus=document.activeElement;$('sheetBody').innerHTML=html;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;}
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>{stopVoice();if(returnFocus?.isConnected)returnFocus.focus();});
function toast(text){clearTimeout(toast.timer);$('toast').hidden=true;let target=$('toast');if(dialog.open){target=$('dialogStatus');if(!target){target=document.createElement('p');target.id='dialogStatus';target.className='alert';target.setAttribute('role','status');$('sheetBody').appendChild(target);}}target.textContent=text;target.hidden=false;if(dialog.open)target.scrollIntoView({block:'nearest'});toast.timer=setTimeout(()=>target.hidden=true,4500);}
function readStore(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}}
function persist(key,value){localStorage.setItem(key,JSON.stringify(value));if(localStorage.getItem(key)!==JSON.stringify(value))throw Error('storage_failed');}
const APP_ASSET_HASH_KEY='hf-ui-assets-hash-v2';
async function liveAssetHash(){
 try{
  const stamp=Date.now(),paths=['./app-flow.js','./hybrid05.css','./mobile.js','./index.html'];
  const parts=await Promise.all(paths.map(async path=>{
   const r=await fetch(path+'?watch='+stamp,{cache:'no-store',credentials:'same-origin'});
   if(!r.ok)throw Error('asset_fetch_failed');
   return await r.text();
  }));
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(parts.join('\n/*HF-ASSET*/\n')));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
 }catch{return '';}
}
async function checkForLiveUpdate(){
 if(document.visibilityState==='hidden'||navigator.onLine===false)return;
 const hash=await liveAssetHash();if(!hash)return;
 const prior=sessionStorage.getItem(APP_ASSET_HASH_KEY)||'';
 if(!prior){sessionStorage.setItem(APP_ASSET_HASH_KEY,hash);return;}
 if(prior!==hash){
  sessionStorage.setItem(APP_ASSET_HASH_KEY,hash);
  toast('새 화면 버전을 반영합니다…');
  setTimeout(()=>location.reload(),350);
 }
}
setTimeout(checkForLiveUpdate,2500);
setInterval(checkForLiveUpdate,60000);
window.addEventListener('focus',()=>setTimeout(checkForLiveUpdate,300));
function coreCacheRead(){const v=readStore(CORE_CACHE_KEY,null);return v&&Array.isArray(v.items)&&v.items.length?v:null;}
function coreCacheSave(){
 try{persist(CORE_CACHE_KEY,{cachedAt:new Date().toISOString(),sourceDate,items:items.map(({id,...x})=>x)});}catch{}
}
function coreCacheRestore(){
 const c=coreCacheRead();if(!c)return false;
 items=c.items.map((x,id)=>({...x,id}));sourceDate=String(c.sourceDate||'');lastRead=c.cachedAt?new Date(c.cachedAt).toLocaleString('ko-KR'):'';
 live=true;readStale=true;readMessage='최근 정상값 · 최신 동기화 대기';
 return true;
}
coreCacheRestore();
function notes(){const a=readStore(KEY,[]);return Array.isArray(a)?a:[];}
function updateNote(id,patch){const a=notes(),r=a.find(r=>r.id===id);if(!r)throw Error('missing_note');Object.assign(r,patch);persist(KEY,a);return r;}
async function api(path,body,timeout=25000){const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:c.signal,...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});let d;try{d=await r.json();}catch{throw Error('invalid_response');}if(!r.ok||d.ok!==true){const e=Error(d.error||'request_failed');e.status=r.status;e.data=d;throw e;}return d;}finally{clearTimeout(timer);}}
function coreProcessFromState(state,next,previous=''){
 const t=norm([state,next].join(' '));
 if(/출고|납품|포장/.test(t))return '출고';
 if(/검수|점검|테스트|시험/.test(t))return '검수';
 if(/전장|배선|전기|프로그램|프로그래밍/.test(t))return '전장';
 if(/조립|기구|마감|갭세팅|프레임/.test(t))return '조립';
 if(/자재|입고|구매|발주/.test(t))return '자재';
 return previous;
}
function corePriorityFromState(state,next,status,previous=2){
 const text=String(state||'')+' '+String(next||'');
 if(status==='CLOSED'||/^(출고완료|납품완료|완료)$/.test(String(state||'')))return 3;
 if(/불량|문제|고장|지연|점검|재작업|수정중|에러|오류|멈춤|출고대기/.test(text))return 1;
 if(/대기|보류/.test(text))return 2;
 return previous||2;
}
async function refreshCachedCore(){
 const d=await api('/api/sa2-app',{action:'catalog'},18000);
 if(!Array.isArray(d.issues))throw Error('invalid_catalog');
 const byId=new Map(d.issues.map(v=>[String(v.issueId||''),v]));
 const changed=[];
 for(const x of items){
   const v=byId.get(String(x.issueId||''));if(!v)continue;
   if(String(v.state||'')!==String(x.state||'')||String(v.status||'')!==String(x.issueStatus||''))changed.push({x,v});
 }
 const details=await Promise.allSettled(changed.slice(0,8).map(({x})=>api('/api/sa2-app',{action:'issue',issueId:x.issueId},18000)));
 changed.slice(0,8).forEach(({x,v},i)=>{
   const detail=details[i]?.status==='fulfilled'?details[i].value:null;
   const idx=items.findIndex(k=>k.issueId===x.issueId);if(idx<0)return;
   const state=String(detail?.state??v.state??x.state),next=String(detail?.nextAction??x.nextAction??''),status=String(detail?.status??v.status??x.issueStatus);
   items[idx]={...x,state,nextAction:next,issueStatus:status,orderId:String(detail?.orderId||x.orderId),customer:String(detail?.customer||x.customer),model:String(detail?.model||x.model),process:coreProcessFromState(state,next,x.process),priority:corePriorityFromState(state,next,status,x.priority),since:state!==x.state?new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}):x.since,sourceLatestUpdate:state!==x.state?new Date().toISOString():x.sourceLatestUpdate};
 });
 items=items.map((x,id)=>({...x,id}));
 if(changed.length){sourceDate=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});lastRead=new Date().toLocaleString('ko-KR');coreCacheSave();}
 return {changed:changed.length};
}
function active(name){screen=name;document.querySelectorAll('.bottom button').forEach(b=>b.classList.toggle('selected',b.dataset.page===name));}
function banner(){document.querySelector('.demo').innerHTML=`<b>${BUILD} · HYBRID 0.5</b><span>${live?'연결됨 · ':''}${esc(readMessage)}</span>`;}
async function refresh(force=true){
 if(readPending)return readPending;
 if(!force&&Date.now()-lastCoreAttempt<60000)return items.length;
 lastCoreAttempt=Date.now();
 readMessage=items.length?'최근 정상값 표시 · 최신값 확인 중…':'현재 상태를 불러오는 중…';banner();
 readPending=(async()=>{
  try{
   if(items.length){
    try{
     const quick=await refreshCachedCore();
     live=true;readStale=false;lastReadErrorStatus=0;
     readMessage='CORE · '+items.length+'건 · '+(quick.changed?'변경 '+quick.changed+'건 반영':'최신 상태 확인');
     return true;
    }catch(_){}
   }
   const d=await api('/api/sa2-real-status',null,22000);
   if(d.live!==true||!Array.isArray(d.currentStatus))throw Error('invalid_response');
   items=d.currentStatus.map((x,id)=>({...x,id}));live=true;readStale=false;lastReadErrorStatus=0;sourceDate=d.sourceLatestDate||'';lastRead=new Date().toLocaleString('ko-KR');readMessage=(d.test?'검증 데이터 · 운영 아님 · ':'')+(d.coreRead?'CORE · ':'')+`${items.length}건 · ${sourceDate||'기준일 미등록'}`;coreCacheSave();return true;
  }catch(e){
   lastReadErrorStatus=e.status||0;
   if(e.status===401){items=[];live=false;readStale=false;readMessage='사용자 등록 · 연결이 필요합니다';}
   else{readStale=true;const cached=items.length||coreCacheRestore();if(cached){live=true;readMessage='동기화 지연 · 최근 정상값 유지';}else{live=false;readMessage='현재 상태를 불러오지 못했습니다.';}}
   return false;
  }finally{
   readPending=null;banner();
   if(screen==='home')home();if(screen==='work')work(filter,$('search')?.value||'');if(screen==='delivery'&&typeof delivery==='function')delivery();if(screen==='projects'&&typeof projects==='function')projects();if(screen==='issues'&&typeof todayIssues==='function')todayIssues();
  }
 })();
 return readPending;
}

function card(x){return `<article class="item"><div class="item-top"><div class="item-status"><span class="tag">현재 진행</span><button class="schedule-button" onclick="scheduleReport(${x.id})">계획일정 ↗</button></div><span class="category">${esc(x.process)}</span></div><button class="item-detail" aria-label="${esc(x.customer)} ${esc(x.model)} 업무 상세" onclick="openItem(${x.id})"><h3>${esc(x.customer)}<small>${esc(x.model)}</small></h3><p class="issue">${esc(x.state||'진행내용 미등록')}</p><div class="next"><span>다음 행동 · ${esc(x.nextAction||'확인 필요')}</span><span>›</span></div></button></article>`;}
function reports(){return `<section><div class="section-title"><h2>생산 · 지원 집계</h2></div><div class="report-links"><button onclick="productionReport('month')">▥ 월간생산량<small>집계 연결 확인 ›</small></button><button onclick="productionReport('year')">▤ 연간생산량<small>집계 연결 확인 ›</small></button><button onclick="supportReport()">⇄ 타부서지원<small>누적 집계표 ›</small></button></div></section>`;}
function home(){active('home');const urgent=items.filter(x=>x.priority===1),done=items.filter(x=>x.priority===3),top=urgent[0],sorted=items.slice().sort((a,b)=>(a.priority||9)-(b.priority||9));main.innerHTML=`
<div class="hybrid-eyebrow">${esc(new Date().toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',weekday:'long'}))}</div>
<h1 class="hybrid-title">오늘 확인할 일<br>${live?urgent.length:'—'}건이 있습니다</h1>
<p class="hybrid-desc">현재 상태와 다음 행동을 우선순위 기준으로 보여줍니다.</p>${readStale?`<button class="hybrid-quick" onclick="refresh()"><span>↻ 다시 불러오기</span><span>${items.length?'최근 정상값 유지':'재시도'}</span></button>`:''}
${top?`<section class="hybrid-decision"><div class="hybrid-decision-top"><span>가장 먼저 볼 항목</span><span>P1 · ${esc(top.priorityReason||'확인 필요')}</span></div><h2>${esc(top.customer)} · ${esc(top.model)}<br><span>${esc(top.state)}</span></h2><p>다음 행동 · ${esc(top.nextAction||'확인 필요')}</p><button onclick="openItem(${top.id})"><span>상세와 변경 근거 보기</span><span>›</span></button></section>`:!live&&lastReadErrorStatus===401?'<section class="hybrid-decision"><h2>사용자 연결이 필요합니다.</h2><button onclick="login()"><span>앱 연결하기</span><span>›</span></button></section>':!live?'<section class="hybrid-decision"><h2>서버 연결이 잠시 지연되고 있습니다.</h2><p>사용자 연결은 정상입니다. 다시 불러오기를 눌러주세요.</p></section>':'<section class="hybrid-decision"><h2>우선 확인할 P1 항목이 없습니다.</h2><p>현재 관리 항목은 정상 진행 또는 완료 상태입니다.</p></section>'}
<div class="hybrid-numbers"><button class="hybrid-number" onclick="projects()"><small>관리중</small><b>${live?items.length:'—'}</b><em>현재 Core</em></button><button class="hybrid-number risk" onclick="projects('urgent')"><small>우선순위 1</small><b>${live?urgent.length:'—'}</b><em>먼저 확인</em></button><button class="hybrid-number" onclick="showInbox()"><small>완료 상태</small><b>${live?done.length:'—'}</b><em>기록 확인</em></button></div>
<div class="hybrid-section"><b>공정 신호</b><span>우선순위순</span></div>
<div class="hybrid-floor">${sorted.map(x=>`<button class="hybrid-floor-row p${esc(x.priority||2)}" onclick="openItem(${x.id})"><span class="hybrid-code">${x.priority===1?'P1':x.priority===3?'완료':'P2'}</span><span><b>${esc(x.customer)} · ${esc(x.model)}</b><small>${esc(x.state||'미등록')} · 다음 ${esc(x.nextAction||'확인 필요')}</small></span><span class="hybrid-priority">${x.priority===1?'확인':x.priority===3?'완료':'진행'}</span></button>`).join('')||'<div class="empty">현재 관리 항목이 없습니다.</div>'}</div>
<button class="hybrid-quick" onclick="todayIssues()"><span>🎙 오늘 이슈 입력</span><span>＋</span></button>
<div class="hybrid-section"><b>생산 · 지원 집계</b><span>실제 집계</span></div>${reports()}
<p class="source">${live?`Core 기준 · 조회 ${esc(lastRead)}`:esc(readMessage)}</p>`;banner();}
function work(f='all',query=''){active('work');filter=f;main.innerHTML=`<h1>업무 <span>한눈에</span></h1><p class="lead">현재 관리 이슈를 검색합니다.</p><div class="search"><input id="search" aria-label="고객 또는 장비 검색" value="${esc(query)}" placeholder="고객명 · 장비명 · 상태" oninput="renderList()"></div><div class="tabs">${[['all','전체'],['waiting','대기·보류'],['urgent','우선순위 1']].map(([v,t])=>`<button class="chip ${f===v?'active':''}" onclick="work('${v}')">${t}</button>`).join('')}</div><div id="list"></div>`;renderList();}
function renderList(){const q=norm($('search').value),a=items.filter(x=>(filter!=='waiting'||/대기|보류|지연/.test(x.state))&&(filter!=='urgent'||x.priority===1)&&norm([x.customer,x.model,x.state,x.cause,x.orderId].join(' ')).includes(q));$('list').innerHTML=a.length?a.map(card).join(''):`<div class="empty">${live?'일치하는 업무가 없습니다.':esc(readMessage)}</div>`;}
function openItem(id){const x=items[id];if(!x)return toast('최신 상태를 다시 불러오세요.');open(heading(x.process,x.customer,x.model)+`<div class="job-number"><small>JOB NO.</small><b>${esc(x.orderId||'미등록')}</b></div><h4>최근 진행내용</h4><div class="action-box">${esc(x.state||'미등록')}</div><h4>진행 시작 · 지속</h4><p>${esc(x.since||'미등록')} · ${Number.isFinite(x.days)?x.days+'일째':'기간 미확인'}</p><h4>기존 원인 / 이슈</h4><p>${esc(x.cause||'미등록')}</p><h4>다음 행동</h4><p>${esc(x.nextAction||'미등록')}</p><p class="note">${esc(x.issueId)} · ${esc(x.issueStatus)} · 원본 최신 ${esc(x.sourceLatestUpdate||sourceDate)}</p><button class="primary" onclick="openUnifiedEvent('${esc(x.issueId)}')">오늘 이슈 입력</button><button class="secondary" onclick="scheduleReport(${id})">계획일정 확인</button>`);}
function unavailable(title,description){open(heading('연결 상태',title,'실제 데이터 연결이 필요합니다')+`<div class="alert">${esc(description)}</div><p>값을 0 또는 완료로 대신 표시하지 않습니다.</p><button class="secondary" onclick="dialog.close()">닫기</button>`);}
function productionReport(mode){unavailable(mode==='month'?'월간생산량':'연간생산량','현재 조회 서비스에 생산 완료일·완료 수량이 없어 실적을 집계할 수 없습니다.');}
function supportReport(){unavailable('타부서지원 누적 집계표','현재 조회 서비스에 지원 부서·지원 시간·기준일이 연결되지 않았습니다.');}
let planRequest=0;
async function scheduleReport(id){
 const x=items[id];if(!x)return;
 const request=++planRequest;
 open(heading('계획일정',x.customer,x.model)+'<p id="planResult">원본 계획을 불러오는 중…</p>');
 const result=$('planResult');
 if(!x.orderId){result.textContent='프로젝트 ID가 없어 계획을 안전하게 연결할 수 없습니다.';return;}
 try{
  const d=await api('/api/sa2-lifecycle',{action:'plans',orderId:x.orderId});
  if(request!==planRequest||!result.isConnected||!dialog.open)return;
  if(d.orderId!==x.orderId||!Array.isArray(d.plans))throw Error('invalid_plans');
  result.outerHTML='<div class="alert">계획은 완료 실적이 아닙니다. 일정 수정은 개인계정 권한과 변경이력 연결 검증이 필요합니다.</div><p>'+esc(x.orderId)+'</p>'+
    (d.plans.length?d.plans.map(r=>'<article class="item"><b>'+esc(r[3])+' · '+esc(r[10])+'</b><p>'+esc(r[11]||'상태 미등록')+'</p></article>').join(''):'<p>이 프로젝트 ID에 연결된 계획이 없습니다.</p>');
 }catch{if(request===planRequest&&result.isConnected)result.textContent='계획을 불러오지 못했습니다. 연결을 확인한 뒤 다시 여세요.';}
}
function input(id){const x=typeof id==='object'?id:items[id],d=readStore(DRAFT,{}),target=x?`${x.orderId?x.orderId+' · ':''}${x.customer} · ${x.model}`:d.target||'',draftText=x&&d.target&&d.target!==target?'':d.text||'';open(heading('FIELD NOTE','진행내용 입력',x?.issueId?'입력한 첫 줄을 현재 업무 카드에도 바로 표시합니다.':'기기에 보관한 뒤 내용을 확인하여 서버로 보냅니다')+`<label>입력 대상<input id="inputTarget" aria-label="입력 대상" maxlength="160" value="${esc(target)}" placeholder="고객명 · 장비명" oninput="saveDraft()"></label><label>진행내용<textarea id="draft" aria-label="진행 내용" maxlength="800" placeholder="바뀐 진행내용을 입력하세요." oninput="saveDraft()">${esc(draftText)}</textarea></label><input id="inputIssueId" type="hidden" value="${esc(x?.issueId||'')}"><input id="inputOrderId" type="hidden" value="${esc(x?.orderId||'')}"><input id="inputNextAction" type="hidden" value="${esc(x?.nextAction||'')}"><input id="inputIssueStatus" type="hidden" value="${esc(x?.issueStatus||'OPEN')}"><button class="chip" onclick="voice()">◉ 음성 입력</button><p id="inputHint" class="note">${draftText?'보관한 초안을 불러왔습니다.':x?.issueId?'첫 줄은 현재 진행으로 표시하고, 다음 행동·일정은 그대로 둡니다.':'입력 원문은 이 기기에 보관됩니다.'}</p><button class="primary" onclick="saveAndSendNote()">서버로 보내고 바로 반영</button><button class="secondary" onclick="saveNote()">기기에만 보관</button><p class="note">서버 저장과 재조회를 확인한 뒤 업무 카드를 자동으로 갱신합니다.</p>`);}
function saveDraft(){try{persist(DRAFT,{target:$('inputTarget').value,text:$('draft').value});$('inputHint').textContent='이 기기에 초안 보관됨';}catch{$('inputHint').textContent='기기 저장에 실패했습니다. 화면을 닫기 전에 원문을 복사하세요.';}}
function saveNote(){const target=$('inputTarget').value.trim(),text=$('draft').value.trim();if(!target||!text){$('inputHint').textContent='입력 대상과 진행 내용을 모두 작성하세요.';return;}try{const id=crypto.randomUUID(),r={id,submissionId:id,target,text,status:'draft',createdAt:new Date().toISOString(),issueId:$('inputIssueId')?.value||'',orderId:$('inputOrderId')?.value||'',displayState:text.split(/\r?\n/).map(v=>v.trim()).find(Boolean)?.slice(0,80)||'',nextAction:$('inputNextAction')?.value||'',issueStatus:$('inputIssueStatus')?.value||'OPEN'};const a=notes();a.unshift(r);persist(KEY,a);localStorage.removeItem(DRAFT);receiptDetail(r.id);return r.id;}catch{toast('저장에 실패했습니다. 원문을 복사하여 보관하세요.');}}
async function saveAndSendNote(){const id=saveNote();if(id)await sendNote(id);}
const labels={draft:'기기에 보관 · 미전송',sending:'서버 응답 확인 중',unknown:'결과 확인 필요 · 재전송 보류',applied:'업무이력 저장 · 재조회 확인',saved_unverified:'서버 저장 응답 · 재조회 확인 필요',review:'검토 필요',partial:'일부 반영 · 검토 필요',excluded:'운영 반영 제외',duplicate:'중복 접수 · 반영 확인 필요',received:'서버 접수 · 반영 대기',rejected:'서버 접수 거절'};
function showInbox(){const all=notes(),done=r=>r.status==='applied'&&!!r.verifiedAt;const rows=a=>a.map(r=>`<button class="item" onclick="receiptDetail('${r.id}')"><span class="tag">${esc(r.status==='applied'&&!r.verifiedAt?labels.saved_unverified:(labels[r.status]||labels.unknown))}</span><h3>${esc(r.target)}</h3><p>${esc(r.text)}</p><small>${esc(new Date(r.updatedAt||r.createdAt).toLocaleString('ko-KR'))}${r.updatedAt?' · 수정됨':''}</small></button>`).join('')||'<p class="empty">기록이 없습니다.</p>';open(heading('ACTIVITY','처리함','이 기기의 원문과 이력을 보존합니다')+'<p class="note">업무 카드에서 입력한 진행내용은 이력 저장과 현재 진행 표시를 함께 확인합니다. 다음 행동·일정은 그대로 유지합니다.</p><h3>확인 필요</h3>'+rows(all.filter(r=>!done(r)))+'<h3>저장 완료</h3>'+rows(all.filter(done)));}
function receiptDetail(id){const r=notes().find(r=>r.id===id);if(!r)return;open(heading('INPUT RESULT',r.status==='applied'&&!r.verifiedAt?labels.saved_unverified:(labels[r.status]||labels.unknown),r.target)+`<div class="action-box" style="white-space:pre-wrap">${esc(r.text)}</div><p class="note">보관 번호 ${esc(r.id)}${r.requestId?'<br>서버 요청 '+esc(r.requestId):''}</p>${r.ack?`<p>${esc(r.ack)}</p>`:''}${r.status==='draft'?`<div class="alert">보내기를 누르면 업무이력으로 저장되고, 연결된 업무 카드의 현재 진행도 함께 바뀝니다.</div><button id="sendNote" class="primary" onclick="sendNote('${r.id}')">서버로 보내고 바로 반영</button>`:''}${['unknown','sending'].includes(r.status)?'<div class="alert">응답이 확인되지 않아 자동 재전송하지 않습니다. 중복 입력을 피하려면 서버 기록을 먼저 확인해야 합니다.</div>':''}${r.status==='applied'?'<p>'+(r.issueId?'업무이력 저장과 현재 진행 표시를 확인했습니다. 다음 행동·일정은 그대로입니다.':'업무이력 저장을 확인했습니다.')+'</p>':''}<button class="secondary" onclick="refreshAndShow()">최신 업무 상태 확인</button><button class="secondary" onclick="showInbox()">처리함으로</button>`);}
async function sendNote(id){const r=notes().find(r=>r.id===id);if(!r||r.status!=='draft')return;if(!canSendNote(r))return;if(navigator.onLine===false)return toast('오프라인입니다. 수정 내용은 기기에 보관했습니다.');try{updateNote(id,{status:'sending'});}catch{return toast('원문 보관에 실패하여 전송하지 않았습니다.');}receiptDetail(id);try{const d=await api('/api/sa2-write',{op:'safe_write',submissionId:r.submissionId||r.id,text:`${r.target} ${r.text}`,targetHint:r.target,source:'MOBILE',requester:'Emotion'},55000);const status=/REVIEW/i.test(d.status)?(d.applied?'partial':'review'):d.applied?'saved_unverified':/EXCLUDED/i.test(d.status)?'excluded':/DUPLICATE/i.test(d.status)?'duplicate':'received';const messages={partial:'일부 업무이력은 저장됐고 일부는 검토가 필요합니다.',saved_unverified:'업무이력 저장 완료. 현재 업무 카드 반영을 확인 중입니다.',review:'자동 반영하지 않고 검토 대상으로 접수했습니다.',excluded:'운영 기록 반영 제외로 접수했습니다.',duplicate:'중복 가능성이 있어 기존 서버 기록을 확인합니다.',received:'서버가 요청을 접수했습니다. 저장 상태를 자동으로 다시 확인합니다.'};updateNote(id,{status,requestId:d.requestId||'',ack:d.ack||messages[status],respondedAt:new Date().toISOString()});receiptDetail(id);if(d.applied){toast('업무이력 저장 완료. 현재 상태 반영을 확인 중입니다.');if(typeof verifyEventNote==='function'){await verifyEventNote(id,d);receiptDetail(id);}else if(typeof scheduleEventReceiptCheck==='function')scheduleEventReceiptCheck(id,0,false);}else if(typeof scheduleEventReceiptCheck==='function')scheduleEventReceiptCheck(id,0,false);}catch(e){try{const rejected=[400,401,403].includes(e.status);updateNote(id,{status:rejected?'rejected':'unknown',requestId:e.data?.requestId||'',ack:appError(e)});receiptDetail(id);if(!rejected&&typeof scheduleEventReceiptCheck==='function')scheduleEventReceiptCheck(id,1500,false);}catch{toast('결과 보관 실패. 서버 기록을 확인하세요.');}}}
async function refreshAndShow(){dialog.close();home();await refresh();}
function stopVoice(){if(recognition){recognition.abort();recognition=null;}}
function voice(){const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech)return toast('이 브라우저는 음성 인식을 지원하지 않습니다. 키보드의 음성 입력을 사용할 수 있습니다.');if(recognition){stopVoice();return;}recognition=new Speech();recognition.lang='ko-KR';recognition.interimResults=false;recognition.onresult=e=>{if($('draft')){$('draft').value=($('draft').value+' '+e.results[0][0].transcript).trim().slice(0,800);saveDraft();}};recognition.onerror=e=>toast(e.error==='not-allowed'?'마이크 사용 권한이 필요합니다.':'음성 인식에 실패했습니다. 다시 시도하세요.');recognition.onend=()=>{recognition=null;};try{recognition.start();toast('듣고 있습니다. 인식 후 내용을 확인하세요.');}catch{stopVoice();toast('마이크를 시작하지 못했습니다.');}}
function login(){location.href='./login.html';}
async function unlock(){const key=$('appKey').value.trim();if(!key){$('loginHint').textContent='앱 연결 키를 입력하세요.';return;}$('loginHint').textContent='연결 중…';try{await api('/api/unlock',{key});$('appKey').value='';dialog.close();await refresh();if(!live)toast(readMessage);}catch{$('loginHint').textContent='인증하지 못했습니다. 연결 키와 네트워크를 확인하세요.';}}
function grow(){open(heading('GROW','운영DB 근거 찾기','현재 상태와 프로젝트 원장을 다시 조회해 답합니다')+`<textarea id="growQuestion" aria-label="그로우 질문" placeholder="예: 미코 상태와 다음 행동 알려줘"></textarea><button id="growSearch" class="primary" onclick="growAnswer()">운영DB에서 찾기</button><div id="growResult" aria-live="polite"></div><button class="secondary" onclick="input()">진행 내용 입력하기</button>`);}
async function growAnswer(){const raw=$('growQuestion').value.trim(),result=$('growResult');if(!raw){result.textContent='질문을 입력하세요.';return;}if(!live){result.textContent='먼저 앱 연결을 완료하고 현재 상태를 불러오세요.';return;}if(/변경|삭제|등록|저장|반영|수정해|바꿔/.test(raw)){result.textContent='이 화면은 운영DB 조회입니다. 변경은 업무 상세의 상태 수정 또는 현장 입력에서 확인 후 진행하세요.';return;}result.textContent='운영DB를 다시 조회하는 중…';try{const projects=await getAppProjects(),rawNorm=norm(raw),q=norm(raw.replace(/알려줘|보여줘|지금|현재|상태|현황|어때|확인|다음행동|일정/g,'')),all=/오늘|전체|업무/.test(raw);const found=projects.filter(p=>all||[p.orderId,p.customer,p.model,p.pm].some(v=>v&&rawNorm.includes(norm(v)))||(q&&norm([p.orderId,p.customer,p.model,p.state,p.pm].join(' ')).includes(q))).slice(0,20);const current=new Map(items.map(x=>[x.orderId,x]));result.innerHTML=found.length?'<p class="note">운영DB 재조회 '+esc(new Date().toLocaleString('ko-KR'))+' · 현재 상태 기준 '+esc(sourceDate||'미등록')+'</p>'+found.map(p=>{const x=current.get(p.orderId);return '<button class="item" data-grow-project="'+esc(p.orderId)+'"><b>'+esc(p.customer)+' · '+esc(p.model)+'</b><p>현재 '+esc(x?.state||p.state||'미등록')+'</p><p>다음 행동 '+esc(x?.nextAction||'상세에서 확인')+'</p><small>Project ID '+esc(p.orderId)+' · PM '+esc(p.pm||'미등록')+'</small></button>';}).join(''):'<p>운영DB에서 관련 프로젝트를 찾지 못했습니다. 고객명·장비명·Project ID로 다시 검색하세요.</p>';result.querySelectorAll('[data-grow-project]').forEach(b=>b.onclick=()=>openProject(b.dataset.growProject));}catch(e){result.textContent=appError(e);}}
function settings(){open(heading('MY HANDSFREE','사용자와 설정',`버전 ${BUILD}`)+`<div class="action-box">${live?'현재 상태 연결됨':'앱 연결 필요'}</div><p>이름과 4자리 PIN으로 연결합니다. 연결 후에는 180일 동안 자동 유지됩니다. 푸시 알림은 아직 연결되지 않았습니다.</p><button class="primary" onclick="installApp()">휴대폰에 앱 설치</button><button class="secondary" onclick="login()">사용자 등록 · 연결</button><button class="secondary" onclick="showInbox()">기기에 보관한 입력 확인</button><button class="secondary" onclick="checkUpdate()">앱 업데이트 확인</button><p class="note">오프라인에서는 초안을 보관할 수 있습니다. 서버 전송은 연결 후 직접 확인하여 진행하며 자동 재전송하지 않습니다.</p>`);}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
async function installApp(){if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}open(heading('INSTALL','휴대폰에 설치','한 번 설치하면 홈 화면에서 열 수 있습니다')+'<p>아이폰: Safari에서 이 주소를 연 뒤 공유 → 홈 화면에 추가.</p><p>안드로이드: Chrome에서 이 주소를 연 뒤 메뉴 → 앱 설치 또는 홈 화면에 추가.</p><p class="note">이미 설치했거나 설치를 지원하지 않는 브라우저에서는 설치 버튼이 나타나지 않을 수 있습니다.</p>');}
async function checkUpdate(){try{const r=await navigator.serviceWorker?.getRegistration('/kmt-sa2/');if(!r)return toast('현재 브라우저에서 업데이트 서비스를 사용할 수 없습니다.');await r.update();toast(r.waiting?'새 버전이 준비되었습니다. 앱 창을 모두 닫고 다시 여세요.':'업데이트 확인 완료. 새 버전은 앱을 다시 열 때 적용됩니다.');}catch{toast('업데이트 확인 실패. 네트워크를 확인하세요.');}}
const nav=document.querySelector('.bottom');nav.style.gridTemplateColumns='repeat(4,1fr)';nav.innerHTML=`<button data-page="home" id="homeNav" onclick="home()"><span class="nav-icon">⌂</span>오늘</button><button data-page="delivery" id="deliveryNav" onclick="delivery()"><span class="nav-icon">◫</span>납기</button><button data-page="projects" id="projectsNav" onclick="projects()"><span class="nav-icon">▦</span>프로젝트</button><button data-page="issues" id="issuesNav" onclick="todayIssues()"><span class="nav-icon">▤</span>오늘 이슈</button>`;
const profile=document.createElement('button');profile.className='icon';profile.textContent='나';profile.setAttribute('aria-label','사용자와 설정');profile.onclick=settings;document.querySelector('.top').append(profile);
const style=document.createElement('style');style.textContent=`label{display:block;margin:16px 0;font-size:13px}label input{display:block;width:100%;padding:13px;border:1px solid var(--line);border-radius:12px;margin-top:8px}label textarea{margin-top:8px}input,textarea,select{font-size:16px!important}.item-detail{width:100%;text-align:left;background:none;border:0;padding:0}.item-status{display:flex;align-items:center;gap:6px}.schedule-button{background:white;border:1px solid var(--line);border-radius:6px;padding:8px;font-size:11px}.plan-list li{display:flex;flex-wrap:wrap;gap:12px;padding:12px 0}.brief button{gap:8px;text-align:left}.brief button strong{white-space:nowrap}.top .icon{min-width:38px}.demo{flex-wrap:wrap}.sheet{padding-bottom:calc(26px + env(safe-area-inset-bottom))}.item,.action-box,p{overflow-wrap:anywhere}@media(max-width:380px){.top{padding-left:12px!important;padding-right:12px!important}.kmt-brand{gap:5px!important}.kmt-brand strong{font-size:14px!important}}`;document.head.append(style);
// Resume reads only: never retry a write, and never invalidate an open editor's item IDs.
let resumeReadNeeded=false,lastResumeRead=0;
function resumeRead(){
 if(document.visibilityState==='hidden'||navigator.onLine===false)return;
 if(dialog.open){resumeReadNeeded=true;return;}
 if(Date.now()-lastResumeRead<60000)return;
 resumeReadNeeded=false;lastResumeRead=Date.now();refresh(false);
}
window.addEventListener('focus',resumeRead);
document.addEventListener('visibilitychange',resumeRead);
dialog.addEventListener('close',()=>{if(resumeReadNeeded)resumeRead();});
window.addEventListener('online',()=>{toast('연결이 복구되었습니다. 최신 상태를 확인합니다.');lastResumeRead=0;refresh(true);});
window.addEventListener('offline',()=>{if(!items.length)coreCacheRestore();live=!!items.length;readStale=true;readMessage=items.length?'오프라인 · 최근 정상값 유지':'오프라인 · 초안 보관 가능';banner();if(screen==='home')home();if(screen==='work')work(filter);if(screen==='delivery'&&typeof delivery==='function')delivery();if(screen==='projects'&&typeof projects==='function')projects();if(screen==='issues'&&typeof todayIssues==='function')todayIssues();});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>toast('오프라인 앱 준비에 실패했습니다. 온라인으로 사용할 수 있습니다.'));
