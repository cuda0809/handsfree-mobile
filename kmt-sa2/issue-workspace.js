// Text issues and photo records are separate lanes. Photos never become today's issue text.
function issuePlanProgress(x){
 const processKey=v=>/테스트|시험/.test(v||'')?'테스트':/검수/.test(v||'')?'검수':/마감/.test(v||'')?'마감조립':/프로그램/.test(v||'')?'프로그램':/전장|배선/.test(v||'')?'전장':/조립/.test(v||'')?'조립':/출고|납품/.test(v||'')?'출고':'';
 const order=['조립','전장','프로그램','마감조립','테스트','검수','출고'];
 const fields={'조립':'assemblyState','전장':'electricalState','프로그램':'programState','마감조립':'finishingState','테스트':'testState','검수':'inspectionState','출고':'deliveryState'};
 const current=processKey(x.state);
 const completed=v=>/완료/.test(String(v||''))&&!/미완료|예정|아님|대기|취소|여부/.test(String(v||''));
 const stages=order;
 return '<div class="issue-plan-progress" aria-label="공정 진행도">'+stages.map(name=>{
  const field=x[fields[name]],same=name===current;
  const done=same?completed(x.state):completed(field)&&(!processKey(field)||processKey(field)===name);
  return '<div class="issue-plan-stage '+(same?'now ':done?'done ':'future ')+(same&&done?'done':'')+'"'+(same?' aria-current="step"':'')+'><b>'+esc(name)+'</b>'+'</div>';
 }).join('')+'</div>'+(!current?'<small class="note">현재 공정 확인 필요</small>':'');
}
const issueDecisionDrafts=new Map();
function issueDecision(key,text){const d=issueDecisionDrafts.get(String(key));return d?.text===text?d.state:'';}
function issueDecisionIncomplete(key,text){const d=issueDecisionDrafts.get(String(key));return d?.text===text&&d.incomplete===true;}
function issueContextPreview(key,scope=main){
 const field=scope.querySelector('[data-unified-text="'+key+'"]'),panel=scope.querySelector('[data-unified-preview="'+key+'"]');if(!field||!panel)return;
 const text=field.value.trim(),x=todayIssueTarget(key);if(!text||!x){panel.textContent='입력 내용을 공정·기존 기록과 대조합니다.';return;}
 const d=HfIssueContext.resolve(text,x),chosen=issueDecision(key,text);
 panel.innerHTML='<b>'+esc(chosen?'직접 지정 · '+chosen:d.label)+'</b>'+(d.facts.length?'<ul>'+d.facts.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul>':'')+
  '<div class="issue-process-fields"><label>실제 공정<select data-context-process="'+esc(key)+'" aria-label="실제 공정"><option value="">'+(d.needsDecision?'공정을 선택하세요':'자동 해석 사용')+'</option><option value="상태 유지">내용만 기록 · 현재 공정 유지</option>'+HfIssueContext.stages.map(v=>'<option value="'+esc(v)+'">'+esc(v==='출고'?'출고 · 납품':v)+'</option>').join('')+'</select></label>'+
  '<label>진행상태<select data-context-status="'+esc(key)+'" aria-label="진행상태"><option value="">상태를 선택하세요</option>'+HfIssueContext.statuses.map(v=>'<option value="'+esc(v)+'">'+esc(v==='진행'?'진행 중':v==='수정대기'?'수정 대기':v)+'</option>').join('')+'</select></label></div><small>실제 작업한 공정과 상태를 지정하세요. 발생일은 내용에 함께 적어주세요. 원문과 선택 결과를 함께 기록하고 서버 재조회로 반영을 확인합니다.</small><p data-context-summary role="status"></p>';
 const process=panel.querySelector('[data-context-process]'),status=panel.querySelector('[data-context-status]'),summary=panel.querySelector('[data-context-summary]');
 process.value=chosen==='상태 유지'?chosen:chosen.split(' ')[0]||'';status.value=chosen.split(' ')[1]||'';
 status.disabled=!process.value||process.value==='상태 유지';
 const change=()=>{
  status.disabled=!process.value||process.value==='상태 유지';
  const state=process.value==='상태 유지'?'상태 유지':HfIssueContext.selection(process.value,status.value);
  issueDecisionDrafts.set(String(key),{text,state,incomplete:!!process.value&&!state});
  panel.querySelector('b').textContent=state?'직접 지정 · '+state:d.label;
  summary.textContent=state?'저장할 상태 · '+(state==='상태 유지'?'현재 공정 유지':state):process.value?'진행상태도 선택하세요.':d.needsDecision?'실제 공정과 진행상태를 선택하세요.':'자동 해석 · '+d.label;
 };
 process.onchange=()=>{if(status.disabled)status.value='';change();};status.onchange=change;
}
previewUnifiedEvent=issueContextPreview;

