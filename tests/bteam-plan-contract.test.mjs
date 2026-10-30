import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const src=fs.readFileSync('apps-script/HF_LIGHT_APP.gs','utf8');
const code=src.slice(src.indexOf('function hfAppPlanOverview_('),src.indexOf('function hfAppReceipt_('));
test('authenticated plan contract preserves state and explicit source evidence without writing',()=>{
 const row=['BVERIFIED|20261006T120000Z|JOB|META',2026,10,'2026-10-01','JOB','','','','','','','진행 중','2026-10','주간회의자료/생산B팀','생산B팀!R1540','2026-10-06'];
 let writes=0;
 const sheet={getSheetId:()=>1167293203,getLastRow:()=>2,getRange:()=>({getValues:()=>[row],setValues:()=>writes++})};
 const ctx=vm.createContext({String,hfLsDay_:String,hfLsFail_:s=>{throw Error(s);}});vm.runInContext(code,ctx);
 const result=ctx.hfAppPlanOverview_({getSheetByName:()=>sheet});
 assert.equal(result[0].status,'진행 중');assert.equal(result[0].sourceRef,'생산B팀!R1540');assert.equal(result[0].recordId,row[0]);assert.equal(writes,0);
 assert.throws(()=>ctx.hfAppPlanOverview_({getSheetByName:()=>({...sheet,getSheetId:()=>1})}),/invalid_structure/);
});
test('native Sheets month dates have the same sortable contract as text months',()=>{
 const rows=[['old',2026,8,'2026-08-01','JOB','','','','','','조립','',new Date('2026-07-31T15:00:00Z')],['new',2026,10,'2026-10-12','JOB','','','','','','조립','','2026-10']];
 const sheet={getSheetId:()=>1167293203,getLastRow:()=>3,getRange:()=>({getValues:()=>rows})};
 const ctx=vm.createContext({String,Utilities:{formatDate:(d,tz,format)=>{assert.equal(tz,'Asia/Seoul');assert.equal(format,'yyyy-MM');return new Date(d.getTime()+9*3600000).toISOString().slice(0,7);}},hfLsDay_:String,hfLsFail_:s=>{throw Error(s);}});
 vm.runInContext(code,ctx);const records=ctx.hfAppPlanOverview_({getSheetByName:()=>sheet});
 assert.deepEqual(Array.from(records,r=>r.sourceMonth),['2026-08','2026-10']);
 rows[0][12]='unrecognized';assert.throws(()=>ctx.hfAppPlanOverview_({getSheetByName:()=>sheet}),/invalid_source_month/);
});
