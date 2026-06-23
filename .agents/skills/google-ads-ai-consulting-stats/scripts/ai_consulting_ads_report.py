#!/usr/bin/env python3
"""Read-only AI consulting Google Ads performance report."""

from __future__ import annotations

import argparse
import json
import os
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from google.ads.googleads.client import GoogleAdsClient


CONFIG_PATH = os.getenv(
    "GOOGLE_ADS_CONFIG_PATH",
    "/Users/duncananderson/.codex/google-ads.yaml",
)
DEFAULT_CUSTOMER_ID = "1099427521"
DEFAULT_CAMPAIGN_ID = "23969798803"


def customer_id() -> str:
    return os.getenv("GOOGLE_ADS_CUSTOMER_ID", DEFAULT_CUSTOMER_ID).replace("-", "")


def money(micros: int | float) -> str:
    value = (Decimal(str(micros)) / Decimal("1000000")).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
    return f"CA${value}"


def pct(value: float) -> str:
    return f"{value * 100:.2f}%"


def ratio(numerator: int | float, denominator: int | float) -> float:
    return float(numerator) / float(denominator) if denominator else 0.0


def date_range(days: int) -> tuple[str, str]:
    end = date.today()
    start = end - timedelta(days=max(days - 1, 0))
    return start.isoformat(), end.isoformat()


def rows(client: GoogleAdsClient, selected_customer: str, query: str) -> list[Any]:
    service = client.get_service("GoogleAdsService")
    return list(service.search(customer_id=selected_customer, query=query))


def campaign_status(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign_id: str,
) -> dict[str, Any]:
    query = f"""
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.serving_status,
          campaign.primary_status,
          campaign.primary_status_reasons,
          campaign.advertising_channel_type,
          campaign_budget.amount_micros,
          campaign.network_settings.target_google_search,
          campaign.network_settings.target_search_network,
          campaign.network_settings.target_partner_search_network,
          campaign.network_settings.target_content_network
        FROM campaign
        WHERE campaign.id = {campaign_id}
        LIMIT 1
    """
    result = rows(client, selected_customer, query)
    if not result:
        raise SystemExit(f"Campaign not found: {campaign_id}")
    row = result[0]
    campaign = row.campaign
    network = campaign.network_settings
    return {
        "id": campaign.id,
        "name": campaign.name,
        "status": campaign.status.name,
        "serving_status": campaign.serving_status.name,
        "primary_status": campaign.primary_status.name,
        "primary_status_reasons": [
            reason.name for reason in campaign.primary_status_reasons
        ],
        "channel": campaign.advertising_channel_type.name,
        "daily_budget": money(row.campaign_budget.amount_micros),
        "networks": {
            "google_search": network.target_google_search,
            "search_network": network.target_search_network,
            "search_partners": network.target_partner_search_network,
            "display": network.target_content_network,
        },
    }


def campaign_metrics(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign_id: str,
    start: str,
    end: str,
) -> dict[str, Any]:
    query = f"""
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.all_conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE campaign.id = {campaign_id}
          AND segments.date BETWEEN '{start}' AND '{end}'
    """
    totals = {
        "impressions": 0,
        "clicks": 0,
        "cost_micros": 0,
        "conversions": 0.0,
        "all_conversions": 0.0,
    }
    for row in rows(client, selected_customer, query):
        metrics = row.metrics
        totals["impressions"] += metrics.impressions
        totals["clicks"] += metrics.clicks
        totals["cost_micros"] += metrics.cost_micros
        totals["conversions"] += metrics.conversions
        totals["all_conversions"] += metrics.all_conversions
    clicks = totals["clicks"]
    impressions = totals["impressions"]
    cost = totals["cost_micros"]
    conversions = totals["conversions"]
    return {
        **totals,
        "cost": money(cost),
        "ctr": pct(ratio(clicks, impressions)),
        "avg_cpc": money(ratio(cost, clicks)),
        "cost_per_conversion": money(ratio(cost, conversions)),
    }


def ad_status(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign_id: str,
) -> list[dict[str, Any]]:
    query = f"""
        SELECT
          ad_group.name,
          ad_group_ad.status,
          ad_group_ad.policy_summary.approval_status,
          ad_group_ad.policy_summary.review_status,
          ad_group_ad.policy_summary.policy_topic_entries,
          ad_group_ad.ad.id,
          ad_group_ad.ad.final_urls
        FROM ad_group_ad
        WHERE campaign.id = {campaign_id}
          AND ad_group_ad.status != REMOVED
        ORDER BY ad_group.name, ad_group_ad.ad.id
    """
    output = []
    for row in rows(client, selected_customer, query):
        ad = row.ad_group_ad
        output.append(
            {
                "ad_group": row.ad_group.name,
                "ad_id": ad.ad.id,
                "status": ad.status.name,
                "approval": ad.policy_summary.approval_status.name,
                "review": ad.policy_summary.review_status.name,
                "topics": [
                    entry.topic
                    for entry in ad.policy_summary.policy_topic_entries
                ],
                "urls": list(ad.ad.final_urls),
            }
        )
    return output


def table_metrics(
    client: GoogleAdsClient,
    selected_customer: str,
    query: str,
    label_getter,
) -> list[dict[str, Any]]:
    output = []
    for row in rows(client, selected_customer, query):
        metrics = row.metrics
        clicks = metrics.clicks
        impressions = metrics.impressions
        cost = metrics.cost_micros
        conversions = metrics.conversions
        output.append(
            {
                **label_getter(row),
                "impressions": impressions,
                "clicks": clicks,
                "cost": money(cost),
                "conversions": conversions,
                "ctr": pct(ratio(clicks, impressions)),
                "avg_cpc": money(ratio(cost, clicks)),
                "cost_per_conversion": money(ratio(cost, conversions)),
            }
        )
    return output


def ad_groups(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign_id: str,
    start: str,
    end: str,
) -> list[dict[str, Any]]:
    query = f"""
        SELECT
          ad_group.name,
          ad_group.status,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions
        FROM ad_group
        WHERE campaign.id = {campaign_id}
          AND segments.date BETWEEN '{start}' AND '{end}'
        ORDER BY metrics.cost_micros DESC
    """
    return table_metrics(
        client,
        selected_customer,
        query,
        lambda row: {"ad_group": row.ad_group.name, "status": row.ad_group.status.name},
    )


def keywords(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign_id: str,
    start: str,
    end: str,
) -> list[dict[str, Any]]:
    query = f"""
        SELECT
          ad_group.name,
          ad_group_criterion.status,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions
        FROM keyword_view
        WHERE campaign.id = {campaign_id}
          AND segments.date BETWEEN '{start}' AND '{end}'
        ORDER BY metrics.cost_micros DESC
        LIMIT 50
    """
    return table_metrics(
        client,
        selected_customer,
        query,
        lambda row: {
            "ad_group": row.ad_group.name,
            "keyword": row.ad_group_criterion.keyword.text,
            "match_type": row.ad_group_criterion.keyword.match_type.name,
            "status": row.ad_group_criterion.status.name,
        },
    )


def search_terms(
    client: GoogleAdsClient,
    selected_customer: str,
    campaign_id: str,
    start: str,
    end: str,
) -> list[dict[str, Any]]:
    query = f"""
        SELECT
          ad_group.name,
          search_term_view.search_term,
          search_term_view.status,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions
        FROM search_term_view
        WHERE campaign.id = {campaign_id}
          AND segments.date BETWEEN '{start}' AND '{end}'
        ORDER BY metrics.cost_micros DESC
        LIMIT 50
    """
    return table_metrics(
        client,
        selected_customer,
        query,
        lambda row: {
            "ad_group": row.ad_group.name,
            "search_term": row.search_term_view.search_term,
            "status": row.search_term_view.status.name,
        },
    )


def print_table(title: str, records: list[dict[str, Any]]) -> None:
    print(f"\n## {title}")
    if not records:
        print("No rows.")
        return
    keys = list(records[0].keys())
    print("\t".join(keys))
    for record in records:
        print("\t".join(str(record.get(key, "")) for key in keys))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=7)
    parser.add_argument("--campaign-id", default=DEFAULT_CAMPAIGN_ID)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    start, end = date_range(args.days)
    selected_customer = customer_id()
    client = GoogleAdsClient.load_from_storage(CONFIG_PATH)

    report = {
        "customer_id": selected_customer,
        "date_range": {"start": start, "end": end, "days": args.days},
        "campaign_status": campaign_status(
            client,
            selected_customer,
            args.campaign_id,
        ),
        "summary": campaign_metrics(
            client,
            selected_customer,
            args.campaign_id,
            start,
            end,
        ),
        "ad_status": ad_status(client, selected_customer, args.campaign_id),
        "ad_groups": ad_groups(client, selected_customer, args.campaign_id, start, end),
        "keywords": keywords(client, selected_customer, args.campaign_id, start, end),
        "search_terms": search_terms(
            client,
            selected_customer,
            args.campaign_id,
            start,
            end,
        ),
    }

    if args.json:
        print(json.dumps(report, indent=2))
        return 0

    print("# AI Consulting Google Ads Report")
    print(f"Customer: {selected_customer}")
    print(f"Date range: {start} to {end}")

    status = report["campaign_status"]
    print("\n## CAMPAIGN_STATUS")
    for key, value in status.items():
        print(f"{key}: {value}")

    summary = report["summary"]
    print("\n## SUMMARY")
    for key in [
        "cost",
        "impressions",
        "clicks",
        "ctr",
        "avg_cpc",
        "conversions",
        "all_conversions",
        "cost_per_conversion",
    ]:
        print(f"{key}: {summary[key]}")

    print_table("AD_STATUS", report["ad_status"])
    print_table("AD_GROUPS", report["ad_groups"])
    print_table("KEYWORDS", report["keywords"])
    print_table("SEARCH_TERMS", report["search_terms"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
