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
      className={`relative px-6 py-20 md:py-28 ${alternate ? "bg-surface" : "bg-background"}`}
    >
      <div className="mx-auto max-w-5xl">{children}</div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />
    </section>
  );
}
