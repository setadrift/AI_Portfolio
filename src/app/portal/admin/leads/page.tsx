import { readLeadDashboardData } from "@/lib/portal/admin/leads";
import { readAcquisitionData } from "@/lib/portal/admin/acquisition-db";
import LeadsDashboard from "./LeadsDashboard";

export const runtime = "nodejs";

export default async function AdminLeadsPage() {
  const [data, acquisition] = await Promise.all([
    readLeadDashboardData(),
    readAcquisitionData(),
  ]);
  return (
    <LeadsDashboard
      initialData={data}
      offers={acquisition.offers}
      promotedLeadKeys={acquisition.opportunities.flatMap((item) =>
        item.sourceId && item.sourceLeadKey
          ? [`${item.sourceId}:${item.sourceLeadKey}`]
          : [],
      )}
    />
  );
}
