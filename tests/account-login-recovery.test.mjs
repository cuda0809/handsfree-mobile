import test from 'node:test';
import assert from 'node:assert/strict';
import {accountHarness} from './helpers/account-http.mjs';

test('a worker failed logins do not lock another account on the same office connection',async()=>{
 const h=accountHarness();
 try{
  const owner={username:'owner.recovery',name:'이상준',password:'owner-fixture-password',confirmPassword:'owner-fixture-password'};
  await h.call({action:'account-signup',...owner});h.f.c.approveHandsFreeMasterAccount();
  for(let i=0;i<5;i++)await h.call({action:'account-login',username:'unknown.recovery',password:'wrong-fixture-password'});
  assert.equal((await h.call({action:'account-login',username:owner.username,password:owner.password})).code,200);
  assert.equal((await h.call({action:'account-login',username:'unknown.recovery',password:'wrong-fixture-password'})).code,429);
 }finally{h.close();}
});

test('upstream connection failures never consume the password failure budget',async()=>{
 const h=accountHarness();
 try{
  const owner={username:'owner.outage',name:'이상준',password:'owner-fixture-password',confirmPassword:'owner-fixture-password'};
  await h.call({action:'account-signup',...owner});h.f.c.approveHandsFreeMasterAccount();
  const url=process.env.HF_REAL_READ_URL;process.env.HF_REAL_READ_URL='https://unavailable.fixture/exec';
  for(let i=0;i<6;i++)assert.equal((await h.call({action:'account-login',...owner})).body.error,'auth_unavailable');
  process.env.HF_REAL_READ_URL=url;
  assert.equal((await h.call({action:'account-login',...owner})).code,200);
 }finally{h.close();}
});
