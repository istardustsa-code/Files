import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Client (Real Auth, PostgreSQL, Private Storage)
 * --------------------------------------------------------------------------
 * SECURITY RULES:
 * 1. Only public Project URL and Publishable/Anon Key (`VITE_*`) are read here.
 * 2. Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
 * 3. Teacher files live in the private `portfolio-files` bucket (`public = false`)
 *    and are accessed exclusively via short-lived signed URLs.
 */

export const PRIVATE_FILES_BUCKET = 'portfolio-files';
export const PUBLIC_BRANDING_BUCKET = 'platform-branding';
export const DEFAULT_PROJECT_URL = 'https://aritktxijbfcpmuxsxmx.supabase.co';

const supabaseUrl = (
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_PROJECT_URL
).replace(/\/+$/, '');

const supabasePublicKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || ''
).trim();

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabasePublicKey &&
      supabaseUrl.startsWith('https://') &&
      supabasePublicKey.startsWith('sb_publishable_') &&
      supabasePublicKey.length >= 30
  );
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabasePublicKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'files-by-lama-auth-session',
      },
    })
  : null;

export async function verifySupabaseAuthEndpoint(): Promise<{
  ok: boolean;
  status?: number;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: 'المتغير VITE_SUPABASE_PUBLISHABLE_KEY غير مضاف أو لا يبدأ بالصيغة الكاملة sb_publishable_.',
    };
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabasePublicKey },
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { message?: string; msg?: string };
        if (body?.message || body?.msg) {
          msg = `${msg}: ${body.message || body.msg}`;
        }
      } catch {
        // ignore JSON parse error
      }
      return { ok: false, status: res.status, error: msg };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'تعذر الوصول إلى خادم Supabase',
    };
  }
}

export function getSupabaseDiagnostics() {
  const configured = isSupabaseConfigured();
  return {
    configured,
    projectUrl: supabaseUrl,
    urlPresent: Boolean(supabaseUrl),
    publicKeyPresent: Boolean(supabasePublicKey),
    privateBucket: PRIVATE_FILES_BUCKET,
    brandingBucket: PUBLIC_BRANDING_BUCKET,
    authStatus: configured
      ? 'مرتبط بـ Supabase Auth (حفظ الجلسة وتجديدها مفعّل)'
      : 'في انتظار إضافة المفتاح العام الكامل في VITE_SUPABASE_PUBLISHABLE_KEY',
    storageStatus: configured
      ? 'حاوية portfolio-files الخاصة مهيأة عبر روابط موقّعة'
      : 'في انتظار اكتمال إعداد VITE_SUPABASE_PUBLISHABLE_KEY',
    rlsStatus: 'سياسات Row Level Security معرفة في supabase/migrations/',
  };
}
