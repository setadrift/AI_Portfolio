"""Add vertical-specific ad groups for AI workflow audit landing pages.

Default mode is validate-only. `--apply` creates enabled ad groups, phrase
keywords, and responsive search ads that point at the matching vertical page.
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException


CONFIG_PATH = os.getenv(
    "GOOGLE_ADS_CONFIG_PATH",
    "/Users/duncananderson/.codex/google-ads.yaml",
)
CAMPAIGN_NAME = "Search | AI Consulting | Exact/Phrase"
BASE_URL = os.getenv(
    "GOOGLE_ADS_AI_CONSULTING_BASE_URL",
    "https://www.duncananderson.ca/en/ai-workflow-audit",
)
CPC_BID_MICROS = int(
    float(os.getenv("GOOGLE_ADS_VERTICAL_MAX_CPC_CAD", "6.00")) * 1_000_000
)


@dataclass(frozen=True)
class VerticalAdSpec:
    slug: str
    ad_group: str
    path1: str
    path2: str
    keywords: tuple[str, ...]
    headlines: tuple[str, ...]
    descriptions: tuple[str, ...]

    @property
    def final_url(self) -> str:
        return f"{BASE_URL}/{self.slug}"

    @property
    def final_url_suffix(self) -> str:
        return (
            "utm_source=google&utm_medium=cpc"
            "&utm_campaign=ai_workflow_vertical_search"
            f"&utm_content={self.slug}"
            f"&landing_path=%2Fai-workflow-audit%2F{self.slug}"
        )


VERTICAL_ADS: tuple[VerticalAdSpec, ...] = (
    VerticalAdSpec(
        slug="construction-bid-package-review",
        ad_group="Vertical | Construction Bid Review",
        path1="bid-review",
        path2="rfis",
        keywords=(
            "construction bid package review",
            "subcontractor bid review",
            "bid package review service",
            "construction rfi review",
            "construction addenda review",
            "bid day checklist",
            "subcontractor estimate review",
            "commercial bid review",
        ),
        headlines=(
            "Bid Package Review Help",
            "Catch Scope Gaps",
            "RFI Draft Workflow",
            "Addenda Risk Review",
            "Estimator Workflow Audit",
            "Bid-Day Checklist Help",
            "Subcontractor Bid Desk",
            "Review Before Bid Day",
        ),
        descriptions=(
            "Map plans, specs, addenda, RFIs, exclusions, and bid-day checks.",
            "Built for commercial subcontractors who need cleaner pre-bid review.",
            "Find missing package items and unclear scope before price lock.",
            "Start with a focused audit before building a larger bid desk.",
        ),
    ),
    VerticalAdSpec(
        slug="roofing-estimate-follow-up",
        ad_group="Vertical | Roofing Follow Up",
        path1="roofing",
        path2="follow-up",
        keywords=(
            "roofing estimate follow up",
            "roofing workflow automation",
            "roofing crm automation",
            "roofing sales automation",
            "roofing quote follow up",
            "roofing proposal follow up",
            "roofing lead follow up",
            "roofing contractor automation",
        ),
        headlines=(
            "Roofing Follow-Up Help",
            "Stop Losing Estimates",
            "Quote Follow-Up Workflow",
            "Roofing CRM Automation",
            "Track Every Roof Quote",
            "Automate Proposal Follow-Up",
            "Roofing Workflow Audit",
            "Built By An Engineer",
        ),
        descriptions=(
            "Map roofing estimate follow-up from inspection notes to reminders.",
            "Find where open roof quotes stall across texts, email, and CRM notes.",
            "Build a practical follow-up workflow before buying another tool.",
            "Turn stale roofing estimates into visible next steps and owners.",
        ),
    ),
    VerticalAdSpec(
        slug="hvac-plumbing-dispatch-follow-up",
        ad_group="Vertical | HVAC Plumbing Ops",
        path1="hvac-plumbing",
        path2="ops",
        keywords=(
            "hvac dispatch automation",
            "hvac workflow automation",
            "hvac estimate follow up",
            "hvac service automation",
            "plumbing dispatch automation",
            "plumbing workflow automation",
            "plumbing estimate follow up",
            "plumbing service automation",
            "service call automation",
        ),
        headlines=(
            "HVAC Dispatch Workflow",
            "Plumbing Follow-Up Help",
            "Track Service Quotes",
            "Missed Call Workflow",
            "Automate Service Follow-Up",
            "Technician Notes To Tasks",
            "HVAC Workflow Audit",
            "Built By An Engineer",
        ),
        descriptions=(
            "Map dispatch, tech notes, repair quotes, missed calls, and reminders.",
            "Practical automation for HVAC and plumbing service teams.",
            "Find where service calls and open estimates leak revenue.",
            "Business workflow automation, not HVAC hardware automation.",
        ),
    ),
    VerticalAdSpec(
        slug="property-management-maintenance-intake",
        ad_group="Vertical | Property Maintenance",
        path1="property",
        path2="maintenance",
        keywords=(
            "property management maintenance automation",
            "tenant maintenance request automation",
            "property management workflow automation",
            "maintenance intake automation",
            "vendor dispatch automation property management",
            "property manager admin automation",
            "tenant request workflow",
            "property management ai automation",
        ),
        headlines=(
            "Maintenance Intake Help",
            "Tenant Request Workflow",
            "Vendor Follow-Up Automation",
            "Property Manager Admin Help",
            "Track Open Maintenance",
            "Owner Approval Workflow",
            "Property Workflow Audit",
            "Built By An Engineer",
        ),
        descriptions=(
            "Map tenant requests, vendors, owner approvals, and status updates.",
            "For property managers buried in emails, texts, portals, and sheets.",
            "Find where maintenance tickets disappear or create status calls.",
            "Start with one workflow before changing property software.",
        ),
    ),
    VerticalAdSpec(
        slug="bookkeeping-receipt-cleanup",
        ad_group="Vertical | Bookkeeping Cleanup",
        path1="bookkeeping",
        path2="cleanup",
        keywords=(
            "bookkeeping workflow automation",
            "receipt automation for bookkeepers",
            "bookkeeping admin automation",
            "month end bookkeeping automation",
            "bookkeeping cleanup workflow",
            "automate receipt collection",
            "client document collection automation",
            "accounting workflow automation",
        ),
        headlines=(
            "Bookkeeping Workflow Help",
            "Automate Receipt Chasing",
            "Month-End Cleanup Help",
            "Client Document Workflow",
            "Missing Info Follow-Up",
            "Bookkeeper Admin Automation",
            "Keep Human Review",
            "Built By An Engineer",
        ),
        descriptions=(
            "Map receipt collection, document routing, and month-end cleanup.",
            "Practical automation for bookkeepers without replacing judgment.",
            "Turn scattered client docs into a cleaner status workflow.",
            "Start with one repeatable cleanup workflow.",
        ),
    ),
    VerticalAdSpec(
        slug="dental-clinic-front-desk-recall",
        ad_group="Vertical | Dental Recall",
        path1="dental",
        path2="recall",
        keywords=(
            "dental recall automation",
            "dental front desk automation",
            "dental workflow automation",
            "unscheduled treatment follow up",
            "dental patient follow up automation",
            "dental office admin automation",
            "hygiene recall automation",
            "dental cancellation workflow",
        ),
        headlines=(
            "Dental Recall Workflow",
            "Front Desk Admin Help",
            "Treatment Follow-Up",
            "Dental Workflow Audit",
            "Fill Recall Gaps",
            "Patient Follow-Up Help",
            "Keep Staff In Control",
            "Built By An Engineer",
        ),
        descriptions=(
            "Map recall, treatment follow-up, cancellations, and intake.",
            "Practical automation for dental front desk teams.",
            "Turn patient follow-up lists into a clear queue with next action.",
            "Start with one front desk workflow before adding more software.",
        ),
    ),
    VerticalAdSpec(
        slug="med-spa-lead-intake-follow-up",
        ad_group="Vertical | Med Spa Intake",
        path1="med-spa",
        path2="follow-up",
        keywords=(
            "med spa lead follow up",
            "med spa automation",
            "med spa workflow automation",
            "aesthetic clinic automation",
            "med spa consult follow up",
            "med spa patient follow up",
            "med spa booking automation",
            "aesthetic clinic admin automation",
        ),
        headlines=(
            "Med Spa Follow-Up Help",
            "Consult Follow-Up Workflow",
            "Aesthetic Clinic Automation",
            "Track Every Inquiry",
            "Rebooking Workflow Help",
            "Med Spa Admin Audit",
            "Human-Reviewed Messaging",
            "Built By An Engineer",
        ),
        descriptions=(
            "Map lead intake, consult follow-up, treatment reminders, and rebooking.",
            "For med spas handling DMs, forms, calls, notes, and booking tools.",
            "Find where high-intent consults fall through the cracks.",
            "Keep staff in control while making follow-up consistent.",
        ),
    ),
    VerticalAdSpec(
        slug="staffing-candidate-screening",
        ad_group="Vertical | Staffing Screening",
        path1="staffing",
        path2="screening",
        keywords=(
            "staffing workflow automation",
            "candidate screening automation",
            "recruiting workflow automation",
            "resume screening automation",
            "recruiting admin automation",
            "staffing agency automation",
            "candidate intake automation",
            "client submission automation recruiting",
        ),
        headlines=(
            "Candidate Screening Help",
            "Staffing Workflow Audit",
            "Recruiting Admin Automation",
            "Resume Screening Support",
            "Client Submission Workflow",
            "Candidate Intake Help",
            "Keep Recruiter Judgment",
            "Built By An Engineer",
        ),
        descriptions=(
            "Map candidate intake, screening, follow-up, and client submissions.",
            "Practical automation for staffing teams with recruiter review.",
            "Turn resumes, job requirements, and notes into a cleaner workflow.",
            "Start with one candidate workflow before changing your ATS.",
        ),
    ),
    VerticalAdSpec(
        slug="manufacturing-rfq-triage",
        ad_group="Vertical | Manufacturing RFQ",
        path1="rfq",
        path2="triage",
        keywords=(
            "manufacturing rfq automation",
            "rfq workflow automation",
            "quote intake automation",
            "manufacturing quote automation",
            "job shop workflow automation",
            "fabrication quote workflow",
            "rfq intake workflow",
            "manufacturing admin automation",
        ),
        headlines=(
            "RFQ Intake Workflow",
            "Manufacturing Quote Help",
            "Quote Status Automation",
            "Job Shop Admin Help",
            "Drawing Intake Triage",
            "Faster Quote Follow-Up",
            "Manufacturing Workflow Audit",
            "Built By An Engineer",
        ),
        descriptions=(
            "Map RFQ intake, drawing triage, missing info, routing, and aging.",
            "Practical automation for manufacturers with email-heavy RFQs.",
            "Find where RFQs stall before estimating or customer follow-up.",
            "Keep pricing decisions with your team while cleaning quote ops.",
        ),
    ),
    VerticalAdSpec(
        slug="insurance-renewal-intake",
        ad_group="Vertical | Insurance Renewals",
        path1="insurance",
        path2="renewals",
        keywords=(
            "insurance renewal automation",
            "insurance brokerage workflow automation",
            "insurance document collection automation",
            "commercial insurance workflow automation",
            "insurance client follow up automation",
            "certificate request automation insurance",
            "insurance account manager automation",
            "insurance admin automation",
        ),
        headlines=(
            "Insurance Renewal Workflow",
            "Document Intake Help",
            "Brokerage Admin Automation",
            "Client Follow-Up Workflow",
            "Certificate Request Help",
            "Renewal Status Tracking",
            "Account Manager Admin Help",
            "Built By An Engineer",
        ),
        descriptions=(
            "Map renewals, client documents, certificate requests, and follow-up.",
            "Practical automation for insurance brokerages around existing tools.",
            "Turn renewal admin into a visible queue with status and next action.",
            "Start with one document or renewal workflow.",
        ),
    ),
    VerticalAdSpec(
        slug="legal-client-intake",
        ad_group="Vertical | Legal Intake",
        path1="legal",
        path2="intake",
        keywords=(
            "law firm intake automation",
            "legal client intake automation",
            "law firm workflow automation",
            "legal document collection automation",
            "client intake workflow law firm",
            "law firm admin automation",
            "matter intake automation",
            "legal practice automation",
        ),
        headlines=(
            "Law Firm Intake Workflow",
            "Client Intake Automation",
            "Document Collection Help",
            "Matter Opening Workflow",
            "Legal Admin Automation",
            "Keep Lawyer Review",
            "Law Firm Workflow Audit",
            "Built By An Engineer",
        ),
        descriptions=(
            "Map client intake, document collection, consult follow-up, and admin.",
            "Practical automation for law firm operations without legal advice.",
            "Turn prospective-client inquiries into a cleaner intake queue.",
            "Start with one workflow around your practice-management tools.",
        ),
    ),
)


def customer_id() -> str:
    value = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    if not value:
        raise SystemExit("GOOGLE_ADS_CUSTOMER_ID is required.")
    return value.replace("-", "")


def rows(client: GoogleAdsClient, selected_customer: str, query: str) -> list[object]:
    service = client.get_service("GoogleAdsService")
    return list(service.search(customer_id=selected_customer, query=query))


def campaign_resource(client: GoogleAdsClient, selected_customer: str) -> str:
    escaped_name = CAMPAIGN_NAME.replace("'", "\\'")
    result = rows(
        client,
        selected_customer,
        f"""
        SELECT campaign.resource_name
        FROM campaign
        WHERE campaign.name = '{escaped_name}'
          AND campaign.status != REMOVED
        LIMIT 1
        """,
    )
    if not result:
        raise SystemExit(f"Campaign not found: {CAMPAIGN_NAME}")
    return result[0].campaign.resource_name


def existing_ad_groups(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
) -> dict[str, object]:
    result = rows(
        client,
        selected_customer,
        f"""
        SELECT ad_group.resource_name, ad_group.name
        FROM ad_group
        WHERE campaign.resource_name = '{campaign}'
          AND ad_group.status != REMOVED
        """,
    )
    return {row.ad_group.name: row.ad_group for row in result}


def existing_keywords(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
) -> set[tuple[str, str]]:
    result = rows(
        client,
        selected_customer,
        f"""
        SELECT
          ad_group.name,
          ad_group_criterion.keyword.text
        FROM keyword_view
        WHERE campaign.resource_name = '{campaign}'
          AND ad_group_criterion.status != REMOVED
        """,
    )
    return {
        (row.ad_group.name, row.ad_group_criterion.keyword.text.lower())
        for row in result
    }


def existing_ad_urls(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
) -> set[tuple[str, str]]:
    result = rows(
        client,
        selected_customer,
        f"""
        SELECT ad_group.name, ad_group_ad.ad.final_urls
        FROM ad_group_ad
        WHERE campaign.resource_name = '{campaign}'
          AND ad_group_ad.status != REMOVED
        """,
    )
    found: set[tuple[str, str]] = set()
    for row in result:
        for url in row.ad_group_ad.ad.final_urls:
            found.add((row.ad_group.name, url))
    return found


def ad_text_asset(client: GoogleAdsClient, text: str) -> object:
    asset = client.get_type("AdTextAsset")
    asset.text = text
    return asset


def wrap(client: GoogleAdsClient, operation: object) -> object:
    mutate_operation = client.get_type("MutateOperation")
    name = operation.__class__.__name__
    if name == "AdGroupOperation":
        mutate_operation.ad_group_operation = operation
    elif name == "AdGroupCriterionOperation":
        mutate_operation.ad_group_criterion_operation = operation
    elif name == "AdGroupAdOperation":
        mutate_operation.ad_group_ad_operation = operation
    else:
        raise TypeError(f"Unsupported operation type: {name}")
    return mutate_operation


def create_ad_group_operation(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
    temp_id: int,
    spec: VerticalAdSpec,
) -> tuple[object, str]:
    resource_name = f"customers/{selected_customer}/adGroups/-{temp_id}"
    operation = client.get_type("AdGroupOperation")
    ad_group = operation.create
    ad_group.resource_name = resource_name
    ad_group.campaign = campaign
    ad_group.name = spec.ad_group
    ad_group.status = client.enums.AdGroupStatusEnum.ENABLED
    ad_group.cpc_bid_micros = CPC_BID_MICROS
    return operation, resource_name


def create_keyword_operation(
    client: GoogleAdsClient,
    ad_group: str,
    keyword: str,
) -> object:
    operation = client.get_type("AdGroupCriterionOperation")
    criterion = operation.create
    criterion.ad_group = ad_group
    criterion.status = client.enums.AdGroupCriterionStatusEnum.ENABLED
    criterion.keyword.text = keyword
    criterion.keyword.match_type = client.enums.KeywordMatchTypeEnum.PHRASE
    return operation


def create_ad_operation(
    client: GoogleAdsClient,
    ad_group: str,
    spec: VerticalAdSpec,
) -> object:
    operation = client.get_type("AdGroupAdOperation")
    ad_group_ad = operation.create
    ad_group_ad.ad_group = ad_group
    ad_group_ad.status = client.enums.AdGroupAdStatusEnum.ENABLED
    ad_group_ad.ad.final_urls.append(spec.final_url)
    ad_group_ad.ad.final_url_suffix = spec.final_url_suffix
    rsa = ad_group_ad.ad.responsive_search_ad
    rsa.path1 = spec.path1
    rsa.path2 = spec.path2
    rsa.headlines.extend(ad_text_asset(client, headline) for headline in spec.headlines)
    rsa.descriptions.extend(
        ad_text_asset(client, description) for description in spec.descriptions
    )
    return operation


def build_operations(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
) -> list[object]:
    operations: list[object] = []
    ad_groups = existing_ad_groups(client, selected_customer, campaign)
    keywords = existing_keywords(client, selected_customer, campaign)
    ad_urls = existing_ad_urls(client, selected_customer, campaign)
    temp_id = 300

    print(f"target_cpc\tCA${CPC_BID_MICROS / 1_000_000:.2f}")
    for spec in VERTICAL_ADS:
        if spec.ad_group in ad_groups:
            ad_group_resource = ad_groups[spec.ad_group].resource_name
            print(f"ad_group_exists\t{spec.ad_group}")
        else:
            print(f"create_ad_group\t{spec.ad_group}\t{spec.final_url}")
            operation, ad_group_resource = create_ad_group_operation(
                client,
                selected_customer,
                campaign,
                temp_id,
                spec,
            )
            temp_id += 1
            operations.append(wrap(client, operation))

        for keyword in spec.keywords:
            key = (spec.ad_group, keyword.lower())
            if key in keywords:
                continue
            print(f"add_keyword\t{spec.ad_group}\tPHRASE\t{keyword}")
            operations.append(
                wrap(client, create_keyword_operation(client, ad_group_resource, keyword))
            )

        if (spec.ad_group, spec.final_url) in ad_urls:
            print(f"ad_exists\t{spec.ad_group}\t{spec.final_url}")
            continue

        print(f"add_ad\t{spec.ad_group}\t{spec.final_url}")
        operations.append(wrap(client, create_ad_operation(client, ad_group_resource, spec)))

    return operations


def mutate(
    client: GoogleAdsClient,
    selected_customer: str,
    operations: list[object],
    *,
    validate_only: bool,
) -> None:
    if not operations:
        print("No changes needed.")
        return

    service = client.get_service("GoogleAdsService")
    request = client.get_type("MutateGoogleAdsRequest")
    request.customer_id = selected_customer
    request.validate_only = validate_only
    request.partial_failure = False
    request.response_content_type = client.enums.ResponseContentTypeEnum.RESOURCE_NAME_ONLY
    request.mutate_operations.extend(operations)
    response = service.mutate(request=request)

    if validate_only:
        print(f"validate-only accepted\toperations={len(operations)}")
        return

    print(f"applied\toperations={len(operations)}")
    for result in response.mutate_operation_responses:
        response_type = result._pb.WhichOneof("response")
        if response_type:
            resource = getattr(result, response_type).resource_name
            print(f"mutated\t{resource}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    selected_customer = customer_id()
    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)

    try:
      campaign = campaign_resource(client, selected_customer)
      operations = build_operations(client, selected_customer, campaign)
      mutate(client, selected_customer, operations, validate_only=not args.apply)
      return 0
    except GoogleAdsException as exc:
        for error in exc.failure.errors:
            field_path = " > ".join(
                field.field_name for field in error.location.field_path_elements
            )
            print(f"{error.message} field_path={field_path}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
