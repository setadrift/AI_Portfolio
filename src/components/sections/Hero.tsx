import { useLocale } from "next-intl";
import BookingConversionLink from "@/components/ads/BookingConversionLink";
import { BOOKING_URL } from "@/lib/constants";

const copy = {
  en: {
    kicker: "Independent systems consultant",
    heading: "Turn the work held together by hand into",
    emphasis: "a system that holds.",
    body: "I work with founders and operators to replace one recurring, manual workflow with a practical system their team can review, run, and improve.",
    cta: "Discuss the workflow",
    secondary: "See the work",
    inputs: ["Email", "PDF", "Spreadsheet", "Voice note"],
    output: "Ready for review",
    motion: ["Map the work", "Build the system", "Keep the judgment"],
  },
  fr: {
    kicker: "Consultant indépendant en systèmes",
    heading: "Transformez le travail tenu à bout de bras en",
    emphasis: "un système qui tient.",
    body: "J’aide les fondateurs et responsables des opérations à remplacer un workflow manuel récurrent par un système pratique que leur équipe peut réviser, utiliser et améliorer.",
    cta: "Discuter du workflow",
    secondary: "Voir le travail",
    inputs: ["Courriel", "PDF", "Tableur", "Note vocale"],
    output: "Prêt pour révision",
    motion: ["Cartographier", "Construire", "Garder le jugement"],
  },
};

function AmbientSystem({ inputs, output }: { inputs: string[]; output: string }) {
  return (
    <div className="ambient-system" aria-label={`${inputs.join(", ")} — ${output}`}>
      <div className="ambient-core" aria-hidden="true">
        <span className="ambient-core-line" />
        <span className="ambient-core-mark">DA</span>
      </div>
      {inputs.map((input, index) => (
        <span className={`ambient-input ambient-input-${index + 1}`} key={input}>{input}</span>
      ))}
      <div className="ambient-output">
        <span className="ambient-output-dot" aria-hidden="true" />
        {output}
      </div>
      <span className="ambient-orbit ambient-orbit-one" aria-hidden="true" />
      <span className="ambient-orbit ambient-orbit-two" aria-hidden="true" />
    </div>
  );
}

export default function Hero() {
  const t = copy[useLocale() === "fr" ? "fr" : "en"];

  return (
    <section className="editorial-hero" aria-labelledby="hero-heading">
      <div className="editorial-hero-grid">
        <div className="editorial-hero-copy">
          <p className="editorial-kicker">{t.kicker}</p>
          <h1 id="hero-heading">
            {t.heading} <em>{t.emphasis}</em>
          </h1>
          <div className="editorial-hero-foot">
            <p>{t.body}</p>
            <div className="editorial-actions">
              <BookingConversionLink href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="editorial-button">
                {t.cta}<span aria-hidden="true">↗</span>
              </BookingConversionLink>
              <a href="#projects" className="editorial-text-link">{t.secondary}<span aria-hidden="true">↓</span></a>
            </div>
          </div>
        </div>
        <AmbientSystem inputs={t.inputs} output={t.output} />
      </div>
      <div className="editorial-runner" aria-hidden="true">
        <div>{[...t.motion, ...t.motion].map((item, index) => <span key={`${item}-${index}`}>{item}<i>→</i></span>)}</div>
      </div>
    </section>
  );
}
