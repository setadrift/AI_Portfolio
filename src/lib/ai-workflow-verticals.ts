export type WorkflowVertical = {
  slug: string;
  market: string;
  eyebrow: string;
  title: string;
  shortTitle: string;
  metaDescription: string;
  hero: string;
  ctaWorkflow: string;
  urgentPain: string;
  bestFit: string[];
  symptoms: string[];
  workflowMap: string[];
  automationIdeas: string[];
  auditDeliverables: string[];
  proofAngle: string;
  searchIntent: string[];
  adGroupName: string;
  path1: string;
  path2: string;
  keywords: string[];
  headlines: string[];
  descriptions: string[];
};

export const WORKFLOW_VERTICALS: WorkflowVertical[] = [
  {
    slug: "construction-bid-package-review",
    market: "Commercial subcontractors",
    eyebrow: "Bid package review",
    title: "Bid package review workflow for overloaded subcontractor estimators",
    shortTitle: "Bid Package Review",
    metaDescription:
      "Review plans, specs, addenda, bid forms, scope gaps, RFIs, exclusions, and bid-day checklists before commercial subcontractor bids go out.",
    hero:
      "Turn messy plans, specs, addenda, bid forms, GC instructions, and estimator notes into a structured pre-bid review your estimator can actually use before price lock.",
    ctaWorkflow:
      "We are bidding commercial work from PDF plans, specs, addenda, bid forms, and GC invitations. We need help catching scope gaps, RFI candidates, missing addenda, exclusions, alternates, vendor dependencies, and bid-day checklist items before the proposal goes out.",
    urgentPain:
      "The expensive miss is usually not a math error. It is a late addendum, unclear scope boundary, missing bid form requirement, controls/vendor dependency, or unanswered RFI that turns into unpriced work.",
    bestFit: [
      "Electrical, mechanical, roofing, glazing, low-voltage, fire alarm, flooring, and specialty subcontractors with recurring commercial bid volume.",
      "Owner-estimators or preconstruction leads reviewing plans after hours because every package has different instructions.",
      "Teams that already price work but need a second structured pass over compliance, scope, exclusions, and bid-day risk.",
    ],
    symptoms: [
      "Bid invites, addenda, drawing sheets, alternates, allowances, and proposal templates live in different email threads or folders.",
      "RFIs are written late, or unanswered RFIs become rushed proposal qualifications.",
      "Vendor quote requests go out without a clean scope split for controls, fire alarm, testing, startup, closeout, or AHJ requirements.",
      "Estimator notes are useful but never become a reusable checklist for the next similar package.",
    ],
    workflowMap: [
      "Package intake: plans, specs, addenda, bid instructions, bid form, proposal template, scope letter, and estimator notes.",
      "Document completeness check: missing addenda logs, final bid forms, alternates, allowances, unit prices, bonding, taxes, and delivery instructions.",
      "Scope boundary scan: divisions, trade overlaps, vendor responsibilities, exclusions, clarifications, and unclear GC requirements.",
      "Output: RFI candidates, proposal qualifications, vendor quote prompts, risk flags, and a bid-day checklist.",
    ],
    automationIdeas: [
      "A bid package intake checklist that forces every package through the same document completeness review.",
      "RFI and qualification draft generation from ambiguous scope, missing sheets, addenda changes, and vendor dependencies.",
      "Estimator-ready bid-day checklist generation for addenda acknowledgements, alternates, allowances, taxes, bonding, and submission instructions.",
      "Reusable review templates by trade so the second package is faster than the first.",
    ],
    auditDeliverables: [
      "A workflow map from bid invite to submitted proposal.",
      "A missing-document and addenda-risk checklist.",
      "A first-pass structure for RFI candidates, exclusions, and bid-day checks.",
      "A practical build plan for a concierge-assisted or semi-automated bid review workflow.",
    ],
    proofAngle:
      "This page is based on the Bid Package Review workflow: a narrow construction bid desk concept focused on scope notes, RFI candidates, risk flags, exclusions, and bid-day checklists rather than full estimating or takeoff.",
    searchIntent: [
      "construction bid package review",
      "subcontractor bid review",
      "bid package RFI review",
      "construction addenda checklist",
    ],
    adGroupName: "Vertical | Construction Bid Review",
    path1: "bid-review",
    path2: "rfis",
    keywords: [
      "construction bid package review",
      "subcontractor bid review",
      "bid package review service",
      "construction rfi review",
      "construction addenda review",
      "bid day checklist",
      "subcontractor estimate review",
      "commercial bid review",
    ],
    headlines: [
      "Bid Package Review Help",
      "Catch Scope Gaps",
      "RFI Draft Workflow",
      "Addenda Risk Review",
      "Estimator Workflow Audit",
      "Bid-Day Checklist Help",
      "Subcontractor Bid Desk",
      "Review Before Bid Day",
    ],
    descriptions: [
      "Map the bid-review workflow for plans, specs, addenda, RFIs, exclusions, and bid-day checks.",
      "Built for commercial subcontractors who need a cleaner pre-bid review process.",
      "Find missing package items, unclear scope, and proposal qualification gaps before price lock.",
      "Start with a focused workflow audit before building a larger bid desk system.",
    ],
  },
  {
    slug: "roofing-estimate-follow-up",
    market: "Roofing contractors",
    eyebrow: "Roofing estimate follow-up",
    title: "Roofing estimate follow-up workflow for quotes that go cold",
    shortTitle: "Roofing Follow-Up",
    metaDescription:
      "Automate roofing estimate follow-up, proposal reminders, photo notes, production handoffs, and lost-quote tracking.",
    hero:
      "Make every roof inspection, photo set, estimate, proposal, financing note, and follow-up task visible before good leads disappear into inboxes and text threads.",
    ctaWorkflow:
      "We inspect roofs, send estimates, and then lose track of follow-up across calls, texts, email, CRM notes, photos, financing, insurance details, and production handoffs.",
    urgentPain:
      "A roofing lead can be won or lost in the first few follow-up touches. The leak is rarely lead volume; it is quote status, unanswered questions, insurance/financing context, and next-step ownership.",
    bestFit: [
      "Residential or light-commercial roofers running estimates from phone calls, forms, texts, photos, and CRM notes.",
      "Teams where sales reps own follow-up but office staff still chase status manually.",
      "Owners who want to know which estimates are open, stale, won, lost, or waiting on customer/insurance action.",
    ],
    symptoms: [
      "Open estimates have no consistent next follow-up date.",
      "Photos, measurements, inspection notes, and proposal versions are scattered.",
      "Customers ask the same questions because proposal context is hard to find.",
      "Lost quotes are not categorized, so pricing, timing, financing, and competitor objections never become useful data.",
    ],
    workflowMap: [
      "Lead source, property, damage/repair context, inspection appointment, and estimator assignment.",
      "Inspection notes, photo set, measurements, material options, financing/insurance details, and proposal generation.",
      "Follow-up cadence by quote status, age, job value, seasonality, and customer objection.",
      "Won/lost reasons, production handoff, deposit status, scheduling, and customer communication.",
    ],
    automationIdeas: [
      "Quote-age dashboard with next follow-up owner and stale-estimate alerts.",
      "AI-assisted proposal follow-up drafts that reference roof type, inspection notes, financing, and customer concerns.",
      "Lost-quote tagging that turns objections into sales coaching and offer changes.",
      "Production handoff checklist from signed proposal to materials, crew scheduling, permits, and customer expectations.",
    ],
    auditDeliverables: [
      "A quote lifecycle map from lead to inspection to signed job.",
      "A stale-estimate and follow-up risk report.",
      "A recommended CRM/spreadsheet automation plan.",
      "Follow-up message templates tied to actual proposal status.",
    ],
    proofAngle:
      "The audit focuses on the revenue workflow after the estimate, where small admin gaps can cost real jobs.",
    searchIntent: [
      "roofing estimate follow up",
      "roofing crm automation",
      "roofing sales follow up",
    ],
    adGroupName: "Vertical | Roofing Follow Up",
    path1: "roofing",
    path2: "follow-up",
    keywords: [
      "roofing estimate follow up",
      "roofing workflow automation",
      "roofing crm automation",
      "roofing sales automation",
      "roofing quote follow up",
      "roofing proposal follow up",
      "roofing lead follow up",
      "roofing contractor automation",
    ],
    headlines: [
      "Roofing Follow-Up Help",
      "Stop Losing Estimates",
      "Quote Follow-Up Workflow",
      "Roofing CRM Automation",
      "Track Every Roof Quote",
      "Automate Proposal Follow-Up",
      "Roofing Workflow Audit",
      "Built By An Engineer",
    ],
    descriptions: [
      "Map roofing estimate follow-up from inspection notes to proposal reminders and won/lost tracking.",
      "Find where open roof quotes stall across texts, email, CRM notes, photos, and financing context.",
      "Build a practical follow-up workflow before buying another tool.",
      "Turn stale roofing estimates into visible next steps and owner accountability.",
    ],
  },
  {
    slug: "hvac-plumbing-dispatch-follow-up",
    market: "HVAC and plumbing service companies",
    eyebrow: "Dispatch and service follow-up",
    title: "HVAC and plumbing workflow audit for dispatch, quotes, and service follow-up",
    shortTitle: "HVAC/Plumbing Dispatch",
    metaDescription:
      "Improve HVAC and plumbing dispatch workflows, missed-call handling, quote follow-up, service notes, and recurring maintenance reminders.",
    hero:
      "Connect missed calls, service requests, dispatch notes, technician updates, estimates, maintenance reminders, and follow-up so revenue work does not depend on memory.",
    ctaWorkflow:
      "We handle service calls, dispatch, technician notes, repair quotes, maintenance reminders, and customer follow-up across phone, email, texts, field software, and spreadsheets.",
    urgentPain:
      "For service companies, the problem is not only booking the job. It is what happens after the call: dispatch context, technician notes, quote follow-up, parts status, and recurring maintenance reminders.",
    bestFit: [
      "HVAC or plumbing teams with office staff manually reconciling calls, dispatch boards, quotes, and follow-ups.",
      "Owners who suspect repair quotes and maintenance opportunities are slipping after the first visit.",
      "Teams using ServiceTitan, Housecall Pro, Jobber, spreadsheets, or a mix of tools that do not quite match the real workflow.",
    ],
    symptoms: [
      "Missed calls and voicemail callbacks are not tracked as a revenue queue.",
      "Repair estimates sit open without a next contact date or clear owner.",
      "Technician notes do not become customer follow-up, parts orders, or maintenance reminders.",
      "Office staff copy details between field software, email, spreadsheets, and calendars.",
    ],
    workflowMap: [
      "Call/request intake, urgency, customer/property record, equipment context, and dispatch assignment.",
      "Technician visit notes, photos, diagnosis, parts, estimate, customer decision, and return visit needs.",
      "Open quote follow-up cadence and recurring maintenance reminders.",
      "Management view of missed calls, open estimates, service aging, and follow-up accountability.",
    ],
    automationIdeas: [
      "Missed-call and voicemail callback queue with owner, status, and aging.",
      "Open repair quote follow-up with job context and customer-specific reminders.",
      "Technician-note summarization into customer-facing follow-up and internal parts tasks.",
      "Maintenance reminder workflow that does not require manual spreadsheet review.",
    ],
    auditDeliverables: [
      "A dispatch-to-follow-up workflow map.",
      "A revenue-leak checklist for missed calls, stale quotes, and maintenance reminders.",
      "A tool integration plan for field software, email, SMS, calendars, and spreadsheets.",
      "A first automation candidate with expected owner, trigger, and output.",
    ],
    proofAngle:
      "The goal is service workflow cleanup, not HVAC hardware automation or building controls.",
    searchIntent: [
      "hvac dispatch automation",
      "plumbing estimate follow up",
      "service business automation",
    ],
    adGroupName: "Vertical | HVAC Plumbing Ops",
    path1: "hvac-plumbing",
    path2: "ops",
    keywords: [
      "hvac dispatch automation",
      "hvac workflow automation",
      "hvac estimate follow up",
      "hvac service automation",
      "plumbing dispatch automation",
      "plumbing workflow automation",
      "plumbing estimate follow up",
      "plumbing service automation",
      "service call automation",
    ],
    headlines: [
      "HVAC Dispatch Workflow",
      "Plumbing Follow-Up Help",
      "Track Service Quotes",
      "Missed Call Workflow",
      "Automate Service Follow-Up",
      "Technician Notes To Tasks",
      "HVAC Workflow Audit",
      "Built By An Engineer",
    ],
    descriptions: [
      "Map dispatch, technician notes, repair quotes, missed calls, and maintenance reminders.",
      "Practical automation for HVAC and plumbing service teams with admin bottlenecks.",
      "Find where service calls, open estimates, and customer follow-ups are leaking revenue.",
      "Avoid hardware searches. This is business workflow automation for service companies.",
    ],
  },
  {
    slug: "property-management-maintenance-intake",
    market: "Property managers",
    eyebrow: "Maintenance intake",
    title: "Property management maintenance intake workflow for tenant requests and vendor follow-through",
    shortTitle: "Maintenance Intake",
    metaDescription:
      "Automate tenant maintenance intake, triage, vendor dispatch, status updates, owner approvals, and recurring property reports.",
    hero:
      "Turn tenant maintenance emails, portal requests, texts, photos, vendor updates, owner approvals, and completion notes into one trackable workflow.",
    ctaWorkflow:
      "We receive tenant maintenance requests from multiple channels, triage urgency, contact vendors, request owner approval, follow up on status, and manually update tenants or property owners.",
    urgentPain:
      "Maintenance requests create trust problems when they disappear. The operational win is a clean status trail: received, triaged, assigned, waiting on vendor, waiting on owner, scheduled, completed, and billed.",
    bestFit: [
      "Small property management firms handling tenant requests by inbox, portal, text, phone, and spreadsheets.",
      "Teams coordinating vendors manually and losing visibility once a request leaves the office.",
      "Managers who need fewer status-check calls from tenants and owners.",
    ],
    symptoms: [
      "Tenant requests arrive through too many channels and need manual re-entry.",
      "Urgent items, repeat issues, and photo evidence are not consistently categorized.",
      "Vendor dispatch and owner approvals live in separate email threads.",
      "Weekly owner updates require manual status cleanup.",
    ],
    workflowMap: [
      "Request intake, property/unit, tenant, category, urgency, photo/document attachments, and duplicate detection.",
      "Triage decision: emergency, routine, tenant responsibility, owner approval, warranty/vendor callback, or quote needed.",
      "Vendor assignment, scheduling, status updates, completion proof, invoice capture, and owner/tenant communication.",
      "Reporting for open aging, repeat issue types, vendor response time, and owner approvals.",
    ],
    automationIdeas: [
      "Unified maintenance intake queue from email/forms/portal exports.",
      "AI triage labels for urgency, trade category, duplicate issue, and missing information.",
      "Vendor follow-up reminders and tenant status update drafts.",
      "Owner approval packets with summary, photos, estimate, and recommended next action.",
    ],
    auditDeliverables: [
      "A maintenance request lifecycle map.",
      "A triage taxonomy for urgency, category, owner approval, and vendor routing.",
      "A status-update and vendor follow-up automation plan.",
      "A reporting view for open tickets, aging, vendor response, and repeat issues.",
    ],
    proofAngle:
      "The audit targets tenant/vendor admin load, where small firms often know the process but lack a dependable system.",
    searchIntent: [
      "property management maintenance automation",
      "tenant request workflow",
      "maintenance intake automation",
    ],
    adGroupName: "Vertical | Property Maintenance",
    path1: "property",
    path2: "maintenance",
    keywords: [
      "property management maintenance automation",
      "tenant maintenance request automation",
      "property management workflow automation",
      "maintenance intake automation",
      "vendor dispatch automation property management",
      "property manager admin automation",
      "tenant request workflow",
      "property management ai automation",
    ],
    headlines: [
      "Maintenance Intake Help",
      "Tenant Request Workflow",
      "Vendor Follow-Up Automation",
      "Property Manager Admin Help",
      "Track Open Maintenance",
      "Owner Approval Workflow",
      "Property Workflow Audit",
      "Built By An Engineer",
    ],
    descriptions: [
      "Map tenant requests, vendor dispatch, owner approvals, and maintenance status updates.",
      "Practical automation for property managers buried in emails, texts, portals, and spreadsheets.",
      "Find where maintenance tickets disappear or create avoidable status-check calls.",
      "Start with one workflow audit before changing your property management software.",
    ],
  },
  {
    slug: "bookkeeping-receipt-cleanup",
    market: "Bookkeepers and small accounting teams",
    eyebrow: "Receipt and month-end cleanup",
    title: "Bookkeeping workflow audit for receipts, categorization, and month-end cleanup",
    shortTitle: "Bookkeeping Cleanup",
    metaDescription:
      "Automate receipt collection, document naming, transaction categorization support, missing-info follow-up, and month-end bookkeeping cleanup.",
    hero:
      "Make receipts, statements, client emails, transaction questions, document naming, and month-end follow-up easier to track before cleanup becomes deadline panic.",
    ctaWorkflow:
      "We chase clients for receipts, statements, missing transaction context, document naming, uncategorized expenses, and month-end cleanup across email, portals, spreadsheets, and bookkeeping software.",
    urgentPain:
      "The repetitive work is not the accounting judgment. It is chasing documents, matching context, asking the same client questions, and rebuilding the status of what is still missing.",
    bestFit: [
      "Bookkeepers managing several small-business clients with recurring monthly cleanup.",
      "Firms where staff manually rename documents, chase missing receipts, and update status spreadsheets.",
      "Owners who want fewer month-end surprises without outsourcing bookkeeping judgment to AI.",
    ],
    symptoms: [
      "Client documents arrive by email, shared folders, portals, photos, and accounting apps.",
      "Missing receipt and transaction-context questions are recreated manually each month.",
      "Staff lose time figuring out what has already been requested.",
      "Clients receive vague follow-ups instead of concise missing-item lists.",
    ],
    workflowMap: [
      "Client intake, document channels, file naming, receipt/statement status, and transaction-question queue.",
      "Rules for what AI can classify, what needs bookkeeper review, and what must be sent back to the client.",
      "Month-end close status by client: received, missing, reviewed, questions sent, answered, ready to close.",
      "Follow-up cadence and reusable client-specific question templates.",
    ],
    automationIdeas: [
      "Missing document tracker that produces clean client follow-up emails.",
      "Receipt/document renaming and routing by client, period, vendor, and account.",
      "Transaction-question drafts grouped by client instead of one-off email threads.",
      "Month-end status dashboard for clients at risk of late close.",
    ],
    auditDeliverables: [
      "A client document and month-end cleanup workflow map.",
      "A missing-info taxonomy for receipts, statements, uncategorized expenses, and transaction questions.",
      "An automation plan for document routing, status tracking, and client follow-up.",
      "A first workflow prototype recommendation that keeps human review where it belongs.",
    ],
    proofAngle:
      "This is designed around admin cleanup around bookkeeping, not replacing bookkeeping judgment.",
    searchIntent: [
      "bookkeeping workflow automation",
      "receipt automation bookkeeper",
      "month end bookkeeping cleanup",
    ],
    adGroupName: "Vertical | Bookkeeping Cleanup",
    path1: "bookkeeping",
    path2: "cleanup",
    keywords: [
      "bookkeeping workflow automation",
      "receipt automation for bookkeepers",
      "bookkeeping admin automation",
      "month end bookkeeping automation",
      "bookkeeping cleanup workflow",
      "automate receipt collection",
      "client document collection automation",
      "accounting workflow automation",
    ],
    headlines: [
      "Bookkeeping Workflow Help",
      "Automate Receipt Chasing",
      "Month-End Cleanup Help",
      "Client Document Workflow",
      "Missing Info Follow-Up",
      "Bookkeeper Admin Automation",
      "Keep Human Review",
      "Built By An Engineer",
    ],
    descriptions: [
      "Map receipt collection, document routing, missing-info follow-up, and month-end cleanup.",
      "Practical automation for bookkeepers without replacing accounting judgment.",
      "Turn scattered client documents and transaction questions into a cleaner status workflow.",
      "Start with one repeatable cleanup workflow before building more automation.",
    ],
  },
  {
    slug: "dental-clinic-front-desk-recall",
    market: "Dental clinics",
    eyebrow: "Front desk recall and treatment follow-up",
    title: "Dental clinic workflow audit for recall, unscheduled treatment, and front desk admin",
    shortTitle: "Dental Recall",
    metaDescription:
      "Improve dental recall, unscheduled treatment follow-up, cancellation gaps, patient intake, and front desk admin workflows.",
    hero:
      "Help the front desk keep recall, hygiene reactivation, unscheduled treatment, cancellations, intake forms, and patient follow-up from becoming manual busywork.",
    ctaWorkflow:
      "We manually follow up with overdue recall patients, unscheduled treatment plans, cancellations, intake forms, insurance questions, and patient messages across our PMS, email, texts, and spreadsheets.",
    urgentPain:
      "The front desk is often the growth engine and the bottleneck. If recall and unscheduled treatment follow-up are inconsistent, production disappears quietly.",
    bestFit: [
      "Small dental practices with front desk staff manually managing recall and treatment follow-up.",
      "Clinics using a PMS but still relying on spreadsheets, sticky notes, or ad hoc text follow-up.",
      "Owners who want better patient follow-through without adding another disconnected tool.",
    ],
    symptoms: [
      "Overdue recall lists are pulled irregularly and worked inconsistently.",
      "Unscheduled treatment plans do not have a clear follow-up owner or next-touch date.",
      "Cancellations create holes that are filled manually under pressure.",
      "Patient intake or insurance follow-up requires repeated staff chasing.",
    ],
    workflowMap: [
      "Patient segment: overdue recall, unscheduled treatment, cancellation, incomplete intake, insurance/document follow-up.",
      "Data source, status, last contact, next recommended touch, channel, and owner.",
      "Message templates by patient context with clear staff approval rules.",
      "Daily/weekly front desk queue for high-value follow-up work.",
    ],
    automationIdeas: [
      "Recall and unscheduled-treatment follow-up queue with next action and owner.",
      "Patient-specific message drafts for staff review.",
      "Cancellation gap list to help fill hygiene/production openings.",
      "Incomplete intake and insurance follow-up reminders before appointment day.",
    ],
    auditDeliverables: [
      "A front desk follow-up map by patient segment.",
      "A recall/treatment queue structure with status and next action.",
      "A patient messaging and approval workflow plan.",
      "A practical automation candidate that fits the clinic's PMS and communication tools.",
    ],
    proofAngle:
      "The audit targets front desk admin and follow-up consistency; clinical judgment stays with the clinic.",
    searchIntent: [
      "dental recall automation",
      "dental front desk workflow",
      "unscheduled treatment follow up",
    ],
    adGroupName: "Vertical | Dental Recall",
    path1: "dental",
    path2: "recall",
    keywords: [
      "dental recall automation",
      "dental front desk automation",
      "dental workflow automation",
      "unscheduled treatment follow up",
      "dental patient follow up automation",
      "dental office admin automation",
      "hygiene recall automation",
      "dental cancellation workflow",
    ],
    headlines: [
      "Dental Recall Workflow",
      "Front Desk Admin Help",
      "Unscheduled Treatment Follow-Up",
      "Dental Workflow Audit",
      "Fill Recall Gaps",
      "Patient Follow-Up Help",
      "Keep Staff In Control",
      "Built By An Engineer",
    ],
    descriptions: [
      "Map recall, unscheduled treatment, cancellations, intake, and patient follow-up.",
      "Practical automation for dental front desk teams without replacing clinical judgment.",
      "Turn patient follow-up lists into a clear queue with owner, status, and next action.",
      "Start with one front desk workflow before adding more software.",
    ],
  },
  {
    slug: "med-spa-lead-intake-follow-up",
    market: "Med spas and aesthetic clinics",
    eyebrow: "Lead intake and consult follow-up",
    title: "Med spa workflow audit for lead intake, consult follow-up, and rebooking",
    shortTitle: "Med Spa Intake",
    metaDescription:
      "Automate med spa lead intake, consultation follow-up, treatment plan reminders, rebooking prompts, and inquiry triage.",
    hero:
      "Turn DMs, website forms, calls, consult notes, treatment interests, quote questions, financing context, and rebooking reminders into a clean follow-up workflow.",
    ctaWorkflow:
      "We get leads from forms, calls, DMs, ads, referrals, and events. We need help triaging inquiries, booking consults, following up after consults, and rebooking patients without sounding generic.",
    urgentPain:
      "Med spa leads are high-intent but perishable. If consult follow-up depends on whoever remembers to text back, booked revenue leaks quickly.",
    bestFit: [
      "Med spas or aesthetic clinics handling inquiries across Instagram, website forms, calls, email, and booking software.",
      "Teams where consult notes and treatment interests are not consistently used in follow-up.",
      "Owners who want higher booking and rebooking consistency without generic blast messaging.",
    ],
    symptoms: [
      "DMs and website leads do not enter the same follow-up queue.",
      "Consult no-shows, undecided prospects, and treatment-plan follow-ups are not worked consistently.",
      "Staff rewrite the same answers about pricing, downtime, preparation, and next steps.",
      "Rebooking prompts are generic instead of tied to treatment cadence.",
    ],
    workflowMap: [
      "Lead source, treatment interest, urgency, consult status, booking source, and staff owner.",
      "Consult notes, recommendation, quote/treatment plan, objections, financing questions, and next recommended touch.",
      "Rebooking cadence by treatment type and patient status.",
      "Compliance-aware messaging rules with human review.",
    ],
    automationIdeas: [
      "Unified inquiry queue for DMs, forms, calls, and booking requests.",
      "Consult follow-up drafts based on treatment interest and staff notes.",
      "Rebooking reminders tied to treatment cadence and patient history.",
      "Lead aging report for inquiries that have not booked a consult.",
    ],
    auditDeliverables: [
      "A lead-to-consult-to-rebooking workflow map.",
      "A follow-up segmentation plan by treatment interest and status.",
      "A message approval workflow that keeps staff in control.",
      "A first automation candidate for inquiry triage or consult follow-up.",
    ],
    proofAngle:
      "The audit focuses on operational follow-up and admin consistency, not medical advice.",
    searchIntent: [
      "med spa lead follow up",
      "med spa automation",
      "aesthetic clinic workflow",
    ],
    adGroupName: "Vertical | Med Spa Intake",
    path1: "med-spa",
    path2: "follow-up",
    keywords: [
      "med spa lead follow up",
      "med spa automation",
      "med spa workflow automation",
      "aesthetic clinic automation",
      "med spa consult follow up",
      "med spa patient follow up",
      "med spa booking automation",
      "aesthetic clinic admin automation",
    ],
    headlines: [
      "Med Spa Follow-Up Help",
      "Consult Follow-Up Workflow",
      "Aesthetic Clinic Automation",
      "Track Every Inquiry",
      "Rebooking Workflow Help",
      "Med Spa Admin Audit",
      "Human-Reviewed Messaging",
      "Built By An Engineer",
    ],
    descriptions: [
      "Map lead intake, consult follow-up, treatment-plan reminders, and rebooking workflows.",
      "Practical automation for med spas handling DMs, forms, calls, consult notes, and booking tools.",
      "Find where high-intent consults and treatment inquiries fall through the cracks.",
      "Keep staff in control while making follow-up consistent.",
    ],
  },
  {
    slug: "staffing-candidate-screening",
    market: "Staffing and recruiting teams",
    eyebrow: "Candidate screening",
    title: "Staffing workflow audit for candidate intake, screening, and client submission",
    shortTitle: "Staffing Screening",
    metaDescription:
      "Automate candidate intake, resume screening support, follow-up questions, client submission packets, and recruiting pipeline admin.",
    hero:
      "Make resumes, applications, screening notes, job requirements, candidate follow-up, and client submission packets easier to process without losing recruiter judgment.",
    ctaWorkflow:
      "We screen applicants, compare resumes to job requirements, ask follow-up questions, summarize candidate fit, prepare client submissions, and update ATS/CRM stages manually.",
    urgentPain:
      "Recruiters should spend time on judgment and relationships, not copying resume details, chasing missing information, and rewriting candidate summaries from scratch.",
    bestFit: [
      "Staffing firms with recurring roles, repeated screening questions, and high applicant volume.",
      "Recruiters who manually summarize resumes and candidate notes for clients.",
      "Teams where ATS stages are messy because screening work happens outside the system.",
    ],
    symptoms: [
      "Candidate fit notes vary by recruiter and are hard to compare.",
      "Missing availability, pay range, location, certification, or work-authorization details delay submission.",
      "Client submission summaries are rewritten manually.",
      "Rejected candidates do not become searchable talent-pool data.",
    ],
    workflowMap: [
      "Role requirements, must-haves, nice-to-haves, dealbreakers, pay/location constraints, and screening questions.",
      "Candidate resume/application intake, missing-info prompts, recruiter notes, and stage movement.",
      "Client submission packet: fit summary, concerns, availability, pay expectations, and follow-up questions.",
      "Talent-pool tagging for future searches.",
    ],
    automationIdeas: [
      "Resume-to-role screening assistant that drafts fit notes for recruiter review.",
      "Missing-info follow-up questions based on role requirements.",
      "Client submission packet generation from resume plus recruiter notes.",
      "Talent-pool tagging for certifications, industries, tools, and availability.",
    ],
    auditDeliverables: [
      "A candidate intake and screening workflow map.",
      "A role-fit rubric and missing-info checklist.",
      "A submission packet template tied to recruiter approval.",
      "A practical automation plan for ATS, email, forms, and document workflows.",
    ],
    proofAngle:
      "The audit preserves recruiter judgment while removing repeated admin and summary-writing work.",
    searchIntent: [
      "staffing workflow automation",
      "candidate screening automation",
      "recruiting admin automation",
    ],
    adGroupName: "Vertical | Staffing Screening",
    path1: "staffing",
    path2: "screening",
    keywords: [
      "staffing workflow automation",
      "candidate screening automation",
      "recruiting workflow automation",
      "resume screening automation",
      "recruiting admin automation",
      "staffing agency automation",
      "candidate intake automation",
      "client submission automation recruiting",
    ],
    headlines: [
      "Candidate Screening Help",
      "Staffing Workflow Audit",
      "Recruiting Admin Automation",
      "Resume Screening Support",
      "Client Submission Workflow",
      "Candidate Intake Help",
      "Keep Recruiter Judgment",
      "Built By An Engineer",
    ],
    descriptions: [
      "Map candidate intake, screening, missing-info follow-up, and client submission packets.",
      "Practical automation for staffing teams without removing recruiter judgment.",
      "Turn resumes, job requirements, and recruiter notes into a cleaner screening workflow.",
      "Start with one candidate workflow before changing your ATS.",
    ],
  },
  {
    slug: "manufacturing-rfq-triage",
    market: "Small manufacturers and job shops",
    eyebrow: "RFQ triage",
    title: "Manufacturing RFQ workflow audit for quote intake, drawing review, and follow-up",
    shortTitle: "Manufacturing RFQ",
    metaDescription:
      "Improve manufacturing RFQ intake, drawing/document triage, quote status tracking, missing-info follow-up, and customer communication.",
    hero:
      "Turn RFQ emails, drawings, specs, revisions, due dates, capabilities, material questions, and quote follow-up into a visible workflow before good jobs stall.",
    ctaWorkflow:
      "We receive RFQs with drawings/specs by email or portal, check whether we can quote, ask missing questions, route to estimating/production, send quotes, and manually follow up.",
    urgentPain:
      "RFQs die when missing specs, revisions, capability questions, due dates, and owner status are not visible. The goal is faster quote/no-quote decisions and cleaner follow-up.",
    bestFit: [
      "Machine shops, fabricators, cabinet/millwork shops, print/sign shops, and specialty manufacturers receiving recurring RFQs.",
      "Teams where quote intake is email-heavy and production/estimating status is hard to see.",
      "Owners who want to reduce quote turnaround time without automating pricing decisions blindly.",
    ],
    symptoms: [
      "RFQs sit in inboxes waiting for someone to notice missing drawings or specs.",
      "Quote/no-quote decisions depend on tribal knowledge.",
      "Customers ask for status because there is no internal quote aging view.",
      "Lost quote reasons are not tracked by lead time, price, capability, material, or fit.",
    ],
    workflowMap: [
      "RFQ intake source, customer, due date, files, drawing revision, material/spec requirements, quantity, and delivery needs.",
      "Capability and missing-info triage before estimating time is spent.",
      "Estimator/production routing, quote status, customer follow-up, and won/lost reason.",
      "Reporting for quote aging, close rate, bottlenecks, and fit patterns.",
    ],
    automationIdeas: [
      "RFQ intake checklist that catches missing drawings, specs, quantities, due dates, and revisions.",
      "Quote/no-quote triage queue based on capability, value, deadline, and missing information.",
      "Customer missing-info follow-up drafts.",
      "Quote aging and follow-up dashboard for open opportunities.",
    ],
    auditDeliverables: [
      "An RFQ intake and quote-status workflow map.",
      "A missing-info checklist for drawings, specs, revisions, quantities, and due dates.",
      "A quote/no-quote triage structure.",
      "A first automation plan for intake, routing, follow-up, or reporting.",
    ],
    proofAngle:
      "The audit supports quoting operations and status visibility; pricing judgment remains with the shop.",
    searchIntent: [
      "manufacturing rfq automation",
      "quote intake automation",
      "job shop workflow automation",
    ],
    adGroupName: "Vertical | Manufacturing RFQ",
    path1: "rfq",
    path2: "triage",
    keywords: [
      "manufacturing rfq automation",
      "rfq workflow automation",
      "quote intake automation",
      "manufacturing quote automation",
      "job shop workflow automation",
      "fabrication quote workflow",
      "rfq intake workflow",
      "manufacturing admin automation",
    ],
    headlines: [
      "RFQ Intake Workflow",
      "Manufacturing Quote Help",
      "Quote Status Automation",
      "Job Shop Admin Help",
      "Drawing Intake Triage",
      "Faster Quote Follow-Up",
      "Manufacturing Workflow Audit",
      "Built By An Engineer",
    ],
    descriptions: [
      "Map RFQ intake, drawing triage, missing-info follow-up, quote routing, and quote aging.",
      "Practical automation for manufacturers and job shops with email-heavy quote workflows.",
      "Find where RFQs stall before estimating, production review, or customer follow-up.",
      "Keep pricing decisions with your team while cleaning up quote operations.",
    ],
  },
  {
    slug: "insurance-renewal-intake",
    market: "Insurance brokerages",
    eyebrow: "Renewal and document intake",
    title: "Insurance brokerage workflow audit for renewals, document intake, and client follow-up",
    shortTitle: "Insurance Renewals",
    metaDescription:
      "Automate insurance renewal follow-up, client document collection, application status tracking, certificate requests, and account-manager admin.",
    hero:
      "Make renewal dates, applications, certificates, client documents, carrier questions, follow-up emails, and account-manager tasks easier to track before deadlines pile up.",
    ctaWorkflow:
      "We manage renewals, applications, client documents, certificate requests, carrier questions, and follow-up across email, AMS/CRM, PDFs, spreadsheets, and account-manager notes.",
    urgentPain:
      "Renewal work is deadline-driven and detail-heavy. When document status and client follow-up are scattered, account managers spend too much time rebuilding context.",
    bestFit: [
      "Small commercial insurance brokerages with recurring renewals and document-heavy client workflows.",
      "Account managers who manually chase applications, supplements, certificates, and missing information.",
      "Brokerages that want better renewal visibility without replacing their AMS.",
    ],
    symptoms: [
      "Renewal lists require manual spreadsheet cleanup.",
      "Client document status is buried in emails and PDFs.",
      "Carrier follow-up and client follow-up are hard to distinguish.",
      "Certificate and endorsement requests interrupt deeper account work.",
    ],
    workflowMap: [
      "Renewal pipeline by account, line of business, deadline, carrier, application status, and missing documents.",
      "Client follow-up queue with requested items, due date, owner, and last touch.",
      "Certificate/endorsement request intake, routing, completion, and client notification.",
      "Account-manager dashboard for renewal risk, stalled applications, and overdue client items.",
    ],
    automationIdeas: [
      "Renewal status tracker that turns AMS exports and emails into a working queue.",
      "Client missing-document follow-up drafts grouped by account.",
      "Certificate request intake and routing workflow.",
      "Carrier/client question summarization for account-manager review.",
    ],
    auditDeliverables: [
      "A renewal and document-intake workflow map.",
      "A missing-info taxonomy for applications, supplements, certificates, and carrier questions.",
      "A follow-up queue structure for client and carrier tasks.",
      "A first automation plan that works around the existing AMS/CRM.",
    ],
    proofAngle:
      "The audit targets operational admin and follow-up, not coverage advice or underwriting decisions.",
    searchIntent: [
      "insurance renewal automation",
      "insurance document collection automation",
      "brokerage workflow automation",
    ],
    adGroupName: "Vertical | Insurance Renewals",
    path1: "insurance",
    path2: "renewals",
    keywords: [
      "insurance renewal automation",
      "insurance brokerage workflow automation",
      "insurance document collection automation",
      "commercial insurance workflow automation",
      "insurance client follow up automation",
      "certificate request automation insurance",
      "insurance account manager automation",
      "insurance admin automation",
    ],
    headlines: [
      "Insurance Renewal Workflow",
      "Document Intake Help",
      "Brokerage Admin Automation",
      "Client Follow-Up Workflow",
      "Certificate Request Help",
      "Renewal Status Tracking",
      "Account Manager Admin Help",
      "Built By An Engineer",
    ],
    descriptions: [
      "Map renewals, client documents, certificate requests, carrier questions, and follow-up.",
      "Practical automation for insurance brokerages without replacing coverage judgment.",
      "Turn renewal admin into a visible queue with owner, status, deadline, and next action.",
      "Start with one document or renewal workflow around your existing AMS.",
    ],
  },
  {
    slug: "legal-client-intake",
    market: "Small law firms",
    eyebrow: "Client intake and matter triage",
    title: "Law firm workflow audit for client intake, document collection, and matter triage",
    shortTitle: "Legal Intake",
    metaDescription:
      "Improve law firm client intake, conflict-check preparation, document collection, consultation follow-up, and matter-opening admin.",
    hero:
      "Turn calls, forms, referrals, consultation notes, document requests, conflict-check prep, and matter-opening tasks into a cleaner admin workflow.",
    ctaWorkflow:
      "We handle prospective client inquiries, intake forms, consultation scheduling, document requests, conflict-check prep, retainer follow-up, and matter opening across phone, email, forms, and practice-management software.",
    urgentPain:
      "The goal is not AI legal advice. It is reducing intake admin, missing information, follow-up delay, and matter-opening friction while lawyers keep legal judgment.",
    bestFit: [
      "Small firms with high intake volume in family, immigration, employment, real estate, estate, or small-business matters.",
      "Firms where staff manually summarize inquiries and chase missing documents before consults.",
      "Owners who want better intake visibility without replacing their practice-management system.",
    ],
    symptoms: [
      "Potential clients provide incomplete facts and documents before consultation.",
      "Staff rewrite the same intake summaries and document-request emails.",
      "Consultation no-shows and retainer follow-ups are handled inconsistently.",
      "Matter-opening checklists depend on memory instead of a repeatable queue.",
    ],
    workflowMap: [
      "Lead source, practice area, urgency, jurisdiction, parties, conflict-check data, and intake completeness.",
      "Document request list, consultation scheduling, reminders, notes, and next action.",
      "Retainer follow-up, matter-opening checklist, payment status, and handoff to lawyer/paralegal.",
      "Rules for what AI can summarize and what requires lawyer review.",
    ],
    automationIdeas: [
      "Intake completeness checker before consultation.",
      "Document request and consultation reminder drafts.",
      "Prospective-client summary for lawyer review.",
      "Matter-opening task checklist after retained status.",
    ],
    auditDeliverables: [
      "A client intake and matter-opening workflow map.",
      "A missing-information checklist by practice area.",
      "A human-reviewed summary and follow-up workflow plan.",
      "A first automation candidate that avoids legal-advice risk.",
    ],
    proofAngle:
      "The audit is for law firm operations and intake admin, not legal advice generation.",
    searchIntent: [
      "law firm intake automation",
      "legal client intake workflow",
      "law firm admin automation",
    ],
    adGroupName: "Vertical | Legal Intake",
    path1: "legal",
    path2: "intake",
    keywords: [
      "law firm intake automation",
      "legal client intake automation",
      "law firm workflow automation",
      "legal document collection automation",
      "client intake workflow law firm",
      "law firm admin automation",
      "matter intake automation",
      "legal practice automation",
    ],
    headlines: [
      "Law Firm Intake Workflow",
      "Client Intake Automation",
      "Document Collection Help",
      "Matter Opening Workflow",
      "Legal Admin Automation",
      "Keep Lawyer Review",
      "Law Firm Workflow Audit",
      "Built By An Engineer",
    ],
    descriptions: [
      "Map client intake, document collection, consultation follow-up, and matter-opening admin.",
      "Practical automation for law firm operations without generating legal advice.",
      "Turn prospective-client inquiries into a cleaner queue with missing info and next action.",
      "Start with one intake workflow around your existing practice-management tools.",
    ],
  },
];

export function getWorkflowVertical(slug: string) {
  return WORKFLOW_VERTICALS.find((vertical) => vertical.slug === slug);
}
