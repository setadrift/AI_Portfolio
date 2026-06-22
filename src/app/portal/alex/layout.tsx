import Link from "next/link";
import LogoutButton from "@/components/portal/LogoutButton";

export default function AlexLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex min-h-14 max-w-5xl flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/portal/alex" className="font-display text-lg">
            Alex Parker
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-cream-muted">
            <Link href="/portal/alex" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <Link href="/portal/alex/receipts" className="transition-colors hover:text-foreground">
              Receipts
            </Link>
            <Link
              href="/portal/alex/gmail-sweep"
              className="transition-colors hover:text-foreground"
            >
              Gmail sweep
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
