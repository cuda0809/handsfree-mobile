import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const rules=createRequire(import.meta.url)('../kmt-sa2/production-rules.js');
test('completed groups use JOB year independently of shipment date, retain split equipment and search all years',()=>{
 const rows=[{orderId:'251215A-144-04',actualDelivery:'2026-10-07'},{orderId:'260601A-039-01',actualDelivery:'2026-10-07'},{orderId:'260601A-039-02',actualDelivery:'2027-01-01'},{orderId:'LAB-260109K-004'},{orderId:'unknown'}];
 const before=JSON.stringify(rows),groups=rules.completedGroups(rows,'','2026');
 assert.equal(groups[0].year,'2026');assert.equal(groups[0].items.length,3);assert.equal(groups[0].open,true);
 assert.equal(groups.find(g=>g.year==='2025').open,false);assert.equal(groups.find(g=>g.year==='연도 미확인').open,false);
 assert.ok(rules.completedGroups(rows,'144','2026').every(g=>g.open));
 assert.equal(JSON.stringify(rows),before);assert.equal(rules.jobYear('260231A-001'),'');
 assert.equal(rules.completedGroups(rows,'','2027').find(g=>g.year==='2026').open,false);
});
test('approved snapshot changes supersede old milestones without deleting plan history',()=>{
 const row=(revision,date,process)=>({recordId:'BVERIFIED|'+revision+'|JOB|'+date+'|'+process,date,process,sourceMonth:'2026-10',status:'계획',sourceRef:'사용자 합의'});
 const rows=[row('OLD','2026-10-01','검수'),row('OLD','2026-10-02','납품'),row('NEW','2026-10-16','검수'),row('NEW','2026-10-19','납품')];
 // Revision IDs are ordered; use timestamp-like ascending revisions.
 rows[0].recordId=rows[0].recordId.replace('OLD','20261006');rows[1].recordId=rows[1].recordId.replace('OLD','20261006');rows[2].recordId=rows[2].recordId.replace('NEW','20261008');rows[3].recordId=rows[3].recordId.replace('NEW','20261008');
 const before=JSON.stringify(rows),x=rules.resolve(rows);
 assert.equal(x.planInspection,'2026-10-16');assert.equal(x.planDelivery,'2026-10-19');assert.equal(x.planTimeline.length,2);
 assert.equal(x.planHistory.length,4);assert.equal(x.planHistory.filter(r=>r.current===false).length,2);assert.equal(JSON.stringify(rows),before);
});
