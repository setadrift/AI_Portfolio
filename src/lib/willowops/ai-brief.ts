import type { Client, FinanceSnapshot, ProcurementItem, Project } from "./prototype-data";

export type WillowOpsBriefInput = {
  client: Client;
  finance?: FinanceSnapshot;
  procurement: ProcurementItem[];
  project: Project;
  statusChange?: {
    board?: string;
    changedAt?: string;
    changedBy?: string;
    newStatus?: string;
    previousStatus?: string;
  };
};

export type WillowOpsBrief = {
  generatedBy: "fallback" | "openai";
  summary: string;
  risks: string[];
  missingInformation: string[];
  discoveryQuestions: string[];
  internalNextActions: string[];
  outlookDraft: {
    subject: string;
    body: string;
  };
  reviewRequired: boolean;
};

function formatCurrency(value: number | undefined) {
  if (typeof value !== "number") return "not confirmed";

  return new Intl.NumberFormat("en-GB", {
    currency: "GBP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function buildFallbackBrief(input: WillowOpsBriefInput): WillowOpsBrief {
  const delayedItems = input.procurement.filter((item) => item.status === "Delayed");
  const pendingApprovals = input.procurement.filter((item) => item.clientApprovalStatus === "Pending");
  const missingInformation = [
    !input.client.email ? "Client email" : null,
    !input.project.targetInstallDate ? "Target install date" : null,
    !input.project.budget ? "Project budget" : null,
    input.procurement.length === 0 ? "Procurement/design item detail" : null,
  ].filter((item): item is string => Boolean(item));

  const risks = [
    input.project.riskStatus !== "On track"
      ? `${input.project.name} is marked ${input.project.riskStatus.toLowerCase()}.`
      : null,
    delayedItems.length > 0
      ? `${delayedItems.length} procurement item${delayedItems.length === 1 ? "" : "s"} delayed.`
      : null,
    pendingApprovals.length > 0
      ? `${pendingApprovals.length} client approval${pendingApprovals.length === 1 ? "" : "s"} pending.`
      : null,
    input.finance?.paymentStatus === "Overdue"
      ? `${formatCurrency(input.finance.outstandingTotal)} is overdue.`
      : null,
  ].filter((item): item is string => Boolean(item));

  return {
    generatedBy: "fallback",
    summary: `${input.client.name} is associated with ${input.project.name}, a ${input.project.serviceType.toLowerCase()} in ${input.project.propertyLocation}. The project is currently at ${input.project.stage} with a ${formatCurrency(input.project.budget)} working budget. The current next action is: ${input.project.nextAction}`,
    risks: risks.length ? risks : ["No immediate operational risks in the current prototype data."],
    missingInformation,
    discoveryQuestions: [
      "What is the main outcome the client wants from this project?",
      "Are there any hard deadlines, access constraints, or decision makers we need to plan around?",
      "Which rooms or procurement categories are most likely to drive budget or timing risk?",
      "Who should approve external client updates before they are sent?",
    ],
    internalNextActions: [
      "Confirm the source of truth for project status before creating downstream automations.",
      "Review the generated client follow-up before sending externally.",
      "Update Monday.com with the next action and owner.",
      "Log this automation run for review.",
    ],
    outlookDraft: {
      subject: `${input.project.name} - discovery next steps`,
      body: [
        `Hi ${input.client.name},`,
        "",
        `Thank you for sharing the initial details for ${input.project.name}. We are preparing the next steps around your ${input.project.serviceType.toLowerCase()} and will make sure the project notes, budget range, and timing are captured clearly before anything moves forward.`,
        "",
        "The next useful step is to confirm the key priorities, any fixed timing constraints, and the decisions you would like support with first.",
        "",
        "Best,",
        "Willow Grey Interiors",
      ].join("\n"),
    },
    reviewRequired: true,
  };
}

function tryParseBrief(content: string): Omit<WillowOpsBrief, "generatedBy"> | null {
  try {
    const parsed = JSON.parse(content) as Partial<Omit<WillowOpsBrief, "generatedBy">>;

    if (
      typeof parsed.summary === "string" &&
      Array.isArray(parsed.risks) &&
      Array.isArray(parsed.missingInformation) &&
      Array.isArray(parsed.discoveryQuestions) &&
      Array.isArray(parsed.internalNextActions) &&
      parsed.outlookDraft &&
      typeof parsed.outlookDraft.subject === "string" &&
      typeof parsed.outlookDraft.body === "string" &&
      typeof parsed.reviewRequired === "boolean"
    ) {
      return parsed as Omit<WillowOpsBrief, "generatedBy">;
    }
  } catch {
    return null;
  }

  return null;
}

export async function generateWillowOpsBrief(input: WillowOpsBriefInput): Promise<WillowOpsBrief> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return buildFallbackBrief(input);
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an operations automation assistant for a luxury interior design business. Be conservative. Do not invent dates, prices, approvals, suppliers, or client decisions. Return only valid JSON.",
        },
        {
          role: "user",
          content: [
            "Create a structured project/discovery brief for an internal team.",
            "Return JSON with: summary, risks, missingInformation, discoveryQuestions, internalNextActions, outlookDraft { subject, body }, reviewRequired.",
            "",
            JSON.stringify(input, null, 2),
          ].join("\n"),
        },
      ],
      response_format: { type: "json_object" },
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!res.ok) {
    return buildFallbackBrief(input);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  const parsed = content ? tryParseBrief(content) : null;

  if (!parsed) {
    return buildFallbackBrief(input);
  }

  return {
    ...parsed,
    generatedBy: "openai",
  };
}
