import {memberCall as liveCall,memberAuthenticate as liveAuthenticate} from '../lib/member-auth.mjs';
import {sa2Person} from '../lib/sa2-auth.mjs';
import {sameOrigin} from '../lib/person-auth.mjs';
import {adminCookie,adminVerified} from '../lib/admin-session.mjs';
import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse} from '@simplewebauthn/server';
export async function deviceHandler(req,res,{memberCall=liveCall,memberAuthenticate=liveAuthenticate}={}){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'method_not_allowed'});
 if(!sameOrigin(req))return res.status(403).json({ok:false,error:'invalid_origin'});
 const person=sa2Person(req);if(!person?.member)return res.status(401).json({ok:false,error:'registration_required'});
 try{
  const profile=(await memberCall({action:'check',member:person.member})).member;
  if(!profile.isMaster)throw Error('master_required');
  const action=String(req.body?.action||''),origin=String(req.headers.origin||''),rpID=new URL(origin).hostname;
  if(new URL(origin).protocol!=='https:')throw Error('invalid_origin');
  const call=b=>memberCall({...b,member:person.member});
  if(action==='pin-unlock'){
   const p=await memberAuthenticate({action:'login',name:profile.name,pin:req.body.pin});
   if(!p.isMaster||p.id!==person.member.id||p.version!==person.member.version)throw Error('master_required');
   res.setHeader('Set-Cookie',adminCookie(person.member));return res.status(200).json({ok:true,unlocked:true});
  }
  const device=(await call({action:'device-get'})).device;
  if(action==='status')return res.status(200).json({ok:true,registered:!!device,unlocked:adminVerified(req,person.member)});
  if(action==='register-options'){
   if(!adminVerified(req,person.member))throw Error('admin_unlock_required');
   const options=await generateRegistrationOptions({rpName:'HandsFree 마스터',rpID,userName:profile.id,userDisplayName:profile.name,userID:new TextEncoder().encode(profile.id),attestationType:'none',supportedAlgorithmIDs:[-7,-257],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'preferred',userVerification:'required'},excludeCredentials:device?[{id:device.id}]:[]});
   await call({action:'device-challenge',challenge:options.challenge,kind:'register',origin});return res.status(200).json({ok:true,options});
  }
  if(action==='unlock-options'){
   if(!device)throw Error('device_not_registered');
   const options=await generateAuthenticationOptions({rpID,allowCredentials:[{id:device.id,transports:device.transports}],userVerification:'required'});
   await call({action:'device-challenge',challenge:options.challenge,kind:'unlock',origin});return res.status(200).json({ok:true,options});
  }
  const pending=(await call({action:'device-pending'})).pending;
  if(!pending||pending.origin!==origin||pending.expires<Date.now())throw Error('challenge_expired');
  if(action==='register-verify'){
   if(!adminVerified(req,person.member)||pending.kind!=='register')throw Error('admin_unlock_required');
   const result=await verifyRegistrationResponse({response:req.body.response,expectedChallenge:pending.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});
   if(!result.verified)throw Error('device_denied');
   const c=result.registrationInfo.credential;
   await call({action:'device-save',challenge:pending.challenge,device:{id:c.id,publicKey:Buffer.from(c.publicKey).toString('base64url'),counter:c.counter,transports:c.transports||[]}});
   return res.status(200).json({ok:true,registered:true});
  }
  if(action==='unlock-verify'){
   if(!device||pending.kind!=='unlock')throw Error('device_denied');
   const result=await verifyAuthenticationResponse({response:req.body.response,expectedChallenge:pending.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true,credential:{...device,publicKey:new Uint8Array(Buffer.from(device.publicKey,'base64url'))}});
   if(!result.verified)throw Error('device_denied');
   await call({action:'device-counter',challenge:pending.challenge,id:device.id,expected:device.counter,counter:result.authenticationInfo.newCounter});
   res.setHeader('Set-Cookie',adminCookie(person.member));return res.status(200).json({ok:true,unlocked:true});
  }
  throw Error('invalid_request');
 }catch(e){const known=/^(registration_required|member_denied|member_locked|invalid_member_input|member_session_revoked|master_required|admin_unlock_required|device_not_registered|challenge_expired|device_denied|invalid_request)$/;return res.status(known.test(e.message)?403:503).json({ok:false,error:known.test(e.message)?e.message:'device_verification_failed'});}
}
export default function handler(req,res){return deviceHandler(req,res);}
