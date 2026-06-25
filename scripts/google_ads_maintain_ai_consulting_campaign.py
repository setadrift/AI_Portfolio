"""Maintain the AI consulting Google Ads campaign.

Default mode is validate-only. `--apply` mutates the existing campaign by:

- setting the daily campaign budget;
- adding campaign-level negative keywords for known low-quality traffic.
"""

from __future__ import annotations

import argparse
import os

from google.ads.googleads.client import GoogleAdsClient


CONFIG_PATH = os.getenv(
    "GOOGLE_ADS_CONFIG_PATH",
    "/Users/duncananderson/.codex/google-ads.yaml",
)
CAMPAIGN_NAME = "Search | AI Consulting | Exact/Phrase"
DEFAULT_DAILY_BUDGET_CAD = float(
    os.getenv("GOOGLE_ADS_AI_CONSULTING_DAILY_BUDGET_CAD", "40.00")
)


NEGATIVE_KEYWORDS: tuple[tuple[str, str, str], ...] = (
    ("thermostat", "PHRASE", "Avoid HVAC hardware/control searches."),
    ("honeywell", "PHRASE", "Avoid HVAC hardware/control searches."),
    ("schneider", "PHRASE", "Avoid HVAC hardware/control searches."),
    ("hvac controls", "PHRASE", "Avoid HVAC controls searches."),
    ("controls", "PHRASE", "Avoid building-control hardware searches."),
    ("m847a1031", "PHRASE", "Avoid Honeywell part-number searches."),
    ("sensor", "PHRASE", "Avoid HVAC hardware searches."),
    ("actuator", "PHRASE", "Avoid HVAC hardware searches."),
    ("valve", "PHRASE", "Avoid HVAC hardware searches."),
    ("building automation", "PHRASE", "Avoid HVAC/building controls searches."),
    ("i vu", "PHRASE", "Avoid building automation system searches."),
    ("zonex", "PHRASE", "Avoid HVAC hardware brand searches."),
    ("digitract", "PHRASE", "Avoid HVAC hardware brand searches."),
    ("smb market", "PHRASE", "Avoid unrelated SMB market searches."),
    ("smbmarket", "PHRASE", "Avoid unrelated SMB market searches."),
    ("ai hvac", "PHRASE", "Avoid broad HVAC AI research/hardware searches."),
    ("ai for hvac", "PHRASE", "Avoid broad HVAC AI research/hardware searches."),
    ("hvac monitoring", "PHRASE", "Avoid HVAC monitoring hardware searches."),
    ("building ddc", "PHRASE", "Avoid building controls searches."),
    ("tcc thermostat", "PHRASE", "Avoid thermostat hardware searches."),
    ("clio grow", "PHRASE", "Avoid legal CRM/software brand searches."),
    ("deloitte", "PHRASE", "Avoid enterprise consultancy brand searches."),
    ("ey", "PHRASE", "Avoid enterprise consultancy brand searches."),
    ("quantum black", "PHRASE", "Avoid enterprise consultancy brand searches."),
    ("synquery", "PHRASE", "Avoid competitor/software brand searches."),
    ("falcocut", "PHRASE", "Avoid competitor/software brand searches."),
    ("blackbook ai", "PHRASE", "Avoid competitor/software brand searches."),
    ("composio", "PHRASE", "Avoid developer tool searches."),
    ("twin ai", "PHRASE", "Avoid competitor/software brand searches."),
    ("artinus", "PHRASE", "Avoid unrelated company searches."),
    ("xennial", "PHRASE", "Avoid unrelated company searches."),
    ("what is", "PHRASE", "Avoid research-only definition searches."),
    ("how to start", "PHRASE", "Avoid aspiring-consultant searches."),
    ("how to create", "PHRASE", "Avoid DIY tutorial searches."),
    ("how to make", "PHRASE", "Avoid DIY tutorial searches."),
    ("tutorial", "PHRASE", "Avoid how-to searches."),
    ("template", "PHRASE", "Avoid template searches."),
    ("course", "PHRASE", "Avoid training/course searches."),
    ("training", "PHRASE", "Avoid training/course searches."),
    ("jobs", "PHRASE", "Avoid job searches."),
    ("career", "PHRASE", "Avoid career searches."),
    ("salary", "PHRASE", "Avoid career research searches."),
    ("make ai", "PHRASE", "Avoid DIY/tool searches."),
    ("ai automation tools", "PHRASE", "Avoid software/tool research searches."),
    ("ai automation va", "PHRASE", "Avoid virtual assistant job/service searches."),
    ("ai content automation", "PHRASE", "Avoid content tool searches."),
    ("ai development workflow", "PHRASE", "Avoid developer workflow searches."),
    ("ai flow", "PHRASE", "Avoid generic software/tool searches."),
    ("ai orchestration", "PHRASE", "Avoid developer infrastructure searches."),
    ("browser automation", "PHRASE", "Avoid technical tooling searches."),
    ("ai wire bot", "PHRASE", "Avoid unrelated bot searches."),
    ("flowd", "PHRASE", "Avoid software brand searches."),
    ("ingest workflow", "PHRASE", "Avoid data engineering searches."),
    ("leap ai", "PHRASE", "Avoid software/tool brand searches."),
)


def customer_id() -> str:
    value = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    if not value:
        raise SystemExit("GOOGLE_ADS_CUSTOMER_ID is required.")
    return value.replace("-", "")


def rows(client: GoogleAdsClient, selected_customer: str, query: str) -> list[object]:
    service = client.get_service("GoogleAdsService")
    return list(service.search(customer_id=selected_customer, query=query))


def campaign_details(
    client: GoogleAdsClient,
    selected_customer: str,
) -> tuple[str, str, int]:
    escaped_name = CAMPAIGN_NAME.replace("'", "\\'")
    result = rows(
        client,
        selected_customer,
        f"""
        SELECT
          campaign.resource_name,
          campaign_budget.resource_name,
          campaign_budget.amount_micros
        FROM campaign
        WHERE campaign.name = '{escaped_name}'
          AND campaign.status != REMOVED
        LIMIT 1
        """,
    )
    if not result:
        raise SystemExit(f"Campaign not found: {CAMPAIGN_NAME}")

    row = result[0]
    return (
        row.campaign.resource_name,
        row.campaign_budget.resource_name,
        row.campaign_budget.amount_micros,
    )


def existing_negative_keywords(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
) -> set[tuple[str, str]]:
    result = rows(
        client,
        selected_customer,
        f"""
        SELECT
          campaign_criterion.keyword.text,
          campaign_criterion.keyword.match_type
        FROM campaign_criterion
        WHERE campaign.resource_name = '{campaign}'
          AND campaign_criterion.negative = TRUE
          AND campaign_criterion.status != REMOVED
        """,
    )
    return {
        (
            row.campaign_criterion.keyword.text.lower(),
            row.campaign_criterion.keyword.match_type.name,
        )
        for row in result
    }


def keyword_match_type(client: GoogleAdsClient, name: str) -> int:
    return getattr(client.enums.KeywordMatchTypeEnum, name)


def wrap(client: GoogleAdsClient, operation: object) -> object:
    mutate_operation = client.get_type("MutateOperation")
    name = operation.__class__.__name__
    if name == "CampaignBudgetOperation":
        mutate_operation.campaign_budget_operation = operation
    elif name == "CampaignCriterionOperation":
        mutate_operation.campaign_criterion_operation = operation
    else:
        raise TypeError(f"Unsupported operation type: {name}")
    return mutate_operation


def update_budget_operation(
    client: GoogleAdsClient,
    budget_resource: str,
    amount_micros: int,
) -> object:
    operation = client.get_type("CampaignBudgetOperation")
    operation.update.resource_name = budget_resource
    operation.update.amount_micros = amount_micros
    operation.update_mask.paths.append("amount_micros")
    return operation


def create_campaign_negative_keyword_operation(
    client: GoogleAdsClient,
    campaign: str,
    text: str,
    match_type: str,
) -> object:
    operation = client.get_type("CampaignCriterionOperation")
    criterion = operation.create
    criterion.campaign = campaign
    criterion.negative = True
    criterion.keyword.text = text
    criterion.keyword.match_type = keyword_match_type(client, match_type)
    return operation


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


def build_operations(
    client: GoogleAdsClient,
    selected_customer: str,
    *,
    budget_cad: float,
) -> list[object]:
    campaign, budget_resource, current_budget_micros = campaign_details(
        client,
        selected_customer,
    )
    target_budget_micros = int(budget_cad * 1_000_000)
    existing_negatives = existing_negative_keywords(client, selected_customer, campaign)
    operations: list[object] = []

    current_budget = current_budget_micros / 1_000_000
    print(f"current_budget\tCA${current_budget:.2f}")
    print(f"target_budget\tCA${budget_cad:.2f}")
    if current_budget_micros != target_budget_micros:
        print(f"set_budget\tCA${current_budget:.2f}->CA${budget_cad:.2f}")
        operations.append(
            wrap(
                client,
                update_budget_operation(
                    client,
                    budget_resource,
                    target_budget_micros,
                ),
            )
        )
    else:
        print("budget_exists\ttarget already set")

    for text, match_type, reason in NEGATIVE_KEYWORDS:
        key = (text.lower(), match_type)
        if key in existing_negatives:
            print(f"negative_exists\t{match_type}\t{text}")
            continue
        print(f"add_negative\t{match_type}\t{text}\t{reason}")
        operations.append(
            wrap(
                client,
                create_campaign_negative_keyword_operation(
                    client,
                    campaign,
                    text,
                    match_type,
                ),
            )
        )

    return operations


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument(
        "--budget-cad",
        type=float,
        default=DEFAULT_DAILY_BUDGET_CAD,
        help="Target daily budget in CAD. Defaults to CA$40.",
    )
    args = parser.parse_args()

    selected_customer = customer_id()
    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)
    operations = build_operations(
        client,
        selected_customer,
        budget_cad=args.budget_cad,
    )
    mutate(client, selected_customer, operations, validate_only=not args.apply)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
