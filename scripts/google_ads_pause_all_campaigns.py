"""Pause every non-removed enabled Google Ads campaign for the selected account."""

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
          campaign.advertising_channel_type
        FROM campaign
        WHERE campaign.status != REMOVED
        ORDER BY campaign.name
    """
    return list(service.search(customer_id=selected_customer, query=query))


def pause_operations(client: GoogleAdsClient, rows: list[object]) -> list[object]:
    operations = []
    for row in rows:
        campaign = row.campaign
        if campaign.status.name != "ENABLED":
            continue
        operation = client.get_type("CampaignOperation")
        update = operation.update
        update.resource_name = campaign.resource_name
        update.status = client.enums.CampaignStatusEnum.PAUSED
        operation.update_mask.paths.append("status")
        operations.append(operation)
    return operations


def mutate(
    client: GoogleAdsClient,
    selected_customer: str,
    operations: list[object],
    *,
    validate_only: bool,
) -> None:
    if not operations:
        print("No enabled campaigns to pause.")
        return

    service = client.get_service("CampaignService")
    response = service.mutate_campaigns(
        request={
            "customer_id": selected_customer,
            "operations": operations,
            "validate_only": validate_only,
        }
    )
    mode = "validated" if validate_only else "paused"
    for result in response.results:
        print(f"{mode}\t{result.resource_name}")


def print_campaigns(rows: list[object], *, label: str) -> None:
    print(f"## {label}")
    for row in rows:
        campaign = row.campaign
        print(
            "\t".join(
                [
                    str(campaign.id),
                    campaign.name,
                    campaign.status.name,
                    campaign.advertising_channel_type.name,
                ]
            )
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    selected_customer = customer_id()
    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)

    try:
        before = campaigns(client, selected_customer)
        print_campaigns(before, label="BEFORE")

        operations = pause_operations(client, before)
        mutate(
            client,
            selected_customer,
            operations,
            validate_only=not args.apply,
        )

        if args.apply:
            after = campaigns(client, selected_customer)
            print_campaigns(after, label="AFTER")

    except GoogleAdsException as ex:
        print(f"Google Ads request failed: {ex.failure}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
