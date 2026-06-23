"""Replace AI consulting ads with direct 200 landing page URLs."""

from __future__ import annotations

import argparse
import os
import sys

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


def customer_id() -> str:
    value = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    if not value:
        raise SystemExit("GOOGLE_ADS_CUSTOMER_ID is required.")
    return value.replace("-", "")


def matching_ads(client: GoogleAdsClient, selected_customer: str) -> list[object]:
    service = client.get_service("GoogleAdsService")
    escaped_name = CAMPAIGN_NAME.replace("'", "\\'")
    query = f"""
        SELECT
          ad_group_ad.resource_name,
          ad_group_ad.status,
          ad_group_ad.policy_summary.approval_status,
          ad_group_ad.policy_summary.policy_topic_entries,
          ad_group_ad.ad.id,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.final_url_suffix,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.responsive_search_ad.path1,
          ad_group_ad.ad.responsive_search_ad.path2,
          campaign.name,
          ad_group.resource_name,
          ad_group.name
        FROM ad_group_ad
        WHERE campaign.name = '{escaped_name}'
          AND ad_group_ad.status != REMOVED
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
    rows: list[object],
    *,
    validate_only: bool,
) -> None:
    service = client.get_service("AdGroupAdService")
    operations = []
    for row in rows:
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

        existing_rsa = row.ad_group_ad.ad.responsive_search_ad
        rsa = ad_group_ad.ad.responsive_search_ad
        rsa.path1 = existing_rsa.path1
        rsa.path2 = existing_rsa.path2
        rsa.headlines.extend(
            ad_text_asset(client, headline.text)
            for headline in existing_rsa.headlines
        )
        rsa.descriptions.extend(
            ad_text_asset(client, description.text)
            for description in existing_rsa.descriptions
        )
        operations.append(create_operation)

    response = service.mutate_ad_group_ads(
        request={
            "customer_id": selected_customer,
            "operations": operations,
            "validate_only": validate_only,
        }
    )
    if validate_only:
        print("validate-only\tad replacement accepted")
        return
    for result in response.results:
        print(f"mutated\t{result.resource_name}\t{LANDING_URL}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    selected_customer = customer_id()
    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)

    try:
        rows = matching_ads(client, selected_customer)
        if not rows:
            print("No AI consulting ads found.", file=sys.stderr)
            return 1

        print(f"target_url\t{LANDING_URL}")
        for row in rows:
            topics = [
                entry.topic
                for entry in row.ad_group_ad.policy_summary.policy_topic_entries
            ]
            print(
                "\t".join(
                    [
                        str(row.ad_group_ad.ad.id),
                        row.ad_group.name,
                        row.ad_group_ad.status.name,
                        row.ad_group_ad.policy_summary.approval_status.name,
                        ",".join(row.ad_group_ad.ad.final_urls),
                        ",".join(topics) or "(no_topics)",
                    ]
                )
            )

        replace_ads(
            client,
            selected_customer,
            rows,
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
