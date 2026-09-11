// REAL 0.7 LIVE FOCUS — semantic null-progress fix.
(() => {
  const safePct=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Math.max(0,Math.min(100,Number(v))):null);
  const progressHtml=x=>{
    const plan=safePct(x.progressPlan??x.planConsumption??x.progress);
    const actual=safePct(x.progressActual??x.physicalCompletion);
    const line=(label,value,cls='')=>`<div class="focus-progress-row ${cls}"><span>${label}</span><div class="focus-bar"><span style="width:${value===null?0:value}%"></span></div><b>${value===null?'—':value+'%'}</b></div>`;
    return `<div class="focus-progress">${line('계획',plan)}${line('실제',actual,'actual')}</div>`;
  };
  projectCard=function(x){
    const blocked=Boolean(x.blocked||x.flowBlocked||x.assemblyReady==='BLOCKED');
    const current=x.currentProcess||x.state||'상태 확인';
    const next=x.nextGate||'다음 공정 확인';
    const reason=(x.riskReasons||[]).join(' · ')||x.riskReason||x.reason||'';
    return `<article class="focus-card">
      <div class="focus-card-top"><div><div class="focus-id">${esc(x.job||'')}</div><div class="focus-title">${esc(x.customer||'-')}</div><div class="focus-sub">${esc(x.device||'모델 미표시')}</div></div><div class="focus-badges"><span class="focus-risk ${esc(x.grade||'안정')}">${esc(x.grade||'안정')}</span><span class="focus-due">${esc(x.dDay||x.shipment||'납기 확인')}</span>${blocked?'<span class="focus-block">멈춤</span>':''}</div></div>
      <div class="focus-flow"><div><small>현재</small><b>${esc(current)}</b></div><span class="focus-arrow">→</span><div><small>다음</small><b>${esc(next)}</b></div></div>
      ${reason?`<div class="focus-reason">${esc(reason)}</div>`:''}
      <div class="focus-meta">${progressHtml(x)}<button class="project-open focus-detail" data-job="${esc(x.job||'')}">상세</button></div>
    </article>`;
  };
})();
