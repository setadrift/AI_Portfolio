export const SITE = {
  name: "Duncan Anderson",
  title: "Duncan Anderson — AI Consulting for Small Business",
  description:
    "I help small businesses save time and grow with practical AI solutions. No jargon, just results.",
  tagline: "Practical AI for small business.",
  url: "https://duncananderson.ca",
};

export const BOOKING_URL =
  "https://cal.com/duncan-anderson-sdo5hp/ai-automation-discovery-call";

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
      "Production sports analytics platform with ML projections, live odds, EV tools, subscriptions, automated grading, and operating dashboards.",
    result:
      "Built and operate a paid multi-sport analytics product with real-time data pipelines, Stripe/RevenueCat billing, accuracy tracking, and automated settlement.",
    problem:
      "Sports bettors lacked a single place to turn live sports data, player projections, sportsbook odds, and historical results into decisions they could actually trust. The hard part was not only prediction accuracy. The product needed reliable data ingestion, clear user-facing signals, automated grading, subscription access, and public proof that the system was working.",
    solution:
      "I designed, built, and operate The Lineup end-to-end as a solo founder. The platform covers NBA, NFL, NHL, MLB, college basketball, and major soccer leagues across projections, odds, betting tools, and settlement workflows.\n\nML and Data Pipeline — LightGBM projection models generate player forecasts and confidence tiers from historical stats, role context, pace, matchup, and usage signals. The data layer ingests sports stats and sportsbook odds, normalizes them into PostgreSQL, and keeps the product useful even when provider data is incomplete.\n\nReal-Time Betting Engine — The platform compares market prices across sportsbooks, surfaces expected value and arbitrage opportunities, tracks closing-line value, and automatically settles bets against final results so users can see what actually worked.\n\nFull-Stack Operating System — FastAPI backend on Railway, Next.js frontend on Vercel, PostgreSQL on Supabase, Redis caching, Stripe subscriptions, RevenueCat for iOS, Postmark email, PostHog analytics, and admin tools for monitoring growth, data freshness, billing, and product usage.",
    outcome:
      "The Lineup is a live paid product, not a demo. I built and continue to operate the full loop: data pipelines, ML models, odds ingestion, automated settlement, user dashboards, billing, email, analytics, growth experiments, and reliability monitoring. It is the clearest example of how I build AI and automation systems that connect models, operations, and business outcomes.",
    tech: ["Python", "FastAPI", "Next.js", "LightGBM", "PostgreSQL", "Redis", "Stripe", "RevenueCat"],
  },
];
