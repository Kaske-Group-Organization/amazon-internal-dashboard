"""
Amazon Selling Partner API Fetcher
Holt: Umsatz, Bestellungen, FBA-Inventory
"""

import os
import json
import time
import logging
import requests
from datetime import datetime, timedelta, timezone
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


# ── Konfiguration aus Environment Variables ────────────────────────────────────

SP_CLIENT_ID       = os.environ["SP_CLIENT_ID"]
SP_CLIENT_SECRET   = os.environ["SP_CLIENT_SECRET"]
SP_REFRESH_TOKEN   = os.environ["SP_REFRESH_TOKEN"]
SP_MARKETPLACE_ID  = os.environ.get("SP_MARKETPLACE_ID", "A1PA6795UKMFR9")  # DE
SP_SELLER_ID       = os.environ["SP_SELLER_ID"]

LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token"
SP_API_BASE   = "https://sellingpartnerapi-eu.amazon.com"


# ── LWA Token ─────────────────────────────────────────────────────────────────

def get_access_token() -> str:
    """Holt einen frischen LWA Access Token."""
    log.info("Hole LWA Access Token...")
    resp = requests.post(LWA_TOKEN_URL, data={
        "grant_type":    "refresh_token",
        "refresh_token": SP_REFRESH_TOKEN,
        "client_id":     SP_CLIENT_ID,
        "client_secret": SP_CLIENT_SECRET,
    })
    resp.raise_for_status()
    token = resp.json()["access_token"]
    log.info("Access Token erhalten.")
    return token


def sp_headers(token: str) -> dict:
    return {
        "x-amz-access-token": token,
        "Content-Type": "application/json",
    }


# ── Report erstellen & herunterladen ──────────────────────────────────────────

def create_report(token: str, report_type: str, start: str, end: str) -> str:
    """Erstellt einen SP-API Report und gibt die reportId zurück."""
    log.info(f"Erstelle Report: {report_type} ({start} → {end})")
    url = f"{SP_API_BASE}/reports/2021-06-30/reports"
    payload = {
        "reportType":      report_type,
        "marketplaceIds":  [SP_MARKETPLACE_ID],
        "dataStartTime":   start,
        "dataEndTime":     end,
    }
    resp = requests.post(url, headers=sp_headers(token), json=payload)
    resp.raise_for_status()
    report_id = resp.json()["reportId"]
    log.info(f"Report erstellt: {report_id}")
    return report_id


def wait_for_report(token: str, report_id: str, max_wait: int = 300) -> str:
    """Wartet bis der Report fertig ist und gibt die documentId zurück."""
    url = f"{SP_API_BASE}/reports/2021-06-30/reports/{report_id}"
    waited = 0
    while waited < max_wait:
        resp = requests.get(url, headers=sp_headers(token))
        resp.raise_for_status()
        data = resp.json()
        status = data["processingStatus"]
        log.info(f"Report {report_id} Status: {status} ({waited}s)")

        if status == "DONE":
            return data["reportDocumentId"]
        if status in ("CANCELLED", "FATAL"):
            raise RuntimeError(f"Report {report_id} fehlgeschlagen: {status}")

        time.sleep(15)
        waited += 15

    raise TimeoutError(f"Report {report_id} nach {max_wait}s noch nicht fertig.")


def download_report(token: str, document_id: str) -> list[dict]:
    """Lädt das Report-Dokument herunter und gibt es als Liste zurück."""
    url = f"{SP_API_BASE}/reports/2021-06-30/documents/{document_id}"
    resp = requests.get(url, headers=sp_headers(token))
    resp.raise_for_status()
    doc = resp.json()

    # Dokument-URL abrufen (ggf. komprimiert)
    doc_resp = requests.get(doc["url"])
    doc_resp.raise_for_status()

    # TSV → Liste von Dicts
    lines = doc_resp.text.strip().split("\n")
    if len(lines) < 2:
        log.warning(f"Report {document_id} ist leer.")
        return []

    headers = lines[0].split("\t")
    rows = [dict(zip(headers, line.split("\t"))) for line in lines[1:]]
    log.info(f"Report geladen: {len(rows)} Zeilen.")
    return rows


# ── FBA Inventory ─────────────────────────────────────────────────────────────

def fetch_inventory(token: str) -> list[dict]:
    """Holt aktuellen FBA-Inventory-Status."""
    log.info("Hole FBA Inventory...")
    url = f"{SP_API_BASE}/fba/inventory/v1/summaries"
    params = {
        "details":        "true",
        "granularityType": "Marketplace",
        "granularityId":  SP_MARKETPLACE_ID,
        "marketplaceIds": SP_MARKETPLACE_ID,
    }
    items = []
    next_token = None

    while True:
        if next_token:
            params["nextToken"] = next_token

        resp = requests.get(url, headers=sp_headers(token), params=params)
        resp.raise_for_status()
        data = resp.json()

        summaries = data.get("payload", {}).get("inventorySummaries", [])
        items.extend(summaries)

        next_token = data.get("payload", {}).get("pagination", {}).get("nextToken")
        if not next_token:
            break

    log.info(f"Inventory geladen: {len(items)} ASINs.")
    return items


# ── Bestellungen ──────────────────────────────────────────────────────────────

def fetch_orders(token: str, days: int = 30) -> list[dict]:
    """Holt Bestellungen der letzten N Tage."""
    log.info(f"Hole Bestellungen (letzte {days} Tage)...")
    url = f"{SP_API_BASE}/orders/v0/orders"
    created_after = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    params = {
        "MarketplaceIds": SP_MARKETPLACE_ID,
        "CreatedAfter":   created_after,
        "OrderStatuses":  "Shipped,Unshipped,PartiallyShipped",
    }
    orders = []
    next_token = None

    while True:
        if next_token:
            params = {"NextToken": next_token, "MarketplaceIds": SP_MARKETPLACE_ID}

        resp = requests.get(url, headers=sp_headers(token), params=params)
        resp.raise_for_status()
        data = resp.json().get("payload", {})

        orders.extend(data.get("Orders", []))
        next_token = data.get("NextToken")
        if not next_token:
            break

        time.sleep(1)  # Rate-Limit respektieren

    log.info(f"Bestellungen geladen: {len(orders)} Stück.")
    return orders


# ── Daten zusammenführen & normalisieren ──────────────────────────────────────

def build_sales_summary(orders: list[dict]) -> dict:
    """Aggregiert Bestellungen zu einer Tages-/Gesamtübersicht."""
    total_revenue = 0.0
    total_orders  = len(orders)
    by_date: dict[str, dict] = {}

    for order in orders:
        date = order.get("PurchaseDate", "")[:10]
        amount = float(
            order.get("OrderTotal", {}).get("Amount", 0) or 0
        )
        total_revenue += amount

        if date not in by_date:
            by_date[date] = {"orders": 0, "revenue": 0.0}
        by_date[date]["orders"]  += 1
        by_date[date]["revenue"] += amount

    # Tägliche Liste sortiert
    daily = [
        {"date": d, **v}
        for d, v in sorted(by_date.items())
    ]

    return {
        "total_orders":  total_orders,
        "total_revenue": round(total_revenue, 2),
        "currency":      "EUR",
        "daily":         daily,
    }


def build_inventory_summary(items: list[dict]) -> list[dict]:
    """Bereitet Inventory-Daten auf und berechnet Reichweite."""
    result = []
    for item in items:
        details = item.get("inventoryDetails", {})
        fulfillable = int(item.get("totalQuantity", 0))
        avg_daily = float(item.get("days30SalesVelocity", 0) or 0)

        # Reichweite: Tage bis Ausverkauf
        days_remaining = (
            round(fulfillable / avg_daily) if avg_daily > 0 else None
        )

        # Ampel-Status
        if days_remaining is None:
            status = "unknown"
        elif days_remaining <= 14:
            status = "critical"    # Rot
        elif days_remaining <= 30:
            status = "warning"     # Gelb
        else:
            status = "ok"          # Grün

        result.append({
            "asin":            item.get("asin"),
            "fnsku":           item.get("fnsku"),
            "product_name":    item.get("productName", ""),
            "fulfillable":     fulfillable,
            "inbound":         details.get("inboundWorkingQuantity", 0),
            "reserved":        details.get("reservedQuantity", {}).get("totalReservedQuantity", 0),
            "avg_daily_sales": avg_daily,
            "days_remaining":  days_remaining,
            "status":          status,
        })

    # Nach Dringlichkeit sortieren
    order = {"critical": 0, "warning": 1, "ok": 2, "unknown": 3}
    result.sort(key=lambda x: (order[x["status"]], x["days_remaining"] or 999))
    return result


# ── Haupt-Funktion ─────────────────────────────────────────────────────────────

def main():
    today = datetime.now(timezone.utc).date()
    log.info(f"=== SP-API Fetch gestartet: {today} ===")

    token = get_access_token()

    # 1. Bestellungen (30 Tage)
    orders    = fetch_orders(token, days=30)
    sales     = build_sales_summary(orders)

    # 2. FBA Inventory
    inv_raw   = fetch_inventory(token)
    inventory = build_inventory_summary(inv_raw)

    # 3. Ausgabe zusammenstellen
    output = {
        "fetched_at":  datetime.now(timezone.utc).isoformat(),
        "date":        str(today),
        "marketplace": SP_MARKETPLACE_ID,
        "sales":       sales,
        "inventory":   inventory,
    }

    # 4. Lokal speichern (wird von GitHub Actions als Artifact hochgeladen)
    out_dir = Path("pipeline/output")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"sp_{today}.json"
    out_file.write_text(json.dumps(output, ensure_ascii=False, indent=2))
    log.info(f"Gespeichert: {out_file}")

    # Auch als 'latest' speichern (für SharePoint-Upload)
    latest = out_dir / "sp_latest.json"
    latest.write_text(json.dumps(output, ensure_ascii=False, indent=2))
    log.info(f"Gespeichert: {latest}")

    log.info(f"=== Fertig. {sales['total_orders']} Bestellungen, "
             f"€{sales['total_revenue']} Umsatz (30T) ===")


if __name__ == "__main__":
    main()
