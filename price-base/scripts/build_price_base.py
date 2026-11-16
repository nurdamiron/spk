# -*- coding: utf-8 -*-
"""
Сборка price_base_KZ.xlsx из:
  - kp-koktobe-138/scripts/research_kz_2026.py  (322 записи цен прошлого сбора, ключ = позиция)
  - data/verify_<дата>.json                      (живая сверка источников, collect_verify.py)
Классы по правилам промпта: A / B / C / D (см. лист «Журнал», «Правила»).
Запуск: python3 build_price_base.py [YYYY-MM-DD дата_сверки]
Зависимости: openpyxl.
"""
import datetime, glob, html, json, os, re, runpy, statistics, sys
from collections import OrderedDict, defaultdict
from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.datavalidation import DataValidation

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
RESEARCH = os.path.join(ROOT, "..", "kp-koktobe-138", "scripts", "research_kz_2026.py")
BUILD_VOR = os.path.join(ROOT, "..", "kp-koktobe-138", "scripts", "build_vor.py")
vf = sys.argv[1] if len(sys.argv) > 1 else sorted(glob.glob(os.path.join(ROOT, "data", "verify_*.json")))[-1]
if not vf.endswith(".json"):
    vf = os.path.join(ROOT, "data", f"verify_{vf}.json")
V = json.load(open(vf))
VDATE = datetime.date.fromisoformat(V["date"])
VU = V["urls"]
TODAY = VDATE

sys.path.insert(0, HERE)
from load_rows import load_all
ROWS, REF, CONTACTS, CONTROL, LOAD_WARN = load_all()
vor_src = open(BUILD_VOR, encoding="utf-8").read()

# ------------------------------------------------------------------ справочник позиций
GROUPS = OrderedDict([
    ("Дорожные и нерудные материалы", "ab_dense ab_porous sheben psch pgs pesok chernozem haul geotex geo".split()),
    ("Бетон", "bet_b10 bet_b15 bet_b25 bet_b30 ker drymix".split()),
    ("Металл, прокат, трубы", "arm a240 ugolok shveller list trprof tr vgp profnastil setka5 setka4 pvl406".split()),
    ("ЖБИ, плитка, благоустройство (изделия)", "plitka bord30 bord20 takt takt_lay lot zhb_lot b6 kolco lyuk gazon_resh kauchuk ogr".split()),
    ("Гидроизоляция, утеплитель", "tehno bikrost epps".split()),
    ("Оборудование и арматура НС/ВК/ПТ", ("tmw bolid uu z100 z150 z200 v100 v150 v200 ok80 ok100 ok32 zadv80 mano mano_ek kran3x kr25 kr32 "
                                         "gm80 bak50 ot108 ot159 ot219 otvod40 fl80 fl100 fl150 fl200 ros dren_ok sgon shkp45 shkp4").split()),
    ("Озеленение (растения, газон)", "pl_tuya_smar pl_blue pl_globozum pl_forz pl_klen_kr pl_golden pl_dub pl_bereza pl_topol pl_el pl_kiz pl_yasen gazon_rul".split()),
    ("Работы и услуги", ("exc vyvoz zasyp upl compact_base trench backfill_tr bedding monolit_w podg_w otmost_w lay_plitka lay_bord "
                         "fab_met mont_met mont_nas lay_rulon gidro_w ab_turnkey okras plant_work lay_gazon").split()),
])
KEY2GROUP = {k: gname for gname, ks in GROUPS.items() for k in ks}

IMPORTED_EQ = set("tmw bolid uu z100 z150 z200 v100 v150 v200 ok80 ok100 ok32 zadv80 mano mano_ek kran3x kr25 kr32 gm80 bak50 ros dren_ok sgon shkp45 shkp4".split())
VOLATILE = (set("ab_dense ab_porous bet_b10 bet_b15 bet_b25 bet_b30 ker arm a240 ugolok shveller list trprof tr vgp profnastil setka5 setka4 pvl406 "
                "ot108 ot159 ot219 otvod40 fl80 fl100 fl150 fl200 haul vyvoz exc ab_turnkey".split()) | IMPORTED_EQ)
RARE2 = set("tmw bolid uu shkp45 shkp4 bak50 mano_ek ros gm80 sgon".split())  # редкие / дилерские — допустимо меньше источников

BASE_OVERRIDE = {"haul": "₸/м³ (₸/рейс ÷ вместимость кузова)", "pvl406": "₸/м² (лист 1×2 м ÷ 2)",
                 "drymix": "₸/т (мешок 50 кг × 20) — ⚠ коэф. 34 в прошлом сборе, проверить"}
KEYS_ALL = OrderedDict()
for r in ROWS:
    KEYS_ALL.setdefault(r["key"], []).append(r)
POS = {}
for i, (k, rs) in enumerate(KEYS_ALL.items(), 1):
    base = next((x["base_unit"] for x in rs if x.get("base_unit")), None) or next((x["unit"] for x in rs if x["conv"] == 1), rs[0]["unit"])
    base = BASE_OVERRIDE.get(k, base)
    what = next((x["what"] for x in rs if x["what"]), k)
    uses = len(re.findall(r'M\(\s*["\']%s["\']' % re.escape(k), vor_src))
    POS[k] = dict(id=f"P{i:03d}", group=KEY2GROUP.get(k) or next((x["group"] for x in rs if x.get("group")), "Прочее"), name=what, base=base, uses=uses, vol=k in VOLATILE)
EMPTY_ROWS = [r for r in ROWS if not r["price"]]  # заглушки прошлого сбора без цены — в «Прайсы» не попадают
ROWS = [r for r in ROWS if r["price"]]
KEYS = OrderedDict((k, [r for r in ROWS if r["key"] == k]) for k in KEYS_ALL)

# ------------------------------------------------------------------ поставщики
SATU_SELLER_TYPE = "не определён (проверить на странице компании)"
DOMAIN_TYPE = {
    "asfaltcom.kz": "производитель (АБЗ)", "plants.kz": "производитель (питомник)", "www.greenmax.kz": "производитель (питомник)",
    "rbubeton.kz": "производитель (БРУ)", "spectehnica.kz": "подрядчик (спецтехника)", "obyavleniya.kaspi.kz": "подрядчик / частное объявление",
    "unisteel.kz": "оптовая база (металл)", "ma-metall.kz": "оптовая база (металл)", "ilt.kz": "производитель/подрядчик (проверить)",
    "almaty.truboproduct.kz": "оптовая база (трубы)", "concrete-market.kz": "посредник/агрегатор (бетон)", "kaz-jol.kz": "подрядчик (дорожные работы), блог",
}
KNOWN_BIN = {"asfaltcom.kz": "210940014609"}


def domain(u):
    return u.split("/")[2] if u.startswith("http") else ""


def clean_sup(s):
    s = re.sub(r"\s*\((?:Satu|Kaspi)[^)]*\)", "", s)
    s = re.sub(r"\s+—\s+.*$", "", s)
    return s.strip()


def seller_name(r):
    v = VU.get(r["url"], {})
    if v.get("seller"):
        return html.unescape(v["seller"])
    d = domain(r["url"])
    if "kaspi" in d:
        return "Kaspi-объявление: " + re.sub(r"^Kaspi Объявления:\s*", "", r["sup"])[:70] + " (" + r["url"].rsplit("-", 1)[-1] + ")"
    return html.unescape(clean_sup(r["sup"]))


SUP = OrderedDict()
for r in ROWS:
    nm = seller_name(r)
    key = nm.lower()
    if key not in SUP:
        d = domain(r["url"])
        v = VU.get(r["url"], {})
        form = "ТОО" if re.search(r"ТОО|TOO", nm) else ("ИП" if nm.startswith("ИП") else "")
        SUP[key] = dict(id=f"S{len(SUP)+1:03d}", name=nm, form=form,
                        type=DOMAIN_TYPE.get(d, SATU_SELLER_TYPE if "satu.kz" in d else "не определён"),
                        bin=next((b for dom, b in KNOWN_BIN.items() if dom in r["url"]), ""),
                        city=r["city"], site=("https://" + d) if "satu.kz" not in d and "kaspi" not in d else "",
                        company_url=v.get("company_url") or "", marketplace=("Satu.kz" if "satu.kz" in d else "Kaspi Объявления" if "kaspi" in d else ""),
                        keys=set(), n=0, urls=set())
    m = r.get("meta") or {}
    for fld_src, fld_dst in (("bin", "bin"), ("form", "form"), ("type", "type"), ("site", "site"), ("company_url", "company_url")):
        if m.get(fld_src) and (not SUP[key].get(fld_dst) or (fld_dst == "type" and str(SUP[key]["type"]).startswith("не определён"))):
            SUP[key][fld_dst] = m[fld_src]
    for fld in ("phone", "email", "whatsapp", "address"):
        if m.get(fld) and not SUP[key].get(fld):
            SUP[key][fld] = m[fld]
    SUP[key]["keys"].add(r["key"]); SUP[key]["n"] += 1; SUP[key]["urls"].add(r["url"])
    r["_sid"] = SUP[key]["id"]; r["_sname"] = nm; r["_stype"] = SUP[key]["type"]

_CNT = {re.sub(r"\s+", " ", (c.get("supplier_name") or "").lower()).strip(): c for c in CONTACTS}
for _s in SUP.values():
    c = _CNT.get(re.sub(r"\s+", " ", _s["name"].lower()).strip())
    if c:
        for fld in ("bin", "phone", "email", "whatsapp", "address", "site", "form", "type"):
            if c.get(fld):
                _s[fld] = c[fld]
        _s["contact_src"] = c.get("source_url", "")

# ------------------------------------------------------------------ разбор даты и проверка
def parse_date(r):
    v = VU.get(r["url"], {})
    txt = r["date"]
    if r.get("agent"):  # записи агентов: дата только из date_iso
        if not r.get("date_iso"):
            return None, "", None
        vu = datetime.date.fromisoformat(r["valid_until"]) if r.get("valid_until") else None
        return datetime.date.fromisoformat(r["date_iso"]), r.get("date_type", ""), vu
    if "просмотр" in txt or r.get("cls") == "L":  # дата просмотра ≠ дата цены (жёсткое правило 2)
        return None, "", None
    if "kaspi" in domain(r["url"]) and v.get("dateUpdate"):
        return datetime.date.fromisoformat(v["dateUpdate"]), "обновление (дата в разметке Kaspi: dateUpdate)", \
               datetime.date.fromisoformat(v["expiryDate"]) if v.get("expiryDate") else None
    m = re.search(r"обновлено (\d{4}-\d\d-\d\d)", txt)
    if m:
        m2 = re.search(r"до (\d{4}-\d\d-\d\d)", txt)
        return datetime.date.fromisoformat(m.group(1)), "обновление", datetime.date.fromisoformat(m2.group(1)) if m2 else None
    m = re.search(r"(\d\d)\.(\d\d)\.(20\d\d)", txt)
    if m:
        d = datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        tp = "прайс-лист" if "прайс" in txt else "обновление" if "обновлен" in txt.lower() else "публикация"
        return d, tp, None
    if "Осень 2026" in txt:
        return datetime.date(2026, 9, 1), "«на дату» (сезон осень 2026 → принято 01.09.2026, ДОПУЩЕНИЕ)", datetime.date(2026, 11, 30)
    return None, "", None


def verify(r):
    res = _verify(r)
    if r.get("agent") and res[0] in ("MISS", "FAIL", "CHANGED") and r.get("snapshot"):
        snap = os.path.join(ROOT, r["snapshot"])
        if os.path.exists(snap) and str(int(r["price"])) in re.sub(r"[\s\u00a0\u202f]", "", r.get("quote", "")):
            return "OK", "подтверждено цитатой и снимком агента (" + r["snapshot"] + "); живая проверка: " + res[1], True
    return res


def _verify(r):
    """-> (verdict_code, text, status_ok)"""
    v = VU.get(r["url"])
    if not v or v.get("status") != 200:
        return "FAIL", f"страница не открылась ({(v or {}).get('status') or (v or {}).get('error')})", False
    p = r["price"]
    rec = next((x for x in v["rec"] if x["key"] == r["key"] and x["price"] == p), None)
    if rec and (rec["in_ld"] or rec["in_text"]):
        return "OK", "цена совпала со страницей", True
    ld = v.get("ld_price") or []
    if any(abs(x * 1000 - p) < 1 for x in ld if x):
        return "OK", "совпала с пересчётом ₸/кг ×1000", True
    kt = v.get("kaspi_price_text")
    if kt and re.search(r"\d\s*[-–]\s*\d", kt):
        nums = [float(x.replace(" ", "")) for x in re.findall(r"\d[\d\s]*\d|\d", kt.replace(" ", " "))][:2]
        if len(nums) == 2:
            return "RANGE", f"на странице диапазон «{kt}»; в базу прошлого сбора внесена середина", True
    if "диапазон" in r["note"].lower() or "середина" in r["note"].lower():
        return "RANGE", "на странице диапазон цен; в базу внесена середина (см. примечание)", True
    if v.get("availability") == "PreOrder" and (not ld or all((x or 0) == 0 for x in ld)):
        return "HIDDEN", "цена на карточке сейчас не показана («спросите у менеджера», PreOrder)", False
    if ld and p not in ld:
        return "CHANGED", f"на странице сейчас {', '.join(str(int(x)) for x in ld[:2] if x)} ₸, записано {int(p)}", False
    return "MISS", "записанная цена на странице не найдена", False


def classify(r):
    code, vtxt, _ = verify(r)
    d, dtype, until = parse_date(r)
    fresh = 30 if r["key"] in VOLATILE else 90
    age = (TODAY - d).days if d else None
    is_from = "«от»" in r["note"] or r["note"].startswith("от ") or " от " in r["note"][:12]
    live = code in ("OK", "RANGE")
    if code == "FAIL":
        c, why = "D", "источник не открылся при сверке"
    elif code == "HIDDEN":
        c, why = "C", "цена на карточке не показана (по запросу) — прежнее значение не подтверждено"
    elif code in ("MISS", "CHANGED"):
        c, why = "D", "цена не подтверждена на странице: " + vtxt
    elif d is None:
        c, why = "D", "нет даты цены (карточка живая, но дата публикации не указана)"
    elif code == "RANGE" or is_from:
        c, why = "B", "диапазон/«от», а не точная цена"
    elif age > fresh:
        c, why = "B", f"дата {d:%d.%m.%Y}: {age} дн. > срока {fresh} дн."
    elif r["vat"] == "НДС не указан":
        c, why = "B", f"дата {d:%d.%m.%Y} свежая, но НДС на источнике не указан и не выяснен (для A нужен известный НДС/доставка)"
    else:
        c, why = "A", f"дата {d:%d.%m.%Y} ({age} дн. ≤ {fresh}), цена подтверждена, точная, НДС указан"
    return dict(code=code, vtxt=vtxt, date=d, dtype=dtype, until=until, age=age, fresh=fresh, cls=c, why=why, live=live)


for i, r in enumerate(ROWS, 1):
    r["_id"] = f"R{i:04d}"
    r["_c"] = classify(r)
    r["_pos"] = POS[r["key"]]["id"]

# выбросы / дубликаты среди A-строк по ключу
for k, rs in KEYS.items():
    a = [r for r in rs if r["_c"]["cls"] == "A"]
    seen = set()
    for r in a:
        sig = (r["_sid"], r["price"])
        if sig in seen:
            r["_c"]["cls"], r["_c"]["why"] = "D", "дубликат (тот же продавец и цена по другой ссылке)"
        seen.add(sig)
    a = [r for r in rs if r["_c"]["cls"] == "A"]
    if len(a) >= 3:
        med = statistics.median(x["ex"] for x in a)
        for r in a:
            if abs(r["ex"] - med) / med > 0.30:
                r["_c"]["outlier"] = True
for r in ROWS:
    r["_incl"] = r["_c"]["cls"] == "A" and not r["_c"].get("outlier")

# ------------------------------------------------------------------ сводка по ключам
SUM = OrderedDict()
for k, rs in KEYS.items():
    A = [r for r in rs if r["_incl"]]
    Asup = {r["_sid"] for r in A}
    B = [r for r in rs if r["_c"]["cls"] == "B"]
    Dl = [r for r in rs if r["_c"]["cls"] == "D" and r["_c"]["live"]]
    allv = [r for r in rs if r["_c"]["live"] and r["_c"]["cls"] in ("A", "B", "D")]  # все подтверждённые страницей
    med = lambda xs: round(statistics.median(xs), 2) if xs else None
    Ae = [r["ex"] for r in A]
    old = [r["ex"] for r in rs if r["sel"]]
    need = 1 if k in ("tmw", "bolid", "shkp45", "shkp4") else 2 if k in RARE2 else 3
    if len(Asup) >= need:
        status = "готово"
    elif len(Asup) >= 1:
        status = f"частично: A-поставщиков {len(Asup)} из {need} — доспросить"
    else:
        status = "нужен запрос (нет A-цены)"
    dates = [r["_c"]["date"] for r in A + B if r["_c"]["date"]]
    ve = [r["ex"] for r in allv]
    spread_all = (max(ve) - min(ve)) / statistics.median(ve) if len(ve) >= 2 and statistics.median(ve) else None
    spread_a = (max(Ae) - min(Ae)) / statistics.median(Ae) if len(Ae) >= 2 and statistics.median(Ae) else None
    expl = ""
    if spread_all and spread_all > 0.30:
        lo = min(allv, key=lambda r: r["ex"]); hi = max(allv, key=lambda r: r["ex"])
        expl = (f"низ {lo['ex']:,.0f}: {lo['_sname'][:38]} ({lo['_stype']}, {lo['unit']}, {lo['deliv']}); "
                f"верх {hi['ex']:,.0f}: {hi['_sname'][:38]} ({hi['_stype']}, {hi['unit']}, {hi['deliv']}). "
                "Что различает: марка/фракция/форма поставщика/доставка — проверить в «Прайсы» (ДОПУЩЕНИЕ: причины не подтверждены запросом)")
    SUM[k] = dict(A=A, Asup=len(Asup), B=B, Dl=Dl, n=len(rs), medA=med(Ae), minA=round(min(Ae), 2) if Ae else None,
                  maxA=round(max(Ae), 2) if Ae else None, spread_a=spread_a, newest=max(dates) if dates else None,
                  rec=med(Ae), ref=med([r["ex"] for r in B + Dl]), status=status, expl=expl, need=need, old=med(old),
                  spread_all=spread_all, medAll=med(ve), nAll=len(ve), nC=sum(1 for r in rs if r["_c"]["cls"] == "C"),
                  nD=sum(1 for r in rs if r["_c"]["cls"] == "D"))

# ------------------------------------------------------------------ Excel
HF = PatternFill("solid", fgColor="1F3A5F"); HFont = Font(bold=True, color="FFFFFF", name="Arial", size=10)
THIN = Side(style="thin", color="BBBBBB"); BR = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
CLS_FILL = {"A": "C6EFCE", "B": "FFEB9C", "C": "F8CBAD", "D": "D9D9D9"}
FNT = Font(name="Arial", size=9)


def header(ws, row, titles, widths):
    for i, t in enumerate(titles, 1):
        c = ws.cell(row, i, t); c.fill = HF; c.font = HFont; c.border = BR
        c.alignment = Alignment(wrap_text=True, vertical="center")
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[L(i)].width = w
    ws.row_dimensions[row].height = 42


def put(ws, row, vals, fmt=None):
    for i, v in enumerate(vals, 1):
        c = ws.cell(row, i, v); c.font = FNT; c.border = BR
        c.alignment = Alignment(wrap_text=True, vertical="top")
        if fmt and i in fmt:
            c.number_format = fmt[i]


def fd(d):
    return d.strftime("%d.%m.%Y") if d else ""


wb = Workbook()
# ---- 1 Справочник
ws = wb.active; ws.title = "Справочник позиций"
header(ws, 1, ["ID позиции", "Ключ", "Группа", "Наименование / характеристики (как в прошлом сборе)", "Базовая ед. (₸ без НДС)",
               "Срок актуальности, дн.", "Волатильная (30 дн.)", "Используется в ВОР Коктобе (число обращений M())",
               "Источников всего", "Источники и конверсии", "Синонимы / аналоги (аналог — только с разрешения)"],
       [10, 13, 26, 60, 30, 11, 11, 14, 11, 48, 30])
conv_notes = {}
for k, rs in KEYS.items():
    cs = sorted({f"{x['unit']} ×{x['conv']:.4g}" for x in rs if x["conv"] != 1})
    conv_notes[k] = "; ".join(cs)[:300]
rr = 2
for k, p in POS.items():
    put(ws, rr, [p["id"], k, p["group"], p["name"], p["base"], 30 if p["vol"] else 90, "да" if p["vol"] else "нет", p["uses"],
                 len(KEYS[k]), conv_notes[k] or "без пересчёта (единицы совпадают)", ""]); rr += 1
for ni, item in enumerate(REF, 1):  # позиции без цены КЗ
    put(ws, rr, [f"N{ni:02d}", "—", "Оборудование (цена КЗ не найдена)", item[0], "шт",
                 30, "да", "", 0, "нет цены КЗ за 2026; нужен запрос дилеру: " + item[2][:240], ""]); rr += 1
ws.freeze_panes = "C2"; ws.auto_filter.ref = f"A1:K{rr-1}"

SID = {v["id"]: v for v in SUP.values()}


def actual(r):
    c = r["_c"]
    if c["date"] is None:
        return "НЕТ ДАТЫ — актуальность не подтверждена"
    if c["until"] and c["until"] < TODAY:
        return f"ИСТЁК срок действия {fd(c['until'])}"
    left = c["fresh"] - c["age"]
    tail = f"; действует до {fd(c['until'])}" if c["until"] else ""
    if left >= 0:
        return f"АКТУАЛЬНО: цене {c['age']} дн., граница {c['fresh']} дн., осталось {left} дн.{tail}"
    return f"УСТАРЕЛО на {-left} дн.: цене {c['age']} дн., граница {c['fresh']} дн.{tail}"


def contacts_of(sd):
    parts = [x for x in (sd.get("phone"), sd.get("email"), ("WhatsApp " + sd["whatsapp"]) if sd.get("whatsapp") else "", sd.get("address")) if x]
    if sd.get("bin") == "210940014609" and not parts:
        parts = ["ABZ_karatas@bk.ru", "+7 702 662 99 99, +7 707 111 55 63, +7 707 662 99 99", "г. Алматы, ул. Спасская, 105/4"]
    return "; ".join(parts)


def contact_status(sd):
    if sd.get("phone") or sd.get("email") or sd.get("whatsapp") or contacts_of(sd):
        return "есть телефон/e-mail"
    if sd.get("company_url") or sd.get("site"):
        return "только страница компании/сайт (телефон не извлечён)"
    return "контактов нет (только страница объявления)"


ACT_FILL = {"АКТУАЛЬНО": "C6EFCE", "УСТАРЕЛО": "FFEB9C", "НЕТ ДАТЫ": "D9D9D9", "ИСТЁК": "F8CBAD"}


# ---- 2 Поставщики
ws = wb.create_sheet("Поставщики")
header(ws, 1, ["ID", "Название (как на источнике)", "Форма", "БИН", "Тип", "Площадка", "Город (по записи)", "Сайт", "Страница компании (публичная)",
               "Телефон / e-mail / WhatsApp", "Группы товаров", "Записей цен", "Условия по сайту", "Дата проверки", "Надёжность (A/B/C)", "Заметки", "Статус контактов", "Последняя дата цены", "Записей с датой / актуальных / без даты"],
       [8, 38, 7, 14, 24, 14, 16, 26, 38, 34, 28, 9, 30, 12, 11, 42, 26, 14, 20])
rr = 2
for s in SUP.values():
    groups = sorted({POS[k]["group"] for k in s["keys"] if k in POS})
    rel = "B" if (s["bin"] or (s["company_url"] and s["n"] >= 3)) else "C"
    contact = ""
    if s.get("phone") or s.get("email") or s.get("whatsapp"):
        contact = "; ".join(x for x in (s.get("phone"), s.get("email"), ("WhatsApp " + s["whatsapp"]) if s.get("whatsapp") else "", s.get("address")) if x) + (f" (источник: {s['contact_src']})" if s.get("contact_src") else "")
    elif s["bin"] == "210940014609":
        contact = "ABZ_karatas@bk.ru; +7 702 662 99 99, +7 707 111 55 63, +7 707 662 99 99 (из PDF-прайса, публично); г. Алматы, ул. Спасская, 105/4"
    elif s["marketplace"] == "Satu.kz" and not contact:
        contact = "телефон на Satu скрыт за кнопкой — не нажимал; см. страницу компании"
    elif s["marketplace"] == "Kaspi Объявления" and not contact:
        contact = "контакт в объявлении за кнопкой — не нажимал"
    note = "A (надёжность) присваивается вручную после проверки БИН в реестре и ЭСФ." if rel != "B" or not s["bin"] else "Прайс-лист АБЗ с БИН и датой; A после проверки БИН в реестре."
    put(ws, rr, [s["id"], s["name"], s["form"], s["bin"], s["type"], s["marketplace"], s["city"], s["site"], s["company_url"], contact,
                 "; ".join(groups), s["n"], "доставка/мин. заказ/оплата — на карточке не извлекались (см. запрос)", fd(TODAY), rel, note,
                 contact_status(s), fd(max([x["_c"]["date"] for x in ROWS if x["_sid"] == s["id"] and x["_c"]["date"]], default=None)),
                 "{} / {} / {}".format(sum(1 for x in ROWS if x["_sid"] == s["id"] and x["_c"]["date"]),
                                       sum(1 for x in ROWS if x["_sid"] == s["id"] and actual(x).startswith("АКТУАЛЬНО")),
                                       sum(1 for x in ROWS if x["_sid"] == s["id"] and not x["_c"]["date"]))]); rr += 1
ws.freeze_panes = "C2"; ws.auto_filter.ref = f"A1:S{rr-1}"

# ---- 3 Прайсы
ws = wb.create_sheet("Прайсы")
PH = ["ID записи", "ID позиции", "Ключ", "ID поставщика", "Поставщик", "Цена «как на сайте»", "Единица «как на сайте»", "НДС на сайте",
      "Доставка в цене", "Условия / примечание источника", "Коэф. приведения к базовой ед.", "Цена ₸ без НДС за базовую ед. (ФОРМУЛА)",
      "Формула пересчёта (текст)", "Дата цены", "Тип даты", "Срок действия до", "Источник (URL)", "Итоговый URL после редиректов",
      "Снимок/проверка (файл)", "Дата просмотра", "Сверка со страницей", "Возраст цены, дн.", "Срок актуальности, дн.", "Класс",
      "Причина класса", "Живая карточка (цена видна при сверке)", "Берём в расчёт", "Тип поставщика", "Город", "Дата «как в источнике»",
      "АКТУАЛЬНОСТЬ (статус)", "Контакты поставщика", "Страница компании / сайт", "Цитата даты/цены (агент)"]
header(ws, 1, PH, [9, 9, 11, 8, 30, 12, 16, 11, 16, 38, 11, 16, 30, 11, 22, 11, 44, 38, 24, 11, 36, 8, 9, 7, 40, 11, 9, 22, 14, 30, 40, 44, 40, 40])
ws.cell(1, 12).comment = Comment("Формула: =ЕСЛИ(НДС='с НДС'; цена×коэф/1,16; цена×коэф). НДС РК 16% (НК РК № 214-VIII с 01.01.2026). "
                                 "Если НДС на сайте не указан — принято «без НДС» (ДОПУЩЕНИЕ, консервативно; уточнить в запросе).", "price_base")
rr = 2
for r in ROWS:
    c = r["_c"]; v = VU.get(r["url"], {})
    ftxt = f"{r['price']:g} {r['unit']} × {r['conv']:.6g}" + (" ÷ 1,16 (НДС 16%)" if r["vat"] == "с НДС" else " (НДС не указан → без НДС)")
    vals = [r["_id"], r["_pos"], r["key"], r["_sid"], r["_sname"], r["price"], r["unit"], r["vat"], r["deliv"], r["note"], r["conv"],
            f'=IF(H{rr}="с НДС",F{rr}*K{rr}/1.16,F{rr}*K{rr})', ftxt, fd(c["date"]), c["dtype"], fd(c["until"]), r["url"], v.get("final", ""),
            os.path.relpath(vf, ROOT), fd(TODAY), c["vtxt"], c["age"], c["fresh"], c["cls"], c["why"] + (" · ВЫБРОС >30% от медианы A" if c.get("outlier") else ""),
            "да" if c["live"] else "нет", "да" if r["_incl"] else "нет", r["_stype"], r["city"], r["date"],
            actual(r), contacts_of(SID[r["_sid"]]) or contact_status(SID[r["_sid"]]), SID[r["_sid"]].get("company_url") or SID[r["_sid"]].get("site") or "", (r.get("quote") or "")[:300]]
    put(ws, rr, vals, {6: "#,##0.00", 12: "#,##0.00", 11: "0.####"})
    _a = actual(r)
    ws.cell(rr, 31).fill = PatternFill("solid", fgColor=next(v for k, v in ACT_FILL.items() if _a.startswith(k)))
    ws.cell(rr, 24).fill = PatternFill("solid", fgColor=CLS_FILL[c["cls"]])
    rr += 1
LASTP = rr - 1
ws.freeze_panes = "F2"; ws.auto_filter.ref = f"A1:{L(len(PH))}{LASTP}"
dv = DataValidation(type="list", formula1='"A,B,C,D"', allow_blank=False); ws.add_data_validation(dv); dv.add(f"X2:X{LASTP}")
dv2 = DataValidation(type="list", formula1='"да,нет"'); ws.add_data_validation(dv2); dv2.add(f"AA2:AA{LASTP}"); dv2.add(f"Z2:Z{LASTP}")
dv3 = DataValidation(type="list", formula1='"с НДС,без НДС,НДС не указан"'); ws.add_data_validation(dv3); dv3.add(f"H2:H{LASTP}")
UNITS = sorted({r["unit"] for r in ROWS})
# лист со списками для выпадающих единиц
wl = wb.create_sheet("Списки")
for i, u in enumerate(UNITS, 1):
    wl.cell(i, 1, u)
dv4 = DataValidation(type="list", formula1=f"=Списки!$A$1:$A${len(UNITS)}", allow_blank=True)
ws.add_data_validation(dv4); dv4.add(f"G2:G{LASTP}")

# ---- 3б Предложения: всё в одной строке (позиция, поставщик, контакты, ссылка, дата, актуальность)
wo = wb.create_sheet("Предложения")
OH = ["ID записи", "Позиция", "Группа", "Поставщик", "Тип поставщика", "Город", "Цена «как на сайте»", "Ед. на сайте", "НДС на сайте", "Доставка",
      "₸ без НДС за баз. ед.", "Базовая ед.", "Дата цены", "Тип даты", "Возраст, дн.", "АКТУАЛЬНОСТЬ", "Действует до", "Класс", "В расчёт",
      "Телефон / e-mail / адрес", "Статус контактов", "Сайт / страница компании", "БИН", "Ссылка на источник цены", "Снимок", "Сверка со страницей (дата сверки)"]
header(wo, 1, OH, [9, 40, 24, 30, 22, 12, 11, 12, 11, 20, 12, 14, 11, 20, 8, 44, 11, 6, 7, 46, 26, 36, 14, 52, 24, 40])
_ord = {"A": 0, "B": 1, "C": 2, "D": 3}
rr = 2
for r in sorted(ROWS, key=lambda x: (POS[x["key"]]["id"], _ord[x["_c"]["cls"]], x["ex"])):
    c = r["_c"]; sd = SID[r["_sid"]]
    put(wo, rr, [r["_id"], POS[r["key"]]["name"], POS[r["key"]]["group"], r["_sname"], r["_stype"], r["city"], r["price"], r["unit"], r["vat"], r["deliv"],
                 round(r["ex"], 2), POS[r["key"]]["base"], fd(c["date"]), c["dtype"], c["age"], actual(r), fd(c["until"]), c["cls"], "да" if r["_incl"] else "нет",
                 contacts_of(sd), contact_status(sd), sd.get("company_url") or sd.get("site") or "", sd.get("bin") or "", r["url"], r.get("snapshot") or "",
                 f"{c['vtxt']} ({fd(TODAY)})"], {7: "#,##0.00", 11: "#,##0.00"})
    _a = actual(r)
    wo.cell(rr, 16).fill = PatternFill("solid", fgColor=next(v for k, v in ACT_FILL.items() if _a.startswith(k)))
    wo.cell(rr, 18).fill = PatternFill("solid", fgColor=CLS_FILL[c["cls"]])
    rr += 1
wo.freeze_panes = "E2"; wo.auto_filter.ref = f"A1:{L(len(OH))}{rr-1}"

# ---- 4 Сводка
ws = wb.create_sheet("Сводка")
SH = ["ID позиции", "Группа", "Позиция", "Базовая ед.", "Записей всего", "A-поставщиков", "B", "C", "D", "Медиана A, ₸ без НДС", "Min A", "Max A",
      "Разброс A, %", "Самая свежая дата (A/B)", "РЕКОМЕНДУЕМАЯ цена в расчёт, ₸ без НДС", "Ориентир (B + живые без даты), ₸ без НДС",
      "Прежняя цена в ВОР (медиана всех выбранных), ₸", "Δ ориентира/рек. к прежней, %", "Разброс по всем подтверждённым страницей, %",
      "Статус", "Чем объясняется разброс (>30%)"]
header(ws, 1, SH, [9, 26, 44, 24, 8, 9, 6, 6, 6, 13, 11, 11, 9, 12, 16, 16, 16, 11, 12, 34, 70])
ws.cell(1, 15).comment = Comment("Медиана по A-ценам (свежая дата, точная цена, подтверждена на странице), после исключения выбросов >30%. "
                                 "Пусто — нет A-цены, нужен запрос.", "price_base")
rr = 2
for k, s in SUM.items():
    p = POS[k]
    cmp_val = s["rec"] if s["rec"] is not None else s["ref"]
    delta = ((cmp_val - s["old"]) / s["old"]) if (cmp_val and s["old"]) else None
    put(ws, rr, [p["id"], p["group"], p["name"], p["base"], s["n"], s["Asup"], len(s["B"]), s["nC"], s["nD"], s["medA"], s["minA"], s["maxA"],
                 s["spread_a"], fd(s["newest"]), s["rec"], s["ref"], s["old"], delta, s["spread_all"], s["status"], s["expl"]],
        {10: "#,##0.00", 11: "#,##0.00", 12: "#,##0.00", 13: "0%", 15: "#,##0.00", 16: "#,##0.00", 17: "#,##0.00", 18: "0%", 19: "0%"})
    st = ws.cell(rr, 20)
    st.fill = PatternFill("solid", fgColor="C6EFCE" if s["status"] == "готово" else "FFEB9C" if s["status"].startswith("частично") else "F8CBAD")
    rr += 1
ws.freeze_panes = "D2"; ws.auto_filter.ref = f"A1:{L(len(SH))}{rr-1}"

# ---- 5 История
ws = wb.create_sheet("История")
header(ws, 1, ["ID позиции", "Позиция", "ID поставщика", "Поставщик", "Дата цены (или дата просмотра, если даты нет)", "Цена ₸ без НДС за баз. ед.", "Класс",
               "Событие"], [9, 40, 9, 32, 18, 16, 7, 40])
rr = 2
for r in ROWS:
    if r["_c"]["code"] in ("OK", "RANGE"):
        c = r["_c"]
        put(ws, rr, [r["_pos"], POS[r["key"]]["name"], r["_sid"], r["_sname"], fd(c["date"] or TODAY), round(r["ex"], 2), c["cls"],
                     f"первичная запись; сверка {fd(TODAY)}" + ("" if c["date"] else " (дата цены неизвестна)")], {6: "#,##0.00"}); rr += 1
ws.cell(rr + 1, 1, "Новые записи добавляются ниже; старые не затираются (режим «обнови базу»).").font = Font(italic=True, name="Arial", size=9)
ws.freeze_panes = "A2"

# ---- 6 Запросы (заполняется после формирования писем)
wq = wb.create_sheet("Запросы")

# ---- 8 Сверка источников
ws = wb.create_sheet("Сверка источников")
header(ws, 1, ["URL", "HTTP", "Итоговый URL", "Тип", "Заголовок страницы", "Продавец (Satu)", "Наличие (schema.org)", "Цена в разметке", "Даты в разметке",
               "Записей использует", "Результат сверки"], [52, 6, 44, 6, 40, 24, 12, 14, 24, 9, 44])
rr = 2
for u, v in VU.items():
    rs = [r for r in ROWS if r["url"] == u]
    verd = "; ".join(sorted({r["_c"]["vtxt"] for r in rs}))
    dts = ", ".join(x for x in [v.get("dateCreate"), v.get("dateUpdate"), v.get("expiryDate")] + (v.get("dates_ld") or []) if x)
    put(ws, rr, [u, v.get("status"), v.get("final") if v.get("final") != u else "", v.get("kind"), v.get("title"), v.get("seller"), v.get("availability"),
                 ", ".join(str(int(x)) for x in (v.get("ld_price") or []) if x is not None) or (v.get("kaspi_price_text") or ""), dts, len(rs), verd]); rr += 1
ws.freeze_panes = "B2"; ws.auto_filter.ref = f"A1:K{rr-1}"

# ---- Контроль (госзакуп / ССЦ / stat.gov) — НЕ в расчёт
ws = wb.create_sheet("Контроль (сверка)")
header(ws, 1, ["Ключ позиции", "Позиция", "Источник контроля", "Значение источника", "Ед.", "НДС", "Коэф.", "₸ без НДС за баз. ед.", "Дата источника", "Рыночная цена базы (рек. или ориентир), ₸ без НДС",
               "Δ, %", "Флаг >30%", "URL", "Цитата", "Примечание"], [12, 36, 18, 14, 14, 10, 8, 14, 12, 18, 8, 10, 40, 50, 30])
rr = 2
for c in CONTROL:
    k = c.get("key"); sm = SUM.get(k)
    try:
        exv = c["value"] * c.get("conv", 1) / (1.16 if c.get("vat") == "с НДС" else 1.0)
    except Exception:
        continue
    mk = (sm["rec"] if sm and sm["rec"] is not None else sm["ref"] if sm else None)
    dl = (exv - mk) / mk if mk else None
    put(ws, rr, [k, POS[k]["name"] if k in POS else "", c.get("source"), c.get("value"), c.get("unit"), c.get("vat"), c.get("conv", 1), round(exv, 2), c.get("date_iso"), mk, dl,
                 "ДА" if dl is not None and abs(dl) > 0.30 else "", c.get("url"), (c.get("quote") or "")[:300], c.get("note")], {8: "#,##0.00", 10: "#,##0.00", 11: "0%"}); rr += 1
ws.freeze_panes = "C2"

# ---- сохранить рабочие структуры для генератора писем
import pickle
STATE = dict(SUM={k: {kk: vv for kk, vv in s.items() if kk not in ("A", "B", "Dl")} for k, s in SUM.items()}, POS=POS,
             SUP={v["id"]: {kk: (sorted(vv) if isinstance(vv, set) else vv) for kk, vv in v.items()} for v in SUP.values()},
             ROWS=[dict(id=r["_id"], key=r["key"], pos=r["_pos"], sid=r["_sid"], sname=r["_sname"], stype=r["_stype"], price=r["price"], unit=r["unit"],
                        ex=r["ex"], cls=r["_c"]["cls"], code=r["_c"]["code"], url=r["url"], date=fd(r["_c"]["date"]), vtxt=r["_c"]["vtxt"],
                        live=r["_c"]["live"], incl=r["_incl"], city=r["city"], deliv=r["deliv"]) for r in ROWS],
             REF=REF, WARN=LOAD_WARN, VDATE=V["date"], vf=os.path.relpath(vf, ROOT))
pickle.dump(STATE, open(os.path.join(ROOT, "data", "state.pkl"), "wb"))
wb._state = STATE
wb.calculation.fullCalcOnLoad = True
OUTX = os.path.join(ROOT, "price_base_KZ.xlsx")
wb.save(OUTX)
print("saved", OUTX)
import collections
print("классы:", collections.Counter(r["_c"]["cls"] for r in ROWS))
print("вердикты:", collections.Counter(r["_c"]["code"] for r in ROWS))
print("статусы:", collections.Counter(s["status"].split(":")[0] for s in SUM.values()))
