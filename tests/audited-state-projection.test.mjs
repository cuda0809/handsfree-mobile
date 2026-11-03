import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({});vm.runInContext(fs.readFileSync('apps-script/HF_LIGHT_APP.gs','utf8'),c);
function fixture(){const r=Array(19).fill('');Object.assign(r,{0:'ISS-1',3:'JOB-1',8:'MONITOR',16:'연구소 이관 완료',17:'2026-10-24',18:'기존 미해결 이력 확인'});const a=Array(12).fill('');Object.assign(a,{0:'request-1',1:'2026-10-24T01:00:00Z',2:'JOB-1',3:'ISS-1',7:JSON.stringify(r),10:'APPLIED'});return {r,a,p:{orderId:'JOB-1',projectId:'PRJ-1',state:'테스트 진행',currentIssue:'부품 대기',actualDelivery:'',updatedAt:'2026-10-24T00:00:00Z'}};}
test('audited state survives lagging Core; identity, issue and shipment preserved',()=>{const {r,a,p}=fixture();const x=c.hfAppAuditedState_([p],[r],[a],[])[0];assert.equal(x.state,r[16]);assert.equal(x.nextAction,r[18]);assert.equal(x.projectId,p.projectId);assert.equal(x.currentIssue,p.currentIssue);assert.equal(x.actualDelivery,'');assert.equal(p.state,'테스트 진행');});
test('changed canonical row and wrong project never inherit old audit',()=>{const {r,a,p}=fixture();r[16]='다른 변경';assert.equal(c.hfAppAuditedState_([p],[r],[a],[])[0].state,p.state);a[2]='OTHER';assert.equal(c.hfAppAuditedState_([p],[r],[a],[])[0].state,p.state);});
test('newer confirmed event supersedes audit, with KST timestamp normalization',()=>{const {r,a,p}=fixture();p.stateEvidence={entryId:'EV-1'};const e=['EV-1','2026-10-24 11:00:00 KST'];assert.equal(c.hfAppAuditedState_([p],[r],[a],[e])[0].state,p.state);e[1]='2026-10-24 09:00:00 KST';assert.equal(c.hfAppAuditedState_([p],[r],[a],[e])[0].state,r[16]);});
