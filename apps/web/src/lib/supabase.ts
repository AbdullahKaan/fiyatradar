import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let browserClient: SupabaseClient | null = null;

/** Singleton browser client (cookie-based session via @supabase/ssr). */
export function getBrowserSupabase(): SupabaseClient {
  if (!browserClient) browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return browserClient;
}

/** Server client bound to request cookies — use in Route Handlers / Server Components needing auth. */
export interface CookieStoreLike {
  get(name: string): { value: string } | undefined;
  set(options: { name: string; value: string } & CookieOptions): unknown;
}

/** Pass `cookies()` from `next/headers` (kept as a parameter so this module is client-safe). */
export function getServerSupabase(cookieStore: CookieStoreLike): SupabaseClient {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component — cookies are read-only there.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Read-only context.
        }
      },
    },
  });
}

/** Cookie-less anon client for public, cacheable (ISR) reads. */
export function getPublicSupabase(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
