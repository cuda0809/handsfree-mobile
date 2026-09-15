import crypto from 'node:crypto';

const COOKIE='hf_real_session';

function safeEqual(a,b){
  const ha=crypto.createHash('sha256').update(String(a)).digest();
  const hb=crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha,hb);
}
function sign(exp,secret){
  return crypto.createHmac('sha256',secret).update(`hf-real:${exp}`).digest('hex');
}
function parseCookies(req){
  const raw=String(req.headers.cookie||'');
  const out={};
  for(const part of raw.split(';')){
    const i=part.indexOf('=');
    if(i<0)continue;
    const k=part.slice(0,i).trim();
    const v=part.slice(i+1).trim();
    if(k)out[k]=v;
  }
  return out;
}
function validSession(req,appKey){
  const raw=parseCookies(req)[COOKIE]||'';
  const m=/^(\d+)\.([a-f0-9]{64})$/i.exec(raw);
  if(!m)return false;
  const exp=Number(m[1]);
  if(!Number.isFinite(exp)||exp<=Math.floor(Date.now()/1000))return false;
  return safeEqual(m[2],sign(exp,appKey));
}

async function readFromAppsScript(base,token){
  const u=new URL(base);
  u.searchParams.set('token',token);
  const upstream=await fetch(u.toString(),{
    method:'GET',
    headers:{accept:'application/json'},
    cache:'no-store'
  });
  const text=await upstream.text();
  let data=null;
  try{data=JSON.parse(text)}catch{}
  return {upstream,data};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const base = process.env.HF_REAL_READ_URL || '';
  const token = process.env.HF_REAL_READ_TOKEN || '';
  const appKey = process.env.HF_REAL_APP_KEY || '';
  if (!base || !token || !appKey) {
    return res.status(503).json({
      ok: false,
      live: false,
      error: 'not_configured',
      message: 'HF_REAL_READ_URL / HF_REAL_READ_TOKEN / HF_REAL_APP_KEY are not configured.'
    });
  }

  const suppliedKey = String(req.headers['x-hf-app-key'] || '');
  const authorized = validSession(req, appKey) || (!!suppliedKey && safeEqual(suppliedKey, appKey));
  if (!authorized) {
    return res.status(401).json({ok:false, live:false, error:'unauthorized_app'});
  }

  try {
    const {upstream,data}=await readFromAppsScript(base,token);
    if(!upstream.ok || !data || data.ok!==true){
      console.error('[real-status] configured_upstream_failed', {
        status:upstream.status,
        contentType:upstream.headers.get('content-type')||'',
        error:data?.error||''
      });
      return res.status(502).json({ok:false,live:false,error:!data?'upstream_invalid_json':(!upstream.ok?`upstream_${upstream.status}`:String(data.error||'upstream_not_ok'))});
    }
    const currentStatus = Array.isArray(data.currentStatus) ? data.currentStatus.map(x => ({
      issueId: String(x.issueId || ''),
      orderId: String(x.orderId || ''),
      customer: String(x.customer || ''),
      model: String(x.model || ''),
      process: String(x.process || ''),
      state: String(x.state || '확인중'),
      since: String(x.since || ''),
      days: Number(x.days || 0),
      cause: String(x.cause || ''),
      nextAction: String(x.nextAction || ''),
      tone: String(x.tone || 'warn'),
      priority: Number(x.priority || 2),
      issueStatus: String(x.issueStatus || ''),
      type: String(x.type || ''),
      sourceLatestUpdate: String(x.sourceLatestUpdate || '')
    })) : [];

    return res.status(200).json({
      ok: true,
      live: true,
      schema: String(data.schema || ''),
      timezone: String(data.timezone || 'Asia/Seoul'),
      today: String(data.today || ''),
      generatedAt: String(data.generatedAt || ''),
      sourceLatestDate: String(data.sourceLatestDate || ''),
      currentStatus,
      counts: data.counts || {currentStatus: currentStatus.length}
    });
  } catch (err) {
    console.error('[real-status] exception', String(err && err.message ? err.message : err));
    return res.status(502).json({
      ok: false,
      live: false,
      error: String(err && err.message ? err.message : err)
    });
  }
}
