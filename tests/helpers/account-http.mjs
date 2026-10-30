import https from 'node:https';
import {EventEmitter} from 'node:events';
import handler from '../../api/sa2-auth.js';
import {fixture} from './account-fixture.mjs';
export function accountHarness(){
 const f=fixture(),oldEnv={...process.env},original=https.request,upstreamBodies=[];
 Object.assign(process.env,{HF_REAL_APP_KEY:'isolated-account-test-key',HF_REAL_READ_TOKEN:'fixture-secret',HF_REAL_READ_URL:'https://fixture.invalid/exec'});
 https.request=(url,options,callback)=>{
  if(url.hostname!=='fixture.invalid')throw Error('live_network_forbidden');
  const request=new EventEmitter();request.destroy=error=>request.emit('error',error);
  request.end=body=>queueMicrotask(()=>{
   upstreamBodies.push(String(body));let response;
   try{response=f.c.hfLightAuthDispatch_(JSON.parse(body));}catch(e){response={ok:false,error:e.message};}
   const incoming=new EventEmitter();incoming.statusCode=200;incoming.headers={};callback(incoming);incoming.emit('data',Buffer.from(JSON.stringify(response)));incoming.emit('end');
  });return request;
 };
 async function call(body,cookie='',origin='https://account.fixture'){
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.code=v;return this;},json(v){this.body=v;return this;}};
  await handler({method:body?'POST':'GET',body,headers:{host:'account.fixture',origin,cookie,'x-forwarded-for':'isolated-account-flow'}},res);return res;
 }
 return {f,call,upstreamBodies,close(){https.request=original;for(const k of Object.keys(process.env))if(!(k in oldEnv))delete process.env[k];Object.assign(process.env,oldEnv);}};
}
export function cookies(response){return [response.headers['Set-Cookie']].flat().filter(Boolean).map(s=>s.split(';')[0]).join('; ');}
