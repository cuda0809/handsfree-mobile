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
  if (!suppliedKey || suppliedKey !== appKey) {
    return res.status(401).json({ok:false, live:false, error:'unauthorized_app'});
  }

  try {
    const u = new URL(base);
    u.searchParams.set('token', token);
    const upstream = await fetch(u.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store'
    });
    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error('upstream_invalid_json'); }

    if (!upstream.ok || !data || data.ok !== true) {
      return res.status(502).json({ok:false, live:false, error:data?.error || `upstream_${upstream.status}`});
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
    return res.status(502).json({
      ok: false,
      live: false,
      error: String(err && err.message ? err.message : err)
    });
  }
}
