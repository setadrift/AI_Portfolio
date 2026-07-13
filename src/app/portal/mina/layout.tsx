import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/portal/LogoutButton";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

export default async function MinaLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/portal/login?next=/portal/mina");
  if (session.client !== "mina") redirect(`/portal/${session.client}`);

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#20221f]">
      <header className="border-b border-[#dcded7] bg-[#fbfbf8]">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link href="/portal/mina" className="flex items-baseline gap-3">
            <span className="font-display text-xl text-[#263a30]">Mina&apos;s search</span>
            <span className="hidden text-xs tracking-[0.16em] text-[#72776f] uppercase sm:inline">
              The good jobs, first
            </span>
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
