"""Build a search-only AI consulting campaign bundle.

Default mode is validate-only. Applying this script creates the campaign paused
unless `--enable` is provided, so the account can review copy, targeting, and
policy status before spend starts.
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from datetime import date

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException


CONFIG_PATH = os.getenv(
    "GOOGLE_ADS_CONFIG_PATH",
    "/Users/duncananderson/.codex/google-ads.yaml",
)

CAMPAIGN_NAME = "Search | AI Consulting | Exact/Phrase"
BUDGET_NAME = "AI Consulting Search Test Budget 2026-06-22"
LANDING_URL = os.getenv(
    "GOOGLE_ADS_AI_CONSULTING_LANDING_URL",
    "https://www.duncananderson.ca/en/ai-workflow-audit",
)
FINAL_URL_SUFFIX = (
    "utm_source=google&utm_medium=cpc"
    "&utm_campaign=ai_workflow_audit_search"
    "&landing_path=%2Fai-workflow-audit"
)
DAILY_BUDGET_MICROS = int(
    float(os.getenv("GOOGLE_ADS_DAILY_BUDGET_CAD", "20.00")) * 1_000_000,
)
CPC_BID_MICROS = int(float(os.getenv("GOOGLE_ADS_MAX_CPC_CAD", "3.00")) * 1_000_000)

LANGUAGE_ENGLISH = "languageConstants/1000"
TARGET_GEOS = {
    "geoTargetConstants/2124": "Canada",
    "geoTargetConstants/2840": "United States",
}


@dataclass(frozen=True)
class Keyword:
    text: str
    match_type: str


@dataclass(frozen=True)
class AdGroupSpec:
    name: str
    path1: str
    path2: str
    keywords: tuple[Keyword, ...]
    headlines: tuple[str, ...]
    descriptions: tuple[str, ...]


@dataclass(frozen=True)
class NegativeKeyword:
    text: str
    match_type: str
    reason: str


AD_GROUPS: tuple[AdGroupSpec, ...] = (
    AdGroupSpec(
        name="AI Consulting - Exact/Phrase",
        path1="ai-consulting",
        path2="audit",
        keywords=(
            Keyword("ai consultant", "EXACT"),
            Keyword("ai consultant", "PHRASE"),
            Keyword("ai consulting", "EXACT"),
            Keyword("ai consulting", "PHRASE"),
            Keyword("ai consulting services", "EXACT"),
            Keyword("ai consulting services", "PHRASE"),
            Keyword("ai consultant for small business", "EXACT"),
            Keyword("ai consultant for small business", "PHRASE"),
            Keyword("small business ai consultant", "PHRASE"),
        ),
        headlines=(
            "AI Consulting For SMBs",
            "Practical AI Consulting",
            "Small Business AI Help",
            "AI Workflow Audit",
            "AI Without The Jargon",
            "Find Your First AI Project",
            "Built By An Engineer",
            "Request An AI Audit",
        ),
        descriptions=(
            "Find workflows where AI can actually save time. Get a practical first-project plan.",
            "Turn repetitive admin, reporting, and operations work into useful AI systems.",
            "Bring one messy workflow. Get a realistic automation plan for your small business.",
            "Practical AI consulting from an engineer who builds production systems.",
        ),
    ),
    AdGroupSpec(
        name="Business Automation - Exact/Phrase",
        path1="automation",
        path2="workflows",
        keywords=(
            Keyword("business automation consultant", "EXACT"),
            Keyword("business automation consultant", "PHRASE"),
            Keyword("workflow automation consultant", "EXACT"),
            Keyword("workflow automation consultant", "PHRASE"),
            Keyword("ai automation consultant", "EXACT"),
            Keyword("ai automation consultant", "PHRASE"),
            Keyword("automate business processes with ai", "PHRASE"),
            Keyword("ai workflow automation", "PHRASE"),
        ),
        headlines=(
            "Automate Admin Work",
            "Workflow Automation Help",
            "AI Automation Consultant",
            "Business Automation Audit",
            "Connect Your Tools",
            "Reduce Manual Work",
            "Request An AI Audit",
            "Built By An Engineer",
        ),
        descriptions=(
            "Map repetitive workflows and identify the fastest practical automation opportunities.",
            "Connect spreadsheets, inboxes, and business tools into systems that save time.",
            "Get a realistic plan for automating admin, reporting, support, or operations work.",
            "Hands-on automation consulting for small teams with real workflow bottlenecks.",
        ),
    ),
    AdGroupSpec(
        name="AI Implementation - Exact/Phrase",
        path1="ai-builds",
        path2="implementation",
        keywords=(
            Keyword("ai implementation consultant", "EXACT"),
            Keyword("ai implementation consultant", "PHRASE"),
            Keyword("generative ai consultant", "EXACT"),
            Keyword("generative ai consultant", "PHRASE"),
            Keyword("chatgpt consultant", "EXACT"),
            Keyword("chatgpt consultant", "PHRASE"),
            Keyword("custom ai automation", "PHRASE"),
        ),
        headlines=(
            "AI Implementation Help",
            "Build Your First AI Tool",
            "Generative AI Consultant",
            "ChatGPT For Business",
            "Custom AI Automation",
            "Practical AI Systems",
            "Request An AI Audit",
            "Built By An Engineer",
        ),
        descriptions=(
            "Move from AI idea to a scoped workflow, prototype, and production-ready system.",
            "Use AI where it fits: admin, reporting, support, sales ops, and internal workflows.",
            "Get practical implementation help without vague AI transformation promises.",
            "Start with one useful AI workflow and a clear plan for what to build next.",
        ),
    ),
    AdGroupSpec(
        name="Canada US Local - Exact/Phrase",
        path1="canada-us",
        path2="ai-consultant",
        keywords=(
            Keyword("ai consultant canada", "PHRASE"),
            Keyword("ai consultant toronto", "PHRASE"),
            Keyword("ai consultant ontario", "PHRASE"),
            Keyword("business automation consultant canada", "PHRASE"),
            Keyword("ai consultant united states", "PHRASE"),
            Keyword("ai consultant usa", "PHRASE"),
        ),
        headlines=(
            "AI Consultant Canada US",
            "Small Business AI Help",
            "AI Workflow Audit",
            "Practical AI Consulting",
            "Business Automation Help",
            "Request An AI Audit",
            "Built By An Engineer",
            "AI Without The Jargon",
        ),
        descriptions=(
            "AI consulting for small businesses in Canada and the US with real workflow needs.",
            "Find practical automation opportunities across admin, reporting, and operations.",
            "Get a clear first-project plan before investing in a larger AI build.",
            "Hands-on AI systems from a solo engineer, not a generic strategy deck.",
        ),
    ),
)

NEGATIVE_KEYWORDS: tuple[NegativeKeyword, ...] = (
    NegativeKeyword("free", "PHRASE", "Avoid low-intent freebie searches."),
    NegativeKeyword("course", "PHRASE", "Avoid education searches."),
    NegativeKeyword("courses", "PHRASE", "Avoid education searches."),
    NegativeKeyword("training", "PHRASE", "Avoid training-only searches."),
    NegativeKeyword("certificate", "PHRASE", "Avoid credential searches."),
    NegativeKeyword("certification", "PHRASE", "Avoid credential searches."),
    NegativeKeyword("degree", "PHRASE", "Avoid school searches."),
    NegativeKeyword("jobs", "PHRASE", "Avoid job seeker searches."),
    NegativeKeyword("job", "PHRASE", "Avoid job seeker searches."),
    NegativeKeyword("career", "PHRASE", "Avoid job seeker searches."),
    NegativeKeyword("salary", "PHRASE", "Avoid job seeker searches."),
    NegativeKeyword("resume", "PHRASE", "Avoid job seeker searches."),
    NegativeKeyword("internship", "PHRASE", "Avoid job seeker searches."),
    NegativeKeyword("prompt", "PHRASE", "Avoid prompt-template traffic."),
    NegativeKeyword("prompts", "PHRASE", "Avoid prompt-template traffic."),
    NegativeKeyword("template", "PHRASE", "Avoid template traffic."),
    NegativeKeyword("templates", "PHRASE", "Avoid template traffic."),
    NegativeKeyword("examples", "PHRASE", "Avoid research-only traffic."),
    NegativeKeyword("pdf", "PHRASE", "Avoid download-only searches."),
    NegativeKeyword("book", "PHRASE", "Avoid book searches."),
    NegativeKeyword("news", "PHRASE", "Avoid news searches."),
    NegativeKeyword("definition", "PHRASE", "Avoid definition searches."),
    NegativeKeyword("meaning", "PHRASE", "Avoid definition searches."),
    NegativeKeyword("tutorial", "PHRASE", "Avoid tutorial searches."),
    NegativeKeyword("youtube", "PHRASE", "Avoid video searches."),
    NegativeKeyword("reddit", "PHRASE", "Avoid forum browsing searches."),
    NegativeKeyword("image generator", "PHRASE", "Avoid consumer AI tool traffic."),
    NegativeKeyword("ai art", "PHRASE", "Avoid consumer AI art traffic."),
    NegativeKeyword("essay", "PHRASE", "Avoid student traffic."),
    NegativeKeyword("homework", "PHRASE", "Avoid student traffic."),
    NegativeKeyword("gambling", "PHRASE", "Avoid gambling policy adjacency."),
    NegativeKeyword("betting", "PHRASE", "Avoid gambling policy adjacency."),
    NegativeKeyword("casino", "PHRASE", "Avoid gambling policy adjacency."),
    NegativeKeyword("sportsbook", "PHRASE", "Avoid gambling policy adjacency."),
    NegativeKeyword("lottery", "PHRASE", "Avoid gambling policy adjacency."),
    NegativeKeyword("crypto", "PHRASE", "Avoid speculative finance traffic."),
    NegativeKeyword("forex", "PHRASE", "Avoid speculative finance traffic."),
    NegativeKeyword("trading bot", "PHRASE", "Avoid speculative finance traffic."),
)


def customer_id() -> str:
    value = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    if not value:
        raise SystemExit(
            "GOOGLE_ADS_CUSTOMER_ID is required. "
            "Set it to the AI consulting Google Ads customer id before running.",
        )
    return value.replace("-", "")


def keyword_match_type(client: GoogleAdsClient, name: str) -> int:
    return getattr(client.enums.KeywordMatchTypeEnum, name)


def ad_text_asset(client: GoogleAdsClient, text: str) -> object:
    asset = client.get_type("AdTextAsset")
    asset.text = text
    return asset


def existing_campaign_resource(client: GoogleAdsClient, selected_customer: str) -> str | None:
    service = client.get_service("GoogleAdsService")
    escaped_name = CAMPAIGN_NAME.replace("'", "\\'")
    query = f"""
        SELECT campaign.resource_name, campaign.status
        FROM campaign
        WHERE campaign.name = '{escaped_name}'
          AND campaign.status != REMOVED
        LIMIT 1
    """
    rows = list(service.search(customer_id=selected_customer, query=query))
    if not rows:
        return None
    return rows[0].campaign.resource_name


def build_budget_operation(client: GoogleAdsClient, selected_customer: str) -> object:
    operation = client.get_type("CampaignBudgetOperation")
    budget = operation.create
    budget.resource_name = f"customers/{selected_customer}/campaignBudgets/-1"
    budget.name = BUDGET_NAME
    budget.amount_micros = DAILY_BUDGET_MICROS
    budget.delivery_method = client.enums.BudgetDeliveryMethodEnum.STANDARD
    budget.explicitly_shared = False
    return operation


def build_campaign_operation(
    client: GoogleAdsClient,
    selected_customer: str,
    *,
    enable: bool,
) -> object:
    operation = client.get_type("CampaignOperation")
    campaign = operation.create
    campaign.resource_name = f"customers/{selected_customer}/campaigns/-2"
    campaign.name = CAMPAIGN_NAME
    campaign.status = (
        client.enums.CampaignStatusEnum.ENABLED
        if enable
        else client.enums.CampaignStatusEnum.PAUSED
    )
    campaign.advertising_channel_type = client.enums.AdvertisingChannelTypeEnum.SEARCH
    campaign.campaign_budget = f"customers/{selected_customer}/campaignBudgets/-1"
    campaign.manual_cpc.enhanced_cpc_enabled = False
    campaign.network_settings.target_google_search = True
    campaign.network_settings.target_search_network = False
    campaign.network_settings.target_partner_search_network = False
    campaign.network_settings.target_content_network = False
    campaign.geo_target_type_setting.positive_geo_target_type = (
        client.enums.PositiveGeoTargetTypeEnum.PRESENCE
    )
    campaign.geo_target_type_setting.negative_geo_target_type = (
        client.enums.NegativeGeoTargetTypeEnum.PRESENCE
    )
    campaign.contains_eu_political_advertising = (
        client.enums.EuPoliticalAdvertisingStatusEnum.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING
    )
    campaign.start_date_time = f"{date.today().isoformat()} 00:00:00"
    campaign.final_url_suffix = FINAL_URL_SUFFIX
    return operation


def build_language_operation(client: GoogleAdsClient, selected_customer: str) -> object:
    operation = client.get_type("CampaignCriterionOperation")
    criterion = operation.create
    criterion.campaign = f"customers/{selected_customer}/campaigns/-2"
    criterion.language.language_constant = LANGUAGE_ENGLISH
    return operation


def build_location_operations(
    client: GoogleAdsClient,
    selected_customer: str,
) -> list[object]:
    operations = []
    for geo_target in TARGET_GEOS:
        operation = client.get_type("CampaignCriterionOperation")
        criterion = operation.create
        criterion.campaign = f"customers/{selected_customer}/campaigns/-2"
        criterion.location.geo_target_constant = geo_target
        operations.append(operation)
    return operations


def build_negative_operations(
    client: GoogleAdsClient,
    selected_customer: str,
) -> list[object]:
    operations = []
    for negative in NEGATIVE_KEYWORDS:
        operation = client.get_type("CampaignCriterionOperation")
        criterion = operation.create
        criterion.campaign = f"customers/{selected_customer}/campaigns/-2"
        criterion.negative = True
        criterion.keyword.text = negative.text
        criterion.keyword.match_type = keyword_match_type(client, negative.match_type)
        operations.append(operation)
    return operations


def build_ad_group_operations(
    client: GoogleAdsClient,
    selected_customer: str,
) -> list[object]:
    operations = []
    for index, spec in enumerate(AD_GROUPS, start=3):
        operation = client.get_type("AdGroupOperation")
        ad_group = operation.create
        ad_group.resource_name = f"customers/{selected_customer}/adGroups/-{index}"
        ad_group.campaign = f"customers/{selected_customer}/campaigns/-2"
        ad_group.name = spec.name
        ad_group.status = client.enums.AdGroupStatusEnum.ENABLED
        ad_group.cpc_bid_micros = CPC_BID_MICROS
        operations.append(operation)
    return operations


def build_keyword_operations(
    client: GoogleAdsClient,
    selected_customer: str,
) -> list[object]:
    operations = []
    for ad_group_index, spec in enumerate(AD_GROUPS, start=3):
        ad_group = f"customers/{selected_customer}/adGroups/-{ad_group_index}"
        for keyword in spec.keywords:
            operation = client.get_type("AdGroupCriterionOperation")
            criterion = operation.create
            criterion.ad_group = ad_group
            criterion.status = client.enums.AdGroupCriterionStatusEnum.ENABLED
            criterion.keyword.text = keyword.text
            criterion.keyword.match_type = keyword_match_type(
                client,
                keyword.match_type,
            )
            operations.append(operation)
    return operations


def build_ad_operations(client: GoogleAdsClient, selected_customer: str) -> list[object]:
    operations = []
    for ad_group_index, spec in enumerate(AD_GROUPS, start=3):
        operation = client.get_type("AdGroupAdOperation")
        ad_group_ad = operation.create
        ad_group_ad.ad_group = f"customers/{selected_customer}/adGroups/-{ad_group_index}"
        ad_group_ad.status = client.enums.AdGroupAdStatusEnum.ENABLED
        ad_group_ad.ad.final_urls.append(LANDING_URL)
        ad_group_ad.ad.final_url_suffix = FINAL_URL_SUFFIX
        responsive = ad_group_ad.ad.responsive_search_ad
        responsive.path1 = spec.path1
        responsive.path2 = spec.path2
        responsive.headlines.extend(
            ad_text_asset(client, headline) for headline in spec.headlines
        )
        responsive.descriptions.extend(
            ad_text_asset(client, description) for description in spec.descriptions
        )
        operations.append(operation)
    return operations


def wrap_mutate_operation(client: GoogleAdsClient, operation: object) -> object:
    mutate_operation = client.get_type("MutateOperation")
    name = operation.__class__.__name__
    if name == "CampaignBudgetOperation":
        mutate_operation.campaign_budget_operation = operation
    elif name == "CampaignOperation":
        mutate_operation.campaign_operation = operation
    elif name == "CampaignCriterionOperation":
        mutate_operation.campaign_criterion_operation = operation
    elif name == "AdGroupOperation":
        mutate_operation.ad_group_operation = operation
    elif name == "AdGroupCriterionOperation":
        mutate_operation.ad_group_criterion_operation = operation
    elif name == "AdGroupAdOperation":
        mutate_operation.ad_group_ad_operation = operation
    else:
        raise TypeError(f"Unsupported operation type: {name}")
    return mutate_operation


def build_operations(
    client: GoogleAdsClient,
    selected_customer: str,
    *,
    enable: bool,
) -> list[object]:
    operations: list[object] = [
        build_budget_operation(client, selected_customer),
        build_campaign_operation(client, selected_customer, enable=enable),
        build_language_operation(client, selected_customer),
        *build_location_operations(client, selected_customer),
        *build_negative_operations(client, selected_customer),
        *build_ad_group_operations(client, selected_customer),
        *build_keyword_operations(client, selected_customer),
        *build_ad_operations(client, selected_customer),
    ]
    return [wrap_mutate_operation(client, operation) for operation in operations]


def print_plan(*, selected_customer: str, validate_only: bool, enable: bool) -> None:
    mode = "VALIDATE_ONLY" if validate_only else "APPLY"
    campaign_status = "ENABLED" if enable else "PAUSED"
    print(f"Mode: {mode}")
    print(f"Customer: {selected_customer}")
    print(f"Campaign: {CAMPAIGN_NAME}")
    print(f"Campaign status after apply: {campaign_status}")
    print(f"Daily budget: CA${DAILY_BUDGET_MICROS / 1_000_000:.2f}")
    print(f"Max CPC bid: CA${CPC_BID_MICROS / 1_000_000:.2f}")
    print(f"Landing URL: {LANDING_URL}")
    print("Networks: Google Search only")
    print("Locations: " + ", ".join(TARGET_GEOS.values()))
    print("\nAd groups and keywords:")
    print("ad_group\tmatch_type\tkeyword")
    for spec in AD_GROUPS:
        for keyword in spec.keywords:
            print(f"{spec.name}\t{keyword.match_type}\t{keyword.text}")
    print("\nCampaign negatives:")
    print("match_type\ttext\treason")
    for negative in NEGATIVE_KEYWORDS:
        print(f"{negative.match_type}\t{negative.text}\t{negative.reason}")
    print("\nResponsive search ads:")
    for spec in AD_GROUPS:
        print(
            f"- {spec.name}: {len(spec.headlines)} headlines, "
            f"{len(spec.descriptions)} descriptions"
        )


def mutate(
    client: GoogleAdsClient,
    selected_customer: str,
    operations: list[object],
    *,
    validate_only: bool,
) -> None:
    service = client.get_service("GoogleAdsService")
    request = client.get_type("MutateGoogleAdsRequest")
    request.customer_id = selected_customer
    request.validate_only = validate_only
    request.partial_failure = False
    request.response_content_type = (
        client.enums.ResponseContentTypeEnum.RESOURCE_NAME_ONLY
    )
    request.mutate_operations.extend(operations)
    response = service.mutate(request=request)
    if validate_only:
        print("Validate-only mutation accepted.")
        return
    print("Created resources:")
    for result in response.mutate_operation_responses:
        resource_name = result._pb.WhichOneof("response")
        if resource_name:
            resource = getattr(result, resource_name).resource_name
            print(resource)


def verify(client: GoogleAdsClient, selected_customer: str) -> None:
    resource_name = existing_campaign_resource(client, selected_customer)
    if not resource_name:
        raise SystemExit("Campaign was not found after apply.")
    service = client.get_service("GoogleAdsService")
    query = f"""
        SELECT
          campaign.name,
          campaign.status,
          campaign.network_settings.target_google_search,
          campaign.network_settings.target_search_network,
          campaign.network_settings.target_partner_search_network,
          campaign.network_settings.target_content_network
        FROM campaign
        WHERE campaign.resource_name = '{resource_name}'
        LIMIT 1
    """
    rows = list(service.search(customer_id=selected_customer, query=query))
    if not rows:
        raise SystemExit("Campaign verification query returned no rows.")
    campaign = rows[0].campaign
    print("Verified campaign:")
    print(f"name={campaign.name}")
    print(f"status={campaign.status.name}")
    print(f"google_search={campaign.network_settings.target_google_search}")
    print(f"search_network={campaign.network_settings.target_search_network}")
    print(
        f"partner_search={campaign.network_settings.target_partner_search_network}",
    )
    print(f"content_network={campaign.network_settings.target_content_network}")


def validate_asset_lengths() -> None:
    for spec in AD_GROUPS:
        if len(spec.path1) > 15:
            raise ValueError(f"path1 too long ({len(spec.path1)}): {spec.path1}")
        if len(spec.path2) > 15:
            raise ValueError(f"path2 too long ({len(spec.path2)}): {spec.path2}")
        for headline in spec.headlines:
            if len(headline) > 30:
                raise ValueError(f"Headline too long ({len(headline)}): {headline}")
        for description in spec.descriptions:
            if len(description) > 90:
                raise ValueError(
                    f"Description too long ({len(description)}): {description}",
                )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Create the campaign bundle. Defaults to validate-only.",
    )
    parser.add_argument(
        "--enable",
        action="store_true",
        help="Create the campaign enabled. Without this flag, apply creates it paused.",
    )
    args = parser.parse_args()

    selected_customer = customer_id()
    validate_asset_lengths()
    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)
    existing = existing_campaign_resource(client, selected_customer)
    if existing:
        print(f"Campaign already exists: {existing}")
        return 0

    print_plan(
        selected_customer=selected_customer,
        validate_only=not args.apply,
        enable=args.enable,
    )
    operations = build_operations(client, selected_customer, enable=args.enable)
    try:
        mutate(client, selected_customer, operations, validate_only=not args.apply)
    except GoogleAdsException as exc:
        print("Google Ads mutation failed:")
        for error in exc.failure.errors:
            print(f"- {error.message}")
        raise
    if args.apply:
        verify(client, selected_customer)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
