import { setRequestLocale } from "next-intl/server";
import Hero from "@/components/sections/Hero";
import BuyerSituations from "@/components/sections/BuyerSituations";
import WorkflowOffers from "@/components/sections/WorkflowOffers";
import Projects from "@/components/sections/Projects";
import SafeMethod from "@/components/sections/SafeMethod";
import About from "@/components/sections/About";
import TrustStatement from "@/components/sections/TrustStatement";
import Contact from "@/components/sections/Contact";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <BuyerSituations />
      <WorkflowOffers />
      <Projects />
      <SafeMethod />
      <About />
      <TrustStatement />
      <Contact />
    </>
  );
}
