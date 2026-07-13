import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import LogoutButton from "@/components/portal/LogoutButton";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

const navItems = [
  { href: "/portal/admin", label: "Today" },
  { href: "/portal/admin/leads", label: "Discovery" },
  { href: "/portal/admin/pipeline", label: "Pipeline" },
  { href: "/portal/admin/partners", label: "Partners" },
  { href: "/portal/admin/proof", label: "Proof" },
  { href: "/portal/admin/metrics", label: "Metrics" },
  { href: "/portal/admin/projects", label: "Projects" },
  { href: "/portal/admin/tasks", label: "Commitments" },
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
        <div className="mx-auto flex min-h-12 max-w-6xl flex-col gap-2 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href="/portal/admin"
            className="text-sm font-semibold text-foreground"
          >
            Consulting OS
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-cream-muted">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
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
