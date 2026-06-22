"""Enable the AI consulting Google Ads campaign after safety checks."""

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


def customer_id() -> str:
    value = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    if not value:
        raise SystemExit("GOOGLE_ADS_CUSTOMER_ID is required.")
    return value.replace("-", "")


def campaigns(client: GoogleAdsClient, selected_customer: str) -> list[object]:
    service = client.get_service("GoogleAdsService")
    query = """
        SELECT
          campaign.id,
          campaign.resource_name,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.network_settings.target_google_search,
          campaign.network_settings.target_search_network,
          campaign.network_settings.target_partner_search_network,
          campaign.network_settings.target_content_network
        FROM campaign
        WHERE campaign.status != REMOVED
        ORDER BY campaign.name
    """
    return list(service.search(customer_id=selected_customer, query=query))


def enable_campaign(
    client: GoogleAdsClient,
    selected_customer: str,
    resource_name: str,
) -> None:
    service = client.get_service("CampaignService")
    operation = client.get_type("CampaignOperation")
    campaign = operation.update
    campaign.resource_name = resource_name
    campaign.status = client.enums.CampaignStatusEnum.ENABLED
    operation.update_mask.paths.append("status")
    service.mutate_campaigns(
        request={
            "customer_id": selected_customer,
            "operations": [operation],
        }
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    selected_customer = customer_id()
    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)

    try:
        rows = campaigns(client, selected_customer)
        ai_campaign = None
        enabled_non_ai = []
        for row in rows:
            campaign = row.campaign
            print(
                "\t".join(
                    [
                        str(campaign.id),
                        campaign.name,
                        campaign.status.name,
                        campaign.advertising_channel_type.name,
                        f"search={campaign.network_settings.target_google_search}",
                        f"search_network={campaign.network_settings.target_search_network}",
                        f"partners={campaign.network_settings.target_partner_search_network}",
                        f"display={campaign.network_settings.target_content_network}",
                    ]
                )
            )
            if campaign.name == CAMPAIGN_NAME:
                ai_campaign = campaign
            elif campaign.status.name == "ENABLED":
                enabled_non_ai.append(campaign.name)

        if enabled_non_ai:
            print(
                "Refusing to launch: non-AI campaigns are enabled: "
                + ", ".join(enabled_non_ai),
                file=sys.stderr,
            )
            return 1

        if ai_campaign is None:
            print(f"Campaign not found: {CAMPAIGN_NAME}", file=sys.stderr)
            return 1

        if ai_campaign.advertising_channel_type.name != "SEARCH":
            print("Refusing to launch: AI campaign is not Search.", file=sys.stderr)
            return 1

        if (
            not ai_campaign.network_settings.target_google_search
            or ai_campaign.network_settings.target_search_network
            or ai_campaign.network_settings.target_partner_search_network
            or ai_campaign.network_settings.target_content_network
        ):
            print("Refusing to launch: network settings are not search-only.", file=sys.stderr)
            return 1

        if ai_campaign.status.name == "ENABLED":
            print("AI consulting campaign is already enabled.")
            return 0

        if not args.apply:
            print("validate-only\tlaunch checks passed; rerun with --apply to enable")
            return 0

        enable_campaign(client, selected_customer, ai_campaign.resource_name)
        print(f"enabled\t{ai_campaign.id}\t{CAMPAIGN_NAME}")
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
