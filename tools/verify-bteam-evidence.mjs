// Read-only reconciliation verifier; production data is supplied outside the repository.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const rules=createRequire(import.meta.url)('../kmt-sa2/production-rules.js');
const dir=process.argv[2];if(!dir)throw Error('Usage: node tools/verify-bteam-evidence.mjs evidence-directory');
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n+'.json'),'utf8'));
const core=read('HF_CORE_통합운영').values.slice(1),ledger=read('HF_DATA_계획원장').values.slice(1);
const migration=read('BTEAM_PREPARED_MIGRATION');
const record=r=>({recordId:r[0],date:rules.day(r[3]),orderId:r[4],process:r[10]||'',sourceMonth:r[12]||'',status:r[11]||'',source:r[13]||'',sourceRef:r[14]||'',updatedAt:r[15]||''});
const grouped=new Map();for(const r of [...ledger,...migration.appendPlanRows].map(record)){
 if(!grouped.has(r.orderId))grouped.set(r.orderId,[]);grouped.get(r.orderId).push(r);
}
const original=execFileSync('git',['show','35cf593:kmt-sa2/app-flow.js'],{encoding:'utf8'});
const fn=original.slice(original.indexOf('function summarizePlanRecords('),original.indexOf('function applyPlanOverview('));
const ctx=vm.createContext({formatHfDate:rules.day});vm.runInContext(fn,ctx);
const old=ledger.filter(r=>r[4]==='260623A-043').map(record);
assert.equal(ctx.summarizePlanRecords(old).planAssembly,'2026-10-01');
const fixed=rules.resolve(grouped.get('260623A-043'));assert.equal(fixed.planAssembly,'2026-10-12');
assert.ok(!fixed.planTimeline.some(r=>r.process==='조립'&&r.date==='2026-10-06'));
for(const [job,g] of Object.entries(migration.sourceJobs)){
 const actual=rules.resolve(grouped.get(job)).planTimeline;
 const expected=g.records.map(r=>({date:r.date,process:r.process,sourceMonth:'2026-10'})).sort((a,b)=>a.date.localeCompare(b.date)||a.process.localeCompare(b.process));
 assert.deepEqual(actual,expected,job+' monthly source coordinates');
}
const counts={},jobs={};
for(const r of [...core,migration.appendCoreValue]){
 if(r[2]!=='B')continue;
 const x={projectId:r[0],orderId:r[1],state:r[27],deliveryState:r[25],actualDelivery:r[37],...(grouped.has(r[1])?rules.resolve(grouped.get(r[1])):{})};
 const classification=rules.classify(x,'2026-10-06');counts[classification]=(counts[classification]||0)+1;(jobs[classification]||=[]).push(r[1]);
}
assert.ok(jobs['출고대기'].includes('251215A-144-05'));assert.ok(jobs['출고대기'].includes('260601A-039-02'));assert.ok(jobs['출고대기'].includes('260626A-046'));
assert.ok(jobs['확인 필요'].includes('261002A-094'));assert.equal(new Set([...core,migration.appendCoreValue].map(r=>r[0])).size,core.length+1);
console.log(JSON.stringify({status:'LOCAL_PREPARED_PASS',baselineMikoAssembly:'2026-10-01',correctedMikoAssembly:fixed.planAssembly,sourceJobsVerified:Object.keys(migration.sourceJobs).length,counts,jobs,productionWrites:0},null,2));
