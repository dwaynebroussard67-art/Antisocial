import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * The Gathered Light is playable fully offline in "Practice Solo" mode.
 * Real-time two-device sessions require Supabase credentials
 * (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) to be set in the
 * environment. If they are absent, `supabase` is null and the app
 * gracefully limits itself to solo practice + a clear notice.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isOnlineConfigured = Boolean(supabase);
