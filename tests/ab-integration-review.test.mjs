import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareABReview,selectABRows} from '../lib/ab-integration-review.mjs';
test('split keeps original identity and does not copy a shipment state to a second unit',()=>{
 const audit={rows:[{sourceRow:149,normalizedJob:'260626A-044-01',team:'A',projectId:'PRJ-00136'},{sourceRow:150,normalizedJob:'260626A-044-01',team:'A',projectId:'PRJ-00136'}]};
 const before=JSON.stringify(audit),r=prepareABReview(audit);
 assert.deepEqual(r.rows.map(x=>[x.canonicalJob,x.projectId]),[['260626A-044-01','PRJ-00136'],['260626A-044-02',null]]);
 assert.equal(r.rows[1].currentState,undefined);assert.equal(JSON.stringify(audit),before);
});
test('042 source discrepancy reuses the exact existing identity and retains raw source',()=>{
 const r=prepareABReview({rows:[{normalizedJob:'260623A-042',team:'B',customer:'엠플러스',model:'PLS - 2KC'}],coreOnly:[{job:'260611A-042',team:'B',customer:'엠플러스',model:'PLS - 2KC',projectId:'PRJ-00134'}]});
 assert.equal(r.rows[0].projectId,'PRJ-00134');assert.equal(r.rows[0].normalizedJob,'260623A-042');assert.equal(r.rows[0].canonicalJob,'260611A-042');
 assert.throws(()=>prepareABReview({rows:[{normalizedJob:'260623A-042',team:'B'}]}),/unresolved_042_identity/);
});
test('team scopes ignore job year and letter, retain old active jobs, and exclude other teams',()=>{
 const rows=[{team:'A',orderId:'260001A'},{team:'B',orderId:'251210A-143-01'},{team:'C'},{team:''}];
 assert.equal(selectABRows(rows,'ALL').length,2);assert.equal(selectABRows(rows).length,1);assert.equal(selectABRows(rows,'A')[0],rows[0]);
 assert.throws(()=>selectABRows(rows,'C'),/invalid_team_selection/);
});
test('unreviewed duplicate identities fail closed',()=>{
 assert.throws(()=>prepareABReview({rows:[{team:'A',normalizedJob:'x'},{team:'A',normalizedJob:'x'}]}),/duplicate_review_job/);
});
