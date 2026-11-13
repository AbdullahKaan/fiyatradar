"""Gemini AI engine: embeddings, product normalization, price analysis, RAG answers."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone

import google.generativeai as genai
import numpy as np
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from config import EMBEDDING_DIMENSION, EMBEDDING_MODEL, GEMINI_API_KEY, GEMINI_MODEL, SIMILARITY_THRESHOLD

genai.configure(api_key=GEMINI_API_KEY)

_retry = retry(
    reraise=True,
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=2, min=2, max=60),
    retry=retry_if_exception_type(Exception),
)

VERDICT_TR = {
    "BUY_NOW": "Hemen Al",
    "WAIT": "Bekle",
    "OVERPRICED": "Pahalı",
    "GOOD_DEAL": "İyi Fırsat",
}


def _model(system_instruction: str | None = None) -> genai.GenerativeModel:
    return genai.GenerativeModel(GEMINI_MODEL, system_instruction=system_instruction)


def _extract_json(text: str) -> dict:
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object in model output: {text[:200]}")
    return json.loads(match.group(0))


@_retry
def get_embedding(text: str) -> list[float]:
    result = genai.embed_content(model=EMBEDDING_MODEL, content=text[:8000], task_type="semantic_similarity", output_dimensionality=EMBEDDING_DIMENSION)
    vec = np.asarray(result["embedding"], dtype=np.float32)
    if vec.shape[0] != EMBEDDING_DIMENSION:
        raise ValueError(f"Unexpected embedding dim {vec.shape[0]}")
    norm = np.linalg.norm(vec)
    return (vec / norm if norm else vec).tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    va, vb = np.asarray(a), np.asarray(b)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(va @ vb / denom) if denom else 0.0


def find_similar_product(embedding: list[float], client) -> dict | None:
    """pgvector cosine search: 1 - (embedding <=> query_vec) >= SIMILARITY_THRESHOLD."""
    res = client.rpc(
        "match_master_products",
        {"query_embedding": embedding, "match_threshold": SIMILARITY_THRESHOLD, "match_count": 1},
    ).execute()
    return res.data[0] if res.data else None


@_retry
def normalize_product_name(raw_name: str, category: str) -> dict:
    prompt = f"""Sen bir e-ticaret ürün normalizasyon motorusun. Mağazalardan toplanan dağınık ürün
başlıklarını standart hale getiriyorsun.

Ham başlık: "{raw_name}"
Kategori ipucu: "{category}"

Görevler:
1. Pazarlama ifadelerini ("Kampanyalı", "Orijinal", "Hızlı Kargo", "Distribütör Garantili" vb.) çıkar.
2. Marka + model + ayırt edici varyant (renk, depolama, boyut) içeren temiz bir ürün adı üret.
3. Markayı ayrı çıkar.
4. Teknik özellikleri anahtar-değer olarak çıkar (ör. "Depolama": "256 GB").
5. Kategoriyi Türkçe tek kelime/ifade olarak belirle.

SADECE şu JSON'u döndür:
{{"name": "...", "brand": "...", "category": "...", "specs": {{}}}}"""
    try:
        resp = _model().generate_content(
            prompt, generation_config={"response_mime_type": "application/json", "temperature": 0.1}
        )
        data = _extract_json(resp.text)
    except (ValueError, json.JSONDecodeError):
        data = {}
    return {
        "name": str(data.get("name") or raw_name).strip()[:250],
        "brand": str(data.get("brand") or "").strip(),
        "category": str(data.get("category") or category or "Genel").strip(),
        "specs": data.get("specs") if isinstance(data.get("specs"), dict) else {},
    }


def _parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def detect_fake_discount(history: list[dict]) -> bool:
    """Fake discount: original/list price inflated shortly before a 'discount' so that the
    discounted price is not actually below the prior typical price."""
    if len(history) < 3:
        return False
    hist = sorted(history, key=lambda h: _parse_ts(h["recorded_at"]))
    prices = [float(h["price"]) for h in hist]
    current = prices[-1]
    origs = [float(h["original_price"]) for h in hist if h.get("original_price")]

    # Rule 1: original price jumped >15% within recent records before the discount
    recent_orig = [float(h["original_price"]) for h in hist[-4:] if h.get("original_price")]
    earlier_orig = [float(h["original_price"]) for h in hist[:-4] if h.get("original_price")]
    if recent_orig and earlier_orig and max(recent_orig) > np.median(earlier_orig) * 1.15:
        return True
    # Rule 2: price rose >10% then "discounted" back to roughly the earlier level
    prior = prices[:-1]
    baseline = float(np.median(prior[: max(1, len(prior) // 2)]))
    peak = max(prior[-5:])
    if peak > baseline * 1.10 and current >= baseline * 0.97:
        return True
    # Rule 3: claimed original far above anything observed as a real price
    if origs and origs[-1] > max(prices) * 1.25 and current >= min(prices) * 1.02:
        return True
    return False


@_retry
def _price_summary(product_name: str, stats: dict) -> dict:
    prompt = f"""Sen FiyatRadar'ın fiyat analistisin. Aşağıdaki son 6 aylık istatistiklere göre
"{product_name}" için kısa (en fazla 2 cümle) Türkçe bir değerlendirme yaz ve bir karar ver.

İstatistikler: {json.dumps(stats, ensure_ascii=False)}

Karar seçenekleri: BUY_NOW (tarihi dip/çok iyi), GOOD_DEAL (ortalamanın altında),
WAIT (ortalama civarı, düşüş beklenebilir), OVERPRICED (ortalamanın belirgin üstünde).
Sahte indirim tespit edildiyse kullanıcıyı uyar.

SADECE JSON döndür: {{"verdict": "...", "summary": "..."}}"""
    resp = _model().generate_content(
        prompt, generation_config={"response_mime_type": "application/json", "temperature": 0.3}
    )
    return _extract_json(resp.text)


def _rule_verdict(current_vs_avg: float, current: float, lowest: float) -> str:
    if current <= lowest * 1.02:
        return "BUY_NOW"
    if current_vs_avg <= -5:
        return "GOOD_DEAL"
    if current_vs_avg >= 10:
        return "OVERPRICED"
    return "WAIT"


def analyze_price(product_name: str, price_history: list[dict]) -> dict:
    now = datetime.now(timezone.utc)
    hist = [
        h for h in price_history
        if h.get("price") is not None and (now - _parse_ts(h["recorded_at"])).days <= 180
    ]
    hist.sort(key=lambda h: _parse_ts(h["recorded_at"]))
    if not hist:
        return {
            "verdict": "WAIT", "verdict_tr": VERDICT_TR["WAIT"],
            "summary": "Yeterli fiyat geçmişi yok; analiz için daha fazla veri toplanıyor.",
            "lowest_6m": 0, "highest_6m": 0, "average_6m": 0, "current_price": 0,
            "current_vs_avg_percent": 0, "fake_discount_detected": False,
            "data_points": 0, "analyzed_at": now.isoformat(),
        }

    prices = np.asarray([float(h["price"]) for h in hist])
    current = float(prices[-1])
    lowest, highest, average = float(prices.min()), float(prices.max()), float(prices.mean())
    current_vs_avg = round((current - average) / average * 100, 2) if average else 0.0
    fake = detect_fake_discount(hist)

    stats = {
        "current_price": current, "lowest_6m": lowest, "highest_6m": highest,
        "average_6m": round(average, 2), "current_vs_avg_percent": current_vs_avg,
        "fake_discount_detected": fake, "data_points": len(hist),
    }
    verdict = _rule_verdict(current_vs_avg, current, lowest)
    if fake and verdict in ("BUY_NOW", "GOOD_DEAL"):
        verdict = "WAIT"
    summary = (
        f"Güncel fiyat 6 aylık ortalamanın %{abs(current_vs_avg):.1f} "
        f"{'altında' if current_vs_avg < 0 else 'üstünde'}."
    )
    try:
        ai = _price_summary(product_name, stats)
        if ai.get("verdict") in VERDICT_TR:
            verdict = ai["verdict"]
        summary = ai.get("summary") or summary
    except Exception:
        pass
    if fake and verdict in ("BUY_NOW", "GOOD_DEAL"):
        verdict = "WAIT"

    return {
        "verdict": verdict,
        "verdict_tr": VERDICT_TR[verdict],
        "summary": summary,
        "lowest_6m": round(lowest, 2),
        "highest_6m": round(highest, 2),
        "average_6m": round(average, 2),
        "current_price": round(current, 2),
        "current_vs_avg_percent": current_vs_avg,
        "fake_discount_detected": fake,
        "data_points": len(hist),
        "analyzed_at": now.isoformat(),
    }


RAG_SYSTEM_PROMPT = (
    "Sen FiyatRadar platformunun AI asistanısın. Türkiye'deki en iyi fiyatları bulman için yardım "
    "ediyorsun. Yalnızca sana verilen ürün bağlamındaki verilere dayanarak cevap ver; bilmediğin fiyatı "
    "uydurma. Fiyatları TL olarak belirt, mağazaları karşılaştır, sahte indirim uyarılarını mutlaka "
    "aktar ve kısa, samimi, Türkçe yanıt ver. Bağlamda uygun ürün yoksa bunu açıkça söyle."
)


@_retry
def answer_product_query(user_question: str, relevant_products: list[dict]) -> str:
    context = json.dumps(relevant_products, ensure_ascii=False, default=str)[:30000]
    prompt = f"Ürün bağlamı (JSON):\n{context}\n\nKullanıcı sorusu: {user_question}"
    resp = _model(RAG_SYSTEM_PROMPT).generate_content(prompt, generation_config={"temperature": 0.4})
    return resp.text.strip()
