/* Pure production-plan rules. Plans never establish actual completion. */
(function(root){
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
  return {planAssembly:dates(/조립/)[0]||'',planElectrical:dates(/전장|전기/)[0]||'',
   planProgram:dates(/프로그램/)[0]||'',planInspection:dates(/검수|테스트|시험|FAT/).at(-1)||'',
   planDelivery:dates(/출고|납품/).at(-1)||'',planSourceMonth:month,
   planTimeline:timeline.map(r=>({date:r.date,process:r.process,sourceMonth:r.sourceMonth||''})),
   planHistory:list.filter(r=>r.process).map(r=>({date:day(r.date),process:r.process,sourceMonth:r.sourceMonth||''})),
   planSourceVerified:verified.length>0,
   productionEvidence:verified.find(r=>!r.process&&['진행 중','작업 예정','출고대기','확인 필요'].includes(r.status))||null};
 }
 const rules={day,classify,resolve};root.HfProductionRules=rules;
 if(typeof module==='object'&&module.exports)module.exports=rules;
})(typeof window==='object'?window:globalThis);
