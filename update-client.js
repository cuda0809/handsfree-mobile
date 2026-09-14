(()=>{
  try{
    // REAL currentStatus priority is 1=highest. Correct the old inverted urgent rule.
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

    // LIVE currently exposes active issue/current-status rows, not the full daily work plan.
    const workMetric=document.querySelector('#mWork')?.closest('.metric');
    if(workMetric){
      workMetric.querySelector('small').textContent='활성 항목';
      workMetric.querySelector('span').textContent='현재 관리 대상';
    }

    const currentSection=[...document.querySelectorAll('#today .section-title')].find(x=>x.querySelector('h2')?.textContent.includes('오늘 진행'));
    if(currentSection){
      currentSection.querySelector('small').textContent='CURRENT STATUS';
      currentSection.querySelector('h2').textContent='현재 관리';
      currentSection.querySelector('button').textContent='활성 대상';
    }

    const projects=document.querySelector('#projects');
    if(projects){
      projects.querySelector('h1').textContent='활성 대상';
      projects.querySelector('.lead').textContent='OPEN 이슈의 현재 상태와 다음 행동을 확인';
    }

    const search=document.querySelector('#search');
    if(search){
      search.querySelector('h1').textContent='현재 이슈 검색';
      search.querySelector('.lead').textContent='현재 활성 이슈에서 발주번호·고객사·모델·내용 검색';
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
    console.warn('REAL semantic compatibility fix skipped',e);
  }
})();
