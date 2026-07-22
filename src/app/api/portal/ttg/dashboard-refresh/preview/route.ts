import { NextResponse } from "next/server";
import { requireTtgPortalSession } from "@/lib/portal/ttg/auth";
import { buildRefreshPayload } from "@/lib/portal/ttg/dashboard-refresh";
import { getWorkbookFingerprint } from "@/lib/portal/ttg/google-sheets-refresh";
import { signRefreshStage } from "@/lib/portal/ttg/refresh-stage";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_BATCH_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireTtgPortalSession();
  if (!auth.ok) return auth.response;
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    if (!files.length) return NextResponse.json({ error: "Choose the Jane and bank CSV files first." }, { status: 400 });
    if (files.length > 20) return NextResponse.json({ error: "Upload one reporting package at a time (20 files maximum)." }, { status: 400 });
    if (files.some((file) => !file.name.toLowerCase().endsWith(".csv"))) return NextResponse.json({ error: "Use CSV exports. Excel files are not accepted for this refresh." }, { status: 400 });
    if (files.some((file) => file.size > MAX_FILE_BYTES) || files.reduce((sum, file) => sum + file.size, 0) > MAX_BATCH_BYTES) return NextResponse.json({ error: "The upload is too large. Keep each CSV under 5 MB and the batch under 20 MB." }, { status: 413 });
    const payload = buildRefreshPayload(await Promise.all(files.map(async (file) => ({ name: file.name, text: await file.text() }))));
    const workbookFingerprint = await getWorkbookFingerprint();
    const token = await signRefreshStage({ payload, workbookFingerprint, preparedBy: auth.session.sub });
    return NextResponse.json({ payload, token });
  } catch (error) {
    console.error("TTG dashboard refresh preview failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not inspect these files." }, { status: 400 });
  }
}
