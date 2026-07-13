import { readAcquisitionData } from "@/lib/portal/admin/acquisition-db";
import CommitmentsWorkspace from "./CommitmentsWorkspace";

export const runtime = "nodejs";

export default async function AdminTasksPage() {
  const data = await readAcquisitionData();
  return <CommitmentsWorkspace data={data} />;
}
