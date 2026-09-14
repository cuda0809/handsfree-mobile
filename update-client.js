(()=>{
  function applyRealFixes(){
    try{
      // REAL currentStatus uses priority 1 as highest priority. The old UI treated 3 as urgent.
      if(typeof vm==='function' && typeof textOf==='function'){
        vm=function(x){
          const text=textOf(x);
          const pri=Number(x.priority||0);
          const tone=String(x.tone||'').toLowerCase();
          const urgent=pri===1||/critical|danger|hot|urgent/.test(tone);
          const blocked=/대기|보류|지연|미확정|입고|불량|문제|blocked/i.test(text);
          const quality=/품질|불량|끼임|동심|소음|검수|수정|재검증/.test(text);
          return {...x,id:String(x.orderId||x.issueId||''),risk:urgent?'긴급':'주의',blocked,quality,search:text.toLowerCase()};
        };
      }

      // The LIVE endpoint currently returns active issue/current-status rows, not the full daily work plan.
      const workMetric=document.querySelector('#mWork')?.closest('.metric');
      if(workMetric){
        const label=workMetric.querySelector('small');
        const sub=workMetric.querySelector('span');
        if(label) label.textContent='활성 항목';
        if(sub) sub.textContent='현재 관리 대상';
      }

      const todaySection=[...document.querySelectorAll('#today .section-title')].find(x=>x.querySelector('h2')?.textContent.includes('오늘 진행'));
      if(todaySection){
        const small=todaySection.querySelector('small');
        const h2=todaySection.querySelector('h2');
        const btn=todaySection.querySelector('button');
        if(small) small.textContent='CURRENT STATUS';
        if(h2) h2.textContent='현재 관리';
        if(btn) btn.textContent='활성 대상';
      }

      const projects=document.querySelector('#projects');
      if(projects){
        const h1=projects.querySelector('h1');
        const lead=projects.querySelector('.lead');
        if(h1) h1.textContent='활성 대상';
        if(lead) lead.textContent='OPEN 이슈의 현재 상태와 다음 행동을 확인';
      }

      const search=document.querySelector('#search');
      if(search){
        const h1=search.querySelector('h1');
        const lead=search.querySelector('.lead');
        const input=search.querySelector('#searchInput');
        if(h1) h1.textContent='현재 이슈 검색';
        if(lead) lead.textContent='현재 활성 이슈에서 발주번호·고객사·모델·내용 검색';
        if(input) input.placeholder='예) 미코 / KRM-100D2 / 트루메카';
      }

      if(typeof sourceState==='function'){
        sourceState=function(){
          if(LIVE){
            document.querySelector('#sourceState').textContent='LIVE · '+(SOURCE_DATE||'연결');
            document.querySelector('#syncLead').textContent='LIVE 연결 · 이슈 최신 '+(SOURCE_DATE||'실시간');
            document.querySelector('#growMode').textContent='읽기 · OS v3 LIVE';
          }else{
            document.querySelector('#sourceState').textContent='🔐 LIVE 연결';
            document.querySelector('#syncLead').textContent='앱 키 인증 후 Google Sheets LIVE READ 연결';
            document.querySelector('#growMode').textContent='읽기 · LIVE 연결 필요';
          }
        };
      }

      if(typeof renderHome==='function') renderHome();
      if(typeof renderProjects==='function') renderProjects();
      if(typeof renderIssues==='function') renderIssues();
      if(typeof renderSearch==='function') renderSearch();
      if(typeof sourceState==='function') sourceState();
    }catch(e){
      console.warn('REAL compatibility fix skipped',e);
    }
  }

  async function updateServiceWorker(){
    try{
      if(!('serviceWorker' in navigator)) return;
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg) await reg.update();
    }catch(e){}
  }

  applyRealFixes();
  window.addEventListener('pageshow',updateServiceWorker,{once:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') updateServiceWorker();
  });
})();
