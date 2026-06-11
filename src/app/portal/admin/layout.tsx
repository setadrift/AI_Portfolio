import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import LogoutButton from "@/components/portal/LogoutButton";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) redirect("/portal/login?next=/portal/admin/leads");
  if (session.client !== "admin") redirect(`/portal/${session.client}`);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/portal/admin/leads" className="font-display text-lg">
            Duncan Admin
          </Link>
          <nav className="flex items-center gap-5 text-sm text-cream-muted">
            <Link
              href="/portal/admin/leads"
              className="hover:text-foreground transition-colors"
            >
              Leads
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
