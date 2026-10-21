// GET /api/status  -> which server features are switched on (true/false only, never the keys).
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'public, max-age=300');
  res.end(JSON.stringify({ email: !!process.env.RESEND_API_KEY, ai: !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY), nudges: !!(process.env.RESEND_API_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.CRON_SECRET), pay: !!(process.env.PAYSTACK_SECRET_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) }));
};
