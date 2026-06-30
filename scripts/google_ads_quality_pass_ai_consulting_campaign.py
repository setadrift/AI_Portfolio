"""Tighten AI consulting Google Ads traffic quality.

Default mode is validate-only. `--apply` mutates the existing campaign by:

- adding campaign-level negative keywords for junk branded/software/hardware/research terms;
- pausing broad-match keywords in the broad workflow automation ad group;
- lowering that broad workflow automation ad group's CPC bid so budget can shift
  toward higher-intent exact/phrase and vertical ad groups.
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
BROAD_WORKFLOW_AD_GROUP = "Workflow Automation - Broader Test"
BROAD_WORKFLOW_TARGET_CPC_MICROS = int(
    float(os.getenv("GOOGLE_ADS_BROAD_WORKFLOW_MAX_CPC_CAD", "3.00")) * 1_000_000
)


@dataclass(frozen=True)
class NegativeKeyword:
    text: str
    match_type: str
    reason: str


NEGATIVE_KEYWORDS: tuple[NegativeKeyword, ...] = (
    # Branded/company/software terms from the latest search-term report.
    NegativeKeyword("clearview", "PHRASE", "Avoid unrelated software/company searches."),
    NegativeKeyword("ats testing tool", "PHRASE", "Avoid ATS software/tool searches."),
    NegativeKeyword("ats tester", "PHRASE", "Avoid job-seeker ATS checker searches."),
    NegativeKeyword("ats cv test", "PHRASE", "Avoid job-seeker ATS checker searches."),
    NegativeKeyword("ats checker", "PHRASE", "Avoid job-seeker ATS checker searches."),
    NegativeKeyword("ats parser checker", "PHRASE", "Avoid job-seeker ATS checker searches."),
    NegativeKeyword("ats resume checker", "PHRASE", "Avoid job-seeker ATS checker searches."),
    NegativeKeyword("ats resume scanner", "PHRASE", "Avoid job-seeker ATS checker searches."),
    NegativeKeyword("ats scanner", "PHRASE", "Avoid job-seeker ATS checker searches."),
    NegativeKeyword("resume analyzer", "PHRASE", "Avoid job-seeker resume analysis searches."),
    NegativeKeyword("resume analysis", "PHRASE", "Avoid job-seeker resume analysis searches."),
    NegativeKeyword("automatic resume reader", "PHRASE", "Avoid resume-tool searches."),
    NegativeKeyword("online resume ats score checker", "PHRASE", "Avoid job-seeker ATS checker searches."),
    NegativeKeyword("resume ats scanner", "PHRASE", "Avoid job-seeker ATS checker searches."),
    NegativeKeyword("resume scanner", "PHRASE", "Avoid job-seeker resume scanner searches."),
    NegativeKeyword("resume checker score", "PHRASE", "Avoid job-seeker ATS checker searches."),
    NegativeKeyword("resume checker score ai", "PHRASE", "Avoid job-seeker ATS checker searches."),
    NegativeKeyword("ats software", "PHRASE", "Avoid ATS software/tool searches."),
    NegativeKeyword("newhire hiretech", "PHRASE", "Avoid unrelated software/company searches."),
    NegativeKeyword("newhire hiretech com", "PHRASE", "Avoid unrelated software/company searches."),
    NegativeKeyword("indeed ats scanner", "PHRASE", "Avoid job-seeker ATS checker searches."),
    NegativeKeyword("falcocut", "PHRASE", "Avoid unrelated software/company searches."),
    NegativeKeyword("falcocut ai", "PHRASE", "Avoid unrelated software/company searches."),
    NegativeKeyword("8n8", "PHRASE", "Avoid unrelated tool/typo searches."),
    NegativeKeyword("easyerp", "PHRASE", "Avoid unrelated software/company searches."),
    NegativeKeyword("easyerp ai", "PHRASE", "Avoid unrelated software/company searches."),
    NegativeKeyword("flux context", "PHRASE", "Avoid unrelated AI image workflow searches."),
    NegativeKeyword("flux context workflows", "PHRASE", "Avoid unrelated AI image workflow searches."),
    NegativeKeyword("comfyui", "PHRASE", "Avoid AI image workflow searches."),
    NegativeKeyword("workflow comfyui", "PHRASE", "Avoid AI image workflow searches."),
    NegativeKeyword("z image turbo", "PHRASE", "Avoid AI image workflow searches."),
    NegativeKeyword("z image turbo workflow", "PHRASE", "Avoid AI image workflow searches."),
    NegativeKeyword("sesami ai", "PHRASE", "Avoid unrelated software/company searches."),
    NegativeKeyword("deccan", "PHRASE", "Avoid unrelated company searches."),
    NegativeKeyword("outlier ai", "PHRASE", "Avoid unrelated AI company searches."),
    NegativeKeyword("edge ai", "PHRASE", "Avoid unrelated company/edge-computing searches."),
    NegativeKeyword("airm", "PHRASE", "Avoid unrelated company searches."),
    NegativeKeyword("aiva consulting", "PHRASE", "Avoid unrelated company searches."),
    NegativeKeyword("bridge ai", "PHRASE", "Avoid unrelated company searches."),
    NegativeKeyword("artinus", "PHRASE", "Avoid unrelated company searches."),
    NegativeKeyword("systematiq ai", "PHRASE", "Avoid unrelated company searches."),
    NegativeKeyword("xennial", "PHRASE", "Avoid unrelated company searches."),
    NegativeKeyword("archy dental", "PHRASE", "Avoid dental software brand searches."),
    NegativeKeyword("archy dental software", "PHRASE", "Avoid dental software brand searches."),
    NegativeKeyword("curve dental", "PHRASE", "Avoid dental software brand searches."),
    NegativeKeyword("curve dental software", "PHRASE", "Avoid dental software brand searches."),
    NegativeKeyword("dentrix", "PHRASE", "Avoid dental software brand searches."),
    NegativeKeyword("dentrix charting", "PHRASE", "Avoid dental software brand searches."),
    NegativeKeyword("dentrix software", "PHRASE", "Avoid dental software brand searches."),
    NegativeKeyword("paradigm dental", "PHRASE", "Avoid dental software brand searches."),
    NegativeKeyword("paradigm dental software", "PHRASE", "Avoid dental software brand searches."),
    NegativeKeyword("aesthetic pro", "PHRASE", "Avoid med-spa software brand searches."),
    NegativeKeyword("aesthetics pro", "PHRASE", "Avoid med-spa software brand searches."),
    NegativeKeyword("aestheticspro", "PHRASE", "Avoid med-spa software brand searches."),
    NegativeKeyword("myaestheticspro", "PHRASE", "Avoid med-spa software brand searches."),
    NegativeKeyword("rezscore pro", "PHRASE", "Avoid resume-scoring software searches."),
    NegativeKeyword("smb market canada", "PHRASE", "Avoid unrelated SMB market searches."),
    NegativeKeyword("smbmarket", "PHRASE", "Avoid unrelated SMB market searches."),
    # Hardware/building-control terms still leaking through HVAC automation.
    NegativeKeyword("honeywell m847a1031", "PHRASE", "Avoid Honeywell part-number searches."),
    NegativeKeyword("zonex digitract", "PHRASE", "Avoid HVAC hardware brand searches."),
    NegativeKeyword("ddc system", "PHRASE", "Avoid building-control system searches."),
    NegativeKeyword("building ddc system", "PHRASE", "Avoid building-control system searches."),
    NegativeKeyword("i vu building automation", "PHRASE", "Avoid HVAC/building automation hardware searches."),
    NegativeKeyword("hvac building automation", "PHRASE", "Avoid HVAC/building-control hardware searches."),
    NegativeKeyword("hvac monitoring system", "PHRASE", "Avoid monitoring hardware searches."),
    NegativeKeyword("hvac plc", "PHRASE", "Avoid HVAC controls/programming searches."),
    NegativeKeyword("hvac programming", "PHRASE", "Avoid HVAC controls/programming searches."),
    NegativeKeyword("right suite", "PHRASE", "Avoid HVAC design software searches."),
    NegativeKeyword("right suite universal", "PHRASE", "Avoid HVAC design software searches."),
    NegativeKeyword("smart hvac control systems", "PHRASE", "Avoid HVAC controls hardware searches."),
    NegativeKeyword("wrightsoft", "PHRASE", "Avoid HVAC design software searches."),
    NegativeKeyword("wrightsoft duct design", "PHRASE", "Avoid HVAC design software searches."),
    # Legal software, AI tools, and time-tracking brands.
    NegativeKeyword("8am mycase", "PHRASE", "Avoid legal software brand searches."),
    NegativeKeyword("clio", "PHRASE", "Avoid legal software brand searches."),
    NegativeKeyword("clio grow", "PHRASE", "Avoid legal software brand searches."),
    NegativeKeyword("clio law software", "PHRASE", "Avoid legal software brand searches."),
    NegativeKeyword("harvey ai", "PHRASE", "Avoid legal AI software brand searches."),
    NegativeKeyword("lawyer time tracking", "PHRASE", "Avoid legal software/tool searches."),
    NegativeKeyword("lawy", "PHRASE", "Avoid unrelated legal tool searches."),
    NegativeKeyword("migratrack", "PHRASE", "Avoid legal software brand searches."),
    NegativeKeyword("vincent ai", "PHRASE", "Avoid legal AI software brand searches."),
    # Research, DIY, and consultant-career intent.
    NegativeKeyword("workflow dashboard design", "PHRASE", "Avoid dashboard-design search intent."),
    NegativeKeyword("ai business mentor", "PHRASE", "Avoid coaching/mentor searches."),
    NegativeKeyword("ai impact on consulting industry", "PHRASE", "Avoid research-only searches."),
    NegativeKeyword("freelance ai consultant", "PHRASE", "Avoid supplier/career searches."),
    NegativeKeyword("machine learning engineer consultant", "PHRASE", "Avoid ML staffing/vendor searches."),
    NegativeKeyword("what does an ai consultant do", "PHRASE", "Avoid definition searches."),
    NegativeKeyword("what is a ai consultant", "PHRASE", "Avoid definition searches."),
    NegativeKeyword("what is an ai consultant", "PHRASE", "Avoid definition searches."),
    NegativeKeyword("what is ai consulting", "PHRASE", "Avoid definition searches."),
    NegativeKeyword("how to start an ai consulting business", "PHRASE", "Avoid aspiring-consultant searches."),
)


def customer_id() -> str:
    value = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    if not value:
        raise SystemExit("GOOGLE_ADS_CUSTOMER_ID is required.")
    return value.replace("-", "")


def rows(client: GoogleAdsClient, selected_customer: str, query: str) -> list[object]:
    service = client.get_service("GoogleAdsService")
    return list(service.search(customer_id=selected_customer, query=query))


def keyword_match_type(client: GoogleAdsClient, name: str) -> int:
    return getattr(client.enums.KeywordMatchTypeEnum, name)


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


def broad_workflow_ad_group(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
) -> object:
    escaped_name = BROAD_WORKFLOW_AD_GROUP.replace("'", "\\'")
    result = rows(
        client,
        selected_customer,
        f"""
        SELECT ad_group.resource_name, ad_group.name, ad_group.cpc_bid_micros
        FROM ad_group
        WHERE campaign.resource_name = '{campaign}'
          AND ad_group.name = '{escaped_name}'
          AND ad_group.status != REMOVED
        LIMIT 1
        """,
    )
    if not result:
        raise SystemExit(f"Ad group not found: {BROAD_WORKFLOW_AD_GROUP}")
    return result[0].ad_group


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


def enabled_broad_workflow_keywords(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign: str,
) -> list[object]:
    escaped_name = BROAD_WORKFLOW_AD_GROUP.replace("'", "\\'")
    return rows(
        client,
        selected_customer,
        f"""
        SELECT
          ad_group_criterion.resource_name,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.status
        FROM keyword_view
        WHERE campaign.resource_name = '{campaign}'
          AND ad_group.name = '{escaped_name}'
          AND ad_group_criterion.status = ENABLED
          AND ad_group_criterion.keyword.match_type = BROAD
        """,
    )


def wrap(client: GoogleAdsClient, operation: object) -> object:
    mutate_operation = client.get_type("MutateOperation")
    name = operation.__class__.__name__
    if name == "CampaignCriterionOperation":
        mutate_operation.campaign_criterion_operation = operation
    elif name == "AdGroupCriterionOperation":
        mutate_operation.ad_group_criterion_operation = operation
    elif name == "AdGroupOperation":
        mutate_operation.ad_group_operation = operation
    else:
        raise TypeError(f"Unsupported operation type: {name}")
    return mutate_operation


def create_campaign_negative_keyword_operation(
    client: GoogleAdsClient,
    campaign: str,
    negative: NegativeKeyword,
) -> object:
    operation = client.get_type("CampaignCriterionOperation")
    criterion = operation.create
    criterion.campaign = campaign
    criterion.negative = True
    criterion.keyword.text = negative.text
    criterion.keyword.match_type = keyword_match_type(client, negative.match_type)
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
    ad_group = broad_workflow_ad_group(client, selected_customer, campaign)
    existing_negatives = existing_negative_keywords(client, selected_customer, campaign)
    operations: list[object] = []

    for negative in NEGATIVE_KEYWORDS:
        key = (negative.text.lower(), negative.match_type)
        if key in existing_negatives:
            print(f"negative_exists\t{negative.match_type}\t{negative.text}")
            continue
        print(f"add_negative\t{negative.match_type}\t{negative.text}\t{negative.reason}")
        operations.append(
            wrap(client, create_campaign_negative_keyword_operation(client, campaign, negative))
        )

    for row in enabled_broad_workflow_keywords(client, selected_customer, campaign):
        keyword = row.ad_group_criterion.keyword
        print(f"pause_broad_keyword\t{keyword.match_type.name}\t{keyword.text}")
        operations.append(
            wrap(client, pause_keyword_operation(client, row.ad_group_criterion.resource_name))
        )

    current_cpc = ad_group.cpc_bid_micros / 1_000_000
    target_cpc = BROAD_WORKFLOW_TARGET_CPC_MICROS / 1_000_000
    if ad_group.cpc_bid_micros != BROAD_WORKFLOW_TARGET_CPC_MICROS:
        print(
            f"set_broad_workflow_cpc\t{BROAD_WORKFLOW_AD_GROUP}\t"
            f"CA${current_cpc:.2f}->CA${target_cpc:.2f}"
        )
        operations.append(
            wrap(
                client,
                update_ad_group_bid_operation(
                    client,
                    ad_group.resource_name,
                    BROAD_WORKFLOW_TARGET_CPC_MICROS,
                ),
            )
        )
    else:
        print(f"broad_workflow_cpc_exists\tCA${target_cpc:.2f}")

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
            print(f"- {error.error_code}: {error.message}")
        raise SystemExit(1)
