import https from 'node:https';
import {randomUUID} from 'node:crypto';

// Used only for whitelisted reads. ContentService returns through a one-time
// Google URL: never forward the authenticated POST body to that result URL.
export async function readAppsScript(url,payload,timeout=45000,request=https.request){
 const deadline=Date.now()+timeout,traceId=randomUUID();
 let target=new URL(url),method='POST',body=JSON.stringify(payload);
 if(target.protocol!=='https:')throw Error('upstream_invalid_redirect');
 const origin=target.origin,path=target.pathname,originalBody=body;
 target.searchParams.set('hf_read_request',randomUUID());
 let recoveredResult=false;
 let coreRead=false;
 try{coreRead=payload.op==='light_app'&&JSON.parse(payload.signed).action==='core';}catch{}
 let recoveredTransport=false;
 try{for(let hop=0;hop<5;hop++){
  const remaining=deadline-Date.now();
  if(remaining<=0)throw Object.assign(Error('upstream_timeout'),{name:'TimeoutError'});
  let response;
  try{response=await new Promise((resolve,reject)=>{
   let settled=false,timer,stage='socket',status=0;
   const hopStarted=Date.now(),phase=method==='POST'?'execution':'result';
   const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);console.info('HF_READ_HOP',traceId,hop,phase,stage,status,Date.now()-hopStarted,error?'failed':'ok');if(error)error.upstreamStage=stage;error?reject(error):resolve(value);};
   const req=request(target,{method,headers:{'Cache-Control':'no-cache, no-store',Pragma:'no-cache',...(body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{Accept:'application/json'})}},res=>{
    stage='body';status=res.statusCode||0;
    const chunks=[];let size=0;
    res.on('data',chunk=>{size+=chunk.length;if(size>4*1024*1024){req.destroy(Error('upstream_response_too_large'));return;}chunks.push(chunk);});
    res.on('error',error=>finish(error));
    res.on('end',()=>finish(null,{status:res.statusCode,headers:res.headers,text:Buffer.concat(chunks).toString('utf8')}));
   });
   req.on('error',error=>finish(error));
   req.on('socket',socket=>{
    stage=socket.connecting?'dns':'headers';
    socket.once('lookup',()=>{stage='tcp';});
    socket.once('connect',()=>{stage='tls';});
    socket.once('secureConnect',()=>{stage='headers';});
   });
   const wait=coreRead&&!recoveredTransport?Math.min(20000,Math.max(1,Math.floor(remaining/2))):remaining;
   timer=setTimeout(()=>req.destroy(Object.assign(Error('upstream_timeout'),{name:'TimeoutError'})),wait);
   req.end(body||undefined);
  });}catch(error){
   const transient=error.name==='TimeoutError'||error.name==='AbortError'||/^(ECONNRESET|ETIMEDOUT|EAI_AGAIN|UND_ERR_SOCKET)$/.test(error.code||'');
   if(!coreRead||recoveredTransport||!transient||deadline-Date.now()<=0)throw error;
   recoveredTransport=true;
   // Retry this signed read once on a new execution/result pair. The total
   // deadline is unchanged; no cached data or WRITE request is substituted.
   console.info('HF_CORE_TRANSPORT_RECOVERY',method==='POST'?'execution':'result');
   target=new URL(url);target.searchParams.set('hf_read_request',randomUUID());method='POST';body=originalBody;
   continue;
  }
  if([301,302,303,307,308].includes(response.status)){
   if(!response.headers.location)throw Error('upstream_invalid_redirect');
   const next=new URL(response.headers.location,target);
   if(next.protocol!=='https:'||next.username||next.password||next.port)throw Error('upstream_invalid_redirect');
   // Some Google ingress redirects return to the same execution URL. These
   // calls are read-only: preserve the request rather than turning it into
   // unauthenticated doGet. Never send its body to a different execution URL.
   if(next.origin===origin&&next.pathname===path){target=next;method='POST';body=originalBody;continue;}
   if(next.hostname!=='script.googleusercontent.com'&&!(next.hostname==='script.google.com'&&next.pathname==='/macros/echo'))throw Error('upstream_invalid_redirect');
   target=next;method='GET';body='';continue;
  }
  // A failed one-time result URL cannot be reused. Re-execute this whitelisted
  // READ once with a new nonce, inside the original total deadline.
  if(method==='GET'&&response.status===404&&!recoveredResult){
   recoveredResult=true;target=new URL(url);target.searchParams.set('hf_read_request',randomUUID());method='POST';body=originalBody;continue;
  }
  let data;
  try{data=JSON.parse(response.text);}catch{throw Object.assign(Error('upstream_invalid_json'),{upstreamResponse:true,upstreamStatus:response.status});}
  if(response.status<200||response.status>=300||data?.ok!==true)throw Object.assign(Error(data?.error||'upstream_failed'),{upstreamResponse:true,upstreamStatus:response.status});
  return data;
 }
 throw Error('upstream_redirect_limit');
 }catch(error){error.upstreamPhase=method==='POST'?'execution':'result';throw error;}
}
