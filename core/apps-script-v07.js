// HandsFree Mobile REAL 0.7 — Google Apps Script LIVE READ bridge.
// Vercel keeps the Web App URL + read token in server-only environment variables.
const EXPECTED_SCHEMA='HF_REAL_READ_V1';
const HEADER_CONTRACTS={
  product:['발주번호','고객사','제품/모델','납기','영업담당','설계담당','생산담당1 (정)','생산담당2 (부)','담당PM','상태','현재 진행률','관리비고'],
  work:['일자','구분','고객/현장','모델','업무내용','참여자','원문/메모','등록경로','확정여부'],
  issue:['Issue_ID','Opened_At','Type','Order_ID','고객/현장','모델','공정','Source_Event_ID','Status','Latest_Update','Resolution','Closed_At','Source_Row','Briefing_Active','Search_Key','Note'],
  change:['변경일','연도','월','발주번호','고객사','모델','공정','초기계획일','직전유효일','변경후유효일','이번증감일','누적증감일','연장일','단축일','변경유형','변경사유/내용','원문','업무이력행','현재유효','검색키'],
  capacity:['계획일','발주번호','고객','모델','납기','공정','마스터담당','최근실작업자','Crew_Source','Crew_FTE','당일이탈인원','직접결손FTE','팀가용FTE','당일계획수요FTE','팀부족FTE','영향기여일','위험등급','영향설명'],
  briefing:['우선순위','일자','구분','발주번호','고객/현장','모델','공정','계획대비','차이일','업무내용','참여자','법칙태그','결정필요','분석요약'],
  analysis90:['스냅샷일','연도','월','발주번호','고객사','제품/모델','등급','설계표시','설계일수','구매표시','구매일수','생산여유일','생산상태','최종검수','납기D-Day','병목/판정','담당PM','90일기준','고객납기','운영기준납기','지연사유/메모','월최신','일정변경건수','일정순변경일','일정연장일','일정단축일','일정변경요약','90일기준 시작일','설계 인계일/상태','설계편차일','구매시작일','구매완료일/상태','구매편차일','조립가능일','조립가능편차일','실적산출근거']
};
function configured(){return Boolean(process.env.HF_APPS_SCRIPT_URL&&process.env.HF_APPS_SCRIPT_TOKEN);}
function text(v){return String(v??'').trim();}
function norm(v){return text(v).toLowerCase().replace(/\s+/g,'').replace(/[()]/g,'');}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function bool(v){if(typeof v==='boolean')return v;const s=text(v).toUpperCase();return ['TRUE','1','Y','YES'].includes(s);}
function dateOnly(v){if(typeof v==='number'&&v>20000)return new Date(Math.round((v-25569)*86400000)).toISOString().slice(0,10);const s=text(v);if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{4})[./년 -]+(\d{1,2})[./월 -]+(\d{1,2})/);return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:null;}
function kstToday(){return new Date(Date.now()+9*3600000).toISOString().slice(0,10);}
function assertHeader(name,table,expected){const header=Array.isArray(table?.[0])?table[0]:null;if(!header)throw new Error(`${name} header row is missing`);const mismatch=[];expected.forEach((label,i)=>{if(text(header[i])!==text(label))mismatch.push(`${i+1}:${text(header[i])||'(blank)'}!=${label}`);});if(mismatch.length)throw new Error(`${name} header mismatch — ${mismatch.slice(0,4).join(', ')}`);}
function commonPattern(ids){const clean=[...new Set(ids.filter(Boolean))];if(clean.length===1)return clean[0];if(!clean.length)return null;let prefix=clean[0];for(const id of clean.slice(1)){let i=0;while(i<prefix.length&&i<id.length&&prefix[i]===id[i])i++;prefix=prefix.slice(0,i);}const cut=prefix.lastIndexOf('-');return cut>=0?prefix.slice(0,cut+1)+'*':null;}
function resolveProjectId(customer,model,projects){const c=norm(customer),m=norm(model);let matches=projects.filter(p=>norm(p.customer)===c&&(!m||norm(p.model)===m));if(!matches.length&&c)matches=projects.filter(p=>norm(p.customer)===c);return commonPattern(matches.map(p=>p.id));}
function inferProcess(summary,type){const s=`${type||''} ${summary||''}`;for(const p of ['자재수령','외주입고','가공/외주','조립','전장','프로그램','테스트','검수','출고','A/S','PT','인력'])if(s.includes(p))return p;if(/입고|자재/.test(s))return '자재/입고';if(/가공|수정/.test(s))return '가공/외주';return '기타';}
function lawTag(type){if(type==='일일작업')return'ACTUAL';if(type==='출고완료')return'DELIVERY';if(type==='일정변경')return'PLAN_CHANGE';if(type==='지연사유')return'DELAY_CAUSE';if(type==='불량발생')return'QUALITY_ISSUE';if(['출장','연차','반차'].includes(type))return'RESOURCE';if(['A/S','PT','타팀지원'].includes(type))return'SUPPORT';return null;}
function validateTables(t){assertHeader('제품마스터',t.productRows,HEADER_CONTRACTS.product);assertHeader('업무이력',t.workRows,HEADER_CONTRACTS.work);assertHeader('HF_DATA_이슈원장',t.issueRows,HEADER_CONTRACTS.issue);assertHeader('HF_DATA_일정변경누적',t.changeRows,HEADER_CONTRACTS.change);assertHeader('HF_VIEW_인력CAPA',t.capaRows,HEADER_CONTRACTS.capacity);assertHeader('HF_VIEW_브리핑소스',t.briefRows,HEADER_CONTRACTS.briefing);assertHeader('HF_DATA_90일분석이력',t.analysisRows,HEADER_CONTRACTS.analysis90);}
function buildSnapshot(payload){
  const t=payload.tables||{};validateTables(t);
  const projects=(t.productRows||[]).slice(1).filter(r=>r[0]).map(r=>({id:text(r[0]),customer:r[1]??null,model:r[2]??null,due:dateOnly(r[3])||(r[3]??null),sales:r[4]??null,design:r[5]??null,production:[r[6],r[7]].filter(Boolean),pm:r[8]??null,status:r[9]??null,progressText:r[10]??null,note:r[11]??null}));
  const events=(t.workRows||[]).slice(1).filter(r=>r[0]||r[1]||r[2]).map((r,i)=>{const type=text(r[1]),summary=r[4]??null;return{id:`EV-LIVE-${dateOnly(r[0])||'NA'}-${i+8}`,date:dateOnly(r[0]),projectId:resolveProjectId(r[2],r[3],projects),type,customer:r[2]??null,model:r[3]??null,process:inferProcess(summary,type),summary,participants:r[5]??null,raw:r[6]??null,inputPath:r[7]??null,confirmed:r[8]??null,lawTag:lawTag(type),source:'업무이력'};});
  const issues=(t.issueRows||[]).slice(1).filter(r=>r[0]).map(r=>({id:r[0],openedAt:dateOnly(r[1]),type:r[2],projectId:r[3],customer:r[4]??null,model:r[5]??null,process:r[6]??null,sourceEventId:r[7]??null,status:text(r[8]||'OPEN').toUpperCase(),latestUpdate:dateOnly(r[9]),resolution:r[10]??null,closedAt:dateOnly(r[11]),sourceRow:r[12]??null,briefingActive:bool(r[13]),searchKey:r[14]??null,note:r[15]??null}));
  const changes=(t.changeRows||[]).slice(1).filter(r=>r[0]||r[3]).map(r=>({date:dateOnly(r[0]),projectId:r[3]??null,customer:r[4]??null,model:r[5]??null,process:r[6]??null,initialPlan:dateOnly(r[7]),previousDate:dateOnly(r[8]),effectiveDate:dateOnly(r[9]),deltaDays:num(r[10]),cumulativeDays:num(r[11]),extendedDays:num(r[12]),shortenedDays:num(r[13]),changeType:r[14]??null,reason:r[15]??null,summary:r[15]??null,raw:r[16]??null,sourceRow:r[17]??null,current:bool(r[18]),searchKey:r[19]??null,source:'HF_DATA_일정변경누적'}));
  const capacity=(t.capaRows||[]).slice(1).filter(r=>r[0]||r[1]).map(r=>{const available=num(r[12]),demand=num(r[13]);return{date:dateOnly(r[0]),projectId:r[1]??null,customer:r[2]??null,model:r[3]??null,due:dateOnly(r[4]),process:r[5]??null,masterCrew:r[6]??null,recentWorkers:r[7]??null,crewSource:r[8]??null,crewFTE:num(r[9]),absent:r[10]??null,directLossFTE:num(r[11]),availableFTE:available,demandFTE:demand,shortageFTE:num(r[14]),gap:available-demand,impactDays:num(r[15]),risk:r[16]??null,summary:r[17]??null,source:'HF_VIEW_인력CAPA'};});
  const briefing=(t.briefRows||[]).slice(1).filter(r=>r[0]||r[1]||r[2]).map(r=>{const customer=r[4]??null,model=r[5]??null;return{priority:r[0]??null,date:dateOnly(r[1]),type:r[2]??null,projectId:r[3]||resolveProjectId(customer,model,projects),customer,model,process:r[6]??null,planComparison:r[7]??null,diffDays:r[8]===null||r[8]===undefined?null:num(r[8]),summary:r[9]??null,participants:r[10]??null,lawTag:r[11]??null,decisionRequired:bool(r[12]),analysis:r[13]??null,source:'HF_VIEW_브리핑소스'};});
  const analysis90=(t.analysisRows||[]).slice(1).filter(r=>r[0]||r[3]).map(r=>({snapshotDate:dateOnly(r[0]),projectId:r[3]??null,customer:r[4]??null,model:r[5]??null,grade:r[6]??null,designStatus:r[7]??null,designDays:num(r[8]),purchaseStatus:r[9]??null,purchaseDays:num(r[10]),productionSlackDays:r[11]===null||r[11]===undefined||r[11]===''?null:num(r[11]),productionStatus:r[12]??null,finalInspection:r[13]??null,dueText:r[14]??null,bottleneck:r[15]??null,pm:r[16]??null,baseline90:r[17]??null,customerDue:dateOnly(r[18])||(r[18]??null),operatingDue:dateOnly(r[19])||(r[19]??null),memo:r[20]??null,scheduleChangeCount:num(r[22]),scheduleNetDays:num(r[23]),scheduleExtendedDays:num(r[24]),scheduleShortenedDays:num(r[25]),scheduleSummary:r[26]??null,purchaseCompletion:r[31]??null,assemblyAvailableDate:dateOnly(r[33]),actualBasis:r[35]??null,source:'HF_DATA_90일분석이력'}));
  return {meta:{asOf:payload.today||kstToday(),fetchedAt:payload.generatedAt||new Date().toISOString(),bridge:'apps-script'},projects,events,issues,changes,capacity,briefing,analysis90};
}
async function loadSnapshot(){
  if(!configured())throw new Error('Apps Script bridge is not configured');
  const base=text(process.env.HF_APPS_SCRIPT_URL);if(!/^https:\/\//i.test(base))throw new Error('Apps Script URL must use HTTPS');
  const url=new URL(base);url.searchParams.set('token',process.env.HF_APPS_SCRIPT_TOKEN);url.searchParams.set('v','1');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const resp=await fetch(url,{redirect:'follow',headers:{accept:'application/json'},signal:controller.signal});
    const data=await resp.json().catch(()=>null);
    if(!resp.ok||!data)throw new Error(`Apps Script read failed: HTTP ${resp.status}`);
    if(data.ok!==true)throw new Error(`Apps Script read rejected: ${text(data.error)||'unknown error'}`);
    if(data.schema!==EXPECTED_SCHEMA)throw new Error(`Apps Script schema mismatch: ${text(data.schema)||'(missing)'}`);
    return buildSnapshot(data);
  } finally {clearTimeout(timer);}
}
module.exports={configured,loadSnapshot,buildSnapshot,HEADER_CONTRACTS};
