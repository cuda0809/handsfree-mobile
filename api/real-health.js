export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const base = process.env.HF_REAL_READ_URL || '';
  const token = process.env.HF_REAL_READ_TOKEN || '';

  if (!base || !token) {
    return res.status(503).json({
      ok: false,
      live: false,
      error: 'not_configured'
    });
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
      return res.status(502).json({
        ok: false,
        live: false,
        error: data?.error || `upstream_${upstream.status}`
      });
    }

    const rows = Array.isArray(data.currentStatus) ? data.currentStatus : [];
    const states = rows.reduce((acc, row) => {
      const key = String(row?.state || 'unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      ok: true,
      live: true,
      schema: String(data.schema || ''),
      timezone: String(data.timezone || 'Asia/Seoul'),
      today: String(data.today || ''),
      generatedAt: String(data.generatedAt || ''),
      sourceLatestDate: String(data.sourceLatestDate || ''),
      counts: {
        currentStatus: rows.length,
        openIssues: Number(data?.counts?.openIssues ?? rows.length)
      },
      states
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      live: false,
      error: String(err && err.message ? err.message : err)
    });
  }
}
