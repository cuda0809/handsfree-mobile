(function(root){
 'use strict';
 const stages=['조립','전장','프로그램','마감조립','테스트','검수','출고'];
 const statuses=['진행','완료','대기','수정대기'];
 function selection(process,status){return stages.includes(process)&&statuses.includes(status)?process+' '+status:'';}
 function stage(v){v=String(v||'').replace(/\s/g,'');return /출고|납품/.test(v)?6:/검수/.test(v)?5:/테스트|시험/.test(v)?4:/마감/.test(v)?3:/프로그램/.test(v)?2:/전장|배선/.test(v)?1:/조립/.test(v)?0:-1;}
 function resolve(raw,current){
  raw=String(raw||'').trim();current=current||{};
  const result={type:'NOTE',state:'',status:'OPEN',changesState:false,natural:true,needsDecision:false,candidates:[],facts:[],label:'내용 기록 · 공정 유지'};
  const decision=raw.match(/(?:^|\n)\[공정 확인\]\s*(상태 유지|(?:조립|전장|프로그램|마감조립|검수|테스트|출고) (?:진행|완료|대기|수정대기))\s*$/);
  if(decision){result.facts.push('입력자가 공정을 확인함');if(decision[1]==='상태 유지')return {...result,explicitDecision:true};const delivery=decision[1]==='출고 완료';return {...result,type:delivery?'DELIVERY':'PROGRESS',status:delivery?'CLOSED':'OPEN',state:decision[1],changesState:true,explicitDecision:true,label:'확인한 공정 · '+decision[1]};}
  const correction=raw.match(/(마감\s*조립|프로그램|전장|조립|검수|테스트)\s*(진행\s*중|진행|완료|대기)\s*(?:으?로)\s*(?:수정|정정|변경)/);
  if(correction&&!/예정|여부|확인\s*필요/.test(raw)){const state=correction[1].replace(/\s/g,'')+' '+correction[2].replace(/\s*중$/,'');return {...result,type:'PROGRESS',state,changesState:true,explicitDecision:true,evidenceText:correction[0],label:'명시한 정정 · '+state};}
  const actual=[],uncertain=[];
  const parts=raw.replace(/(했으며|했고|끝났고|완료하고)/g,'$1;').split(/\r?\n|;|\/(?=\s*[가-힣])|[,，]|그리고/).map(v=>v.trim()).filter(Boolean);
  for(const part of parts){
   if(/입고|입하|수령/.test(part)&&/완료|됐|되었|받았|들어왔/.test(part))result.facts.push('부품·자재 수령: '+part);
   const m=part.match(/(마감\s*조립|마감|프로그램(?:밍)?|전장|배선|조립|검수|(?:리크|누설|구동)?\s*테스트|시험|출고|납품)\s*(?:작업\s*)?(완료|끝났|끝냄|마쳤|끝|진행\s*중|진행|중|하고\s*있|시작|예정|대기|수정\s*대기)/);
   if(!m){if(/대기|미입고|지연|불량|문제|고장|이상|리크|수정/.test(part))result.facts.push(part);continue;}
   if(/예정|계획|내일|다음\s*주|추후|완료\s*후|끝나면/.test(part)){result.facts.push('예정·조건: '+part);continue;}
   if(/아직|미완료|못했|안\s*했|안\s*됐|아님|아니|하지\s*않|여부|확인\s*필요/.test(part)){uncertain.push(part);result.candidates.push(m[1].replace(/\s/g,'')+' 진행',m[1].replace(/\s/g,'')+' 완료');continue;}
   const process=/테스트|시험/.test(m[1])?'테스트':/배선/.test(m[1])?'전장':m[1].replace(/\s/g,'').replace('프로그래밍','프로그램').replace(/^마감$/,'마감조립');
   if(/출고|납품/.test(process)){uncertain.push(part);continue;}
   const state=/완료|끝|마쳤/.test(m[2])?'완료':/수정\s*대기/.test(m[2])?'수정대기':/대기/.test(m[2])?'대기':'진행';
   actual.push({state:process+' '+state,stage:stage(process),ongoing:state!=='완료',part});
  }
  const ongoing=actual.filter(x=>x.ongoing),pool=ongoing.length?ongoing:actual;
  const unique=[...new Map(pool.map(x=>[x.state,x])).values()];
  result.facts.push(...actual.map(x=>x.part));
  if(unique.length===1&&!uncertain.length){
   const c=unique[0],from=stage(current.state);
   if(c.stage<from&&!/재작업|재조립|다시|되돌|복귀/.test(raw)){result.needsDecision=true;result.candidates=[c.state];result.label='이전 공정보다 앞선 기록 · 현재 공정 확인';}
   else return {...result,type:c.stage===4||c.stage===5?'INSPECTION':'PROGRESS',state:c.state,changesState:true,nextStage:stages[c.stage+1]||'',evidenceText:c.part,label:'공정 해석 · '+c.state};
  }else if(unique.length>1||uncertain.length){result.needsDecision=true;result.candidates=[...result.candidates,...unique.map(x=>x.state)];result.label='공정 해석이 나뉩니다 · 아래에서 바로 결정하세요';}
  else if(result.facts.length){result.type='ISSUE';result.label='입고·이슈 내용 기록 · 공정 유지';}
  if(!actual.length&&!uncertain.length&&/완료|끝났|마쳤|진행|끝냄/.test(raw)&&!/(입고|수령|부품|자재|가공품|예정)/.test(raw)){const phase=stage(current.state);result.needsDecision=true;result.label='대상 공정 확인 필요';if(phase>=0)result.candidates=[...(phase<6?[stages[phase]+' 완료']:[]),...(phase<5?[stages[phase+1]+' 진행']:[])];}
  const planned=(current.planTimeline||[]).map(x=>String(x.process||'')).filter(v=>stages.includes(v));
  if(result.needsDecision)result.candidates=[...new Set([...result.candidates,...planned.map(v=>v+' 진행')])].slice(0,8);
  return result;
 }
 const api={resolve,stage,stages,statuses,selection};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HfIssueContext=api;
})(typeof globalThis!=='undefined'?globalThis:this);

