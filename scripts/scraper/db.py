"""Supabase data access layer for the scraper (service role, bypasses RLS)."""
from __future__ import annotations

import re
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone
from functools import lru_cache

from supabase import Client, create_client

from config import SIMILARITY_THRESHOLD, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL

_TR_MAP = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")


@lru_cache(maxsize=1)
def get_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def slugify(text: str) -> str:
    text = text.translate(_TR_MAP)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:80] or "urun"


def get_active_stores() -> list[dict]:
    res = get_client().table("stores").select("*").eq("is_active", True).execute()
    return res.data or []


def upsert_store(store_data: dict) -> dict:
    data = dict(store_data)
    data.setdefault("slug", slugify(data["name"]))
    res = get_client().table("stores").upsert(data, on_conflict="slug").execute()
    return res.data[0]


def find_similar_master_product(embedding: list[float], threshold: float = SIMILARITY_THRESHOLD) -> dict | None:
    res = get_client().rpc(
        "match_master_products",
        {"query_embedding": embedding, "match_threshold": threshold, "match_count": 1},
    ).execute()
    return res.data[0] if res.data else None


def get_or_create_master_product(product: dict, embedding: list[float]) -> dict:
    """Return existing match (vector similarity) or insert a new master product.

    Result dict includes `_created: bool`.
    """
    existing = find_similar_master_product(embedding)
    if existing:
        existing["_created"] = False
        return existing

    client = get_client()
    base_slug = slugify(f"{product.get('brand', '')} {product['name']}")
    slug = base_slug
    if client.table("master_products").select("id").eq("slug", slug).execute().data:
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

    row = {
        "name": product["name"],
        "slug": slug,
        "category": product.get("category") or "Genel",
        "brand": product.get("brand") or "",
        "description": product.get("description"),
        "image_url": product.get("image_url"),
        "specs": product.get("specs") or {},
        "embedding": embedding,
    }
    res = client.table("master_products").insert(row).execute()
    created = res.data[0]
    created.pop("embedding", None)
    created["_created"] = True
    return created


def get_listing(master_product_id: str, store_id: str) -> dict | None:
    res = (
        get_client().table("store_listings").select("*")
        .eq("master_product_id", master_product_id).eq("store_id", store_id).limit(1).execute()
    )
    return res.data[0] if res.data else None


def upsert_store_listing(listing: dict) -> dict:
    data = dict(listing)
    price, orig = data.get("current_price"), data.get("original_price")
    if orig and price and float(orig) > float(price):
        data["discount_percent"] = round((float(orig) - float(price)) / float(orig) * 100, 2)
    else:
        data["discount_percent"] = None
    data["last_updated"] = datetime.now(timezone.utc).isoformat()
    res = (
        get_client().table("store_listings")
        .upsert(data, on_conflict="master_product_id,store_id").execute()
    )
    return res.data[0]


def record_price_history(
    listing_id: str, master_product_id: str, store_id: str, price: float, currency: str,
    original_price: float | None = None,
) -> None:
    get_client().table("price_history").insert({
        "store_listing_id": listing_id,
        "master_product_id": master_product_id,
        "store_id": store_id,
        "price": price,
        "original_price": original_price,
        "currency": currency or "TRY",
    }).execute()


def get_all_active_listings_for_analysis(hours: int = 24, days_history: int = 180) -> list[dict]:
    """Listings updated within `hours`, each with `product_name` and `price_history` (last N days)."""
    client = get_client()
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    listings = (
        client.table("store_listings")
        .select("*, master_products(id, name)")
        .gte("last_updated", since).eq("in_stock", True).execute().data or []
    )
    hist_since = (datetime.now(timezone.utc) - timedelta(days=days_history)).isoformat()
    for listing in listings:
        listing["product_name"] = (listing.get("master_products") or {}).get("name", "")
        listing["price_history"] = (
            client.table("price_history")
            .select("price, original_price, currency, recorded_at, store_id")
            .eq("store_listing_id", listing["id"]).gte("recorded_at", hist_since)
            .order("recorded_at").execute().data or []
        )
    return listings


def update_product_ai_analysis(product_id: str, analysis: dict) -> None:
    get_client().table("master_products").update({"ai_price_analysis": analysis}).eq("id", product_id).execute()


def get_pending_price_alerts() -> list[dict]:
    res = get_client().rpc("get_pending_price_alerts", {}).execute()
    return res.data or []


def mark_alert_triggered(alert_id: str) -> None:
    get_client().table("price_alerts").update(
        {"triggered_at": datetime.now(timezone.utc).isoformat(), "is_active": False}
    ).eq("id", alert_id).execute()
