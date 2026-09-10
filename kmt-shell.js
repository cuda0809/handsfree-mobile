(function(){
  const qs=(s,r=document)=>r.querySelector(s);

  function setLoginVisible(show){
    const login=qs('#loginScreen');
    const app=qs('#appShell');
    if(show){
      login.style.display='block';
      app.classList.add('locked');
      app.setAttribute('aria-hidden','true');
      document.body.style.overflow='hidden';
    }else{
      login.style.display='none';
      app.classList.remove('locked');
      app.setAttribute('aria-hidden','false');
      document.body.style.overflow='';
      window.scrollTo(0,0);
      setTimeout(refreshChrome,80);
    }
  }

  function loginAs(label){
    sessionStorage.setItem('kmt_hf_session','1');
    sessionStorage.setItem('kmt_hf_user',label||'UI TEST');
    setLoginVisible(false);
  }

  function refreshChrome(){
    try{
      if(typeof APP==='undefined') return;
      const mode=String(APP.mode||'').toLowerCase();
      const pill=qs('#kmtRuntimeMode');
      if(pill){
        const live=mode.includes('live')||mode.includes('google');
        pill.textContent=live?'OS v3 LIVE':'REFERENCE · READ ONLY';
        pill.classList.toggle('live',live);
      }

      const m=APP.metrics||{};
      const available=Number(m.capacityAvailable ?? m.availableFTE);
      const planned=Number(m.capacityPlanned ?? m.plannedFTE);
      const gapRaw=m.capacityGap ?? m.capaGap;
      const gap=gapRaw===null||gapRaw===undefined||gapRaw===''?NaN:Number(gapRaw);
      const text=qs('#capaText'), badge=qs('#capaBadge'), bar=qs('#capaBar'), sub=qs('#capaSub');

      if(Number.isFinite(available)&&Number.isFinite(planned)&&planned>0){
        const pct=Math.max(0,Math.min(100,Math.round(available/planned*100)));
        text.textContent=`가용 ${available.toFixed(1)} / 계획 ${planned.toFixed(1)} FTE`;
        bar.style.width=pct+'%';
        const g=available-planned;
        badge.textContent=(g>0?'+':'')+g.toFixed(1)+' FTE';
        badge.className='capa-badge '+(g<0?'warn':'ok');
        sub.textContent=`오늘 인력 가용률 ${pct}% · 실제 운영 데이터 기준`;
      }else if(Number.isFinite(gap)){
        text.textContent=`오늘 인력 GAP ${gap>0?'+':''}${gap} FTE`;
        bar.style.width=gap<0?'68%':'100%';
        badge.textContent=(gap>0?'+':'')+gap+' FTE';
        badge.className='capa-badge '+(gap<0?'warn':'ok');
        sub.textContent='가용/계획 FTE 상세값은 LIVE CAPA 소스 연결 시 표시됩니다.';
      }else{
        text.textContent='LIVE 연결 후 자동 계산';
        badge.textContent='대기';
        badge.className='capa-badge';
        bar.style.width='0%';
        sub.textContent='운영 인력 데이터와 연결되면 계획 대비 GAP을 표시합니다.';
      }
    }catch(e){}
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const form=qs('#loginForm');
    const note=qs('#loginNote');
    form?.addEventListener('submit',e=>{
      e.preventDefault();
      const id=qs('#loginId')?.value.trim();
      const pw=qs('#loginPw')?.value.trim();
      if(!id||!pw){
        note.textContent='UI 테스트 단계입니다. 아이디와 비밀번호를 입력하거나 “UI 테스트로 입장”을 눌러주세요.';
        note.classList.add('error');
        return;
      }
      loginAs(id);
    });
    qs('#testLoginBtn')?.addEventListener('click',()=>loginAs('UI TEST'));
    qs('#logoutBtn')?.addEventListener('click',()=>{
      sessionStorage.removeItem('kmt_hf_session');
      sessionStorage.removeItem('kmt_hf_user');
      qs('#loginPw').value='';
      setLoginVisible(true);
    });
    qs('#homeGrowBtn')?.addEventListener('click',()=>qs('#growNav')?.click());
    qs('#homeSearchBtn')?.addEventListener('click',()=>{
      const btn=document.querySelector('.bottom button[data-page="search"]');
      btn?.click();
      setTimeout(()=>qs('#globalSearch')?.focus(),100);
    });

    setLoginVisible(sessionStorage.getItem('kmt_hf_session')!=='1');
    refreshChrome();
    setInterval(refreshChrome,1200);
  });
})();
