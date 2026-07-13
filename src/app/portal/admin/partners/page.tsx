import { readAcquisitionData } from "@/lib/portal/admin/acquisition-db";
import { acquisitionMetrics } from "@/lib/portal/admin/consulting-metrics";
import PartnerWorkspace from "./PartnerWorkspace";

export const runtime = "nodejs";

export default async function PartnersPage() {
  const data = await readAcquisitionData();
  return (
    <PartnerWorkspace initialData={data} metrics={acquisitionMetrics(data)} />
  );
}
