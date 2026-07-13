import { readAcquisitionData } from "@/lib/portal/admin/acquisition-db";
import ProofWorkspace from "./ProofWorkspace";

export const runtime = "nodejs";

export default async function ProofPage() {
  return <ProofWorkspace initialData={await readAcquisitionData()} />;
}
