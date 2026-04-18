import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

export default async function PortalRoot() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    redirect("/portal/login");
  }
  // Single-tenant for now — drop them straight into their client dashboard.
  redirect(`/portal/${session.client}`);
}
