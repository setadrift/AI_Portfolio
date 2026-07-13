import type { Metadata } from "next";
import MinaJobsBoard from "./MinaJobsBoard";
import { readMinaJobsData } from "@/lib/portal/mina/jobs";

export const metadata: Metadata = {
  title: "Mina's job search",
  description: "A private shortlist and application tracker for Mina.",
};

export default async function MinaJobsPage() {
  const data = await readMinaJobsData();
  return <MinaJobsBoard initialData={data} />;
}
