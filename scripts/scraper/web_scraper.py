"""
For stores without affiliate feeds, use Playwright to scrape product listings.
This is a template - customize selectors per store in store_configs.
"""
from __future__ import annotations

import asyncio
from urllib.parse import urljoin

from playwright.async_api import async_playwright

from feed_parser import parse_price

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# Example selector set (stores.scrape_config.selectors overrides this)
DEFAULT_SELECTORS = {
    "item": "[data-product], .product-card, .p-card-wrppr, li.productListContent-item",
    "name": "h3, .product-title, .prdct-desc-cntnr-name, [data-test-id='product-card-name']",
    "price": ".price, .prc-box-dscntd, [data-test-id='price-current-price']",
    "original_price": ".old-price, .prc-box-orgnl, [data-test-id='price-prev-price']",
    "image": "img",
    "link": "a",
    "out_of_stock": ".out-of-stock, .sold-out",
}


async def _scrape_list(url: str, selectors: dict) -> list[dict]:
    sel = {**DEFAULT_SELECTORS, **(selectors or {})}
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(user_agent=USER_AGENT, locale="tr-TR")
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        try:
            await page.wait_for_selector(sel["item"], timeout=15000)
        except Exception:
            await browser.close()
            return []
        for _ in range(3):  # trigger lazy loading
            await page.mouse.wheel(0, 4000)
            await page.wait_for_timeout(800)
        raw = await page.eval_on_selector_all(
            sel["item"],
            """(items, s) => items.map(el => {
                const q = (css) => css ? el.querySelector(css) : null;
                const img = q(s.image), a = q(s.link) || el.closest('a');
                return {
                  name: q(s.name)?.textContent?.trim() || '',
                  price: q(s.price)?.textContent?.trim() || '',
                  original_price: q(s.original_price)?.textContent?.trim() || '',
                  image: img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '',
                  link: a ? a.getAttribute('href') : '',
                  out_of_stock: !!q(s.out_of_stock),
                };
            })""",
            sel,
        )
        await browser.close()

    products = []
    for r in raw:
        price = parse_price(r["price"])
        if not r["name"] or not price or not r["link"]:
            continue
        orig = parse_price(r["original_price"])
        products.append({
            "name": r["name"],
            "price": price,
            "original_price": orig if orig and orig > price else None,
            "in_stock": not r["out_of_stock"],
            "product_url": urljoin(url, r["link"]),
            "image_url": urljoin(url, r["image"]) if r["image"] else None,
            "category": selectors.get("default_category", "Elektronik") if selectors else "Elektronik",
            "brand": "",
            "description": None,
            "currency": "TRY",
        })
    return products


def scrape_store_page(url: str, selectors: dict) -> list[dict]:
    return asyncio.run(_scrape_list(url, selectors))


async def _scrape_detail(url: str) -> dict:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(user_agent=USER_AGENT, locale="tr-TR")
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(1500)
        data = await page.evaluate(
            """() => {
              const meta = (n) => document.querySelector(`meta[property='${n}'],meta[name='${n}']`)?.content || null;
              const desc = document.querySelector('[itemprop=description], .product-description, #productDescription, .detail-desc-container');
              const images = [...new Set([...document.querySelectorAll('img')]
                .map(i => i.currentSrc || i.src).filter(s => s && /^https?:/.test(s) && !/logo|icon|sprite/i.test(s)))].slice(0, 20);
              const specs = {};
              document.querySelectorAll('table tr').forEach(tr => {
                const c = tr.querySelectorAll('th,td');
                if (c.length >= 2) { const k = c[0].textContent.trim(), v = c[1].textContent.trim();
                  if (k && v && k.length < 80 && v.length < 300) specs[k] = v; }
              });
              document.querySelectorAll('dl').forEach(dl => {
                const dt = dl.querySelectorAll('dt'), dd = dl.querySelectorAll('dd');
                dt.forEach((d, i) => { if (dd[i]) specs[d.textContent.trim()] = dd[i].textContent.trim(); });
              });
              return {
                name: meta('og:title') || document.querySelector('h1')?.textContent?.trim() || document.title,
                description: (desc?.textContent || meta('description') || '').trim().slice(0, 5000),
                image_url: meta('og:image') || images[0] || null,
                images, specs,
              };
            }"""
        )
        await browser.close()
    data["product_url"] = url
    return data


def scrape_product_detail(url: str) -> dict:
    return asyncio.run(_scrape_detail(url))
