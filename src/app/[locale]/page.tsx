import { setRequestLocale } from "next-intl/server";
import Hero from "@/components/sections/Hero";
import LandingSections from "@/components/sections/LandingSections";

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
      <LandingSections />
    </>
  );
}
