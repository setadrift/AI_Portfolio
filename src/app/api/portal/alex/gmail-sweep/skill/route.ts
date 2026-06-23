import { NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import { readAlexGmailSweepSkill } from "@/lib/portal/alex/gmail-sweep-skill";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  const text = await readAlexGmailSweepSkill();
  return new NextResponse(text, {
    headers: {
      "Content-Disposition": 'attachment; filename="gmail-sweep-skill.txt"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
