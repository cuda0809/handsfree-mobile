import test from 'node:test';import assert from 'node:assert/strict';
import {accountHarness,cookies} from './helpers/account-http.mjs';
test('real API, signed transport and isolated GAS complete signup, approval, login, password change, revocation and logout',async()=>{
 const h=accountHarness(),call=h.call;
 const member={username:'worker08',password:'isolated-user-password',confirmPassword:'isolated-user-password',name:'이성호'};
 try{
  assert.equal((await call()).body.user,null);
  const mismatch=await call({action:'account-signup',...member,confirmPassword:'not-matching'});assert.equal(mismatch.body.error,'password_confirmation_mismatch');
  const signup=await call({action:'account-signup',...member});assert.equal(signup.code,200);assert.equal(signup.body.pending,true);assert.equal(signup.headers['Set-Cookie'],undefined);
  assert.equal((await call({action:'account-signup',...member})).body.error,'username_taken');
  assert.equal((await call({action:'account-login',...member})).body.error,'account_pending');
  assert.equal((await call({action:'account-approve',username:member.username})).code,403);
  const master={username:'master.test',password:'isolated-master-password',confirmPassword:'isolated-master-password',name:'이상준'};
  assert.equal((await call({action:'account-signup',...master})).body.pending,true);
  h.f.c.approveHandsFreeMasterAccount(); // Only the isolated property fixture is changed.
  const owner=await call({action:'account-login',...master});assert.equal(owner.code,200);assert.equal(owner.body.user.isMaster,true);assert.equal(owner.body.user.team,'B');const ownerCookie=cookies(owner);
  const pending=await call({action:'account-pending'},ownerCookie);assert.equal(pending.code,200);assert.ok(pending.body.accounts.some(a=>a.username===member.username));assert.doesNotMatch(JSON.stringify(pending.body),/"hash"|"salt"/);
  assert.equal((await call({action:'account-approve',username:member.username},ownerCookie)).code,200);
  assert.equal((await call({action:'account-login',...member,password:'wrong-password'})).body.error,'account_denied');
  const login=await call({action:'account-login',...member});assert.equal(login.code,200);assert.equal(login.body.user.memberId,'HFU-008');assert.equal(login.body.user.isMaster,false);const session=cookies(login);
  assert.equal((await call(undefined,session)).body.user.label,'이성호');
  assert.equal((await call({action:'account-pending'},session)).code,403);
  const change={action:'account-change',...member,newPassword:'replacement-user-password',confirmPassword:'replacement-user-password'};
  assert.equal((await call(change,ownerCookie)).body.error,'account_denied');
  const changed=await call(change,session);assert.equal(changed.code,200);assert.equal((await call(undefined,cookies(changed))).body.user.memberId,'HFU-008');
  assert.equal((await call(undefined,session)).body.user,null);
  assert.equal((await call({action:'account-login',...member})).body.error,'account_denied');
  const next=await call({action:'account-login',...member,password:change.newPassword});assert.equal(next.code,200);
  const out=await call({action:'logout'},cookies(next));assert.equal(out.code,200);assert.ok(out.headers['Set-Cookie'].every(c=>c.includes('Max-Age=0')));
  assert.equal((await call({action:'account-login',...member},'','https://foreign.fixture')).code,403);
  for(const body of h.upstreamBodies){assert.ok(!body.includes(member.password));assert.ok(!body.includes(master.password));assert.ok(!body.includes(change.newPassword));}
 }finally{h.close();}
});
