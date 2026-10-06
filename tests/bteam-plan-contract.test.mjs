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
