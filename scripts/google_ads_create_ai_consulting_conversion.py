"""Create or read the AI consulting lead-submit conversion action."""

from __future__ import annotations

import argparse
import os
import re
import sys

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException


CONFIG_PATH = os.getenv(
    "GOOGLE_ADS_CONFIG_PATH",
    "/Users/duncananderson/.codex/google-ads.yaml",
)
CONVERSION_NAME = os.getenv(
    "GOOGLE_ADS_AI_CONSULTING_CONVERSION_NAME",
    "AI Consulting Lead Submit",
)


def customer_id() -> str:
    value = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    if not value:
        raise SystemExit(
            "GOOGLE_ADS_CUSTOMER_ID is required. "
            "Set it to the AI consulting Google Ads customer id before running.",
        )
    return value.replace("-", "")


def extract_send_to(event_snippet: str) -> str:
    match = re.search(r"send_to['\"]?\s*:\s*['\"]([^'\"]+)['\"]", event_snippet)
    return match.group(1) if match else ""


def find_conversion_action(
    client: GoogleAdsClient,
    selected_customer: str,
) -> tuple[str, str, str] | None:
    service = client.get_service("GoogleAdsService")
    escaped_name = CONVERSION_NAME.replace("'", "\\'")
    query = f"""
        SELECT
          conversion_action.resource_name,
          conversion_action.name,
          conversion_action.status,
          conversion_action.tag_snippets
        FROM conversion_action
        WHERE conversion_action.name = '{escaped_name}'
          AND conversion_action.status != REMOVED
        LIMIT 1
    """
    rows = list(service.search(customer_id=selected_customer, query=query))
    if not rows:
        return None

    action = rows[0].conversion_action
    send_to = ""
    for snippet in action.tag_snippets:
        send_to = extract_send_to(snippet.event_snippet)
        if send_to:
            break
    return action.resource_name, action.status.name, send_to


def create_conversion_action(
    client: GoogleAdsClient,
    selected_customer: str,
    *,
    validate_only: bool,
) -> str:
    service = client.get_service("ConversionActionService")
    operation = client.get_type("ConversionActionOperation")
    action = operation.create
    action.name = CONVERSION_NAME
    action.type_ = client.enums.ConversionActionTypeEnum.WEBPAGE
    action.category = client.enums.ConversionActionCategoryEnum.SUBMIT_LEAD_FORM
    action.status = client.enums.ConversionActionStatusEnum.ENABLED
    action.value_settings.default_value = 0
    action.value_settings.always_use_default_value = True
    action.counting_type = client.enums.ConversionActionCountingTypeEnum.ONE_PER_CLICK
    action.click_through_lookback_window_days = 30
    action.view_through_lookback_window_days = 1

    response = service.mutate_conversion_actions(
        request={
            "customer_id": selected_customer,
            "operations": [operation],
            "validate_only": validate_only,
        }
    )
    if validate_only:
        return "validate-only"
    return response.results[0].resource_name


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Create the conversion action if it does not already exist.",
    )
    args = parser.parse_args()

    selected_customer = customer_id()
    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)

    try:
        existing = find_conversion_action(client, selected_customer)
        if existing:
            resource_name, status, send_to = existing
            print(f"existing\t{resource_name}\tstatus={status}\tsend_to={send_to}")
            return 0

        resource_name = create_conversion_action(
            client,
            selected_customer,
            validate_only=not args.apply,
        )
        if not args.apply:
            print("validate-only\tconversion action mutation accepted")
            return 0

        created = find_conversion_action(client, selected_customer)
        if not created:
            print(f"created\t{resource_name}\tsend_to=(not yet available)")
            return 0
        _, status, send_to = created
        print(f"created\t{resource_name}\tstatus={status}\tsend_to={send_to}")
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
