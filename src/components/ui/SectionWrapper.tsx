interface SectionWrapperProps {
  id: string;
  children: React.ReactNode;
  alternate?: boolean;
}

export default function SectionWrapper({
  id,
  children,
  alternate = false,
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={`px-6 py-20 md:py-28 ${alternate ? "bg-white" : "bg-warm-50"}`}
    >
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  );
}
