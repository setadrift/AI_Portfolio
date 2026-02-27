export const SITE = {
  name: "Duncan Anderson",
  title: "Duncan Anderson — AI Consulting for Small Business",
  description:
    "I help small businesses save time and grow with practical AI solutions. No jargon, just results.",
  tagline: "Practical AI for small business.",
  url: "https://duncananderson.ai",
};

export const NAV_LINKS = [
  { label: "Projects", href: "#projects" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export interface Project {
  clientType: string;
  title: string;
  challenge: string;
  result: string;
}

export const PROJECTS: Project[] = [
  {
    clientType: "Online Travel Agency",
    title: "Automated Dispute Resolution",
    challenge:
      "A major travel company was losing money on chargebacks — each one took staff hours to investigate, gather evidence, and respond. Thousands piled up every month.",
    result:
      "Built an AI pipeline that automatically gathers the right evidence and fights disputes end-to-end — recovering revenue that was previously written off.",
  },
  {
    clientType: "Sports Analytics Platform",
    title: "Data-Driven Projections at Scale",
    challenge:
      "Sports bettors and fantasy players had no reliable way to compare projections, spot value, or catch pricing errors across platforms.",
    result:
      "Created a full analytics platform with ML-powered projections, real-time arbitrage detection, and lineup optimization — now used by 200+ subscribers.",
  },
  {
    clientType: "E-commerce Business",
    title: "Smart Customer Support Automation",
    challenge:
      "A growing online business was drowning in repetitive customer questions. The small team spent hours each day on the same answers instead of growing sales.",
    result:
      "Set up an AI assistant trained on their actual policies and products — now handles 70% of inquiries automatically, freeing the team to focus on revenue.",
  },
];
