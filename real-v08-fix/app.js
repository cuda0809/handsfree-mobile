(function(){
'use strict';

var live=false;
var rows=[];

function $(id){ return document.getElementById(id); }
function setText(id,text){ var el=$(id); if(el) el.textContent=text; }
function parseResponse(r){
  return r.text().then(function(t){
    var d={};
    try{ d=t?JSON.parse(t):{}; }catch(e){}
    if(!r.ok){ var err=new Error(d.error||('HTTP '+r.status)); err.status=r.status; err.data=d; throw err; }
    return d;
  });
}
function showSheet(id){ var el=$(id); if(el) el.classList.add('show'); }
function hideSheet(id){ var el=$(id); if(el) el.classList.remove('show'); }
function status(msg,ok){ var el=$('status'); if(!el) return; el.textContent=msg; el.className='status '+(ok?'ok':'warn'); }
function formatDate(){ var d=new Date(); var y=d.getFullYear(); var m=String(d.getMonth()+1).padStart(2,'0'); var day=String(d.getDate()).padStart(2,'0'); return y+'-'+m+'-'+day; }

function render(){
  setText('mWork', String(rows.length));
  var urgent=0, issues=0;
  for(var i=0;i<rows.length;i++){
    var r=rows[i]||{};
    var txt=[r.cause,r.state,r.process,r.issueStatus,r.status,r.type].join(' ');
    if(Number(r.priority)===1 || /긴급|urgent|critical|danger/i.test(String(r.tone||''))) urgent++;
    if(/대기|지연|불량|문제|open|issue/i.test(txt) || r.cause) issues++;
  }
  setText('mUrgent', String(urgent));
  setText('mIssue', String(issues));
  setText('decisionCount', String(Math.min(rows.length,5))+'건');
  var list=$('currentList');
  if(!list) return;
  if(!rows.length){ list.innerHTML='<div class="empty">LIVE 연결 후 현재 관리 상세가 표시돼.</div>'; return; }
  var html='';
  for(var j=0;j<Math.min(rows.length,6);j++){
    var x=rows[j]||{};
    var title=(x.customer||'미지정')+(x.model?' · '+x.model:'');
    var sub=x.process||x.state||x.issueStatus||'확인 필요';
    var cause=x.cause||'';
    html+='<div class="card"><b>'+escapeHtml(title)+'</b><span>현재 · '+escapeHtml(sub)+'</span>'+(cause?'<p>'+escapeHtml(cause)+'</p>':'')+'</div>';
  }
  list.innerHTML=html;
}
function escapeHtml(v){
  return String(v==null?'':v).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function refresh(){
  status('LIVE 데이터를 불러오는 중…',true);
  fetch('/api/real-status?t='+Date.now(),{cache:'no-store',credentials:'same-origin'})
    .then(parseResponse)
    .then(function(d){
      live=d.ok===true;
      rows=Array.isArray(d.currentStatus)?d.currentStatus:[];
      setText('liveState', live?'LIVE 연결':'LIVE 연결 필요');
      setText('syncLead', live?'LIVE 연결 정상 · 현재 항목 '+rows.length+'건':'LIVE 인증이 필요해.');
      status(live?'LIVE 연결 정상 · 현재 항목 '+rows.length+'건':'LIVE 인증 필요',live);
      render();
    })
    .catch(function(e){
      live=false; rows=[]; render(); setText('liveState','LIVE 연결 필요');
      if(e.status===401){ status('LIVE 인증이 필요해. 상단 LIVE 버튼을 눌러 앱 키를 입력해.',false); }
      else{ status('LIVE 연결 오류 · '+String(e.message||e),false); }
    });
}

function unlock(){
  var key=($('appKey').value||'').trim();
  if(!key){ setText('loginResult','앱 키를 입력해줘.'); return; }
  setText('loginResult','인증 중…');
  fetch('/api/unlock',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:key})})
    .then(parseResponse)
    .then(function(){ $('appKey').value=''; setText('loginResult','인증 완료'); hideSheet('loginSheet'); refresh(); })
    .catch(function(e){ setText('loginResult',e.status===401?'앱 키가 맞지 않아.':'LIVE 인증 오류'); });
}

function submitField(){
  var detail=($('fDetail').value||'').trim();
  if(!detail){ setText('fieldResult','내용을 입력해줘.'); return; }
  if(!live){ setText('fieldResult','먼저 LIVE 연결을 완료해줘.'); showSheet('loginSheet'); return; }
  var target=($('fTarget').value||'').trim();
  var owner=($('fOwner').value||'').trim();
  var date=($('fDate').value||'').trim();
  var text=[date,target,owner,detail].filter(Boolean).join(' ');
  var btn=$('fieldSubmit'); btn.disabled=true; btn.textContent='처리중…'; setText('fieldResult','Queue에 등록하고 자동분류하는 중…');
  fetch('/api/write',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text,source:'MOBILE_FIELD',requester:owner||'Emotion',targetHint:target})})
    .then(parseResponse)
    .then(function(d){
      var map={WRITTEN:'원본반영 완료',REVIEW:'검토대기 저장',EXCLUDED:'제외정책 적용',DUPLICATE:'중복 감지'};
      var msg=(map[d.status]||d.status||'처리완료');
      if(d.requestId) msg+='\n'+d.requestId;
      if(d.ack) msg+='\n'+d.ack;
      setText('fieldResult',msg);
      if(d.status==='WRITTEN'||d.status==='REVIEW'||d.status==='EXCLUDED') $('fDetail').value='';
      refresh();
    })
    .catch(function(e){
      if(e.status===401){ setText('fieldResult','LIVE 인증이 만료됐어. 다시 연결해줘.'); showSheet('loginSheet'); }
      else{ setText('fieldResult','전송 실패 · '+String((e.data&&e.data.ack)||e.message||'오류')); }
    })
    .then(function(){ btn.disabled=false; btn.textContent='등록'; },function(){ btn.disabled=false; btn.textContent='등록'; });
}

function bind(){
  setText('jsState','JS READY');
  $('fDate').value=formatDate();
  $('liveBtn').addEventListener('click',function(){ if(live) refresh(); else showSheet('loginSheet'); });
  $('refreshBtn').addEventListener('click',refresh);
  $('openInput').addEventListener('click',function(){ showSheet('inputSheet'); });
  $('openGrow').addEventListener('click',function(){ showSheet('growSheet'); });
  $('closeInput').addEventListener('click',function(){ hideSheet('inputSheet'); });
  $('closeGrow').addEventListener('click',function(){ hideSheet('growSheet'); });
  $('closeLogin').addEventListener('click',function(){ hideSheet('loginSheet'); });
  $('unlockBtn').addEventListener('click',unlock);
  $('fieldSubmit').addEventListener('click',submitField);
  $('clearField').addEventListener('click',function(){ $('fTarget').value=''; $('fOwner').value=''; $('fDetail').value=''; setText('fieldResult','입력 대기'); });
  $('growToday').addEventListener('click',function(){ setText('growResult', live?'현재 LIVE 항목 '+rows.length+'건을 읽고 있어.':'먼저 LIVE 연결이 필요해.'); });
  $('inputSheet').addEventListener('click',function(e){ if(e.target===this) hideSheet('inputSheet'); });
  $('growSheet').addEventListener('click',function(e){ if(e.target===this) hideSheet('growSheet'); });
  $('loginSheet').addEventListener('click',function(e){ if(e.target===this) hideSheet('loginSheet'); });
  refresh();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
})();
