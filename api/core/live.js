// HandsFree Mobile REAL 0.7 — strict authenticated LIVE READ gate.
// Returns HTTP 200 only when the runtime is actually reading OS v3 through
// the Google service-account bridge. Reference/private fallbacks never count
// as LIVE so the mobile UI cannot mistake a demo snapshot for current data.
const { getCore } = require('../../core/provider');

function envPresence() {
  return {
    spreadsheetId: Boolean(process.env.HF_OS_V3_SPREADSHEET_ID),
    credential: Boolean(
      process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON_B64 ||
      process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON ||
      (process.env.HF_GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.HF_GOOGLE_PRIVATE_KEY)
    )
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const core = await getCore({ force: true });
    const source = core.sourceHealth();
    const liveReady = Boolean(
      source?.runtimeDirectGoogleRead === true &&
      source?.auth === 'service-account' &&
      /OS v3 LIVE/i.test(String(source?.label || ''))
    );

    const payload = {
      ok: liveReady,
      liveReady,
      mode: source?.mode || null,
      label: source?.label || null,
      auth: source?.auth || null,
      runtimeDirectGoogleRead: Boolean(source?.runtimeDirectGoogleRead),
      fetchedAt: source?.fetchedAt || null,
      warning: source?.warning || null,
      env: envPresence(),
      writeLocked: true
    };

    if (!liveReady) {
      return res.status(503).json({
        ...payload,
        code: 'REAL_LIVE_READ_NOT_READY',
        message: 'Authenticated Google Sheets LIVE READ is not active. Reference/private fallback is not accepted as LIVE.'
      });
    }

    return res.status(200).json({
      ...payload,
      code: 'REAL_LIVE_READ_READY',
      message: 'Authenticated OS v3 LIVE READ is active.'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      liveReady: false,
      code: 'REAL_LIVE_READ_ERROR',
      message: error?.message || 'LIVE READ check failed',
      env: envPresence(),
      writeLocked: true
    });
  }
};
