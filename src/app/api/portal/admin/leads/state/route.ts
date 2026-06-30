import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { persistLeadStatesToDatabase } from "@/lib/portal/admin/lead-db";
import type { LeadSourceId, StoredLeadState } from "@/lib/portal/admin/leads";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

export const runtime = "nodejs";

type LeadStateRequest = {
  updates?: Array<{
    sourceId?: LeadSourceId;
    leadKey?: string;
    queue?: StoredLeadState["queue"];
    action?: StoredLeadState["action"];
    notes?: string;
  }>;
};

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session || session.client !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as LeadStateRequest | null;
  const updates = (body?.updates ?? []).filter(
    (update) =>
      update.sourceId &&
      update.leadKey &&
      update.queue &&
      update.action &&
      typeof update.notes === "string",
  );

  if (updates.length === 0) {
    return NextResponse.json({ error: "No valid lead state updates provided." }, { status: 400 });
  }

  const result = await persistLeadStatesToDatabase(
    updates.map((update) => ({
      sourceId: update.sourceId as LeadSourceId,
      leadKey: update.leadKey as string,
      queue: update.queue as string,
      action: update.action as string,
      notes: update.notes as string,
    })),
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.skipped ? "Supabase lead database is not configured." : result.error ?? "Failed to save lead state.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, saved: updates.length });
}
