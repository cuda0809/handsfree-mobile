// HandsFree Mobile REAL 0.4 — authenticated Google Sheets read bridge.
// Adds the 90-day analysis ledger as read-only evidence for production readiness.
const crypto = require('crypto');
const SCOPE='https://www.googleapis.com/auth/spreadsheets.readonly';
const TOKEN_URL='https://oauth2.googleapis.com/token';
let tokenCache={token:null,expiresAt:0};

const HEADER_CONTRACTS={
  product:['발주번호','고객사','제품/모델','납기','영업담당','설계담당','생산담당1 (정)','생산담당2 (부)','담당PM','상태','현재 진행률','관리비고'],
  work:['일자','구분','고객/현장','모델','업무내용','참여자','원문/메모','등록경로','확정여부'],
  issue:['Issue_ID','Opened_At','Type','Order_ID','고객/현장','모델','공정','Source_Event_ID','Status','Latest_Update','Resolution','Closed_At','Source_Row','Briefing_Active','Search_Key','Note'],
  change:['변경일','연도','월','발주번호','고객사','모델','공정','초기계획일','직전유효일','변경후유효일','이번증감일','누적증감일','연장일','단축일','변경유형','변경사유/내용','원문','업무이력행','현재유효','검색키'],
  capacity:['계획일','발주번호','고객','모델','납기','공정','마스터담당','최근실작업자','Crew_Source','Crew_FTE','당일이탈인원','직접결손FTE','팀가용FTE','당일계획수요FTE','팀부족FTE','영향기여일','위험등급','영향설명'],
  briefing:['우선순위','일자','구분','발주번호','고객/현장','모델','공정','계획대비','차이일','업무내용','참여자','법칙태그','결정필요','분석요약'],
  analysis90:['스냅샷일','연도','월','발주번호','고객사','제품/모델','등급','설계표시','설계일수','구매표시','구매일수','생산여유일','생산상태','최종검수','납기D-Day','병목/판정','담당PM','90일기준','고객납기','운영기준납기','지연사유/메모','월최신','일정변경건수','일정순변경일','일정연장일','일정단축일','일정변경요약','90일기준 시작일','설계 인계일/상태','설계편차일','구매시작일','구매완료일/상태','구매편차일','조립가능일','조립가능편차일','실적산출근거']
};

function headerText(v){return String(v??'').trim();}
function assertHeader(name,table,expected){
  const header=Array.isArray(table?.[0])?table[0]:null;
  if(!header)throw new Error(`${name} header row is missing`);
  if(header.length<expected.length)throw new Error(`${name} header width ${header.length}/${expected.length}`);
  const mismatch=[];
  expected.forEach((label,i)=>{if(headerText(header[i])!==headerText(label))mismatch.push(`${i+1}:${headerText(header[i])||'(blank)'}!=${label}`);});
  if(mismatch.length)throw new Error(`${name} header mismatch — ${mismatch.slice(0,4).join(', ')}`);
  return true;
}
function validateHeaders(tables){
  assertHeader('제품마스터',tables.productRows,HEADER_CONTRACTS.product);
  assertHeader('업무이력',tables.workRows,HEADER_CONTRACTS.work);
  assertHeader('HF_DATA_이슈원장',tables.issueRows,HEADER_CONTRACTS.issue);
  assertHeader('HF_DATA_일정변경누적',tables.changeRows,HEADER_CONTRACTS.change);
  assertHeader('HF_VIEW_인력CAPA',tables.capaRows,HEADER_CONTRACTS.capacity);
  assertHeader('HF_VIEW_브리핑소스',tables.briefRows,HEADER_CONTRACTS.briefing);
  assertHeader('HF_DATA_90일분석이력',tables.analysisRows,HEADER_CONTRACTS.analysis90);
  return true;
}

function envCredential(){
  let obj=null;
  if(process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON_B64){obj=JSON.parse(Buffer.from(process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON_B64,'base64').toString('utf8'));}
  else if(process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON){obj=JSON.parse(process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON);}
  else if(process.env.HF_GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.HF_GOOGLE_PRIVATE_KEY){obj={client_email:process.env.HF_GOOGLE_SERVICE_ACCOUNT_EMAIL,private_key:process.env.HF_GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'),token_uri:process.env.HF_GOOGLE_TOKEN_URI||TOKEN_URL};}
  if(!obj)return null;
  if(!obj.client_email||!obj.private_key)throw new Error('Google service account email/private key missing');
  obj.private_key=String(obj.private_key).replace(/\\n/g,'\n'); return obj;
}
function configured(){return Boolean(process.env.HF_OS_V3_SPREADSHEET_ID&&(process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON_B64||process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON||(process.env.HF_GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.HF_GOOGLE_PRIVATE_KEY)));}
function base64url(input){return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
async function accessToken(){
  if(tokenCache.token&&tokenCache.expiresAt>Date.now()+60000)return tokenCache.token;
  const cred=envCredential(); if(!cred)throw new Error('Google service account credentials are not configured');
  const now=Math.floor(Date.now()/1000),header=base64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const payload=base64url(JSON.stringify({iss:cred.client_email,scope:SCOPE,aud:cred.token_uri||TOKEN_URL,iat:now,exp:now+3600}));
  const unsigned=`${header}.${payload}`,signature=crypto.sign('RSA-SHA256',Buffer.from(unsigned),cred.private_key),assertion=`${unsigned}.${base64url(signature)}`;
  const resp=await fetch(cred.token_uri||TOKEN_URL,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
  const data=await resp.json().catch(()=>({})); if(!resp.ok||!data.access_token)throw new Error(`Google token exchange failed: ${data.error_description||data.error||`HTTP ${resp.status}`}`);
  tokenCache={token:data.access_token,expiresAt:Date.now()+Number(data.expires_in||3600)*1000}; return tokenCache.token;
}
function norm(v){return String(v??'').trim().toLowerCase().replace(/\s+/g,'').replace(/[()]/g,'');}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function numOrNull(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function bool(v){if(typeof v==='boolean')return v;const s=String(v??'').trim().toUpperCase();return s==='TRUE'||s==='1'||s==='Y'||s==='YES';}
function serialDate(v){if(typeof v==='number'&&v>20000)return new Date(Math.round((v-25569)*86400000)).toISOString().slice(0,10);const s=String(v??'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{4})[./년 -]+(\d{1,2})[./월 -]+(\d{1,2})/);return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:null;}
function kstToday(){return new Date(Date.now()+9*3600000).toISOString().slice(0,10);}
function commonPattern(ids){const clean=[...new Set(ids.filter(Boolean))];if(clean.length===1)return clean[0];if(!clean.length)return null;let prefix=clean[0];for(const id of clean.slice(1)){let i=0;while(i<prefix.length&&i<id.length&&prefix[i]===id[i])i++;prefix=prefix.slice(0,i);}const cut=prefix.lastIndexOf('-');return cut>=0?prefix.slice(0,cut+1)+'*':null;}
function resolveProjectId(customer,model,projects){const c=norm(customer),m=norm(model);let matches=projects.filter(p=>norm(p.customer)===c&&(!m||norm(p.model)===m));if(!matches.length&&c)matches=projects.filter(p=>norm(p.customer)===c);return commonPattern(matches.map(p=>p.id));}
function inferProcess(summary,type){const s=`${type||''} ${summary||''}`;for(const p of ['자재수령','외주입고','가공/외주','조립','전장','프로그램','테스트','검수','출고','A/S','PT','인력'])if(s.includes(p))return p;if(/입고|자재/.test(s))return '자재/입고';if(/가공|수정/.test(s))return '가공/외주';return '기타';}
function lawTag(type){if(type==='일일작업')return'ACTUAL';if(type==='출고완료')return'DELIVERY';if(type==='일정변경')return'PLAN_CHANGE';if(type==='지연사유')return'DELAY_CAUSE';if(type==='불량발생')return'QUALITY_ISSUE';if(['출장','연차','반차'].includes(type))return'RESOURCE';if(['A/S','PT','타팀지원'].includes(type))return'SUPPORT';return null;}
async function batchGet(ranges){
  const token=await accessToken(),qs=new URLSearchParams(); for(const r of ranges)qs.append('ranges',r);qs.set('valueRenderOption','UNFORMATTED_VALUE');qs.set('dateTimeRenderOption','SERIAL_NUMBER');
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(process.env.HF_OS_V3_SPREADSHEET_ID)}/values:batchGet?${qs}`;
  const resp=await fetch(url,{headers:{authorization:`Bearer ${token}`}}),data=await resp.json().catch(()=>({}));if(!resp.ok)throw new Error(`Google Sheets read failed: ${data?.error?.message||`HTTP ${resp.status}`}`);return data.valueRanges||[];
}
function rows(vr){return Array.isArray(vr?.values)?vr.values:[];}
function buildSnapshot(valueRanges){
  const [productVR,workVR,issueVR,changeVR,capaVR,briefVR,analysisVR]=valueRanges;
  const productRows=rows(productVR),workRows=rows(workVR),issueRows=rows(issueVR),changeRows=rows(changeVR),capaRows=rows(capaVR),briefRows=rows(briefVR),analysisRows=rows(analysisVR);
  validateHeaders({productRows,workRows,issueRows,changeRows,capaRows,briefRows,analysisRows});
  const projects=productRows.slice(1).filter(r=>r[0]).map(r=>({id:String(r[0]).trim(),customer:r[1]??null,model:r[2]??null,due:serialDate(r[3])||(r[3]??null),sales:r[4]??null,design:r[5]??null,production:[r[6],r[7]].filter(Boolean),pm:r[8]??null,status:r[9]??null,progressText:r[10]??null,note:r[11]??null}));
  const events=workRows.slice(1).filter(r=>r[0]||r[1]||r[2]).map((r,i)=>{const type=String(r[1]??'').trim(),summary=r[4]??null;return{id:`EV-LIVE-${serialDate(r[0])||'NA'}-${i+8}`,date:serialDate(r[0]),projectId:resolveProjectId(r[2],r[3],projects),type,customer:r[2]??null,model:r[3]??null,process:inferProcess(summary,type),summary,participants:r[5]??null,raw:r[6]??null,inputPath:r[7]??null,confirmed:r[8]??null,lawTag:lawTag(type),source:'업무이력'};});
  const issues=issueRows.slice(1).filter(r=>r[0]).map(r=>({id:r[0],openedAt:serialDate(r[1]),type:r[2],projectId:r[3],customer:r[4]??null,model:r[5]??null,process:r[6]??null,sourceEventId:r[7]??null,status:String(r[8]??'OPEN').toUpperCase(),latestUpdate:serialDate(r[9]),resolution:r[10]??null,closedAt:serialDate(r[11]),sourceRow:r[12]??null,briefingActive:bool(r[13]),searchKey:r[14]??null,note:r[15]??null}));
  const changes=changeRows.slice(1).filter(r=>r[0]||r[3]).map(r=>({date:serialDate(r[0]),projectId:r[3]??null,customer:r[4]??null,model:r[5]??null,process:r[6]??null,initialPlan:serialDate(r[7]),previousDate:serialDate(r[8]),effectiveDate:serialDate(r[9]),deltaDays:num(r[10]),cumulativeDays:num(r[11]),extendedDays:num(r[12]),shortenedDays:num(r[13]),changeType:r[14]??null,reason:r[15]??null,summary:r[15]??null,raw:r[16]??null,sourceRow:r[17]??null,current:bool(r[18]),searchKey:r[19]??null,source:'HF_DATA_일정변경누적'}));
  const capacity=capaRows.slice(1).filter(r=>r[0]||r[1]).map(r=>{const available=num(r[12]),demand=num(r[13]);return{date:serialDate(r[0]),projectId:r[1]??null,customer:r[2]??null,model:r[3]??null,due:serialDate(r[4]),process:r[5]??null,masterCrew:r[6]??null,recentWorkers:r[7]??null,crewSource:r[8]??null,crewFTE:num(r[9]),absent:r[10]??null,directLossFTE:num(r[11]),availableFTE:available,demandFTE:demand,shortageFTE:num(r[14]),gap:available-demand,impactDays:num(r[15]),risk:r[16]??null,summary:r[17]??null,source:'HF_VIEW_인력CAPA'};});
  const briefing=briefRows.slice(1).filter(r=>r[0]||r[1]||r[2]).map(r=>{const customer=r[4]??null,model=r[5]??null;return{priority:r[0]??null,date:serialDate(r[1]),type:r[2]??null,projectId:r[3]||resolveProjectId(customer,model,projects),customer,model,process:r[6]??null,planComparison:r[7]??null,diffDays:r[8]===null||r[8]===undefined?null:num(r[8]),summary:r[9]??null,participants:r[10]??null,lawTag:r[11]??null,decisionRequired:bool(r[12]),analysis:r[13]??null,source:'HF_VIEW_브리핑소스'};});
  const analysis90=analysisRows.slice(1).filter(r=>r[0]||r[3]).map(r=>({
    snapshotDate:serialDate(r[0]),projectId:r[3]??null,customer:r[4]??null,model:r[5]??null,grade:r[6]??null,
    designStatus:r[7]??null,designDays:numOrNull(r[8]),purchaseStatus:r[9]??null,purchaseDays:numOrNull(r[10]),
    productionSlackDays:numOrNull(r[11]),productionStatus:r[12]??null,finalInspection:r[13]??null,dueDday:r[14]??null,bottleneck:r[15]??null,pm:r[16]??null,
    baseline90:serialDate(r[17]),customerDue:serialDate(r[18])||(r[18]??null),operatingDue:serialDate(r[19])||(r[19]??null),memo:r[20]??null,
    monthLatest:bool(r[21]),changeCount:numOrNull(r[22]),netChangeDays:numOrNull(r[23]),extendedDays:numOrNull(r[24]),shortenedDays:numOrNull(r[25]),changeSummary:r[26]??null,
    baselineStart:serialDate(r[27]),designHandoff:r[28]??null,designVarianceDays:numOrNull(r[29]),purchaseStart:serialDate(r[30]),purchaseComplete:r[31]??null,purchaseVarianceDays:numOrNull(r[32]),
    assemblyAvailableDate:serialDate(r[33]),assemblyVarianceDays:numOrNull(r[34]),actualBasis:r[35]??null,source:'HF_DATA_90일분석이력'
  }));
  return{meta:{asOf:kstToday(),generatedAt:new Date().toISOString(),source:'GOOGLE_SHEETS_LIVE'},projects,events,issues,changes,capacity,briefing,analysis90};
}
async function loadSnapshot(){
  if(!configured())throw new Error('Google Sheets bridge credentials are not configured');
  const ranges=["'제품마스터'!A4:L1100","'업무이력'!A7:I220","'HF_DATA_이슈원장'!A1:P1000","'HF_DATA_일정변경누적'!A1:T2000","'HF_VIEW_인력CAPA'!A1:R2000","'HF_VIEW_브리핑소스'!A1:N1000","'HF_DATA_90일분석이력'!A1:AJ2000"];
  const valueRanges=await batchGet(ranges);if(valueRanges.length<ranges.length)throw new Error(`Google Sheets returned ${valueRanges.length}/${ranges.length} ranges`);return buildSnapshot(valueRanges);
}
module.exports={configured,loadSnapshot,buildSnapshot,validateHeaders,assertHeader,HEADER_CONTRACTS};
