import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';
export function scheduleContext(){return vm.createContext({Date,JSON,Number,String,Object,Math,Error,Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(alg,v)=>crypto.createHash('sha256').update(v).digest(),base64EncodeWebSafe:v=>Buffer.from(v).toString('base64url')}});}
export function loadSchedule(){const ctx=scheduleContext();vm.runInContext(fs.readFileSync(new URL('../apps-script/HF_LIGHT_SCHEDULE.gs',import.meta.url),'utf8'),ctx);return ctx;}
export function applyBatch(s,requests){for(const r of requests){if(r.addSheet){s.sheetIds.push(r.addSheet.properties.sheetId);continue;}if(r.appendCells){for(const row of r.appendCells.rows)s.audit.push(row.values.map(c=>c.userEnteredValue?.stringValue??''));continue;}
 const u=r.updateCells;if(!u)continue;const range=u.range||u.start,id=range.sheetId,row=range.startRowIndex??range.rowIndex,col=range.startColumnIndex??range.columnIndex,grid=id===s.planId?s.plans:id===s.monthId?s.monthly:s.audit;
 u.rows.forEach((r,i)=>{grid[row+i]||=[];r.values.forEach((c,j)=>{grid[row+i][col+j]=c.userEnteredValue?.stringValue??c.userEnteredValue?.numberValue??'';});});}}
const c=loadSchedule(),serial=c.hfLsSerial_('2026-09-01');
const row=['P-1|20260901|조립',2026,9,serial,'P-1','고객','모델','','','','조립','','2026-09','월간계획_메인','원본',''];
const base={plans:[[],row],monthly:[[],[],['',2026,'','',9],[],[],['P-1','','','','','','조립']],planFormulas:[[],[]],monthFormulas:[[],[],[],[],[],[]],planId:1167293203,monthId:1001001,auditId:1907280001,audit:[],sheetIds:[1167293203,1001001]};
const s=structuredClone(base),key=c.hfLsKey_(row),p=c.hfLsRecord_(s,'P-1',key);
const b={action:'edit',orderId:'P-1',key,expected:p.revision,date:'2026-09-05',reason:'검증 사유',requestId:'schedule-test-00000001',actor:{sub:'123',email:'test@gmail.com'}};
const built=c.hfLsBuild_(s,b,'2026-09-28T04:00:00Z');assert.equal(built.requests.length,10);applyBatch(s,built.requests);
assert.equal(s.monthly[5][6],'');assert.equal(s.monthly[5][10],'조립');assert.equal(s.plans[1][0],row[0]);assert.equal(s.plans[1][4],'P-1');assert.equal(c.hfLsRecord_(s,'P-1',key).date,b.date);assert.equal(s.audit.length,2);
assert.equal(c.hfLsBuild_(s,b,'now').requests.length,0);
assert.throws(()=>c.hfLsBuild_(s,{...b,reason:'different'},'now'),/request_conflict/);
assert.throws(()=>c.hfLsBuild_(s,{...b,requestId:'schedule-test-00000002'},'now'),/stale_record/);
for(const date of ['2026-02-30','2026-13-01','bad'])assert.throws(()=>c.hfLsDay_(date),/invalid_date/);
assert.throws(()=>c.hfLsBuild_(base,{...b,date:'2026-10-02'},'now'),/outside_edit_month/);
assert.throws(()=>c.hfLsBuild_(base,{...b,reason:' '},'now'),/invalid_reason/);
assert.throws(()=>c.hfLsRecord_(base,'P-10',key),/project_mismatch/);
let t=structuredClone(base);t.plans.push([...row]);assert.throws(()=>c.hfLsRecord_(t,'P-1',key),/ambiguous_record/);
t=structuredClone(base);t.plans.push([...row]);t.plans[2][12]='2026-08';assert.equal(c.hfLsRecord_(t,'P-1',key).index,1);
t=structuredClone(base);t.monthly[5][10]='검수';assert.throws(()=>c.hfLsBuild_(t,{...b,expected:c.hfLsRecord_(t,'P-1',key).revision},'now'),/destination_occupied/);
t=structuredClone(base);t.monthly[5][6]='전장';assert.throws(()=>c.hfLsRecord_(t,'P-1',key),/source_mismatch/);
t=structuredClone(base);t.monthFormulas[5][10]='=""';assert.throws(()=>c.hfLsBuild_(t,{...b,expected:c.hfLsRecord_(t,'P-1',key).revision},'now'),/formula_cell/);
console.log('PASS schedule atomic batch, identity preservation, receipt dedupe/conflict, stale revisions, dates, occupied/formula cells and historical identity');
const secret='test-only-key';c.HF_TOKEN_KEY='TOKEN';c.PropertiesService={getScriptProperties:()=>({getProperty:()=>secret})};
c.Utilities.computeHmacSha256Signature=(message,key)=>crypto.createHmac('sha256',key).update(message).digest();
let permissions=[['MASTER','owner@gmail.com','Owner'],['READER','reader@gmail.com','Reader']];
const ss={getSheetByName:()=>({getLastRow:()=>permissions.length,getRange:()=>({getDisplayValues:()=>permissions})})};
const signedBody=email=>({action:'edit',orderId:'P-1',actor:{sub:'1',email,exp:Date.now()/1000+100}});
const proof=body=>{const signed=JSON.stringify(body);return {signed,signature:crypto.createHmac('sha256',secret).update(signed).digest('base64url')};};
assert.equal(c.hfLsActor_(proof(signedBody('owner@gmail.com')),ss).actor.email,'owner@gmail.com');
assert.throws(()=>c.hfLsActor_(proof(signedBody('reader@gmail.com')),ss),/forbidden/);
assert.throws(()=>c.hfLsActor_(proof(signedBody('unknown@gmail.com')),ss),/forbidden/);
let forged=proof(signedBody('owner@gmail.com'));forged.signed=forged.signed.replace('P-1','P-2');assert.throws(()=>c.hfLsActor_(forged,ss),/forbidden/);
assert.throws(()=>c.hfLsActor_(proof({...signedBody('owner@gmail.com'),actor:{sub:'1',email:'owner@gmail.com',exp:1}}),ss),/forbidden/);
permissions=[];assert.throws(()=>c.hfLsActor_(proof(signedBody('owner@gmail.com')),ss),/forbidden/);
console.log('PASS Apps Script signed-body tampering, expiry, roles and live allowlist revocation');
