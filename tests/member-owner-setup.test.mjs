import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
function fixture(){
 const props={};const service={getProperty:k=>props[k]||null,setProperty:(k,v)=>props[k]=v};
 const c=vm.createContext({PropertiesService:{getScriptProperties:()=>service},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},Utilities:{getUuid:crypto.randomUUID,DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(a,v)=>Array.from(crypto.createHash(a).update(v).digest())}});
 vm.runInContext(fs.readFileSync('apps-script/HF_MEMBER_AUTH.gs','utf8'),c);
 vm.runInContext(fs.readFileSync('apps-script/HF_MEMBER_OWNER_SETUP.gs','utf8'),c);
 return {c,props};
}
test('owner provisioning is closed, credential-free for other members, and never overwrites an existing registry',()=>{
 const {c,props}=fixture();const result=c.prepareHandsFreeOwnerOnly();assert.equal(result.gate,'CLOSED');assert.equal(props.HF_MEMBER_AUTH_OPEN,undefined);
 const snapshot=JSON.parse(props.HF_MEMBER_REGISTRY_V1);assert.equal(snapshot.rows.length,12);
 const owner=snapshot.rows.find(r=>r[0]==='HFU-007');assert.equal(owner[2],'B');assert.equal(owner[3],'team_lead');assert.equal(owner[13],'MASTER');
 assert.equal(owner[8],crypto.createHash('sha256').update(props.HF_MEMBER_OWNER_INVITE_ONCE).digest('hex'));
 for(const r of snapshot.rows.filter(r=>r[0]!=='HFU-007')){assert.equal(r[4],'BLOCKED');assert.equal(r.slice(6,10).join(''),'');}
 const original=props.HF_MEMBER_REGISTRY_V1;assert.throws(()=>c.prepareHandsFreeOwnerOnly(),/registry_exists/);assert.equal(props.HF_MEMBER_REGISTRY_V1,original);
 assert.equal(c.activateHandsFreeOwnerOnly().gate,'OPEN');
});
test('activation refuses a changed rollout scope and expired owner invitation',()=>{
 const {c,props}=fixture();c.prepareHandsFreeOwnerOnly();const snapshot=JSON.parse(props.HF_MEMBER_REGISTRY_V1);
 snapshot.rows[0][4]='INVITED';props.HF_MEMBER_REGISTRY_V1=JSON.stringify(snapshot);assert.throws(()=>c.activateHandsFreeOwnerOnly(),/rollout_scope_changed/);
 snapshot.rows[0][4]='BLOCKED';snapshot.rows[6][9]='1';props.HF_MEMBER_REGISTRY_V1=JSON.stringify(snapshot);assert.throws(()=>c.activateHandsFreeOwnerOnly(),/owner_not_ready/);
});
