import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import {isoCBOR} from '@simplewebauthn/server/helpers';
import {deviceHandler as handler} from '../lib/master-device-handler.mjs';
import authHandler from '../api/sa2-auth.js';
import {adminCookie,adminVerified} from '../lib/admin-session.mjs';
import {sa2Cookie} from '../lib/sa2-auth.mjs';
const member={id:'HFU-007',version:2},secret='fixture-only-secret',origin='https://fixture.test';
test('short admin session is bound to member version, expires, rejects tampering and never elevates a legacy session',()=>{
 const now=Date.now(),cookie=adminCookie(member,secret,now).split(';')[0],req={headers:{cookie}};
 assert.equal(adminVerified(req,member,secret,now),true);
 assert.equal(adminVerified(req,{...member,version:3},secret,now),false);
 assert.equal(adminVerified(req,member,secret,now+301000),false);
 assert.equal(adminVerified({headers:{cookie:cookie+'tamper'}},member,secret,now),false);
 assert.equal(adminVerified(req,null,secret,now),false);
});
function fixture(){
 const props={},profile={...member,name:'이상준',team:'B',role:'team_lead',isMaster:true};
 const c=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],setProperty:(k,v)=>props[k]=v})},Utilities:{newBlob:s=>({getBytes:()=>Buffer.from(s)})},hfMemberActive_:(_ss,m)=>{if(m?.id!==member.id||m?.version!==member.version)throw Error('member_session_revoked');return profile;}});
 vm.runInContext(fs.readFileSync('apps-script/HF_MASTER_DEVICE.gs','utf8'),c);
 const fetcher=async(_url,opts)=>{const b=JSON.parse(JSON.parse(opts.body).signed);const data=b.action==='check'?{ok:true,member:profile}:c.hfMemberDevice_({},b);return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(data)};};
 const cookie=sa2Cookie({sub:'member-'+member.id,email:'MEMBER:'+member.id,label:'이상준',member},secret).split(';')[0];
 async function call(body,{admin=false,legacy=false}={}){const headers={host:'fixture.test',origin,cookie:legacy?sa2Cookie({sub:'legacy',email:'SA2:이상준',label:'이상준'},secret).split(';')[0]:cookie+(admin?'; '+adminCookie(member,secret).split(';')[0]:'')};const r={headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.code=v;return this;},json(v){this.body=v;return this;}};await handler({method:'POST',headers,body},r,{memberCall:async b=>b.action==='check'?{ok:true,member:profile}:c.hfMemberDevice_({},b)});return r;}
 return {call,c,props,cookie};
}
function credentialFixture(){
 const {publicKey,privateKey}=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'}),jwk=publicKey.export({format:'jwk'}),id=crypto.randomBytes(32);
 const cose=isoCBOR.encode(new Map([[1,2],[3,-7],[-1,1],[-2,new Uint8Array(Buffer.from(jwk.x,'base64url'))],[-3,new Uint8Array(Buffer.from(jwk.y,'base64url'))]]));
 const hash=v=>crypto.createHash('sha256').update(v).digest();
 function data(type,challenge,site=origin){return Buffer.from(JSON.stringify({type,challenge,origin:site,crossOrigin:false}));}
 function registration(challenge){const client=data('webauthn.create',challenge),length=Buffer.alloc(2);length.writeUInt16BE(id.length);const auth=Buffer.concat([hash('fixture.test'),Buffer.from([0x45]),Buffer.alloc(4),Buffer.alloc(16),length,id,cose]);return {id:id.toString('base64url'),rawId:id.toString('base64url'),type:'public-key',clientExtensionResults:{},response:{clientDataJSON:client.toString('base64url'),attestationObject:Buffer.from(isoCBOR.encode(new Map([['fmt','none'],['attStmt',new Map()],['authData',new Uint8Array(auth)]]))).toString('base64url'),transports:['internal']}};}
 function authentication(challenge,{site=origin,uv=true}={}){const client=data('webauthn.get',challenge,site),counter=Buffer.alloc(4);counter.writeUInt32BE(1);const auth=Buffer.concat([hash('fixture.test'),Buffer.from([uv?0x05:0x01]),counter]);return {id:id.toString('base64url'),rawId:id.toString('base64url'),type:'public-key',clientExtensionResults:{},response:{clientDataJSON:client.toString('base64url'),authenticatorData:auth.toString('base64url'),signature:crypto.sign('sha256',Buffer.concat([auth,hash(client)]),privateKey).toString('base64url')}};}
 return {registration,authentication};
}
test('real signed passkey registration and unlock enforce UV, challenge, origin, short admin cookie and replay protection',async()=>{
 const previous={...process.env},before=globalThis.fetch;
 try{
  Object.assign(process.env,{HF_REAL_APP_KEY:secret,HF_REAL_READ_TOKEN:'fixture-token',HF_REAL_READ_URL:'https://fixture.test/exec'});
  const f=fixture();globalThis.fetch=async(_url,opts)=>{const b=JSON.parse(JSON.parse(opts.body).signed);const data=b.action==='check'?{ok:true,member:{...member,name:'이상준',isMaster:true}}:f.c.hfMemberDevice_({},b);return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(data)};};
  assert.equal((await f.call({action:'status'},{legacy:true})).code,401);
  assert.equal((await f.call({action:'register-options'})).body.error,'admin_unlock_required');
  const key=credentialFixture(),options=(await f.call({action:'register-options'},{admin:true})).body.options;
  assert.equal(options.authenticatorSelection.userVerification,'required');
  const enrolled=await f.call({action:'register-verify',response:key.registration(options.challenge)},{admin:true});assert.equal(enrolled.body.registered,true);
  const unlock=(await f.call({action:'unlock-options'})).body.options;
  assert.equal((await f.call({action:'unlock-verify',response:key.authentication(unlock.challenge,{uv:false})})).code,503);
  assert.equal((await f.call({action:'unlock-verify',response:key.authentication(unlock.challenge,{site:'https://evil.test'})})).code,503);
  const bad=key.authentication(unlock.challenge);bad.response.signature=crypto.randomBytes(70).toString('base64url');assert.equal((await f.call({action:'unlock-verify',response:bad})).code,503);
  const accepted=await f.call({action:'unlock-verify',response:key.authentication(unlock.challenge)});assert.equal(accepted.body.unlocked,true);
  assert.equal(adminVerified({headers:{cookie:accepted.headers['Set-Cookie'].split(';')[0]}},member,secret),true);
  assert.equal((await f.call({action:'unlock-verify',response:key.authentication(unlock.challenge)})).body.error,'challenge_expired');
  const res={setHeader(){},status(v){this.code=v;return this;},json(v){this.body=v;return this;}};
  await authHandler({method:'POST',headers:{host:'fixture.test',origin,cookie:f.cookie},body:{action:'admin-list'}},res);assert.equal(res.body.error,'admin_unlock_required');
 }finally{globalThis.fetch=before;for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);}
});
