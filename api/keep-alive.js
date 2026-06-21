// Keep-alive endpoint — runs on a schedule (see vercel.json `crons`) to make a
// lightweight query against Supabase so the free-tier project isn't paused for
// inactivity. A single REST read hits Postgres, which counts as activity.
//
// Required env vars (already set for the app's build, reused here by the
// serverless runtime): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
// Optional: CRON_SECRET — if set, Vercel Cron sends it as a Bearer token and we
// reject any request that doesn't match, so the endpoint can't be triggered by
// arbitrary callers.

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'Supabase env vars not set' })
  }

  try {
    // RLS returns no rows for the anon key, but the query still executes against
    // Postgres — which is all we need to keep the database active.
    const resp = await fetch(`${url}/rest/v1/transactions?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    return res.status(resp.ok ? 200 : 502).json({
      ok: resp.ok,
      status: resp.status,
      pingedAt: new Date().toISOString(),
    })
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message })
  }
}
