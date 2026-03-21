import {
  createClient as createSupabaseClient,
  type SupabaseClient
} from "@supabase/supabase-js";

export function createClient(
  supabaseUrl: string,
  supabaseKey: string
): SupabaseClient {
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
}
