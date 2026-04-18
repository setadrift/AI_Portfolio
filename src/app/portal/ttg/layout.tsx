import Link from "next/link";
import LogoutButton from "@/components/portal/LogoutButton";

export default function TtgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/portal/ttg" className="font-display text-lg">
            The Trauma Therapy Group
          </Link>
          <nav className="flex items-center gap-5 text-sm text-cream-muted">
            <Link href="/portal/ttg" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/portal/ttg/publish" className="hover:text-foreground transition-colors">
              Publish a post
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
