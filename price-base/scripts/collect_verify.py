# -*- coding: utf-8 -*-
"""
Сверка источников прайсов (только чтение страниц, ничего не отправляется).

Для каждого URL из research_kz_2026.py:
  - HTTP-статус, итоговый URL (редиректы), title
  - цена на странице (JSON-LD offers.price / видимый текст без пробелов) vs записанная цена
  - наличие (schema.org availability), «цена по запросу» (price=0 / PreOrder)
  - даты: Kaspi (dateCreate/dateUpdate/expiryDate), JSON-LD datePublished/dateModified
  - Satu: имя продавца, ссылка на страницу компании
  - PDF: скачивается во временную папку и читается pdftotext -layout; ищется записанная цена
Результат: data/verify_YYYY-MM-DD.json

Запуск:  python3 collect_verify.py [путь_к_research_kz_2026.py]
Зависимости: requests (pip), pdftotext (poppler).
"""
import json, re, runpy, subprocess, sys, tempfile, time, datetime, os
from concurrent.futures import ThreadPoolExecutor
import requests

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "kp-koktobe-138", "scripts", "research_kz_2026.py")
TODAY = datetime.date.today().isoformat()
OUT = os.path.join(HERE, "..", "data", f"verify_{TODAY}.json")
H = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
     "Accept-Language": "ru-RU,ru;q=0.9"}

sys.path.insert(0, HERE)
from load_rows import load_all
R = load_all()[0]
urls = sorted({r["url"] for r in R if r["url"].startswith("http")})
tmp = tempfile.mkdtemp(prefix="pricepdf_")


def num(s):
    try:
        return float(s)
    except Exception:
        return None


def digits_text(html):
    t = re.sub(r"<script.*?</script>|<style.*?</style>", " ", html, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"[\s  ]", "", t)


def fetch(u):
    o = {"url": u}
    for _ in range(2):
        try:
            resp = requests.get(u, headers=H, timeout=30, allow_redirects=True)
            o.update(status=resp.status_code, final=resp.url)
            if u.lower().endswith(".pdf"):
                f = os.path.join(tmp, re.sub(r"\W", "_", u)[-60:] + ".pdf")
                open(f, "wb").write(resp.content)
                txt = subprocess.run(["pdftotext", "-layout", f, "-"], capture_output=True, text=True).stdout
                o.update(kind="pdf", title="PDF", flat=re.sub(r"[\s  ]", "", txt), head=re.sub(r"\s+", " ", txt)[:300])
                break
            t = resp.text
            m = re.search(r"<title>(.*?)</title>", t, re.S)
            o["title"] = m.group(1).strip()[:140] if m else ""
            o["kind"] = "html"
            o["ld_price"] = [num(x) for x in re.findall(r'"price"\s*:\s*"?([\d.]+)', t)[:4]]
            av = re.search(r'"availability"\s*:\s*"[^"]*/(\w+)"', t)
            o["availability"] = av.group(1) if av else None
            o["dates_ld"] = re.findall(r'(?:datePublished|dateModified)"\s*:\s*"([^"]+)', t)[:2]
            for k in ("dateCreate", "dateUpdate", "expiryDate"):
                m = re.search(k + r':"(20\d\d-\d\d-\d\d)', t)
                o[k] = m.group(1) if m else None
            m = re.search(r'price:"([^"]+)"', t)  # Kaspi: строка цены/диапазона
            o["kaspi_price_text"] = m.group(1) if m else None
            s = re.search(r'"seller":\{"@type":"Organization","name":"([^"]+)"', t)
            o["seller"] = s.group(1) if s else None
            c = re.search(r'href="(/c\d+-[^"]+\.html)"', t)
            o["company_url"] = "https://satu.kz" + c.group(1) if c else None
            o["gone"] = bool(re.search(r"(страница не найдена|объявление.{0,20}(не найдено|снято|архив))", t, re.I))
            o["flat"] = digits_text(t)
            break
        except Exception as e:
            o["error"] = str(e)[:150]
            time.sleep(1)
    return o


with ThreadPoolExecutor(6) as ex:
    res = {o["url"]: o for o in ex.map(fetch, urls)}

for r in R:
    o = res.get(r["url"])
    if not o:
        continue
    flat = o.get("flat", "")
    p = r["price"]
    o.setdefault("rec", []).append({
        "key": r["key"], "price": p,
        "in_ld": p in (o.get("ld_price") or []),
        "in_text": bool(flat) and (str(int(p)) in flat),
    })
for o in res.values():
    o.pop("flat", None)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({"date": TODAY, "urls": res}, open(OUT, "w"), ensure_ascii=False, indent=1)
print(len(res), "URL проверено ->", OUT)
