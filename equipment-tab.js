(()=>{
  const $=s=>document.querySelector(s);
  const metricArticles=()=>Array.from(document.querySelectorAll('.metrics article'));
  const chipButtons=()=>Array.from(document.querySelectorAll('.chips button'));
  const bottomTabs=()=>Array.from(document.querySelectorAll('.bottom button[data-tab]'));
  const defaults={
    title:'오늘 운영현황',
    search:'발주번호 · 고객사 · 장비 검색',
    metricLabels:['오늘 작업','긴급','주의/이슈','타부서지원'],
    metricSmall:['현재 공정','우선 확인','현재 유효','월 누적'],
    chipText:['전체','오늘 작업','긴급','주의'],
    focusLabel:'오늘 결정 필요',
    focusButton:'보기'
  };
  let equipmentMode=false;
  let defaultSync='';

  function setMetricCopy(labels,small){
    metricArticles().forEach((a,i)=>{
      const span=a.querySelector('span');
      const sm=a.querySelector('small');
      if(span&&labels[i]!=null) span.textContent=labels[i];
      if(sm&&small[i]!=null) sm.textContent=small[i];
    });
  }

  function setChipCopy(texts){
    chipButtons().forEach((b,i)=>{if(texts[i]!=null)b.textContent=texts[i]});
  }

  function applyEquipment(){
    if(!equipmentMode){
      const sync=$('#syncText');
      if(sync) defaultSync=sync.textContent;
    }
    equipmentMode=true;
    const rows=(typeof STATE!=='undefined'&&STATE&&Array.isArray(STATE.data))?STATE.data:[];
    const total=rows.length;
    const active=rows.filter(x=>x.state&&x.state!=='오늘 계획 없음').length;
    const issue=rows.filter(x=>['긴급','주의'].includes(x.grade)).length;
    const inspected=rows.filter(x=>String(x.inspection||'').includes('완료')).length;

    const title=$('.headrow h1'); if(title) title.textContent='장비 현황';
    const sync=$('#syncText'); if(sync) sync.textContent=((typeof live!=='undefined'&&live)?'LIVE':'SNAPSHOT')+' · 장비 통합조회';
    const search=$('#search'); if(search) search.placeholder='고객사 · 장비 · 발주번호 검색';
    setMetricCopy(['전체 장비','진행 중','이슈 장비','검수 완료'],['현재 운영','오늘 작업 있음','긴급·주의','검수 완료']);
    const values=metricArticles().map(a=>a.querySelector('b'));
    if(values[0]) values[0].textContent=total+'대';
    if(values[1]) values[1].textContent=active+'대';
    if(values[2]) values[2].textContent=issue+'대';
    if(values[3]) values[3].textContent=inspected+'대';
    setChipCopy(['전체 장비','작업 중','긴급','주의']);
    const focusLabel=$('.focus small'); if(focusLabel) focusLabel.textContent='장비 빠른 확인 · 자동반영 테스트';
    const focusText=$('#focusText'); if(focusText) focusText.textContent='검색하거나 장비 카드를 선택해 상세 상태를 확인';
    const focusBtn=$('#focusBtn');
    if(focusBtn){
      focusBtn.textContent='전체보기';
      focusBtn.onclick=()=>{
        if(search){search.value='';search.blur();}
        FILTER='all';
        if(typeof render==='function') render();
      };
    }
  }

  function restoreDefault(){
    equipmentMode=false;
    const title=$('.headrow h1'); if(title) title.textContent=defaults.title;
    const sync=$('#syncText'); if(sync&&defaultSync) sync.textContent=defaultSync;
    const search=$('#search'); if(search) search.placeholder=defaults.search;
    setMetricCopy(defaults.metricLabels,defaults.metricSmall);
    setChipCopy(defaults.chipText);
    const focusLabel=$('.focus small'); if(focusLabel) focusLabel.textContent=defaults.focusLabel;
    const focusBtn=$('#focusBtn'); if(focusBtn) focusBtn.textContent=defaults.focusButton;
  }

  const originalRender=(typeof render==='function')?render:null;
  if(originalRender){
    const wrappedRender=function(){
      originalRender();
      if(equipmentMode) applyEquipment();
    };
    window.render=wrappedRender;
    try{render=wrappedRender;}catch(e){}
  }

  bottomTabs().forEach(btn=>{
    const original=btn.onclick;
    btn.onclick=function(ev){
      if(btn.dataset.tab==='equipment'){
        bottomTabs().forEach(x=>x.classList.remove('active'));
        btn.classList.add('active');
        const search=$('#search'); if(search){search.value='';search.blur();}
        FILTER='all';
        if(typeof render==='function') render();
        applyEquipment();
        window.scrollTo({top:0,behavior:'smooth'});
        return;
      }
      restoreDefault();
      if(typeof original==='function') original.call(btn,ev);
    };
  });
})();