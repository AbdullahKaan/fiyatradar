"""
Parses product feeds from affiliate networks.
Supports: XML (standard e-commerce feed), RSS/Atom, JSON arrays.
"""
from __future__ import annotations

import re

import feedparser
import httpx
from lxml import etree
from rich.console import Console
from tenacity import retry, stop_after_attempt, wait_exponential

from config import MAX_RETRIES

console = Console()
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; FiyatRadarBot/1.0; +https://fiyatradar.app)"}

FIELD_ALIASES = {
    "name": ["title", "name", "productname", "product_name", "baslik", "urunadi"],
    "price": ["price", "saleprice", "sale_price", "fiyat", "current_price", "indirimlifiyat"],
    "original_price": ["oldprice", "old_price", "listprice", "list_price", "originalprice", "original_price", "piyasafiyati"],
    "in_stock": ["instock", "in_stock", "availability", "stock", "stok", "quantity"],
    "product_url": ["producturl", "product_url", "link", "url", "deeplink"],
    "image_url": ["imageurl", "image_url", "image", "image_link", "img", "resim"],
    "category": ["category", "categoryname", "product_type", "kategori"],
    "brand": ["brand", "manufacturer", "marka"],
    "description": ["description", "desc", "aciklama", "summary"],
    "currency": ["currency", "para_birimi"],
}
PRODUCT_XPATHS = ["//product", "//Product", "//item", "//urun", "//offer", "//entry", "//*[local-name()='item']"]


@retry(stop=stop_after_attempt(MAX_RETRIES), wait=wait_exponential(min=2, max=20), reraise=True)
def _download(url: str) -> httpx.Response:
    resp = httpx.get(url, headers=HEADERS, timeout=60, follow_redirects=True)
    resp.raise_for_status()
    return resp


def parse_price(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = re.sub(r"[^\d,.]", "", str(value))
    if not s:
        return None
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")
    elif s.count(".") > 1 or re.search(r"\.\d{3}$", s):
        s = s.replace(".", "")
    try:
        return float(s)
    except ValueError:
        return None


def parse_stock(value) -> bool:
    if value is None:
        return True
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    s = str(value).strip().lower()
    if s.isdigit():
        return int(s) > 0
    return s not in {"false", "0", "no", "hayir", "hayır", "out of stock", "out_of_stock", "tükendi", "yok"}


def _pick(record: dict, field: str, store_config: dict):
    custom = (store_config.get("field_map") or {}).get(field)
    keys = ([custom.lower()] if custom else []) + FIELD_ALIASES[field]
    for k in keys:
        if record.get(k) not in (None, ""):
            return record[k]
    return None


def normalize_record(record: dict, store_config: dict) -> dict | None:
    rec = {str(k).lower().split("}")[-1].split(":")[-1]: v for k, v in record.items()}
    name, price = _pick(rec, "name", store_config), parse_price(_pick(rec, "price", store_config))
    url = _pick(rec, "product_url", store_config)
    if not name or not price or not url:
        return None
    orig = parse_price(_pick(rec, "original_price", store_config))
    return {
        "name": str(name).strip(),
        "price": price,
        "original_price": orig if orig and orig > price else None,
        "in_stock": parse_stock(_pick(rec, "in_stock", store_config)),
        "product_url": str(url).strip(),
        "image_url": _pick(rec, "image_url", store_config),
        "category": str(_pick(rec, "category", store_config) or store_config.get("default_category") or "Elektronik"),
        "brand": str(_pick(rec, "brand", store_config) or ""),
        "description": _pick(rec, "description", store_config),
        "currency": str(_pick(rec, "currency", store_config) or "TRY")[:3].upper(),
    }


def _element_to_dict(el) -> dict:
    data = {etree.QName(k).localname: v for k, v in el.attrib.items()}
    for child in el:
        if not isinstance(child.tag, str):
            continue
        tag = etree.QName(child).localname
        text = (child.text or "").strip() or child.attrib.get("href") or child.attrib.get("url")
        if text and tag not in data:
            data[tag] = text
    return data


def parse_xml_feed(url: str, store_config: dict) -> list[dict]:
    content = _download(url).content
    root = etree.fromstring(content, parser=etree.XMLParser(recover=True, huge_tree=True))
    if root is None:
        return []
    nodes = []
    custom = store_config.get("item_xpath")
    for xp in ([custom] if custom else []) + PRODUCT_XPATHS:
        nodes = root.xpath(xp)
        if nodes:
            break
    products = [p for p in (normalize_record(_element_to_dict(n), store_config) for n in nodes) if p]
    if not products:  # RSS/Atom fallback
        parsed = feedparser.parse(content)
        for e in parsed.entries:
            rec = {k: (v if isinstance(v, str) else str(v)) for k, v in e.items() if isinstance(v, (str, int, float))}
            p = normalize_record(rec, store_config)
            if p:
                products.append(p)
    return products


def parse_json_feed(url: str, store_config: dict) -> list[dict]:
    data = _download(url).json()
    if isinstance(data, dict):
        for key in (store_config.get("json_root"), "products", "items", "data", "results"):
            if key and isinstance(data.get(key), list):
                data = data[key]
                break
        else:
            data = []
    return [p for p in (normalize_record(r, store_config) for r in data if isinstance(r, dict)) if p]


def parse_feed(url: str, store_config: dict) -> list[dict]:
    feed_type = (store_config.get("feed_type") or "auto").lower()
    if feed_type == "auto":
        if url.lower().split("?")[0].endswith(".json"):
            feed_type = "json"
        elif url.lower().split("?")[0].endswith((".xml", ".rss", ".atom")):
            feed_type = "xml"
        else:
            try:
                ctype = httpx.head(url, headers=HEADERS, timeout=20, follow_redirects=True).headers.get("content-type", "")
            except httpx.HTTPError:
                ctype = ""
            feed_type = "json" if "json" in ctype else "xml"
    products = parse_json_feed(url, store_config) if feed_type == "json" else parse_xml_feed(url, store_config)
    console.log(f"[green]{store_config.get('name', url)}[/]: {len(products)} ürün ayrıştırıldı ({feed_type})")
    return products
