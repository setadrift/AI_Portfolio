import Link from "next/link";
import LogoutButton from "@/components/portal/LogoutButton";

export default function TtgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col ttg-portal">
      <header className="ttg-portal-header">
        <div className="ttg-portal-header-inner">
          <Link href="/portal/ttg" className="ttg-portal-brand">
            <span>TTG</span>
            <span>The Trauma Therapy Group<small>Private workspace</small></span>
          </Link>
          <nav className="ttg-portal-links" aria-label="TTG portal">
            <Link href="/portal/ttg/dashboard">CEO dashboard</Link>
            <Link href="/portal/ttg/refresh">Refresh data</Link>
            <Link href="/portal/ttg/publish">Blog publisher</Link>
            <span className="ttg-portal-divider" />
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
