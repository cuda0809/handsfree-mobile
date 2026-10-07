import https from 'node:https';

// ContentService returns the result through a one-time Google URL. Never replay
// the original POST or forward its credentials when following that redirect.
export async function readAppsScript(url,payload,timeout=45000,request=https.request){
 const deadline=Date.now()+timeout;
 let target=new URL(url),method='POST',body=JSON.stringify(payload);
 if(target.protocol!=='https:')throw Error('upstream_invalid_redirect');
 for(let hop=0;hop<5;hop++){
  const remaining=deadline-Date.now();
  if(remaining<=0)throw Object.assign(Error('upstream_timeout'),{name:'TimeoutError'});
  const response=await new Promise((resolve,reject)=>{
   let settled=false,timer;
   const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);};
   const req=request(target,{method,headers:body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{Accept:'application/json'}},res=>{
    const chunks=[];let size=0;
    res.on('data',chunk=>{size+=chunk.length;if(size>4*1024*1024){req.destroy(Error('upstream_response_too_large'));return;}chunks.push(chunk);});
    res.on('error',error=>finish(error));
    res.on('end',()=>finish(null,{status:res.statusCode,headers:res.headers,text:Buffer.concat(chunks).toString('utf8')}));
   });
   req.on('error',error=>finish(error));
   timer=setTimeout(()=>req.destroy(Object.assign(Error('upstream_timeout'),{name:'TimeoutError'})),remaining);
   req.end(body||undefined);
  });
  if([301,302,303,307,308].includes(response.status)){
   if(!response.headers.location)throw Error('upstream_invalid_redirect');
   const next=new URL(response.headers.location,target);
   if(next.protocol!=='https:'||next.username||next.password||next.port||next.hostname!=='script.googleusercontent.com')throw Error('upstream_invalid_redirect');
   target=next;method='GET';body='';continue;
  }
  let data;
  try{data=JSON.parse(response.text);}catch{throw Object.assign(Error('upstream_invalid_json'),{upstreamResponse:true,upstreamStatus:response.status});}
  if(response.status<200||response.status>=300||data?.ok!==true)throw Object.assign(Error(data?.error||'upstream_failed'),{upstreamResponse:true,upstreamStatus:response.status});
  return data;
 }
 throw Error('upstream_redirect_limit');
}
