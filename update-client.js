(function(){
  'use strict';

  function q(sel){ return document.querySelector(sel); }
  function qa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function text(el, value){ if(el) el.textContent=value; }
  function showToast(msg){
    var el=q('#toast');
    if(!el) return;
    el.textContent=msg;
    el.classList.add('show');
    setTimeout(function(){ el.classList.remove('show'); },1800);
  }
  function openSheetCompat(id){
    var el=document.getElementById(id);
    if(!el) return;
    el.classList.add('show');
    if(id==='growSheet'){
      setTimeout(function(){ var input=q('#growInput'); if(input){ try{ input.focus(); }catch(e){} } },80);
    }
  }
  function closeSheetCompat(id){
    var el=document.getElementById(id);
    if(el) el.classList.remove('show');
  }
  function goCompat(id){
    qa('.page').forEach(function(p){ p.classList.toggle('active',p.id===id); });
    qa('[data-nav]').forEach(function(b){ b.classList.toggle('active',b.getAttribute('data-nav')===id); });
    try{ window.scrollTo(0,0); }catch(e){}
    if(typeof renderProjects==='function' && id==='projects') try{ renderProjects(); }catch(e){}
    if(typeof renderIssues==='function' && id==='issues') try{ renderIssues(); }catch(e){}
    if(typeof renderSearch==='function' && id==='search') try{ renderSearch(); }catch(e){}
  }

  // Keep the production UI interactive even if the inline bootstrap script aborts early.
  var style=document.createElement('style');
  style.textContent='button,input,textarea,select{pointer-events:auto!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent}.sheet:not(.show){display:none!important;pointer-events:none!important}.sheet.show{display:flex!important;pointer-events:auto!important}.sheet.show .sheetbox,.sheet.show input,.sheet.show textarea,.sheet.show button{pointer-events:auto!important}';
  document.head.appendChild(style);

  // REAL currentStatus priority is 1=highest. Correct the old inverted urgent rule when core loaded.
  try{
    if(typeof vm==='function' && typeof textOf==='function'){
      vm=function(x){
        var t=textOf(x);
        var pri=Number(x.priority||0);
        var tone=String(x.tone||'').toLowerCase();
        var urgent=pri===1||/critical|danger|hot|urgent/.test(tone);
        var blocked=/대기|보류|지연|미확정|입고|불량|문제|blocked/i.test(t);
        var quality=/품질|불량|끼임|동심|소음|검수|수정|재검증/.test(t);
        return Object.assign({},x,{id:String(x.orderId||x.issueId||''),risk:urgent?'긴급':'주의',blocked:blocked,quality:quality,search:t.toLowerCase()});
      };
    }
  }catch(e){ console.warn('priority semantic fix skipped',e); }

  // Current LIVE endpoint is active issue/current-status data, not a full daily work plan.
  try{
    var workMetric=q('#mWork');
    if(workMetric && workMetric.parentElement){
      text(workMetric.parentElement.querySelector('small'),'활성 항목');
      text(workMetric.parentElement.querySelector('span'),'현재 관리 대상');
    }
    qa('#today .section-title').forEach(function(section){
      var h=section.querySelector('h2');
      if(h && h.textContent.indexOf('오늘 진행')!==-1){
        text(section.querySelector('small'),'CURRENT STATUS');
        text(h,'현재 관리');
        text(section.querySelector('button'),'활성 대상');
      }
    });
    var projects=q('#projects');
    if(projects){ text(projects.querySelector('h1'),'활성 대상'); text(projects.querySelector('.lead'),'OPEN 이슈의 현재 상태와 다음 행동을 확인'); }
    var search=q('#search');
    if(search){ text(search.querySelector('h1'),'현재 이슈 검색'); text(search.querySelector('.lead'),'현재 활성 이슈에서 발주번호·고객사·모델·내용 검색'); }
  }catch(e){ console.warn('REAL label fix skipped',e); }

  // Fallback LIVE loader used only when the core loader is unavailable or failed.
  var compatRows=[];
  var compatLive=false;
  var compatDate='';
  function compatRender(){
    var rows=compatRows||[];
    var urgent=rows.filter(function(x){ return Number(x.priority||0)===1 || /critical|danger|hot|urgent/.test(String(x.tone||'').toLowerCase()); });
    var issues=rows.filter(function(x){ return x.cause||x.issueStatus||x.type; });
    text(q('#mUrgent'),String(urgent.length));
    text(q('#mWork'),String(rows.length));
    text(q('#mIssue'),String(issues.length));
    text(q('#sourceState'),compatLive?'LIVE · '+(compatDate||'연결'):'🔐 LIVE 연결');
    text(q('#syncLead'),compatLive?'LIVE 연결 · 이슈 최신 '+(compatDate||'실시간'):'앱 키 인증 후 Google Sheets LIVE READ 연결');
    text(q('#growMode'),compatLive?'읽기 · OS v3 LIVE':'읽기 · LIVE 연결 필요');
  }
  function parseJsonResponse(r){
    return r.text().then(function(t){
      var d={}; try{ d=t?JSON.parse(t):{}; }catch(e){}
      if(!r.ok){ var err=new Error(d.error||('HTTP '+r.status)); err.status=r.status; throw err; }
      return d;
    });
  }
  function compatLoad(interactive){
    if(typeof loadLive==='function'){
      try{ return Promise.resolve(loadLive(!!interactive)); }catch(e){}
    }
    return fetch('/api/real-status?t='+Date.now(),{cache:'no-store',credentials:'same-origin'})
      .then(parseJsonResponse)
      .then(function(d){
        compatRows=Array.isArray(d.currentStatus)?d.currentStatus:[];
        compatLive=d.ok===true;
        compatDate=String(d.sourceLatestDate||d.today||'');
        compatRender();
        showToast('LIVE 새로고침 완료');
        return true;
      })
      .catch(function(e){
        compatLive=false; compatRender();
        if(e && e.status===401 && interactive) return compatUnlock();
        if(interactive) showToast('LIVE 연결을 확인해줘');
        return false;
      });
  }
  function compatUnlock(){
    if(typeof unlock==='function'){
      try{ return Promise.resolve(unlock()); }catch(e){}
    }
    var key=(window.prompt('REAL LIVE 연결용 앱 키를 입력해줘.\n키는 화면/소스에 저장하지 않고 서버 보안 세션으로만 사용해.')||'').trim();
    if(!key) return Promise.resolve(false);
    return fetch('/api/unlock',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:key})})
      .then(parseJsonResponse)
      .then(function(){ showToast('LIVE 인증 완료'); return compatLoad(false); })
      .catch(function(e){ showToast(e && e.status===401?'앱 키가 맞지 않아':'LIVE 인증 오류'); return false; });
  }
  function compatGrowRun(){
    if(typeof runGrow==='function'){
      try{ runGrow(); return; }catch(e){}
    }
    var input=q('#growInput');
    var result=q('#growResult');
    var s=input?input.value.trim():'';
    if(!s){ showToast('질문을 입력해줘'); return; }
    if(!compatLive){ if(result) result.textContent='먼저 상단의 🔐 LIVE 연결을 눌러 앱 키 인증을 해줘.'; return; }
    if(/변경|미뤄|당겨|기록|등록|추가|삭제|반영/.test(s)){ if(result) result.textContent='WRITE LOCK 상태야. 변경/기록 명령은 아직 실제 Google Sheets에 반영하지 않아.'; return; }
    var tokens=s.replace(/알려줘|상태|현황|확인|보여줘|지금|현재/g,' ').toLowerCase().split(/\s+/).filter(function(x){ return x.length>1; });
    var hits=compatRows.filter(function(x){
      var t=[x.orderId,x.issueId,x.customer,x.model,x.process,x.state,x.cause,x.nextAction,x.issueStatus,x.type].filter(Boolean).join(' ').toLowerCase();
      return tokens.length && tokens.every(function(tok){ return t.indexOf(tok)!==-1; });
    }).slice(0,6);
    if(result) result.textContent=hits.length?hits.map(function(x){ return (x.customer||'미지정')+' · '+(x.model||'')+' ('+(x.orderId||x.issueId||'')+')\n'+(x.process||x.state||'')+'\n'+(x.cause||'')+'\n다음: '+(x.nextAction||'확인 필요'); }).join('\n\n'):'관련 LIVE 근거를 찾지 못했어.';
  }

  // Rebind every primary touch target from this external compatibility layer.
  var refresh=q('#refreshBtn'); if(refresh) refresh.onclick=function(e){ if(e) e.preventDefault(); compatLoad(true); };
  var live=q('#liveBtn'); if(live) live.onclick=function(e){ if(e) e.preventDefault(); compatUnlock(); };
  var grow=q('#growNav'); if(grow) grow.onclick=function(e){ if(e) e.preventDefault(); openSheetCompat('growSheet'); };
  var inputNav=q('#inputNav'); if(inputNav) inputNav.onclick=function(e){ if(e) e.preventDefault(); openSheetCompat('inputSheet'); };
  var growRunBtn=q('#growRun'); if(growRunBtn) growRunBtn.onclick=function(e){ if(e) e.preventDefault(); compatGrowRun(); };
  var growToday=q('#growToday'); if(growToday) growToday.onclick=function(e){ if(e) e.preventDefault(); var gi=q('#growInput'); if(gi) gi.value='오늘 내가 결정할 것 알려줘'; compatGrowRun(); };

  qa('[data-close]').forEach(function(b){ b.onclick=function(e){ if(e) e.preventDefault(); closeSheetCompat(b.getAttribute('data-close')); }; });
  qa('[data-open]').forEach(function(b){ b.onclick=function(e){ if(e) e.preventDefault(); goCompat(b.getAttribute('data-open')); }; });
  qa('[data-nav]').forEach(function(b){ b.onclick=function(e){ if(e) e.preventDefault(); goCompat(b.getAttribute('data-nav')); }; });
  qa('.sheet').forEach(function(s){ s.addEventListener('click',function(e){ if(e.target===s) closeSheetCompat(s.id); }); });

  // Field draft fallback remains device-local while WRITE LOCK is on.
  var save=q('#saveDraft');
  if(save) save.onclick=function(e){
    if(e) e.preventDefault();
    var detail=q('#fDetail');
    if(!detail || !detail.value.trim()){ showToast('내용을 입력해줘'); return; }
    try{
      var key='hf-real-field-drafts-v1';
      var arr=JSON.parse(localStorage.getItem(key)||'[]');
      arr.unshift({target:(q('#fTarget')?q('#fTarget').value.trim():''),date:(q('#fDate')?q('#fDate').value:''),owner:(q('#fOwner')?q('#fOwner').value:''),detail:detail.value.trim(),savedAt:new Date().toISOString()});
      localStorage.setItem(key,JSON.stringify(arr.slice(0,50)));
      text(q('#fieldResult'),'초안 저장 완료. WRITE LOCK이라 Google Sheets에는 반영하지 않았어.');
      text(q('#draftInfo'),'이 기기 미등록 초안 '+arr.length+'건');
    }catch(err){ showToast('초안 저장 오류'); }
  };
  var clear=q('#clearDraft');
  if(clear) clear.onclick=function(e){ if(e) e.preventDefault(); ['#fTarget','#fOwner','#fDetail'].forEach(function(sel){ var el=q(sel); if(el) el.value=''; }); };

  // If core is healthy, refresh semantic state. Otherwise keep fallback UI usable.
  try{
    if(typeof sourceState==='function') sourceState();
    if(typeof renderHome==='function') renderHome();
  }catch(e){ compatRender(); }
})();
