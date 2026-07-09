import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const APPLY = process.argv.includes("--apply");

async function main() {
  const env = {
    ...(await loadDotEnv(".env.local")),
    ...(await loadDotEnv(".env")),
    ...process.env,
  };
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and a server-side Supabase key are required.");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { count, error: countError } = await supabase
    .from("admin_leads")
    .select("*", { count: "exact", head: true })
    .eq("source_id", "reddit")
    .eq("active", true);
  if (countError) throw new Error(`Unable to count active Reddit leads: ${countError.message}`);

  if (!APPLY) {
    console.log(`Dry run: ${count ?? 0} active Reddit lead rows would be archived.`);
    console.log("Re-run with --apply to set active=false. No rows were changed.");
    return;
  }

  const { data, error } = await supabase
    .from("admin_leads")
    .update({ active: false })
    .eq("source_id", "reddit")
    .eq("active", true)
    .select("lead_key");
  if (error) throw new Error(`Unable to archive active Reddit leads: ${error.message}`);
  console.log(`Archived ${data?.length ?? 0} active Reddit lead rows. Historical rows and lead states were preserved.`);
}

async function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const raw = await readFile(filePath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = String(match[2] || "").trim().replace(/^[\"']|[\"']$/g, "");
  }
  return env;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
