"""
FiyatRadar - Ana Veri Toplama ve AI İşleme Pipeline'ı
Çalışma Süresi: ~10-15 dakika (500 ürün için)
Çalışma Sıklığı: Her 6 saatte bir (GitHub Actions)
"""
from __future__ import annotations

import os
import sys
import time
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rich.console import Console  # noqa: E402
from rich.progress import BarColumn, MofNCompleteColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn  # noqa: E402
from rich.table import Table  # noqa: E402

import db  # noqa: E402
from ai_engine import analyze_price, get_embedding, normalize_product_name  # noqa: E402
from config import AFFILIATE_TAG, MAX_PRODUCTS_PER_RUN, REQUEST_DELAY_SECONDS  # noqa: E402
from feed_parser import parse_feed  # noqa: E402
from web_scraper import scrape_store_page  # noqa: E402

console = Console()


def build_affiliate_url(product_url: str, template: str | None) -> str:
    if not template or not AFFILIATE_TAG:
        return product_url
    from urllib.parse import quote
    suffix = template.replace("{AFFILIATE_TAG}", AFFILIATE_TAG).replace("{URL}", quote(product_url, safe=""))
    if "{URL}" in template:
        return suffix if suffix.startswith("http") else product_url + suffix
    if suffix.startswith("?") and "?" in product_url:
        suffix = "&" + suffix[1:]
    return product_url + suffix


def _progress() -> Progress:
    return Progress(SpinnerColumn(), TextColumn("{task.description}"), BarColumn(),
                    MofNCompleteColumn(), TimeElapsedColumn(), console=console)


def collect_products(store: dict) -> list[dict]:
    cfg = {**(store.get("scrape_config") or {}), "name": store["name"], "feed_type": store.get("feed_type")}
    if store.get("feed_url"):
        return parse_feed(store["feed_url"], cfg)
    products: list[dict] = []
    for url in cfg.get("list_urls", []):
        try:
            products.extend(scrape_store_page(url, cfg.get("selectors", {})))
        except Exception as e:  # noqa: BLE001
            console.log(f"[red]Scrape hatası {url}: {e}")
        time.sleep(REQUEST_DELAY_SECONDS)
    return products


def process_product(store: dict, product: dict, stats: dict) -> None:
    embed_text = f"{product['name']} {product.get('brand', '')} {product.get('category', '')}".strip()
    embedding = get_embedding(embed_text)
    match = db.find_similar_master_product(embedding)
    if match:
        master = match
    else:
        normalized = normalize_product_name(product["name"], product.get("category", ""))
        master = db.get_or_create_master_product(
            {**product, **normalized, "description": product.get("description"),
             "image_url": product.get("image_url")},
            get_embedding(f"{normalized['name']} {normalized['brand']} {normalized['category']}"),
        )
        if master.get("_created"):
            stats["new_products"] += 1
        else:
            stats["matched"] += 1
    if match:
        stats["matched"] += 1

    previous = db.get_listing(master["id"], store["id"])
    listing = db.upsert_store_listing({
        "master_product_id": master["id"],
        "store_id": store["id"],
        "current_price": product["price"],
        "original_price": product.get("original_price"),
        "currency": product.get("currency", "TRY"),
        "in_stock": product.get("in_stock", True),
        "product_url": product["product_url"],
        "affiliate_url": build_affiliate_url(product["product_url"], store.get("affiliate_param_template")),
    })
    if previous is None or float(previous["current_price"]) != float(product["price"]):
        db.record_price_history(listing["id"], master["id"], store["id"], product["price"],
                                product.get("currency", "TRY"), product.get("original_price"))
        stats["price_changes"] += 1


def run_ingestion(stats: dict) -> None:
    stores = db.get_active_stores()
    console.rule(f"[bold indigo]{len(stores)} aktif mağaza")
    budget = MAX_PRODUCTS_PER_RUN
    for store in stores:
        if budget <= 0:
            break
        if not store.get("feed_url") and not (store.get("scrape_config") or {}).get("list_urls"):
            console.log(f"[yellow]{store['name']}: feed_url / scrape_config yok, atlandı")
            continue
        try:
            products = collect_products(store)[:budget]
        except Exception as e:  # noqa: BLE001
            console.log(f"[red]{store['name']} feed hatası: {e}")
            stats["errors"] += 1
            continue
        budget -= len(products)
        stats["per_store"][store["name"]] += len(products)
        with _progress() as prog:
            task = prog.add_task(f"{store['name']}", total=len(products))
            for product in products:
                try:
                    process_product(store, product, stats)
                    stats["processed"] += 1
                except Exception as e:  # noqa: BLE001
                    stats["errors"] += 1
                    console.log(f"[red]Ürün hatası '{product.get('name', '')[:50]}': {e}")
                prog.advance(task)
                time.sleep(REQUEST_DELAY_SECONDS / 3)


def run_analysis(stats: dict) -> None:
    listings = db.get_all_active_listings_for_analysis(hours=24)
    by_product: dict[str, list[dict]] = defaultdict(list)
    names: dict[str, str] = {}
    cheapest: dict[str, float] = {}
    for l in listings:
        pid, price = l["master_product_id"], float(l["current_price"])
        names[pid] = l["product_name"]
        # Use the cheapest listing's history as representative for the product
        if pid not in cheapest or price < cheapest[pid]:
            cheapest[pid] = price
            by_product[pid] = l["price_history"] or [
                {"price": l["current_price"], "original_price": l.get("original_price"),
                 "recorded_at": l["last_updated"]}
            ]
    with _progress() as prog:
        task = prog.add_task("AI fiyat analizi", total=len(by_product))
        for pid, history in by_product.items():
            try:
                analysis = analyze_price(names[pid], history)
                db.update_product_ai_analysis(pid, analysis)
                stats["analyzed"] += 1
                if analysis["fake_discount_detected"]:
                    stats["fake_discounts"] += 1
            except Exception as e:  # noqa: BLE001
                stats["errors"] += 1
                console.log(f"[red]Analiz hatası {pid}: {e}")
            prog.advance(task)
            time.sleep(REQUEST_DELAY_SECONDS)


def run_alerts(stats: dict) -> None:
    for alert in db.get_pending_price_alerts():
        console.log(
            f"[magenta]🔔 Alarm: {alert['product_name']} → {alert['current_price']} TL "
            f"({alert['store_name']}) hedef {alert['target_price']} TL"
        )
        db.mark_alert_triggered(alert["alert_id"])
        stats["alerts"] += 1


def print_summary(stats: dict, started: float) -> None:
    table = Table(title="FiyatRadar Çalışma Özeti", header_style="bold magenta")
    table.add_column("Metrik")
    table.add_column("Değer", justify="right")
    for label, key in [("İşlenen ürün", "processed"), ("Yeni master ürün", "new_products"),
                       ("Eşleşen ürün", "matched"), ("Fiyat değişimi", "price_changes"),
                       ("AI analizi", "analyzed"), ("Sahte indirim", "fake_discounts"),
                       ("Tetiklenen alarm", "alerts"), ("Hata", "errors")]:
        table.add_row(label, str(stats[key]))
    for name, count in stats["per_store"].items():
        table.add_row(f"  ↳ {name}", str(count))
    table.add_row("Süre", f"{(time.time() - started) / 60:.1f} dk")
    console.print(table)


def main() -> int:
    started = time.time()
    stats: dict = defaultdict(int)
    stats["per_store"] = defaultdict(int)
    for step, fn in [("Veri toplama", run_ingestion), ("AI analiz", run_analysis), ("Fiyat alarmları", run_alerts)]:
        console.rule(f"[bold]{step}")
        try:
            fn(stats)
        except Exception as e:  # noqa: BLE001
            stats["errors"] += 1
            console.print_exception() if os.getenv("DEBUG") else console.log(f"[red]{step} başarısız: {e}")
    print_summary(stats, started)
    return 1 if stats["processed"] == 0 and stats["errors"] > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
