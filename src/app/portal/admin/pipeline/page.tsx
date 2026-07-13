import { readAcquisitionData } from "@/lib/portal/admin/acquisition-db";
import PipelineWorkspace from "./PipelineWorkspace";

export const runtime = "nodejs";

export default async function PipelinePage() {
  const data = await readAcquisitionData();
  return <PipelineWorkspace initialData={data} />;
}
