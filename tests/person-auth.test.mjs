import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {verifyGoogle,encodePerson,person,sameOrigin} from '../lib/person-auth.mjs';
import {roleFor} from '../lib/access.mjs';

test('Google identity validates signature, audience, nonce, expiry and email authority',async()=>{
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk={...publicKey.export({format:'jwk'}),kid:'unit-key',use:'sig',alg:'RS256'};
 const now=Math.floor(Date.now()/1000),claims={iss:'https://accounts.google.com',aud:'unit-client',sub:'123',email:'unit@gmail.com',email_verified:true,nonce:'unit-nonce',iat:now,exp:now+3600};
 const jwt=(p,h={alg:'RS256',kid:'unit-key'})=>{const raw=[h,p].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');return raw+'.'+crypto.sign('RSA-SHA256',Buffer.from(raw),privateKey).toString('base64url');};
 const options={clientId:'unit-client',now,fetcher:async()=>({ok:true,json:async()=>({keys:[jwk]})})};
 assert.equal((await verifyGoogle(jwt(claims),'unit-nonce',options)).sub,'123');
 for(const patch of [{aud:'other'},{iss:'other'},{nonce:'other'},{exp:now-1},{iat:now+120},{email_verified:false},{email:'unit@example.com'},{sub:''},{azp:'other'}])await assert.rejects(()=>verifyGoogle(jwt({...claims,...patch}),'unit-nonce',options));
 await assert.rejects(()=>verifyGoogle(jwt(claims,{alg:'none',kid:'unit-key'}),'unit-nonce',options));
 const valid=jwt(claims),parts=valid.split('.');parts[2]=(parts[2][0]==='a'?'b':'a')+parts[2].slice(1);await assert.rejects(()=>verifyGoogle(parts.join('.'),'unit-nonce',options));
});
test('personal sessions reject tampering and expiry; access list fails closed',()=>{
 const p={sub:'123',email:'unit@gmail.com',exp:Math.floor(Date.now()/1000)+100};
 const cookie=encodePerson(p,'unit-secret');
 assert.equal(person({headers:{cookie:'hf_person='+cookie}},'unit-secret').email,p.email);
 assert.equal(person({headers:{cookie:'hf_person='+cookie}},'wrong-secret'),null);
 assert.equal(person({headers:{cookie:'hf_person='+encodePerson({...p,exp:1},'unit-secret')}},'unit-secret'),null);
 process.env.HF_REAL_ALLOWED_USERS='{"unit@gmail.com":"writer"}';
 assert.equal(roleFor(p.email),'writer');assert.throws(()=>roleFor('outsider@gmail.com'));
 process.env.HF_REAL_ALLOWED_USERS='{}';assert.throws(()=>roleFor(p.email));delete process.env.HF_REAL_ALLOWED_USERS;
 assert.equal(sameOrigin({headers:{origin:'https://app.example',host:'app.example'}}),true);
 assert.equal(sameOrigin({headers:{origin:'https://evil.example',host:'app.example'}}),false);
});
