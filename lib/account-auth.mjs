import crypto from 'node:crypto';
import {memberCall,memberEqual,memberPinHash,memberProfile} from './member-auth.mjs';
export function accountId(value){const id=String(value||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9._-]{3,31}$/.test(id))throw Error('invalid_username');return id;}
function password(value){if(typeof value!=='string'||value.length<10||value.length>128)throw Error('invalid_password');return value;}
function hash(value){const salt=crypto.randomBytes(16).toString('base64url');return {salt,hash:memberPinHash(password(value),salt)};}
export async function accountAuthenticate(body,identity,call=memberCall){
 const action=body.action,username=accountId(body.username);
 if(action==='account-signup'){
  const name=String(body.name||'').trim();if(!name||name.length>30)throw Error('invalid_member_input');
  if(body.password!==body.confirmPassword)throw Error('password_confirmation_mismatch');
  return call({action:'account-signup',username,name,...hash(body.password)});
 }
 const row=(await call({action:'account-lookup',username})).account;
 const valid=row&&memberEqual(memberPinHash(password(body.password),row.salt),row.hash);
 if(!valid){await call({action:'account-failure',username});throw Error('account_denied');}
 if(action==='account-change'){
  if(!identity||row.memberId!==identity.id)throw Error('account_denied');
  if(body.newPassword!==body.confirmPassword)throw Error('password_confirmation_mismatch');
  return call({action:'account-change',username,member:identity,proof:row.hash,expected:row.version,...hash(body.newPassword)});
 }
 const result=await call({action:'account-success',username,proof:row.hash,expected:row.version});
 return {ok:true,profile:memberProfile(result.member),username};
}
