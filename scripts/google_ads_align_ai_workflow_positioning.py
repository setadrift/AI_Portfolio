"""Align AI consulting search ads with productized workflow-audit positioning.

Default mode is validate-only. `--apply` replaces enabled non-vertical RSAs in
the existing campaign with review-first workflow-audit copy.
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


@dataclass(frozen=True)
class AdCopy:
    path1: str
    path2: str
    headlines: tuple[str, ...]
    descriptions: tuple[str, ...]


DEFAULT_COPY = AdCopy(
    path1="workflow",
    path2="audit",
    headlines=(
        "Workflow Audit For SMBs",
        "Review-First Automation",
        "Fix Admin Workflows",
        "AI Workflow Systems",
        "Built By An Engineer",
        "Human Approval Stays",
        "Document Intake Help",
        "Revenue Follow-Up",
    ),
    descriptions=(
        "Map one admin-heavy workflow before investing in a larger AI build.",
        "Turn emails, PDFs, forms, quotes, photos, and follow-up into a review-first system.",
        "Get an automate, keep human, redesign, or buy recommendation.",
        "Built for service businesses with real operating bottlenecks.",
    ),
)

AD_GROUP_COPY: dict[str, AdCopy] = {
    "Workflow Automation - Broader Test": DEFAULT_COPY,
    "AI Consulting - Exact/Phrase": DEFAULT_COPY,
    "AI Implementation - Exact/Phrase": DEFAULT_COPY,
    "Business Automation - Exact/Phrase": DEFAULT_COPY,
    "Small Business Admin Pain - Phrase": AdCopy(
        path1="admin",
        path2="queue",
        headlines=(
            "Operations Admin Queue",
            "Automate Admin Tasks",
            "Review-First Workflow",
            "Fix Inbox Follow-Up",
            "Spreadsheet Workflow Help",
            "Human Approval Stays",
            "Built By An Engineer",
            "Request Workflow Audit",
        ),
        descriptions=(
            "Turn shared inboxes, forms, spreadsheets, and follow-up into a visible queue.",
            "Map owner, status, aging, missing info, and next action before building.",
            "Review-first automation for service businesses with repetitive admin.",
            "Start with one workflow audit before changing tools.",
        ),
    ),
    "Trades And Field Service - Phrase": AdCopy(
        path1="follow-up",
        path2="workflow",
        headlines=(
            "Revenue Follow-Up",
            "Estimate Follow-Up Help",
            "Dispatch Workflow Audit",
            "Service Business Workflow",
            "Track Every Quote",
            "Human Approval Stays",
            "Built By An Engineer",
            "Request Workflow Audit",
        ),
        descriptions=(
            "Map missed calls, estimates, service notes, and customer follow-up.",
            "Review-first workflow automation for contractors and field service teams.",
            "Find the admin gap before buying another tool.",
            "Built around quotes, dispatch, photos, and follow-up.",
        ),
    ),
}


def customer_id() -> str:
    value = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    if not value:
        raise SystemExit("GOOGLE_ADS_CUSTOMER_ID is required.")
    return value.replace("-", "")


def matching_ads(client: GoogleAdsClient, selected_customer: str) -> list[object]:
    service = client.get_service("GoogleAdsService")
    escaped_name = CAMPAIGN_NAME.replace("'", "\\'")
    quoted_groups = ", ".join(
        "'" + name.replace("'", "\\'") + "'" for name in AD_GROUP_COPY
    )
    query = f"""
        SELECT
          ad_group_ad.resource_name,
          ad_group_ad.status,
          ad_group_ad.ad.id,
          ad_group_ad.ad.final_url_suffix,
          ad_group.resource_name,
          ad_group.name
        FROM ad_group_ad
        WHERE campaign.name = '{escaped_name}'
          AND ad_group.name IN ({quoted_groups})
          AND ad_group_ad.status = ENABLED
        ORDER BY ad_group.name, ad_group_ad.ad.id
    """
    return list(service.search(customer_id=selected_customer, query=query))


def ad_text_asset(client: GoogleAdsClient, text: str) -> object:
    asset = client.get_type("AdTextAsset")
    asset.text = text
    return asset


def replace_ads(
    client: GoogleAdsClient,
    selected_customer: str,
    ad_rows: list[object],
    *,
    validate_only: bool,
) -> None:
    if not ad_rows:
        print("No matching enabled ads found.")
        return

    service = client.get_service("AdGroupAdService")
    operations = []
    for row in ad_rows:
        copy = AD_GROUP_COPY[row.ad_group.name]
        remove_operation = client.get_type("AdGroupAdOperation")
        remove_operation.remove = row.ad_group_ad.resource_name
        operations.append(remove_operation)

        create_operation = client.get_type("AdGroupAdOperation")
        ad_group_ad = create_operation.create
        ad_group_ad.ad_group = row.ad_group.resource_name
        ad_group_ad.status = client.enums.AdGroupAdStatusEnum.ENABLED
        ad_group_ad.ad.final_urls.append(LANDING_URL)
        if row.ad_group_ad.ad.final_url_suffix:
            ad_group_ad.ad.final_url_suffix = row.ad_group_ad.ad.final_url_suffix

        rsa = ad_group_ad.ad.responsive_search_ad
        rsa.path1 = copy.path1
        rsa.path2 = copy.path2
        rsa.headlines.extend(ad_text_asset(client, text) for text in copy.headlines)
        rsa.descriptions.extend(
            ad_text_asset(client, text) for text in copy.descriptions
        )
        operations.append(create_operation)

        print(f"replace_ad\t{row.ad_group.name}\t{row.ad_group_ad.ad.id}")

    response = service.mutate_ad_group_ads(
        request={
            "customer_id": selected_customer,
            "operations": operations,
            "validate_only": validate_only,
        }
    )
    if validate_only:
        print(f"validate-only accepted\toperations={len(operations)}")
        return

    print(f"applied\toperations={len(operations)}")
    for result in response.results:
        print(f"mutated\t{result.resource_name}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    selected_customer = customer_id()
    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)
    try:
        ad_rows = matching_ads(client, selected_customer)
        replace_ads(
            client,
            selected_customer,
            ad_rows,
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
