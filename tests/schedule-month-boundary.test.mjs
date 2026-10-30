import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSchedule,applyBatch} from './schedule.test.mjs';
function fixture(year,month){
 const c=loadSchedule(),start=`${year}-${String(month).padStart(2,'0')}-01`;
 const row=['record-1',year,month,c.hfLsSerial_(start),'P-1','고객','모델','','','','조립','',start.slice(0,7),'월간계획_메인','',''];
 const s={plans:[[],row],monthly:[[],[],['',year,'','',month],[],[],['P-1','','','','','','조립']],planFormulas:[[],[]],monthFormulas:[[],[],[],[],[],[]],planId:1167293203,monthId:1001001,auditId:1907280001,audit:[],sheetIds:[1167293203,1001001]};
 const key=c.hfLsKey_(row),p=c.hfLsRecord_(s,'P-1',key);
 const b={action:'edit',orderId:'P-1',key,expected:p.revision,reason:'isolated test',requestId:'month-test-00000001',actor:{sub:'fixture',email:'fixture@example.invalid'}};
 return {c,s,b};
}
for(const [year,month,last,next] of [[2026,2,'2026-02-28','2026-03-01'],[2028,2,'2028-02-29','2028-03-01'],[2026,9,'2026-09-30','2026-10-01'],[2026,12,'2026-12-31','2027-01-01']]){
 test(`month ${year}-${month}: protect adjacent month and permit last day`,()=>{
  const {c,s,b}=fixture(year,month);
  assert.equal(c.hfLsList_(s,'P-1')[0].maxDate,last);
  assert.throws(()=>c.hfLsBuild_(s,{...b,date:next},'now'),/outside_edit_month/);
  const built=c.hfLsBuild_(s,{...b,date:last},'now');applyBatch(s,built.requests);
  assert.equal(c.hfLsRecord_(s,'P-1',b.key).date,last);
  assert.equal(c.hfLsBuild_(s,{...b,date:last},'now').requests.length,0);
 });
 test(`month ${year}-${month}: corrupted next-month row is read-only`,()=>{
  const {c,s,b}=fixture(year,month);
  const offset=c.hfLsSerial_(next)-c.hfLsSerial_(`${year}-${String(month).padStart(2,'0')}-01`);
  s.plans[1][3]=c.hfLsSerial_(next);s.monthly[5][6+offset]='조립';
  assert.throws(()=>c.hfLsRecord_(s,'P-1',b.key),/outside_edit_month/);
  assert.equal(c.hfLsList_(s,'P-1')[0].editable,false);
 });
}
