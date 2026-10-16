// Text issues and photo records are separate lanes. Photos never become today's issue text.
function issuePlanProgress(x){
 const processKey=v=>/테스트|시험/.test(v||'')?'테스트':/검수/.test(v||'')?'검수':/마감/.test(v||'')?'마감조립':/프로그램/.test(v||'')?'프로그램':/전장|배선/.test(v||'')?'전장':/조립/.test(v||'')?'조립':/출고|납품/.test(v||'')?'출고':'';
 const order=['조립','전장','프로그램','마감조립','테스트','검수','출고'];
 const fields={'조립':'assemblyState','전장':'electricalState','프로그램':'programState','마감조립':'finishingState','테스트':'testState','검수':'inspectionState','출고':'deliveryState'};
 const current=processKey(x.state),present=new Set((x.planTimeline||[]).map(r=>processKey(r.process)).filter(Boolean));
 // An actual recorded phase remains visible even when its plan date is absent.
 if(current)present.add(current);
 const completed=v=>/완료/.test(String(v||''))&&!/미완료|예정|아님|대기|취소|여부/.test(String(v||''));
 order.forEach(name=>{if(completed(x[fields[name]])&&(!processKey(x[fields[name]])||processKey(x[fields[name]])===name))present.add(name);});
 const stages=order.filter(name=>present.has(name));
 if(!stages.length)return '<p class="note">공정 확인 필요</p>';
 return '<div class="issue-plan-progress" aria-label="공정 진행도">'+stages.map(name=>{
  const field=x[fields[name]],same=name===current;
  const done=same?completed(x.state):completed(field)&&(!processKey(field)||processKey(field)===name);
  const status=same?(done?'여기까지 완료':/예정/.test(x.state||'')?'예정':/대기/.test(x.state||'')?'작업 대기':'진행 중'):done?'완료':'';
  return '<div class="issue-plan-stage '+(same?'now ':done?'done ':'future ')+(same&&done?'done':'')+'"'+(same?' aria-current="step"':'')+'><b>'+esc(name==='마감조립'?'마감':name)+'</b>'+(status?'<span>'+esc(status)+'</span>':'')+'</div>';
 }).join('')+'</div>'+(!current?'<small class="note">현재 공정 확인 필요</small>':'');
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
