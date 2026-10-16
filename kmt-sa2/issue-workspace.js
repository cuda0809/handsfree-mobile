// Text issues and photo records are separate lanes. Photos never become today's issue text.
function issuePlanProgress(x){
 const rows=(x.planTimeline||[]).filter(r=>r.date&&r.process).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const grouped=new Map();rows.forEach(r=>{if(!grouped.has(r.process))grouped.set(r.process,[]);grouped.get(r.process).push(r.date);});
 if(!grouped.size)return '<p class="note">확인된 생산계획 없음 · 임의 공정은 표시하지 않습니다.</p>';
 const fields={'조립':'assemblyState','전장':'electricalState','프로그램':'programState','검수':'inspectionState','출고':'deliveryState','자재':'materialState'};
 const processKey=v=>/테스트|시험/.test(v||'')?'테스트':/검수/.test(v||'')?'검수':/마감/.test(v||'')?'마감조립':/프로그램/.test(v||'')?'프로그램':/전장|배선/.test(v||'')?'전장':/조립/.test(v||'')?'조립':/출고|납품/.test(v||'')?'출고':/자재|입고/.test(v||'')?'자재':'';
 const current=processKey(x.state),fresh=!planReadStale;
 return '<div class="issue-plan-progress" aria-label="생산계획 기준 공정 진행도">'+Array.from(grouped,([process,dates])=>{
  const completed=v=>/완료/.test(String(v||''))&&!/미완료|예정|아님|대기|취소|여부/.test(String(v||''));
  const field=x[fields[process]],same=!!current&&processKey(process)===current;
  const done=same?completed(x.state):completed(field)&&(!processKey(field)||processKey(field)===processKey(process));
  const status=done?'완료':same?'진행':'예정';
  return '<div class="issue-plan-stage '+(done?'done':status==='진행'?'now':'future')+'"><b>'+esc(process)+'</b><span>'+esc(status)+'</span><small>'+esc(dates[0])+(dates.length>1?' ~ '+esc(dates.at(-1)):'')+'</small></div>';
 }).join('')+'</div>'+(!fresh?'<small class="note">이전 계획 표시 · 최신 계획 확인 필요</small>':'');
}
const issueDecisionDrafts=new Map();
function issueDecision(key,text){const d=issueDecisionDrafts.get(String(key));return d?.text===text?d.state:'';}
function issueContextPreview(key,scope=main){
 const field=scope.querySelector('[data-unified-text="'+key+'"]'),panel=scope.querySelector('[data-unified-preview="'+key+'"]');if(!field||!panel)return;
 const text=field.value.trim(),x=todayIssueTarget(key);if(!text||!x){panel.textContent='입력 내용을 공정·기존 기록과 대조합니다.';return;}
 const d=HfIssueContext.resolve(text,x),chosen=issueDecision(key,text);
 panel.innerHTML='<b>'+esc(d.label)+'</b>'+(d.facts.length?'<ul>'+d.facts.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul>':'')+
  (d.needsDecision?'<label>반영할 공정<select data-context-choice="'+esc(key)+'"><option value="">선택하세요</option><option value="상태 유지">내용만 기록 · 공정 유지</option>'+d.candidates.map(v=>'<option value="'+esc(v)+'"'+(chosen===v?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label><small>선택 결과도 원문과 함께 이력에 남습니다.</small>':'');
 const select=panel.querySelector('select');if(select){select.value=chosen;select.onchange=()=>issueDecisionDrafts.set(String(key),{text,state:select.value});}
}
previewUnifiedEvent=issueContextPreview;
