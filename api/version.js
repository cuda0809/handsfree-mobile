module.exports = (req, res) => {
  const version = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_URL || 'handsfree-alpha03';
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({ version });
};
