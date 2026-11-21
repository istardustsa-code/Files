import process from 'node:process';

const EXPECTED_SUPABASE_HOST_SUFFIX = '.supabase.co';

export async function GET(): Promise<Response> {
  const supabaseUrl = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '');

  const supabaseKey = (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Supabase environment variables are not configured.',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid Supabase URL format.' }),
      {
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }

  if (
    parsedUrl.protocol !== 'https:' ||
    !parsedUrl.hostname.endsWith(EXPECTED_SUPABASE_HOST_SUFFIX)
  ) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Unsupported Supabase target host.' }),
      {
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }

  if (!supabaseKey.startsWith('sb_publishable_') || supabaseKey.length < 30) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid Supabase publishable key format.' }),
      {
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }

  try {
    const [authRes, dbRes] = await Promise.all([
      fetch(`${parsedUrl.origin}/auth/v1/settings`, {
        headers: { apikey: supabaseKey },
      }),
      fetch(`${parsedUrl.origin}/rest/v1/platform_config?select=id&limit=1`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }),
    ]);

    const ok = authRes.ok && dbRes.ok;
    return new Response(
      JSON.stringify({
        ok,
        authStatus: authRes.status,
        dbStatus: dbRes.status,
        checkedAt: new Date().toISOString(),
      }),
      {
        status: ok ? 200 : 502,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Failed to reach Supabase.',
        checkedAt: new Date().toISOString(),
      }),
      {
        status: 502,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }
}
