import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {accountAuthenticate,accountId} from '../lib/account-auth.mjs';
import {fixture} from './helpers/account-fixture.mjs';
const signup={action:'account-signup',username:'worker08',name:'이성호',password:'fixture-password-123',confirmPassword:'fixture-password-123'};
const owner={id:'HFU-007',version:1};
test('signup never grants access from a name, accepts no caller role, preserves legacy writes',async()=>{
 const f=fixture();assert.equal((await accountAuthenticate({...signup,isMaster:true,role:'factory_manager'},null,f.call)).pending,true);
 assert.equal(JSON.parse(f.props.HF_MEMBER_REGISTRY_V1).rows[1][4],'BLOCKED');
 await assert.rejects(accountAuthenticate({...signup,action:'account-login'},null,f.call),/account_pending/);
 assert.doesNotThrow(()=>f.c.hfMemberActor_({}, {actor:{},action:'edit'}));
 assert.ok(!JSON.stringify(f.props).includes(signup.password));
 await assert.rejects(accountAuthenticate(signup,null,f.call),/username_taken/);
 await assert.rejects(accountAuthenticate({...signup,username:'otherid'},null,f.call),/member_account_exists/);
 await assert.rejects(f.call({action:'account-approve',username:signup.username,member:{id:'HFU-008',version:1}}),/member_session_revoked/);
});
test('approval pins roster team and privilege, password login, persistent lock and rejection',async()=>{
 const f=fixture();await accountAuthenticate(signup,null,f.call);await f.call({action:'account-approve',username:signup.username,member:owner});
 const d=await accountAuthenticate({...signup,action:'account-login'},null,f.call);assert.equal(d.profile.id,'HFU-008');assert.equal(d.profile.team,'B');assert.equal(d.profile.isMaster,false);
 for(let i=0;i<5;i++)await assert.rejects(accountAuthenticate({...signup,action:'account-login',password:'wrong-password'},null,f.call),/account_denied/);
 await assert.rejects(accountAuthenticate({...signup,action:'account-login'},null,f.call),/member_locked/);
 const g=fixture();await accountAuthenticate(signup,null,g.call);await g.call({action:'account-reject',username:signup.username,member:owner});assert.equal((await accountAuthenticate({...signup,username:'newworker'},null,g.call)).pending,true);
});
test('password change requires current password and identity; revokes old sessions',async()=>{
 const f=fixture();await accountAuthenticate(signup,null,f.call);await f.call({action:'account-approve',username:signup.username,member:owner});
 const before=(await accountAuthenticate({...signup,action:'account-login'},null,f.call)).profile;
 const change={...signup,action:'account-change',newPassword:'replacement-password',confirmPassword:'replacement-password'};
 await assert.rejects(accountAuthenticate(change,owner,f.call),/account_denied/);
 const r=await accountAuthenticate(change,{id:before.id,version:before.version},f.call);assert.equal(r.member.version,before.version+1);
 await assert.rejects(f.call({action:'check',member:{id:before.id,version:before.version}}),/member_session_revoked/);
 await assert.rejects(accountAuthenticate({...signup,action:'account-login'},null,f.call),/account_denied/);
 assert.equal((await accountAuthenticate({...signup,action:'account-login',password:change.newPassword},null,f.call)).profile.id,before.id);
});
test('account inputs reject short passwords and malformed identifiers, preserve whitespace passwords',async()=>{
 assert.throws(()=>accountId('../admin'),/invalid_username/);assert.equal(accountId(' Worker08 '),'worker08');
 const f=fixture();await assert.rejects(accountAuthenticate({...signup,password:'1234',confirmPassword:'1234'},null,f.call),/invalid_password/);
 await assert.rejects(accountAuthenticate({...signup,confirmPassword:'different'},null,f.call),/password_confirmation_mismatch/);
});
test('login and management UI show username and password without PIN or invitation choices',()=>{
 for(const path of ['kmt-sa2/account.html','kmt-sa2/account.js','kmt-sa2/members.html','kmt-sa2/master-unlock.js']){const s=fs.readFileSync(path,'utf8');assert.doesNotMatch(s,/개인 PIN|기존.*PIN|초대코드|inputmode="numeric"/);}
 const html=fs.readFileSync('kmt-sa2/account.html','utf8');assert.match(html,/autocomplete="username"/);assert.match(html,/autocomplete="current-password"/);assert.match(html,/회원가입/);
});

test('old login address is only a redirect and worker migrates only retired login windows',async()=>{
 const html=fs.readFileSync('kmt-sa2/login.html','utf8');assert.doesNotMatch(html,/inviteCode|pinLabel|memberModes|<input/);assert.match(html,/account\.html/);
 const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));assert.ok(config.redirects.some(r=>r.source==='/kmt-sa2/login.html'&&r.destination.startsWith('/kmt-sa2/account.html')));
 const listeners={},moves=[],waits=[];const origin='https://fixture.test';const clients=['/kmt-sa2/login.html?manage=1','/kmt-sa2/','/kmt-sa2/account.html','https://other.test/kmt-sa2/login.html'].map(p=>({url:p.startsWith('https:')?p:origin+p,navigate:async url=>moves.push(url)}));
 const c=vm.createContext({URL,location:{origin},self:{location:{origin},registration:{scope:origin+'/kmt-sa2/'},clients:{claim:async()=>{},matchAll:async()=>clients},addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn)},caches:{keys:async()=>[],delete:async()=>{throw Error('unexpected cache deletion');}}});
 vm.runInContext(fs.readFileSync('kmt-sa2/sw.js','utf8'),c);for(const fn of listeners.activate)fn({waitUntil:p=>waits.push(p)});await Promise.all(waits);assert.deepEqual(moves,['/kmt-sa2/account.html?manage=1']);
});
