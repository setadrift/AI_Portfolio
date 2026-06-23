import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import LogoutButton from "@/components/portal/LogoutButton";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

const navItems = [
  { href: "/portal/admin", label: "Dashboard" },
  { href: "/portal/admin/leads", label: "Leads" },
  { href: "/portal/admin/projects", label: "Projects" },
  { href: "/portal/admin/tasks", label: "Tasks" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) redirect("/portal/login?next=/portal/admin");
  if (session.client !== "admin") redirect(`/portal/${session.client}`);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex min-h-14 max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/portal/admin" className="font-display text-lg">
            Duncan Admin
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-cream-muted">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
