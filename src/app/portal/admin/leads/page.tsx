import { readLeadDashboardData } from "@/lib/portal/admin/leads";
import LeadsDashboard from "./LeadsDashboard";

export const runtime = "nodejs";

export default async function AdminLeadsPage() {
  const data = await readLeadDashboardData();
  return <LeadsDashboard initialData={data} />;
}
