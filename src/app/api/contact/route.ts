import { NextResponse } from "next/server";
import { Resend } from "resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_FIELD_LENGTH = 5000;

type ContactBody = {
  name?: string;
  email?: string;
  message?: string;
  company?: string;
  companyTrap?: string;
  formType?: string;
  businessName?: string;
  website?: string;
  businessType?: string;
  country?: string;
  teamSize?: string;
  budgetRange?: string;
  workflowType?: string;
  weeklyVolume?: string;
  workflow?: string;
  tools?: string;
  humanReviewBoundary?: string;
  timeline?: string;
  landingContext?: string;
  attribution?: Record<string, string | undefined>;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatLine(label: string, value: string) {
  return value ? `${label}: ${value}\n` : "";
}

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("Contact form missing RESEND_API_KEY");
      return NextResponse.json(
        { error: "Contact form is not configured." },
        { status: 500 },
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = (await request.json()) as ContactBody;
    const name = clean(body.name);
    const email = clean(body.email);
    const message = clean(body.message);
    const formType = clean(body.formType) || "contact";
    const businessName = clean(body.businessName);
    const website = clean(body.website);
    const businessType = clean(body.businessType);
    const country = clean(body.country);
    const teamSize = clean(body.teamSize);
    const budgetRange = clean(body.budgetRange);
    const workflowType = clean(body.workflowType);
    const weeklyVolume = clean(body.weeklyVolume);
    const workflow = clean(body.workflow);
    const tools = clean(body.tools);
    const humanReviewBoundary = clean(body.humanReviewBoundary);
    const timeline = clean(body.timeline);
    const landingContext = clean(body.landingContext);
    const companyTrap = clean(body.companyTrap || body.company);
    const attribution = body.attribution || {};

    // Honeypot — real users never fill this hidden field
    if (companyTrap) {
      // Silently accept to not tip off bots
      return NextResponse.json({ success: true });
    }

    if (!name || !email || (!message && !workflow)) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 },
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const fieldsToCheck = [
      message,
      businessName,
      website,
      businessType,
      country,
      teamSize,
      budgetRange,
      workflowType,
      weeklyVolume,
      workflow,
      tools,
      humanReviewBoundary,
      timeline,
      landingContext,
    ];

    if (fieldsToCheck.some((field) => field.length > MAX_FIELD_LENGTH)) {
      return NextResponse.json(
        { error: "Message fields must be under 5,000 characters." },
        { status: 400 },
      );
    }

    const sourceLines = [
      formatLine("UTM source", clean(attribution.utm_source)),
      formatLine("UTM medium", clean(attribution.utm_medium)),
      formatLine("UTM campaign", clean(attribution.utm_campaign)),
      formatLine("UTM term", clean(attribution.utm_term)),
      formatLine("UTM content", clean(attribution.utm_content)),
      formatLine("GCLID", clean(attribution.gclid)),
      formatLine("GBRAID", clean(attribution.gbraid)),
      formatLine("WBRAID", clean(attribution.wbraid)),
      formatLine("Landing path", clean(attribution.landing_path)),
      formatLine("Landing URL", clean(attribution.landing_url)),
      formatLine("Referrer", clean(attribution.referrer)),
      formatLine("First touch", clean(attribution.first_touch_at)),
      formatLine("Current touch", clean(attribution.current_touch_at)),
    ].join("");

    const text =
      formType === "ai-workflow-audit"
        ? [
            "New AI workflow audit request",
            "",
            `Name: ${name}`,
            `Email: ${email}`,
            formatLine("Business", businessName).trimEnd(),
            formatLine("Website", website).trimEnd(),
            formatLine("Business type", businessType).trimEnd(),
            formatLine("Country", country).trimEnd(),
            formatLine("Team size", teamSize).trimEnd(),
            formatLine("Workflow type", workflowType).trimEnd(),
            formatLine("Weekly volume", weeklyVolume).trimEnd(),
            formatLine("Budget range", budgetRange).trimEnd(),
            formatLine("Timeline", timeline).trimEnd(),
            formatLine("Landing context", landingContext).trimEnd(),
            "",
            "Workflow:",
            workflow,
            "",
            "Tools involved:",
            tools || "Not provided",
            "",
            "What should stay human:",
            humanReviewBoundary || "Not provided",
            "",
            "Additional message:",
            message || "Not provided",
            "",
            "Attribution:",
            sourceLines || "No attribution captured.",
          ]
            .filter(Boolean)
            .join("\n")
        : `Name: ${name}\nEmail: ${email}\n${formatLine("Business", businessName)}\n${message}\n\nAttribution:\n${
            sourceLines || "No attribution captured."
          }`;

    await resend.emails.send({
      from:
        process.env.CONTACT_FROM_EMAIL ||
        "Portfolio Contact <hello@duncananderson.ca>",
      to: process.env.CONTACT_TO_EMAIL || "duncan@duncananderson.ca",
      replyTo: email,
      subject:
        formType === "ai-workflow-audit"
          ? `AI workflow audit request from ${name}`
          : `New message from ${name}`,
      text,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 },
    );
  }
}
