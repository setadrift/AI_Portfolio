export const SITE = {
  name: "Duncan Anderson",
  title: "Duncan Anderson — AI Consulting for Small Business",
  description:
    "I help small businesses save time and grow with practical AI solutions. No jargon, just results.",
  tagline: "Practical AI for small business.",
  url: "https://duncananderson.ai",
};

export const NAV_LINKS = [
  { label: "Projects", href: "/#projects" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export interface Project {
  slug: string;
  clientType: string;
  title: string;
  challenge: string;
  result: string;
  problem: string;
  solution: string;
  outcome: string;
  tech: string[];
}

export const PROJECTS: Project[] = [
  {
    slug: "dispute-defender",
    clientType: "Online Travel Agency",
    title: "Dispute Defender",
    challenge:
      "A major travel company was losing money on chargebacks — each one took staff hours to investigate, gather evidence, and respond. Thousands piled up every month.",
    result:
      "Built an AI pipeline that automatically gathers the right evidence and fights disputes end-to-end — recovering revenue that was previously written off.",
    problem:
      "Every time a customer disputed a charge, someone on the team had to manually dig through booking records, pull together evidence, figure out why the dispute happened, and write a response. With thousands of disputes hitting every month, the team was buried. Most disputes got a generic response — or no response at all — because there simply wasn't enough time. Revenue was walking out the door.",
    solution:
      "I built an automated pipeline that handles the entire dispute process from start to finish. The system pulls in the chargeback, gathers all the relevant booking and transaction data, classifies the root cause, and assembles a tailored evidence package — all without anyone touching it. It replaced what used to be a slow, manual process with something that runs in the background and gets it right the first time.",
    outcome:
      "The team got hours back every week that they'd been spending on repetitive dispute work. Win rates improved because every dispute now gets a well-researched, specific response instead of a rushed one. Revenue that was previously written off started getting recovered consistently.",
    tech: ["Python", "Machine Learning", "REST APIs", "Data Pipelines"],
  },
  {
    slug: "deal-engine",
    clientType: "Online Travel Agency",
    title: "Deal Engine",
    challenge:
      "Customers were browsing thousands of flights but had no easy way to find the best deals. Great prices were buried in the noise, and conversions suffered.",
    result:
      "Built a real-time deal surfacing engine that highlights the hottest flights at any given moment — putting the right deals in front of the right people.",
    problem:
      "FlightHub's inventory had thousands of flights at any given time, but the best deals were hidden in the noise. Customers would browse, get overwhelmed, and leave. The sales team knew great prices existed but had no systematic way to surface them. Meanwhile, competitors were getting better at showing users exactly what they wanted to see.",
    solution:
      "I built a system that continuously analyzes the full flight inventory and identifies which deals are genuinely good — not just cheap, but good value relative to the route, timing, and historical pricing. The engine scores and ranks deals in real time so the best ones can be surfaced to users right when they're browsing. It turned a passive catalog into an active recommendation system.",
    outcome:
      "Conversion rates went up because users started seeing deals that actually matched what they were looking for, right when it mattered. The system ran continuously without manual curation, which meant the merchandising team could focus on strategy instead of hand-picking deals every day.",
    tech: ["Python", "Real-Time Analytics", "Recommendation Systems", "SQL"],
  },
  {
    slug: "the-lineup",
    clientType: "Sports Analytics Platform",
    title: "The Lineup",
    challenge:
      "Sports bettors and fantasy players had no reliable way to compare projections, spot value, or catch pricing errors across platforms.",
    result:
      "Created a full analytics platform with ML-powered projections, real-time arbitrage detection, and lineup optimization — now used by 200+ paying subscribers.",
    problem:
      "If you're serious about sports betting or daily fantasy, you need an edge — and that means data. But the tools available were either too basic, too expensive, or scattered across a dozen sites. There was no single place to get reliable projections, compare odds across sportsbooks, and build optimized lineups. People were making decisions on gut feel when they should've been using math.",
    solution:
      "I designed and built The Lineup from scratch — a full-stack platform that brings everything into one place. It runs ML models to generate player projections across NBA, NFL, NHL, and college basketball. It scans odds across multiple sportsbooks in real time to catch arbitrage opportunities and pricing mistakes. And it includes a DFS lineup optimizer that builds the best possible lineups based on projections, salary constraints, and correlation logic.",
    outcome:
      "The platform launched and grew to over 200 paying subscribers with recurring revenue. Users get a genuine edge from data they can't easily find elsewhere. It's a live product that I built, shipped, and continue to run — from the ML models to the frontend to billing.",
    tech: ["Python", "React", "Machine Learning", "PostgreSQL", "AWS"],
  },
];
