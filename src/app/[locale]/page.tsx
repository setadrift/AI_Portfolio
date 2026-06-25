import { setRequestLocale } from "next-intl/server";
import Hero from "@/components/sections/Hero";
import WorkflowOffers from "@/components/sections/WorkflowOffers";
import Projects from "@/components/sections/Projects";
import About from "@/components/sections/About";
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
      <WorkflowOffers />
      <Projects />
      <About />
      <Contact />
    </>
  );
}
