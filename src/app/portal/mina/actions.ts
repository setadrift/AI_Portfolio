"use server";

import { revalidatePath } from "next/cache";
import { requireMinaPortalSession } from "@/lib/portal/mina/auth";
import {
  createManualMinaJob,
  updateMinaJobState,
  type ManualMinaJobInput,
  type MinaJobState,
} from "@/lib/portal/mina/jobs";

export async function addMinaJob(input: ManualMinaJobInput) {
  const auth = await requireMinaPortalSession();
  if (!auth.ok) return { ok: false as const, error: "Please sign in again." };
  const result = await createManualMinaJob(input);
  if (result.ok) revalidatePath("/portal/mina");
  return result.ok
    ? { ok: true as const, data: result.data }
    : { ok: false as const, error: result.error };
}

export async function setMinaJobState(
  jobId: string,
  patch: Partial<MinaJobState>,
) {
  const auth = await requireMinaPortalSession();
  if (!auth.ok) return { ok: false as const, error: "Please sign in again." };
  const result = await updateMinaJobState(jobId, patch);
  if (result.ok) revalidatePath("/portal/mina");
  return result.ok
    ? { ok: true as const, data: result.data }
    : { ok: false as const, error: result.error };
}
