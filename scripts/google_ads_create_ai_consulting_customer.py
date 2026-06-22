"""Create the AI consulting Google Ads child customer under a manager account.

Default mode is validate-only. Use `--apply` to create the customer and print
the new customer resource name and id.
"""

from __future__ import annotations

import argparse
import os
import re

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException


CONFIG_PATH = os.getenv(
    "GOOGLE_ADS_CONFIG_PATH",
    "/Users/duncananderson/.codex/google-ads.yaml",
)
DEFAULT_MANAGER_CUSTOMER_ID = "2496704694"
DEFAULT_CUSTOMER_NAME = "Duncan Anderson AI Consulting"
DEFAULT_CURRENCY_CODE = "CAD"
DEFAULT_TIME_ZONE = "America/Toronto"


def normalize_customer_id(value: str) -> str:
    return re.sub(r"\D", "", value)


def build_customer(client: GoogleAdsClient, name: str) -> object:
    customer = client.get_type("Customer")
    customer.descriptive_name = name
    customer.currency_code = DEFAULT_CURRENCY_CODE
    customer.time_zone = DEFAULT_TIME_ZONE
    customer.contains_eu_political_advertising = (
        client.enums.EuPoliticalAdvertisingStatusEnum.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING
    )
    return customer


def create_customer_client(
    client: GoogleAdsClient,
    *,
    manager_customer_id: str,
    customer_name: str,
    validate_only: bool,
) -> object:
    service = client.get_service("CustomerService")
    request = client.get_type("CreateCustomerClientRequest")
    request.customer_id = manager_customer_id
    request.customer_client = build_customer(client, customer_name)
    request.validate_only = validate_only
    return service.create_customer_client(request=request)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manager-customer-id",
        default=os.getenv("GOOGLE_ADS_MANAGER_CUSTOMER_ID", DEFAULT_MANAGER_CUSTOMER_ID),
        help="Manager customer id that should own the new child account.",
    )
    parser.add_argument(
        "--customer-name",
        default=os.getenv("GOOGLE_ADS_AI_CONSULTING_CUSTOMER_NAME", DEFAULT_CUSTOMER_NAME),
        help="Descriptive name for the new Google Ads child customer.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Create the child customer. Defaults to validate-only.",
    )
    args = parser.parse_args()

    manager_customer_id = normalize_customer_id(args.manager_customer_id)
    validate_only = not args.apply
    print(f"Mode: {'VALIDATE_ONLY' if validate_only else 'APPLY'}")
    print(f"Manager customer: {manager_customer_id}")
    print(f"New customer name: {args.customer_name}")
    print(f"Currency: {DEFAULT_CURRENCY_CODE}")
    print(f"Time zone: {DEFAULT_TIME_ZONE}")

    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)
    try:
        response = create_customer_client(
            client,
            manager_customer_id=manager_customer_id,
            customer_name=args.customer_name,
            validate_only=validate_only,
        )
    except GoogleAdsException as exc:
        print("Google Ads customer creation failed:")
        for error in exc.failure.errors:
            print(f"- {error.message}")
        return 1

    if validate_only:
        print("Validate-only customer creation accepted.")
        return 0

    resource_name = response.resource_name
    new_customer_id = resource_name.rsplit("/", 1)[-1]
    print(f"Created customer resource: {resource_name}")
    print(f"Created customer id: {new_customer_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
