import { createClient } from "@supabase/supabase-js";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

export function createSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Supabase admin client cannot be used in the browser");
  }

  return createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
