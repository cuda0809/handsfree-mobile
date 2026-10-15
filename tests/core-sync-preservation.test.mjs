import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('apps-script/HF_CORE_SYNC.gs','utf8');
const c=vm.createContext({});vm.runInContext(source,c);
function row(id,job,fields={}){const r=Array(40).fill('');Object.assign(r,{0:id,1:job},fields);return r;}
test('snapshot retains operational fields, overridden dates and absent equipment without mutating inputs',()=>{
 const a=row('PRJ1','JOB1',{6:'2026-11-10',27:'전장 완료',28:'프로그램',37:'2026-10-15'}),b=row('PRJ2','JOB2');
 const next=row('NEW','JOB1',{6:'2026-11-01'}),before=JSON.stringify([a,b,next]);
 const out=c.hfCorePreserveSnapshot_([a,b],[next]);assert.equal(out.length,2);assert.equal(out[0][0],'PRJ1');
 for(const i of [6,27,28,37])assert.equal(out[0][i],a[i]);assert.match(out[0][38],/REVIEW_DATE_CONFLICT/);
 assert.equal(JSON.stringify([a,b,next]),before);
});
test('duplicate jobs and project IDs fail closed before snapshot application',()=>{
 const a=row('PRJ1','JOB1');assert.throws(()=>c.hfCorePreserveSnapshot_([a,a],[]),/duplicate_existing_job/);
 assert.throws(()=>c.hfCorePreserveSnapshot_([],[a,a]),/duplicate_candidate_job/);
 assert.throws(()=>c.hfCorePreserveSnapshot_([a],[row('PRJ1','JOB2')]),/duplicate_or_missing_project_id/);
});
test('explicit closed state clears next action and shared lock always releases',()=>{
 assert.equal(c.hfCorePreserveSnapshot_([row('PRJ1','JOB1',{28:'진행'})],[row('PRJ1','JOB1',{27:'출고완료'})])[0][28],'');
 let release=0,allow=true;c.LockService={getScriptLock:()=>({tryLock:()=>allow,releaseLock:()=>release++})};
 c.hfCoreBuildSync_=()=>{throw Error('fixture failure');};assert.throws(()=>c.hfCoreSync_('TEST'),/fixture failure/);assert.equal(release,1);
 allow=false;assert.throws(()=>c.hfCoreSync_('TEST'),/core_sync_busy/);assert.equal(release,1);
});
