import crypto from 'node:crypto';

const COOKIE='hf_real_session';
const MAX_AGE=60*60*24*30;

function safeEqual(a,b){
  const ha=crypto.createHash('sha256').update(String(a)).digest();
  const hb=crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha,hb);
}
function sign(exp,secret){
  return crypto.createHmac('sha256',secret).update(`hf-real:${exp}`).digest('hex');
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }
  const appKey=process.env.HF_REAL_APP_KEY||'';
  if(!appKey)return res.status(503).json({ok:false,error:'not_configured'});
  let body=req.body||{};
  if(typeof body==='string'){try{body=JSON.parse(body)}catch{}}
  const supplied=String(body.key||'');
  if(!supplied||!safeEqual(supplied,appKey)){
    return res.status(401).json({ok:false,error:'invalid_app_key'});
  }
  const exp=Math.floor(Date.now()/1000)+MAX_AGE;
  const sig=sign(exp,appKey);
  res.setHeader('Set-Cookie',`${COOKIE}=${exp}.${sig}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`);
  return res.status(200).json({ok:true,expiresAt:exp});
}
