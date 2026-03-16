import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null;

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabaseAdmin;
}
