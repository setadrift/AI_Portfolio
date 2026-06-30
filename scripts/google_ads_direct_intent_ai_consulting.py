"""Route direct-intent AI consulting traffic to a dedicated landing page.

Default mode is validate-only. `--apply` mutates the existing campaign by:

- creating direct-intent ads for AI consulting, implementation, automation, and
  local Canada/Ontario ad groups;
- pausing the older generic ads in those direct/local ad groups;
- adding missing exact/phrase direct-intent keywords;
- keeping the broad workflow automation test capped at CA$3 and pausing any
  enabled broad-match keywords.
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException


CONFIG_PATH = os.getenv(
    "GOOGLE_ADS_CONFIG_PATH",
    "/Users/duncananderson/.codex/google-ads.yaml",
)
CAMPAIGN_NAME = "Search | AI Consulting | Exact/Phrase"
DIRECT_LANDING_URL = os.getenv(
    "GOOGLE_ADS_DIRECT_AI_CONSULTING_URL",
    "https://www.duncananderson.ca/en/ai-consulting-small-business",
)
BROAD_WORKFLOW_AD_GROUP = "Workflow Automation - Broader Test"
BROAD_WORKFLOW_TARGET_CPC_MICROS = int(
    float(os.getenv("GOOGLE_ADS_BROAD_WORKFLOW_MAX_CPC_CAD", "3.00")) * 1_000_000
)


DIRECT_HEADLINES = (
    "Small Business AI Consultant",
    "AI Consulting Services",
    "AI Consultant Canada",
    "Practical AI Implementation",
    "Workflow Automation Consultant",
    "AI Automation Consultant",
    "Book A 15-Minute Call",
    "Send One Workflow",
    "Built By An Engineer",
    "AI Help For Owner-Led Teams",
)

DIRECT_DESCRIPTIONS = (
    "Practical AI consulting for small businesses with messy workflows and real operations.",
    "Book a 15-minute fit call or send one workflow for a focused first recommendation.",
    "Turn inboxes, PDFs, spreadsheets, calls, and follow-up into reliable internal systems.",
    "Hands-on AI implementation from an engineer, not a generic strategy deck.",
)


@dataclass(frozen=True)
class KeywordSpec:
    ad_group: str
    text: str
    match_type: str


DIRECT_KEYWORDS: tuple[KeywordSpec, ...] = (
    KeywordSpec("AI Consulting - Exact/Phrase", "ai consulting", "EXACT"),
    KeywordSpec("AI Consulting - Exact/Phrase", "ai consulting", "PHRASE"),
    KeywordSpec("AI Consulting - Exact/Phrase", "ai consulting services", "EXACT"),
    KeywordSpec("AI Consulting - Exact/Phrase", "ai consulting services", "PHRASE"),
    KeywordSpec("AI Consulting - Exact/Phrase", "ai consultant for small business", "EXACT"),
    KeywordSpec("AI Consulting - Exact/Phrase", "ai consultant for small business", "PHRASE"),
    KeywordSpec("AI Consulting - Exact/Phrase", "small business ai consultant", "EXACT"),
    KeywordSpec("AI Consulting - Exact/Phrase", "small business ai consultant", "PHRASE"),
    KeywordSpec("AI Implementation - Exact/Phrase", "ai implementation consultant", "EXACT"),
    KeywordSpec("AI Implementation - Exact/Phrase", "ai implementation consultant", "PHRASE"),
    KeywordSpec("Business Automation - Exact/Phrase", "ai automation consultant", "EXACT"),
    KeywordSpec("Business Automation - Exact/Phrase", "ai automation consultant", "PHRASE"),
    KeywordSpec("Business Automation - Exact/Phrase", "workflow automation consultant", "EXACT"),
    KeywordSpec("Business Automation - Exact/Phrase", "workflow automation consultant", "PHRASE"),
    KeywordSpec("Canada US Local - Exact/Phrase", "ai consultant canada", "EXACT"),
    KeywordSpec("Canada US Local - Exact/Phrase", "ai consultant canada", "PHRASE"),
    KeywordSpec("Canada US Local - Exact/Phrase", "ai consultant ontario", "EXACT"),
    KeywordSpec("Canada US Local - Exact/Phrase", "ai consultant ontario", "PHRASE"),
)

DIRECT_AD_GROUPS = tuple(sorted({keyword.ad_group for keyword in DIRECT_KEYWORDS}))


def customer_id() -> str:
    value = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    if not value:
        raise SystemExit("GOOGLE_ADS_CUSTOMER_ID is required.")
    return value.replace("-", "")


def rows(client: GoogleAdsClient, selected_customer: str, query: str) -> list[object]:
    service = client.get_service("GoogleAdsService")
    return list(service.search(customer_id=selected_customer, query=query))


def escape(value: str) -> str:
    return value.replace("'", "\\'")


def keyword_match_type(client: GoogleAdsClient, name: str) -> int:
    return getattr(client.enums.KeywordMatchTypeEnum, name)


def campaign_resource(client: GoogleAdsClient, selected_customer: str) -> str:
    result = rows(
        client,
        selected_customer,
        f"""
        SELECT campaign.resource_name
        FROM campaign
        WHERE campaign.name = '{escape(CAMPAIGN_NAME)}'
          AND campaign.status != REMOVED
        LIMIT 1
        """,
    )
    if not result:
        raise SystemExit(f"Campaign not found: {CAMPAIGN_NAME}")
    return result[0].campaign.resource_name


def ad_groups_by_name(
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


def active_keywords(
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


def current_direct_ads(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
) -> list[object]:
    ad_group_names = ", ".join(f"'{escape(name)}'" for name in DIRECT_AD_GROUPS)
    return rows(
        client,
        selected_customer,
        f"""
        SELECT
          ad_group.name,
          ad_group.resource_name,
          ad_group_ad.resource_name,
          ad_group_ad.status,
          ad_group_ad.ad.id,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.responsive_search_ad.headlines
        FROM ad_group_ad
        WHERE campaign.resource_name = '{campaign}'
          AND ad_group.name IN ({ad_group_names})
          AND ad_group_ad.status != REMOVED
        ORDER BY ad_group.name, ad_group_ad.ad.id
        """,
    )


def enabled_broad_workflow_keywords(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
) -> list[object]:
    return rows(
        client,
        selected_customer,
        f"""
        SELECT
          ad_group_criterion.resource_name,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type
        FROM keyword_view
        WHERE campaign.resource_name = '{campaign}'
          AND ad_group.name = '{escape(BROAD_WORKFLOW_AD_GROUP)}'
          AND ad_group_criterion.status = ENABLED
          AND ad_group_criterion.keyword.match_type = BROAD
        """,
    )


def ad_text_asset(client: GoogleAdsClient, text: str) -> object:
    asset = client.get_type("AdTextAsset")
    asset.text = text
    return asset


def create_direct_ad_operation(client: GoogleAdsClient, ad_group_resource: str) -> object:
    operation = client.get_type("AdGroupAdOperation")
    ad_group_ad = operation.create
    ad_group_ad.ad_group = ad_group_resource
    ad_group_ad.status = client.enums.AdGroupAdStatusEnum.ENABLED
    ad_group_ad.ad.final_urls.append(DIRECT_LANDING_URL)
    rsa = ad_group_ad.ad.responsive_search_ad
    rsa.path1 = "ai-consulting"
    rsa.path2 = "small-business"
    rsa.headlines.extend(ad_text_asset(client, headline) for headline in DIRECT_HEADLINES)
    rsa.descriptions.extend(
        ad_text_asset(client, description) for description in DIRECT_DESCRIPTIONS
    )
    return operation


def pause_ad_operation(client: GoogleAdsClient, resource_name: str) -> object:
    operation = client.get_type("AdGroupAdOperation")
    operation.update.resource_name = resource_name
    operation.update.status = client.enums.AdGroupAdStatusEnum.PAUSED
    operation.update_mask.paths.append("status")
    return operation


def create_keyword_operation(
    client: GoogleAdsClient,
    ad_group_resource: str,
    keyword: KeywordSpec,
) -> object:
    operation = client.get_type("AdGroupCriterionOperation")
    criterion = operation.create
    criterion.ad_group = ad_group_resource
    criterion.status = client.enums.AdGroupCriterionStatusEnum.ENABLED
    criterion.keyword.text = keyword.text
    criterion.keyword.match_type = keyword_match_type(client, keyword.match_type)
    return operation


def pause_keyword_operation(client: GoogleAdsClient, resource_name: str) -> object:
    operation = client.get_type("AdGroupCriterionOperation")
    operation.update.resource_name = resource_name
    operation.update.status = client.enums.AdGroupCriterionStatusEnum.PAUSED
    operation.update_mask.paths.append("status")
    return operation


def update_ad_group_bid_operation(
    client: GoogleAdsClient,
    resource_name: str,
    target_cpc_micros: int,
) -> object:
    operation = client.get_type("AdGroupOperation")
    operation.update.resource_name = resource_name
    operation.update.cpc_bid_micros = target_cpc_micros
    operation.update_mask.paths.append("cpc_bid_micros")
    return operation


def wrap(client: GoogleAdsClient, operation: object) -> object:
    mutate_operation = client.get_type("MutateOperation")
    name = operation.__class__.__name__
    if name == "AdGroupAdOperation":
        mutate_operation.ad_group_ad_operation = operation
    elif name == "AdGroupCriterionOperation":
        mutate_operation.ad_group_criterion_operation = operation
    elif name == "AdGroupOperation":
        mutate_operation.ad_group_operation = operation
    else:
        raise TypeError(f"Unsupported operation type: {name}")
    return mutate_operation


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


def build_operations(client: GoogleAdsClient, selected_customer: str) -> list[object]:
    campaign = campaign_resource(client, selected_customer)
    ad_groups = ad_groups_by_name(client, selected_customer, campaign)
    existing_keywords = active_keywords(client, selected_customer, campaign)
    operations: list[object] = []

    for name in DIRECT_AD_GROUPS:
        if name not in ad_groups:
            raise SystemExit(f"Ad group not found: {name}")

    for keyword in DIRECT_KEYWORDS:
        key = (keyword.ad_group, keyword.text.lower(), keyword.match_type)
        if key in existing_keywords:
            print(f"keyword_exists\t{keyword.ad_group}\t{keyword.match_type}\t{keyword.text}")
            continue
        print(f"add_keyword\t{keyword.ad_group}\t{keyword.match_type}\t{keyword.text}")
        operations.append(
            wrap(
                client,
                create_keyword_operation(
                    client,
                    ad_groups[keyword.ad_group].resource_name,
                    keyword,
                ),
            )
        )

    direct_ads = current_direct_ads(client, selected_customer, campaign)
    direct_ad_groups = {
        row.ad_group.name
        for row in direct_ads
        if DIRECT_LANDING_URL in list(row.ad_group_ad.ad.final_urls)
    }
    created_ad_groups: set[str] = set(direct_ad_groups)

    for row in direct_ads:
        final_urls = list(row.ad_group_ad.ad.final_urls)
        is_direct_url = DIRECT_LANDING_URL in final_urls
        if not is_direct_url and row.ad_group_ad.status.name == "ENABLED":
            print(
                f"pause_generic_ad\t{row.ad_group.name}\t"
                f"{row.ad_group_ad.ad.id}\t{','.join(final_urls)}"
            )
            operations.append(wrap(client, pause_ad_operation(client, row.ad_group_ad.resource_name)))
        if row.ad_group.name not in created_ad_groups and not is_direct_url:
            print(f"create_direct_ad\t{row.ad_group.name}\t{DIRECT_LANDING_URL}")
            operations.append(
                wrap(client, create_direct_ad_operation(client, row.ad_group.resource_name))
            )
            created_ad_groups.add(row.ad_group.name)
        elif is_direct_url:
            print(f"direct_ad_exists\t{row.ad_group.name}\t{row.ad_group_ad.ad.id}")
            created_ad_groups.add(row.ad_group.name)

    broad_ad_group = ad_groups.get(BROAD_WORKFLOW_AD_GROUP)
    if not broad_ad_group:
        raise SystemExit(f"Ad group not found: {BROAD_WORKFLOW_AD_GROUP}")

    for row in enabled_broad_workflow_keywords(client, selected_customer, campaign):
        keyword = row.ad_group_criterion.keyword
        print(f"pause_broad_keyword\t{keyword.match_type.name}\t{keyword.text}")
        operations.append(
            wrap(client, pause_keyword_operation(client, row.ad_group_criterion.resource_name))
        )

    if broad_ad_group.cpc_bid_micros != BROAD_WORKFLOW_TARGET_CPC_MICROS:
        current_cpc = broad_ad_group.cpc_bid_micros / 1_000_000
        target_cpc = BROAD_WORKFLOW_TARGET_CPC_MICROS / 1_000_000
        print(f"set_broad_workflow_cpc\tCA${current_cpc:.2f}->CA${target_cpc:.2f}")
        operations.append(
            wrap(
                client,
                update_ad_group_bid_operation(
                    client,
                    broad_ad_group.resource_name,
                    BROAD_WORKFLOW_TARGET_CPC_MICROS,
                ),
            )
        )
    else:
        print(f"broad_workflow_cpc_exists\tCA${BROAD_WORKFLOW_TARGET_CPC_MICROS / 1_000_000:.2f}")

    return operations


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    selected_customer = customer_id()
    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)
    operations = build_operations(client, selected_customer)
    mutate(client, selected_customer, operations, validate_only=not args.apply)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except GoogleAdsException as exc:
        print("Google Ads API request failed.")
        for error in exc.failure.errors:
            field_path = " > ".join(
                field.field_name for field in error.location.field_path_elements
            )
            print(f"- {error.error_code}: {error.message} field_path={field_path}")
        raise SystemExit(1)
