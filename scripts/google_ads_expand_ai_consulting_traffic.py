"""Expand the AI consulting search campaign for more traffic.

Default mode is validate-only. `--apply` mutates the existing campaign by:

- raising manual CPC bids on enabled ad groups;
- adding broader workflow/trade-oriented ad groups;
- adding campaign-level sitelink, callout, and structured snippet assets.
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
LANDING_URL = os.getenv(
    "GOOGLE_ADS_AI_CONSULTING_LANDING_URL",
    "https://www.duncananderson.ca/en/ai-workflow-audit",
)
HOME_URL = "https://www.duncananderson.ca/en"
CONTACT_URL = "https://www.duncananderson.ca/en/#contact"
PROJECTS_URL = "https://www.duncananderson.ca/en/#projects"
TARGET_CPC_MICROS = int(
    float(os.getenv("GOOGLE_ADS_EXPANDED_MAX_CPC_CAD", "6.00")) * 1_000_000,
)


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


AD_GROUPS: tuple[AdGroupSpec, ...] = (
    AdGroupSpec(
        name="Workflow Automation - Broader Test",
        path1="automation",
        path2="audit",
        keywords=(
            Keyword("small business automation", "BROAD"),
            Keyword("business process automation", "BROAD"),
            Keyword("workflow automation for small business", "BROAD"),
            Keyword("service business automation", "BROAD"),
            Keyword("automate admin work", "BROAD"),
            Keyword("business automation services", "PHRASE"),
            Keyword("workflow automation services", "PHRASE"),
            Keyword("automate business processes", "PHRASE"),
            Keyword("operations automation consultant", "PHRASE"),
        ),
        headlines=(
            "Automate Admin Work",
            "Workflow Automation Audit",
            "Small Business Automation",
            "Reduce Manual Follow Up",
            "Fix Repetitive Workflows",
            "Built By An Engineer",
            "Practical Automation Help",
            "Request A Workflow Audit",
        ),
        descriptions=(
            "Map one repetitive workflow and get a practical automation plan for your business.",
            "Turn inboxes, spreadsheets, forms, and follow-up into a cleaner operating system.",
            "Hands-on workflow automation for small teams with real admin bottlenecks.",
            "Start with a focused audit before investing in a larger automation build.",
        ),
    ),
    AdGroupSpec(
        name="Trades And Field Service - Phrase",
        path1="trades",
        path2="automation",
        keywords=(
            Keyword("contractor automation", "PHRASE"),
            Keyword("service business automation", "PHRASE"),
            Keyword("field service automation consultant", "PHRASE"),
            Keyword("dispatch workflow automation", "PHRASE"),
            Keyword("quote follow up automation", "PHRASE"),
            Keyword("estimate follow up automation", "PHRASE"),
            Keyword("automate estimate follow up", "PHRASE"),
            Keyword("contractor workflow automation", "PHRASE"),
            Keyword("home service automation", "PHRASE"),
            Keyword("service call automation", "PHRASE"),
        ),
        headlines=(
            "Automation For Contractors",
            "Estimate Follow Up Help",
            "Service Business Automation",
            "Dispatch Workflow Audit",
            "Track Every Quote Request",
            "Reduce Missed Follow Ups",
            "Built By An Engineer",
            "Workflow Help For Trades",
        ),
        descriptions=(
            "Capture service requests, estimates, job updates, and follow-up in one workflow.",
            "Practical automation for contractors, HVAC, plumbing, roofing, and field service.",
            "Find the missed-call, quote, dispatch, or follow-up gaps costing admin time.",
            "Get a focused workflow audit before committing to a larger build.",
        ),
    ),
)

SITELINKS = (
    (
        "AI Workflow Audit",
        "Map one repetitive workflow.",
        "Get a practical first project.",
        LANDING_URL,
    ),
    (
        "Case Studies",
        "See production systems.",
        "Built for real operations.",
        PROJECTS_URL,
    ),
    (
        "Contact Duncan",
        "Send the workflow problem.",
        "Get a practical next step.",
        CONTACT_URL,
    ),
    (
        "Small Business AI Help",
        "Start with one workflow.",
        "Avoid vague AI strategy.",
        HOME_URL,
    ),
)
CALLOUTS = (
    "Built By An Engineer",
    "Practical Workflow Audit",
    "Small Business Focus",
    "Canada And US",
)
STRUCTURED_SNIPPETS = (
    (
        "Services",
        (
            "AI Workflow Audit",
            "Admin Automation",
            "Dispatch Workflows",
            "Reporting Systems",
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


def campaign_search_partners_enabled(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
) -> bool:
    result = rows(
        client,
        selected_customer,
        f"""
        SELECT
          campaign.resource_name,
          campaign.network_settings.target_partner_search_network
        FROM campaign
        WHERE campaign.resource_name = '{campaign}'
        LIMIT 1
        """,
    )
    if not result:
        raise SystemExit(f"Campaign not found: {campaign}")
    return result[0].campaign.network_settings.target_partner_search_network


def existing_ad_groups(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
) -> dict[str, object]:
    result = rows(
        client,
        selected_customer,
        f"""
        SELECT ad_group.resource_name, ad_group.name, ad_group.cpc_bid_micros
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
) -> set[tuple[str, str, str]]:
    result = rows(
        client,
        selected_customer,
        f"""
        SELECT
          ad_group.name,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type
        FROM keyword_view
        WHERE campaign.resource_name = '{campaign}'
          AND ad_group_criterion.status != REMOVED
        """,
    )
    return {
        (
            row.ad_group.name,
            row.ad_group_criterion.keyword.text.lower(),
            row.ad_group_criterion.keyword.match_type.name,
        )
        for row in result
    }


def existing_asset_labels(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
) -> set[tuple[str, str]]:
    result = rows(
        client,
        selected_customer,
        f"""
        SELECT
          campaign.resource_name,
          campaign_asset.field_type,
          asset.sitelink_asset.link_text,
          asset.callout_asset.callout_text,
          asset.structured_snippet_asset.header
        FROM campaign_asset
        WHERE campaign.resource_name = '{campaign}'
          AND campaign_asset.status != REMOVED
        """,
    )
    labels: set[tuple[str, str]] = set()
    for row in result:
        field_type = row.campaign_asset.field_type.name
        if row.asset.sitelink_asset.link_text:
            labels.add((field_type, row.asset.sitelink_asset.link_text))
        if row.asset.callout_asset.callout_text:
            labels.add((field_type, row.asset.callout_asset.callout_text))
        if row.asset.structured_snippet_asset.header:
            labels.add((field_type, row.asset.structured_snippet_asset.header))
    return labels


def ad_text_asset(client: GoogleAdsClient, text: str) -> object:
    asset = client.get_type("AdTextAsset")
    asset.text = text
    return asset


def keyword_match_type(client: GoogleAdsClient, name: str) -> int:
    return getattr(client.enums.KeywordMatchTypeEnum, name)


def mutate(client: GoogleAdsClient, selected_customer: str, operations: list[object], *, validate_only: bool) -> None:
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


def wrap(client: GoogleAdsClient, operation: object) -> object:
    mutate_operation = client.get_type("MutateOperation")
    name = operation.__class__.__name__
    if name == "AdGroupOperation":
        mutate_operation.ad_group_operation = operation
    elif name == "CampaignOperation":
        mutate_operation.campaign_operation = operation
    elif name == "AdGroupCriterionOperation":
        mutate_operation.ad_group_criterion_operation = operation
    elif name == "AdGroupAdOperation":
        mutate_operation.ad_group_ad_operation = operation
    elif name == "AssetOperation":
        mutate_operation.asset_operation = operation
    elif name == "CampaignAssetOperation":
        mutate_operation.campaign_asset_operation = operation
    else:
        raise TypeError(f"Unsupported operation type: {name}")
    return mutate_operation


def update_ad_group_bid_operation(client: GoogleAdsClient, resource_name: str) -> object:
    operation = client.get_type("AdGroupOperation")
    operation.update.resource_name = resource_name
    operation.update.cpc_bid_micros = TARGET_CPC_MICROS
    operation.update_mask.paths.append("cpc_bid_micros")
    return operation


def enable_search_partners_operation(client: GoogleAdsClient, campaign: str) -> object:
    operation = client.get_type("CampaignOperation")
    operation.update.resource_name = campaign
    operation.update.network_settings.target_partner_search_network = True
    operation.update_mask.paths.append("network_settings.target_partner_search_network")
    return operation


def create_ad_group_operation(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
    temp_id: int,
    spec: AdGroupSpec,
) -> tuple[object, str]:
    resource_name = f"customers/{selected_customer}/adGroups/-{temp_id}"
    operation = client.get_type("AdGroupOperation")
    ad_group = operation.create
    ad_group.resource_name = resource_name
    ad_group.campaign = campaign
    ad_group.name = spec.name
    ad_group.status = client.enums.AdGroupStatusEnum.ENABLED
    ad_group.cpc_bid_micros = TARGET_CPC_MICROS
    return operation, resource_name


def create_keyword_operation(
    client: GoogleAdsClient,
    ad_group: str,
    keyword: Keyword,
) -> object:
    operation = client.get_type("AdGroupCriterionOperation")
    criterion = operation.create
    criterion.ad_group = ad_group
    criterion.status = client.enums.AdGroupCriterionStatusEnum.ENABLED
    criterion.keyword.text = keyword.text
    criterion.keyword.match_type = keyword_match_type(client, keyword.match_type)
    return operation


def create_ad_operation(client: GoogleAdsClient, ad_group: str, spec: AdGroupSpec) -> object:
    operation = client.get_type("AdGroupAdOperation")
    ad_group_ad = operation.create
    ad_group_ad.ad_group = ad_group
    ad_group_ad.status = client.enums.AdGroupAdStatusEnum.ENABLED
    ad_group_ad.ad.final_urls.append(LANDING_URL)
    rsa = ad_group_ad.ad.responsive_search_ad
    rsa.path1 = spec.path1
    rsa.path2 = spec.path2
    rsa.headlines.extend(ad_text_asset(client, headline) for headline in spec.headlines)
    rsa.descriptions.extend(
        ad_text_asset(client, description) for description in spec.descriptions
    )
    return operation


def create_sitelink_asset_operation(
    client: GoogleAdsClient,
    selected_customer: str,
    temp_id: int,
    link_text: str,
    description1: str,
    description2: str,
    final_url: str,
) -> tuple[object, str]:
    resource_name = f"customers/{selected_customer}/assets/-{temp_id}"
    operation = client.get_type("AssetOperation")
    asset = operation.create
    asset.resource_name = resource_name
    asset.final_urls.append(final_url)
    asset.sitelink_asset.link_text = link_text
    asset.sitelink_asset.description1 = description1
    asset.sitelink_asset.description2 = description2
    return operation, resource_name


def create_callout_asset_operation(
    client: GoogleAdsClient,
    selected_customer: str,
    temp_id: int,
    text: str,
) -> tuple[object, str]:
    resource_name = f"customers/{selected_customer}/assets/-{temp_id}"
    operation = client.get_type("AssetOperation")
    asset = operation.create
    asset.resource_name = resource_name
    asset.callout_asset.callout_text = text
    return operation, resource_name


def create_structured_snippet_asset_operation(
    client: GoogleAdsClient,
    selected_customer: str,
    temp_id: int,
    header: str,
    values: tuple[str, ...],
) -> tuple[object, str]:
    resource_name = f"customers/{selected_customer}/assets/-{temp_id}"
    operation = client.get_type("AssetOperation")
    asset = operation.create
    asset.resource_name = resource_name
    asset.structured_snippet_asset.header = header
    asset.structured_snippet_asset.values.extend(values)
    return operation, resource_name


def create_campaign_asset_operation(
    client: GoogleAdsClient,
    campaign: str,
    asset: str,
    field_type_name: str,
) -> object:
    operation = client.get_type("CampaignAssetOperation")
    campaign_asset = operation.create
    campaign_asset.campaign = campaign
    campaign_asset.asset = asset
    campaign_asset.field_type = getattr(client.enums.AssetFieldTypeEnum, field_type_name)
    campaign_asset.status = client.enums.AssetLinkStatusEnum.ENABLED
    return operation


def build_operations(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
    *,
    enable_search_partners: bool,
) -> list[object]:
    operations: list[object] = []
    if enable_search_partners:
        if campaign_search_partners_enabled(client, selected_customer, campaign):
            print("search_partners_exists\tenabled")
        else:
            print("enable_search_partners\tcontrolled traffic test")
            operations.append(
                wrap(client, enable_search_partners_operation(client, campaign))
            )

    ad_groups = existing_ad_groups(client, selected_customer, campaign)
    keyword_set = existing_keywords(client, selected_customer, campaign)
    asset_labels = existing_asset_labels(client, selected_customer, campaign)

    print(f"Target CPC: CA${TARGET_CPC_MICROS / 1_000_000:.2f}")
    for ad_group in ad_groups.values():
        if ad_group.cpc_bid_micros < TARGET_CPC_MICROS:
            print(f"raise_cpc\t{ad_group.name}\t{ad_group.cpc_bid_micros / 1_000_000:.2f}->6.00")
            operations.append(wrap(client, update_ad_group_bid_operation(client, ad_group.resource_name)))

    temp_ad_group_id = 100
    for spec in AD_GROUPS:
        if spec.name in ad_groups:
            ad_group_resource = ad_groups[spec.name].resource_name
            print(f"ad_group_exists\t{spec.name}")
        else:
            print(f"create_ad_group\t{spec.name}")
            operation, ad_group_resource = create_ad_group_operation(
                client,
                selected_customer,
                campaign,
                temp_ad_group_id,
                spec,
            )
            temp_ad_group_id += 1
            operations.append(wrap(client, operation))
            operations.append(wrap(client, create_ad_operation(client, ad_group_resource, spec)))

        for keyword in spec.keywords:
            key = (spec.name, keyword.text.lower(), keyword.match_type)
            if key in keyword_set:
                continue
            print(f"add_keyword\t{spec.name}\t{keyword.match_type}\t{keyword.text}")
            operations.append(wrap(client, create_keyword_operation(client, ad_group_resource, keyword)))

    temp_asset_id = 200
    for link_text, description1, description2, final_url in SITELINKS:
        if ("SITELINK", link_text) in asset_labels:
            print(f"sitelink_exists\t{link_text}")
            continue
        print(f"add_sitelink\t{link_text}")
        operation, asset = create_sitelink_asset_operation(
            client,
            selected_customer,
            temp_asset_id,
            link_text,
            description1,
            description2,
            final_url,
        )
        temp_asset_id += 1
        operations.append(wrap(client, operation))
        operations.append(
            wrap(client, create_campaign_asset_operation(client, campaign, asset, "SITELINK"))
        )

    for text in CALLOUTS:
        if ("CALLOUT", text) in asset_labels:
            print(f"callout_exists\t{text}")
            continue
        print(f"add_callout\t{text}")
        operation, asset = create_callout_asset_operation(
            client,
            selected_customer,
            temp_asset_id,
            text,
        )
        temp_asset_id += 1
        operations.append(wrap(client, operation))
        operations.append(
            wrap(client, create_campaign_asset_operation(client, campaign, asset, "CALLOUT"))
        )

    for header, values in STRUCTURED_SNIPPETS:
        if ("STRUCTURED_SNIPPET", header) in asset_labels:
            print(f"structured_snippet_exists\t{header}")
            continue
        print(f"add_structured_snippet\t{header}")
        operation, asset = create_structured_snippet_asset_operation(
            client,
            selected_customer,
            temp_asset_id,
            header,
            values,
        )
        temp_asset_id += 1
        operations.append(wrap(client, operation))
        operations.append(
            wrap(
                client,
                create_campaign_asset_operation(
                    client,
                    campaign,
                    asset,
                    "STRUCTURED_SNIPPET",
                ),
            )
        )

    return operations


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument(
        "--enable-search-partners",
        action="store_true",
        help=(
            "Try enabling Google Search Partners. Some accounts reject this with "
            "CANNOT_TARGET_SEARCH_PARTNER_NETWORK."
        ),
    )
    args = parser.parse_args()

    selected_customer = customer_id()
    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)
    try:
        campaign = campaign_resource(client, selected_customer)
        operations = build_operations(
            client,
            selected_customer,
            campaign,
            enable_search_partners=args.enable_search_partners,
        )
        mutate(
            client,
            selected_customer,
            operations,
            validate_only=not args.apply,
        )
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
