// HandsFree Mobile REAL 0.4.1 — append-only Google Sheets input queue writer.
// Operational ledgers are NEVER written directly from the mobile app.
// The only write target is HF_DATA_입력대기열, after every safety gate passes.
const crypto=require('crypto');

const TOKEN_URL='https://oauth2.googleapis.com/token';
const WRITE_SCOPE='https://www.googleapis.com/auth/spreadsheets';
const QUEUE_SHEET='HF_DATA_입력대기열';
const QUEUE_RANGE=`'${QUEUE_SHEET}'!A:O`;
const QUEUE_HEADERS=['Request_ID','Received_At','Source','Requester','Payload','Status','Dedupe_Key','Attempt','Lock_Owner','Started_At','Completed_At','Result','Error','Priority','Ack_Message'];
const ACTIVE_STATES=new Set(['QUEUED','PROCESSING','DONE']);
let tokenCache={token:null,expiresAt:0};

function truthy(v){return ['1','TRUE','Y','YES','ON'].includes(String(v??'').trim().toUpperCase());}
function writeSwitchEnabled(){return truthy(process.env.HF_QUEUE_WRITE_ENABLED);}
function spreadsheetId(){return String(process.env.HF_OS_V3_SPREADSHEET_ID||'').trim();}
function envCredential(){
  let obj=null;
  if(process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON_B64)obj=JSON.parse(Buffer.from(process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON_B64,'base64').toString('utf8'));
  else if(process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON)obj=JSON.parse(process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON);
  else if(process.env.HF_GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.HF_GOOGLE_PRIVATE_KEY)obj={client_email:process.env.HF_GOOGLE_SERVICE_ACCOUNT_EMAIL,private_key:process.env.HF_GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'),token_uri:process.env.HF_GOOGLE_TOKEN_URI||TOKEN_URL};
  if(!obj)return null;
  if(!obj.client_email||!obj.private_key)throw new Error('Google service account email/private key missing');
  obj.private_key=String(obj.private_key).replace(/\\n/g,'\n');
  return obj;
}
function credentialConfigured(){
  return Boolean(spreadsheetId()&&(process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON_B64||process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON||(process.env.HF_GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.HF_GOOGLE_PRIVATE_KEY)));
}
function base64url(input){return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
async function accessToken(){
  if(tokenCache.token&&tokenCache.expiresAt>Date.now()+60000)return tokenCache.token;
  const cred=envCredential();
  if(!cred)throw new Error('Google service account credentials are not configured');
  const now=Math.floor(Date.now()/1000);
  const header=base64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const payload=base64url(JSON.stringify({iss:cred.client_email,scope:WRITE_SCOPE,aud:cred.token_uri||TOKEN_URL,iat:now,exp:now+3600}));
  const unsigned=`${header}.${payload}`;
  const signature=crypto.sign('RSA-SHA256',Buffer.from(unsigned),cred.private_key);
  const assertion=`${unsigned}.${base64url(signature)}`;
  const resp=await fetch(cred.token_uri||TOKEN_URL,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok||!data.access_token)throw new Error(`Google token exchange failed: ${data.error_description||data.error||`HTTP ${resp.status}`}`);
  tokenCache={token:data.access_token,expiresAt:Date.now()+Number(data.expires_in||3600)*1000};
  return tokenCache.token;
}
async function valuesGet(range){
  const token=await accessToken();
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;
  const resp=await fetch(url,{headers:{authorization:`Bearer ${token}`}});
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok)throw new Error(`Google Sheets gate read failed: ${data?.error?.message||`HTTP ${resp.status}`}`);
  return Array.isArray(data.values)?data.values:[];
}
async function valuesAppend(row){
  const token=await accessToken();
  const qs=new URLSearchParams({valueInputOption:'RAW',insertDataOption:'INSERT_ROWS'});
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${encodeURIComponent(QUEUE_RANGE)}:append?${qs}`;
  const resp=await fetch(url,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({majorDimension:'ROWS',values:[row]})});
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok)throw new Error(`Google Sheets queue append failed: ${data?.error?.message||`HTTP ${resp.status}`}`);
  return data;
}
function rowsToMap(rows){
  const map={};
  for(const r of rows||[]){const k=String(r?.[0]??'').trim();if(k)map[k]=r?.[1]??'';}
  return map;
}
function sameHeaders(row){
  return QUEUE_HEADERS.every((h,i)=>String(row?.[i]??'').trim()===h);
}
async function gateEvidence(){
  if(!credentialConfigured())return {ok:false,reasons:['GOOGLE_CREDENTIALS_NOT_CONFIGURED'],checks:{credentials:false}};
  const [safetyRows,queueRows,integrityRows,coreRows]=await Promise.all([
    valuesGet("'HF_SYS_운영안전'!A1:B18"),
    valuesGet("'HF_DATA_입력대기열'!A1:O1000"),
    valuesGet("'HF_SYS_무결성검사'!A1:B55"),
    valuesGet("'HF_SYS_핵심점검'!A1:B30")
  ]);
  const safety=rowsToMap(safetyRows);
  const checks={
    credentials:true,
    safetyActive:String(safetyRows?.[0]?.[1]??'').trim()==='ACTIVE',
    spreadsheetId:String(safety['Spreadsheet ID']??'').trim()===spreadsheetId(),
    currentVersion:String(safety['Current Version']??'').trim()==='핸즈프리 OS 버전 3',
    queueSheetId:String(safety['Input Queue Sheet ID']??'').trim()==='1907002003',
    integrityPass:String(integrityRows?.[0]?.[1]??'').trim()==='PASS',
    coreCheckPass:String(coreRows?.[0]?.[1]??'').trim()==='PASS',
    queueHeaders:sameHeaders(queueRows?.[0]||[]),
    writeSwitch:writeSwitchEnabled()
  };
  const reasons=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k.toUpperCase());
  return {ok:reasons.length===0,reasons,checks,safety,queueRows};
}
function stableJson(v){
  if(v===null||typeof v!=='object')return JSON.stringify(v);
  if(Array.isArray(v))return `[${v.map(stableJson).join(',')}]`;
  return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stableJson(v[k])}`).join(',')}}`;
}
function normalizeInput(body={}){
  const requester=String(body.requester||'').trim();
  const source=String(body.source||'MOBILE_REAL').trim().toUpperCase();
  const priority=String(body.priority||'NORMAL').trim().toUpperCase();
  const kind=String(body.kind||'WORK').trim().toUpperCase();
  const payload=body.payload;
  if(!requester)throw new Error('requester is required');
  if(!['NORMAL','HIGH'].includes(priority))throw new Error('priority must be NORMAL or HIGH');
  if(!['WORK','CHANGE','ISSUE','SUPPORT'].includes(kind))throw new Error('kind must be WORK, CHANGE, ISSUE or SUPPORT');
  if(payload===undefined||payload===null||payload==='')throw new Error('payload is required');
  const payloadObj={kind,data:payload};
  const payloadText=typeof payload==='string'?JSON.stringify(payloadObj):stableJson(payloadObj);
  if(Buffer.byteLength(payloadText,'utf8')>12000)throw new Error('payload is too large');
  const dedupeSource=`${requester}|${kind}|${payloadText}`;
  const dedupeKey=crypto.createHash('sha256').update(dedupeSource).digest('hex').slice(0,32);
  return {requester,source,priority,kind,payloadText,dedupeKey};
}
function kstStamp(){
  const d=new Date(Date.now()+9*3600000).toISOString().replace('T',' ').slice(0,19);
  return `${d} KST`;
}
function requestId(){
  const date=new Date(Date.now()+9*3600000).toISOString().slice(0,10).replace(/-/g,'');
  return `APP-REAL-${date}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
}
async function enqueue(body){
  const input=normalizeInput(body);
  const gate=await gateEvidence();
  if(!gate.ok){const e=new Error(`Write gate locked: ${gate.reasons.join(', ')}`);e.code='WRITE_GATE_LOCKED';e.gate=gate;throw e;}
  for(const r of gate.queueRows.slice(1)){
    if(String(r?.[6]??'').trim()===input.dedupeKey&&ACTIVE_STATES.has(String(r?.[5]??'').trim().toUpperCase())){
      return {duplicate:true,requestId:r?.[0]||null,status:r?.[5]||null,dedupeKey:input.dedupeKey,ack:'동일 요청이 이미 대기/처리/완료 상태입니다.'};
    }
  }
  const id=requestId(),receivedAt=kstStamp();
  const row=[id,receivedAt,input.source,input.requester,input.payloadText,'QUEUED',input.dedupeKey,0,'','','','','',input.priority,'접수 완료 · 입력대기열 등록'];
  const result=await valuesAppend(row);
  return {duplicate:false,requestId:id,status:'QUEUED',dedupeKey:input.dedupeKey,updatedRange:result?.updates?.updatedRange||null,ack:'접수 완료 · 입력대기열 등록'};
}
module.exports={QUEUE_SHEET,QUEUE_HEADERS,credentialConfigured,writeSwitchEnabled,gateEvidence,normalizeInput,enqueue};
