import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import {memberAuthenticate,memberPinHash,memberCodeHash,memberAdmin} from '../lib/member-auth.mjs';
import {sa2Cookie} from '../lib/sa2-auth.mjs';
import {authUser,signedMemberActor} from '../lib/sa2-auth-user.mjs';
import authHandler from '../api/sa2-auth.js';
import writeHandler from '../api/sa2-write.js';
function fixture(){
 const props={HF_MEMBER_AUTH_OPEN:'OPEN',HF_REAL_READ_TOKEN:'fixture-secret'},rows=[['HFU-001','관리자','ALL','factory_manager','ACTIVE','1','','','','','0','0',''],['HFU-002','팀장','A','team_lead','ACTIVE','1','','','','','0','0',''],['HFU-003','팀원','A','member','INVITED','1','','',memberCodeHash('1234567890abcdef12345678'),String(Date.now()+3600000),'0','0','']];
 let headers=[];const sheet={getLastRow:()=>rows.length+1,getRange:(r,col,n,w)=>({getDisplayValues:()=>r===1?[headers]:rows.slice(r-2,r-2+n).map(v=>v.slice(col-1,col-1+w)),setValues:v=>{rows[r-2]=v[0].map(String);}})};
 const core={getLastRow:()=>3,getRange:()=>({getDisplayValues:()=>[['PA','260101A-001','A'],['PB','260101A-002','B']]})};
 const ss={getSheetByName:n=>n==='HF_AUTH_사용자'?sheet:core};
 const c=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==='HF_MEMBER_REGISTRY_V1'?JSON.stringify({schema:1,rows}):props[k],setProperty:(k,v)=>{if(k==='HF_MEMBER_REGISTRY_V1'){rows.splice(0,rows.length,...JSON.parse(v).rows);}else props[k]=v;}})},SpreadsheetApp:{openById:()=>ss,flush(){}},HF_SPREADSHEET_ID:'fixture',HF_TOKEN_KEY:'HF_REAL_READ_TOKEN',LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},Utilities:{newBlob:s=>({getBytes:()=>Buffer.from(s)}),Charset:{UTF_8:'utf8'},computeHmacSha256Signature:(s,t)=>crypto.createHmac('sha256',t).update(s).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url')}});
 vm.runInContext(fs.readFileSync('apps-script/HF_MEMBER_AUTH.gs','utf8'),c);headers=Array.from(c.HF_MEMBER.headers);
 async function call(body){const signed=JSON.stringify({...body,at:Date.now(),nonce:crypto.randomUUID()}),signature=crypto.createHmac('sha256',props.HF_REAL_READ_TOKEN).update(signed).digest('base64url');return c.hfLightAuthDispatch_({signed,signature});}
 return {c,call,rows,ss,props};
}
test('one-use invitation enrollment and personal PIN login never expose raw PIN or invitation',async()=>{
 const f=fixture(),p=await memberAuthenticate({action:'enroll',name:'팀원',pin:'619283',confirmPin:'619283',code:'1234567890abcdef12345678'},f.call);
 assert.equal(p.id,'HFU-003');assert.equal(p.version,2);assert.equal(f.rows[2][8],'');assert.equal(f.rows[2][4],'ACTIVE');assert.equal(f.rows[2][7],memberPinHash('619283',f.rows[2][6]));assert.ok(!f.rows[2].includes('619283'));
 await assert.rejects(memberAuthenticate({action:'enroll',name:'팀원',pin:'619283',confirmPin:'619283',code:'1234567890abcdef12345678'},f.call),/already_registered/);
 assert.equal((await memberAuthenticate({action:'login',name:'팀원',pin:'619283'},f.call)).id,'HFU-003');
 await assert.rejects(memberAuthenticate({action:'login',name:'팀원',pin:'000000'},f.call),/member_denied/);
});
test('account attempt lock is persistent and enrollment cannot grant a different identity',async()=>{
 const f=fixture();for(let i=0;i<5;i++)await assert.rejects(memberAuthenticate({action:'enroll',name:'팀원',pin:'619283',confirmPin:'619283',code:'ffffffffffffffffffffffff'},f.call),/member_denied/);
 await assert.rejects(f.call({action:'lookup',name:'팀원'}),/member_locked/);assert.ok(Number(f.rows[2][11])>Date.now());
 const g=fixture();g.rows[2][9]='0';await assert.rejects(memberAuthenticate({action:'enroll',name:'팀원',pin:'619283',confirmPin:'619283',code:'1234567890abcdef12345678'},g.call),/member_denied/);
});
test('server enforces team, shared-state correction role, revocation and legacy write cutoff',async()=>{
 const f=fixture();f.rows[2][4]='ACTIVE';const actor=id=>({sub:'member-'+id+'|팀원',member:{id,version:1}}),b={actor:actor('HFU-003'),action:'edit'};
 assert.doesNotThrow(()=>f.c.hfMemberWrite_(f.ss,b,'260101A-001','journal'));
 assert.throws(()=>f.c.hfMemberWrite_(f.ss,b,'260101A-002','photo'),/team_forbidden/);
 assert.throws(()=>f.c.hfMemberWrite_(f.ss,b,'260101A-001','state'),/team_lead_required/);
 assert.doesNotThrow(()=>f.c.hfMemberWrite_(f.ss,{actor:actor('HFU-002')},'260101A-001','schedule'));
 assert.doesNotThrow(()=>f.c.hfMemberWrite_(f.ss,{actor:actor('HFU-001')},'260101A-002','state'));
 assert.throws(()=>f.c.hfMemberActor_(f.ss,{action:'edit',actor:{}}),/registration_required/);
 assert.doesNotThrow(()=>f.c.hfMemberActor_(f.ss,{action:'core',actor:{}}));
 f.rows[2][5]='2';assert.throws(()=>f.c.hfMemberWrite_(f.ss,b,'260101A-001','journal'),/member_session_revoked/);f.rows[2][4]='DISABLED';await assert.rejects(f.call({action:'check',member:{id:'HFU-003',version:2}}),/member_session_revoked/);
});
test('signed individual session fixes identity and propagates only member ID/version',()=>{
 const old={...process.env};try{process.env.HF_REAL_APP_KEY='unit-key';process.env.HF_REAL_ALLOWED_USERS='{"service@example.test":"writer"}';delete process.env.HF_SA2_WRITER_EMAIL;
 const cookie=sa2Cookie({sub:'member-HFU-003',email:'MEMBER:HFU-003',label:'팀원',member:{id:'HFU-003',version:2}}).split(';')[0],p=authUser({headers:{cookie}});
 assert.equal(p.sub,'member-HFU-003|팀원');assert.deepEqual(signedMemberActor(p).member,{id:'HFU-003',version:2});assert.equal(signedMemberActor(p).email,'service@example.test');
 assert.equal(authUser({headers:{cookie:cookie.replace('hf_sa2_person=','hf_sa2_person=bad')}}),null);
 }finally{for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old);}
});
test('auth HTTP handler fails closed for missing config, foreign origin, short personal PIN and absent backend',async()=>{
 const old={...process.env};async function call(method,body,origin='https://fixture.test'){const r={headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(b){this.body=b;return this;}};await authHandler({method,body,headers:{host:'fixture.test',origin,'x-forwarded-for':'fixture-http'}},r);return r;}
 try{delete process.env.HF_REAL_APP_KEY;delete process.env.HF_REAL_READ_TOKEN;assert.equal((await call('GET')).code,503);process.env.HF_REAL_APP_KEY='fixture-key';
 assert.equal((await call('POST',{action:'enroll'},'https://other.test')).code,403);
 const short=await call('POST',{action:'member-login',name:'검증자',pin:'1234'});assert.equal(short.code,401);assert.equal(short.body.error,'invalid_member_input');assert.equal(short.headers['Set-Cookie'],undefined);
 const missing=await call('POST',{action:'enroll',name:'검증자',pin:'619283',confirmPin:'619283',code:'fixture-code-12345678'});assert.equal(missing.code,503);assert.equal(missing.body.error,'auth_unavailable');assert.equal(missing.headers['Set-Cookie'],undefined);
 assert.equal((await call('GET')).body.memberEnabled,false);
 }finally{for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old);}
});
test('journal authorization validates exact signed text, selected job and general-event lane before queue writes',()=>{
 const f=fixture();f.rows[2][4]='ACTIVE';f.c.hfLsActor_=proof=>f.c.hfMemberActor_(f.ss,JSON.parse(proof.signed));
 const body={text:'조립 진행',targetHint:'260101A-001',source:'MOBILE|UNIFIED_EVENT'},actor={sub:'member-HFU-003|팀원',member:{id:'HFU-003',version:1},email:'service@example.test'};
 body.memberProof={signed:JSON.stringify({...body,action:'journal-write',actor})};f.c.hfMemberJournal_(body,f.ss);assert.equal(body.requester,'HFU-003|팀원');assert.match(body.source,/SA2:팀원/);
 assert.throws(()=>f.c.hfMemberJournal_({...body,text:'다른 내용'},f.ss),/member_denied/);
 const foreign={text:'조립 진행',targetHint:'260101A-002',source:'MOBILE|UNIFIED_EVENT'};foreign.memberProof={signed:JSON.stringify({...foreign,action:'journal-write',actor})};assert.throws(()=>f.c.hfMemberJournal_(foreign,f.ss),/team_forbidden/);
 const general={text:'인원지원 기록',targetHint:'GENERAL_ISSUE',source:'MOBILE|GENERAL_EVENT'};general.memberProof={signed:JSON.stringify({...general,action:'journal-write',actor})};assert.doesNotThrow(()=>f.c.hfMemberJournal_(general,f.ss));assert.equal(general.source,'MOBILE|GENERAL_EVENT|SA2:팀원');
});
test('write API binds the authenticated member and exact input to a proof instead of trusting caller identity',async()=>{
 const old={...process.env},fetchBefore=globalThis.fetch;try{Object.assign(process.env,{HF_REAL_APP_KEY:'fixture-key',HF_REAL_READ_TOKEN:'fixture-token',HF_REAL_READ_URL:'https://fixture.test/exec',HF_REAL_ALLOWED_USERS:'{"service@example.test":"writer"}'});delete process.env.HF_SA2_WRITER_EMAIL;
 const cookie=sa2Cookie({sub:'member-HFU-003',email:'MEMBER:HFU-003',label:'팀원',member:{id:'HFU-003',version:2}}).split(';')[0];let sent;
 globalThis.fetch=async(_,opts)=>{sent=JSON.parse(opts.body);return {ok:true,text:async()=>JSON.stringify({ok:true,status:'QUEUED',requestId:'fixture-request'})};};
 const r={setHeader(){},status(v){this.code=v;return this;},json(v){this.body=v;return this;}};await writeHandler({method:'POST',headers:{host:'fixture.test',origin:'https://fixture.test',cookie},body:{text:'조립 진행',source:'MOBILE|UNIFIED_EVENT',targetHint:'260101A-001',requester:'위조',member:{id:'HFU-001',version:1}}},r);
 assert.equal(r.code,200);const proof=JSON.parse(sent.memberProof.signed);assert.equal(proof.actor.member.id,'HFU-003');assert.equal(proof.text,sent.text);assert.equal(proof.targetHint,sent.targetHint);assert.equal(sent.memberProof.signature,crypto.createHmac('sha256','fixture-token').update(sent.memberProof.signed).digest('base64url'));
 }finally{globalThis.fetch=fetchBefore;for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old);}
});

test('master is a pinned server identity, separate from factory manager and team lead',()=>{
 const f=fixture();f.rows.push(['HFU-007','이상준','B','team_lead','ACTIVE','1','','','','','0','0','','MASTER']);
 const b={actor:{member:{id:'HFU-007',version:1}}};
 for(const job of ['260101A-001','260101A-002'])for(const kind of ['journal','photo','state','schedule'])assert.doesNotThrow(()=>f.c.hfMemberWrite_(f.ss,b,job,kind));
 f.rows[3][1]='다른사람';assert.throws(()=>f.c.hfMemberWrite_(f.ss,b,'260101A-001','state'),/member_denied/);
 f.rows[3][1]='이상준';f.rows[3][2]='ALL';assert.throws(()=>f.c.hfMemberActive_(f.ss,b.actor.member),/member_denied/);
});

test('owner-only migration preserves existing employee writes without allowing legacy master administration',async()=>{
 const f=fixture();f.props.HF_MEMBER_AUTH_PHASE='OWNER_ONLY';
 const legacy={action:'edit',actor:{email:'legacy@example.test'}};
 assert.equal(f.c.hfMemberActor_(f.ss,legacy),legacy);
 assert.doesNotThrow(()=>f.c.hfMemberWrite_(f.ss,legacy,'260101A-001','state'));
 assert.doesNotThrow(()=>f.c.hfMemberJournal_({text:'기존 입력',source:'MOBILE'},f.ss));
 await assert.rejects(f.call({action:'admin-list',member:null}),/registration_required/);
 f.rows.push(['HFU-007','이상준','B','team_lead','ACTIVE','1','','','','','0','0','','MASTER']);
 assert.equal((await f.call({action:'check',member:{id:'HFU-007',version:1}})).member.isMaster,true);
});

test('only pinned B-team master can manage users; changes revoke sessions and preserve audit without secrets',async()=>{
 const f=fixture();f.rows.push(['HFU-007','이상준','B','team_lead','ACTIVE','1','','','','','0','0','','MASTER']);
 const owner={id:'HFU-007',version:1};
 const list=await memberAdmin(owner,{action:'admin-list'},f.call);assert.equal(list.members.length,4);assert.equal(list.members[3].team,'B');assert.equal(list.members[3].role,'team_lead');assert.equal(list.members[3].isMaster,true);assert.ok(!JSON.stringify(list).includes('619283'));
 await assert.rejects(memberAdmin({id:'HFU-001',version:1},{action:'admin-list'},f.call),/master_required/);
 await assert.rejects(memberAdmin(owner,{action:'admin-block',id:'HFU-007',expected:1},f.call),/owner_protected/);
 await assert.rejects(memberAdmin(owner,{action:'admin-permissions',id:'HFU-002',expected:1,team:'ALL',role:'master'},f.call),/invalid_permissions/);
 const updated=await memberAdmin(owner,{action:'admin-permissions',id:'HFU-002',expected:1,team:'B',role:'team_lead'},f.call);assert.equal(updated.member.version,2);assert.equal(f.rows[1][2],'B');
 await assert.rejects(f.call({action:'check',member:{id:'HFU-002',version:1}}),/member_session_revoked/);
 await assert.rejects(memberAdmin(owner,{action:'admin-block',id:'HFU-002',expected:1},f.call),/stale_record/);
 await memberAdmin(owner,{action:'admin-block',id:'HFU-002',expected:2},f.call);assert.equal(f.rows[1][4],'BLOCKED');
 await assert.rejects(memberAdmin(owner,{action:'admin-approve',id:'HFU-002',expected:3},f.call),/invitation_required/);
 const invite=await memberAdmin(owner,{action:'admin-invite',id:'HFU-002',expected:3},f.call);assert.equal(invite.invitation.length,24);assert.equal(f.rows[1][8],memberCodeHash(invite.invitation));assert.ok(!f.props.HF_MEMBER_AUDIT_V1.includes(invite.invitation));assert.equal(f.rows[1][4],'INVITED');
 assert.ok(f.props.HF_MEMBER_REGISTRY_ROLLBACK_V1);assert.ok(JSON.parse(f.props.HF_MEMBER_AUDIT_V1).length>=3);
});
