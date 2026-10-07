/* Pure production-plan rules. Plans never establish actual completion. */
(function(root){
 let seoulDayFormatter;
 function today(value=new Date()){
  if(!seoulDayFormatter)seoulDayFormatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
  return seoulDayFormatter.format(value);
 }
 function day(v){
  const s=String(v||'').trim();
  if(/^\d{5}(?:\.\d+)?$/.test(s))return new Date(Date.UTC(1899,11,30)+Math.floor(Number(s))*86400000).toISOString().slice(0,10);
  const m=s.match(/^(\d{2}|20\d{2})[-/.]\s*(\d{1,2})[-/.]\s*(\d{1,2})$/);
  if(!m)return '';
  const y=m[1].length===2?'20'+m[1]:m[1],d=y+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
  const parsed=new Date(d+'T00:00:00Z');
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===d?d:'';
 }
 function classify(x,today){
  const state=String(x.state||''),delivery=String(x.deliveryState||'');
  const actual=day(x.actualDelivery),complete=[state,delivery].some(s=>/출고\s*완료|납품\s*완료/.test(s)&&!/예정|계획|취소|미완료|아님|철회/.test(s));
  if((actual&&actual<=today)||complete)return '출고완료';
  if(/출고\s*대기|납품\s*대기|보관\s*중/.test(state+' '+delivery))return '출고대기';
  if(x.productionEvidence&&['진행 중','작업 예정','출고대기','확인 필요'].includes(x.productionEvidence.status))return x.productionEvidence.status;
  // Only explicit current work is evidence; a calendar entry or a due date is not.
  if(/(?:조립|전장|프로그램|검수|테스트|시험|작업|마무리).*(?:진행|작업\s*중)/.test(state)&&!/예정|진행\s*예정/.test(state))return '진행 중';
  const dates=(x.planTimeline||[]).filter(r=>!/출고|납품/.test(r.process||'')).map(r=>day(r.date)).filter(Boolean);
  if(dates.some(d=>d>=today))return '작업 예정';
  return '확인 필요';
 }
 function resolve(records){
  const list=(records||[]).filter(r=>r&&day(r.date));
  const months=[...new Set(list.map(r=>r.sourceMonth).filter(Boolean))].sort(),month=months.at(-1)||'';
  const current=list.filter(r=>!month||r.sourceMonth===month);
  // Explicit source-verified monthly snapshots supersede collection rows, not history.
  const snapshots=current.filter(r=>String(r.recordId||'').startsWith('BVERIFIED|'));
  const revision=snapshots.map(r=>String(r.recordId).split('|')[1]).sort().at(-1);
  const verified=snapshots.filter(r=>String(r.recordId).split('|')[1]===revision);
  if(verified.some(r=>typeof r.status!=='string'||!r.sourceRef))throw Error('plan_provenance_not_supported');
  const selected=verified.length?verified:current;
  const timeline=selected.filter(r=>r.process).map(r=>({...r,date:day(r.date)}))
   .filter((r,i,a)=>a.findIndex(v=>v.date===r.date&&v.process===r.process)===i)
   .sort((a,b)=>a.date.localeCompare(b.date)||a.process.localeCompare(b.process));
  const dates=re=>timeline.filter(r=>re.test(r.process)).map(r=>r.date);
  return {planAssembly:dates(/^(?!.*마감).*조립/)[0]||'',planElectrical:dates(/전장|전기/)[0]||'',
   planProgram:dates(/프로그램|프로그래밍/)[0]||'',planFinishing:dates(/마감\s*조립/)[0]||'',planInspection:dates(/검수|테스트|시험|FAT/).at(-1)||'',
   planDelivery:dates(/출고|납품/).at(-1)||'',planSourceMonth:month,
   planTimeline:timeline.map(r=>({date:r.date,process:r.process,sourceMonth:r.sourceMonth||''})),
   planHistory:list.filter(r=>r.process).map(r=>({recordId:r.recordId||'',date:day(r.date),process:r.process,sourceMonth:r.sourceMonth||'',sourceRef:r.sourceRef||'',current:selected.includes(r)})),
   planSourceVerified:verified.length>0,
   productionEvidence:verified.find(r=>!r.process&&['진행 중','작업 예정','출고대기','확인 필요'].includes(r.status))||null};
 }
 function manufacturingNow(x,today){
  const c=classify(x,today);
  if(c==='출고완료'||c==='출고대기'||x.productionEvidence?.status==='확인 필요')return false;
  // Source-verified actual work is separate from calendar-only stages.
  // It remains fabrication when Core shows materials receipt or an
  // intermediate stage is complete and follow-up fabrication remains.
  const evidence=x.productionEvidence;
  if(x.planSourceVerified===true&&evidence?.status==='진행 중'&&
   String(evidence.recordId||'').startsWith('BVERIFIED|')&&
   evidence.sourceMonth===today.slice(0,7)&&day(evidence.date)&&day(evidence.date)<=today&&
   /실제 진행 근거\s*:\s*\S/.test(String(evidence.sourceRef||''))&&
   !/제작\s*(?:완료|종료)|작업\s*(?:중단|취소)/.test(String(x.state||'')))return true;
  // A schedule label or generic pre-delivery finishing is not evidence of fabrication.
  // Partial assembly can continue while other parts are awaited.
  return [x.state,x.currentIssue,x.recentEvent].some(v=>String(v||'').split(/[\n;]+/).some(line=>{
   if(/연구소|출고\s*완료|납품\s*완료/.test(line))return false;
   return /(?:조립|전장|배선|프로그램|검수|가공|용접|구동테스트)\s*(?:작업\s*)?(?:진행(?:\s*중)?|중)(?!\s*(?:예정|계획|아님|취소|중단))/.test(line)&&!/진행\s*(?:예정|계획|아님|취소|중단)/.test(line);
  }));
 }
 function nextAction(x,today){
  const manual=String(x.nextAction||'').trim();
  if(manual&&manual!=='미정'&&manual!=='미등록')return manual;
  if(classify(x,today)==='출고완료')return '출고완료 · 이력 확인';
  if(!x.planSourceVerified)return '다음 행동 확인 필요';
  const stage=v=>/출고|납품/.test(v)?6:/검수|테스트|시험|FAT/.test(v)?5:/마감\s*조립/.test(v)?4:/프로그램|프로그래밍/.test(v)?3:/전장|배선|전기/.test(v)?2:/조립/.test(v)?1:0;
  const current=String(x.state||''),level=stage(current),complete=/완료/.test(current)&&!/미완료|예정|계획|아님/.test(current);
  const floor=/출고\s*대기|보관\s*중/.test(current)?6:level+(complete?1:0);
  const rows=(x.planTimeline||[]).filter(r=>day(r.date)&&stage(r.process)>=floor)
   .sort((a,b)=>stage(a.process)-stage(b.process)||day(a.date).localeCompare(day(b.date)));
  const r=rows[0];if(!r)return '다음 행동 확인 필요';
  const date=day(r.date);
  return r.process+' · '+date+(date<today?' (일정 경과 · 진행 확인)':'');
 }
 function jobYear(orderId){
  const m=String(orderId||'').match(/^(?:LAB-)?(\d{2})(\d{2})(\d{2})[A-Z]-\d+(?:-\d+)?$/);
  return m&&day('20'+m[1]+'-'+m[2]+'-'+m[3])?'20'+m[1]:'';
 }
 function completedGroups(rows,query='',currentYear=today().slice(0,4)){
  const groups=new Map();
  for(const x of rows){const year=jobYear(x.orderId)||'연도 미확인';if(!groups.has(year))groups.set(year,[]);groups.get(year).push(x);}
  return [...groups].sort(([a],[b])=>a===currentYear?-1:b===currentYear?1:b.localeCompare(a)).map(([year,items])=>({year,items,open:!!query||year===currentYear}));
 }
 const rules={day,today,classify,resolve,manufacturingNow,nextAction,jobYear,completedGroups};root.HfProductionRules=rules;
 if(typeof module==='object'&&module.exports)module.exports=rules;
})(typeof window==='object'?window:globalThis);
