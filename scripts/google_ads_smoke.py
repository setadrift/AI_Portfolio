"""Smoke-test local Google Ads API access for AI Portfolio.

This script is intentionally read-only. It validates that the local OAuth
config can load and that the selected customer can be queried.
"""

from __future__ import annotations

import os
import sys

from google.ads.googleads.client import GoogleAdsClient


CONFIG_PATH = os.getenv(
    "GOOGLE_ADS_CONFIG_PATH",
    "/Users/duncananderson/.codex/google-ads.yaml",
)


def customer_id() -> str:
    value = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    if not value:
        raise SystemExit(
            "GOOGLE_ADS_CUSTOMER_ID is required. "
            "Set it to the AI consulting Google Ads customer id before running.",
        )
    return value.replace("-", "")


def main() -> int:
    selected_customer = customer_id()
    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)
    service = client.get_service("GoogleAdsService")
    query = """
        SELECT
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone,
          customer.auto_tagging_enabled,
          customer.conversion_tracking_setting.conversion_tracking_status
        FROM customer
        LIMIT 1
    """
    rows = list(service.search(customer_id=selected_customer, query=query))
    if not rows:
        print("No customer row returned.", file=sys.stderr)
        return 1

    customer = rows[0].customer
    print(
        "\t".join(
            [
                str(customer.id),
                customer.descriptive_name or "(unnamed)",
                customer.currency_code,
                customer.time_zone,
                f"auto_tagging={customer.auto_tagging_enabled}",
                f"conversion_tracking={customer.conversion_tracking_setting.conversion_tracking_status.name}",
            ],
        ),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
