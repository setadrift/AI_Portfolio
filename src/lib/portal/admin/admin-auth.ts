import { cookies } from "next/headers";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

export async function hasAdminSession() {
  const store = await cookies();
  const token = store.get(PORTAL_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  return Boolean(session && session.client === "admin");
}
