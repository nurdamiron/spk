# -*- coding: utf-8 -*-
"""
Единая загрузка записей цен:
  1) прошлый сбор: kp-koktobe-138/scripts/research_kz_2026.py (ROWS, REF)
  2) записи агентов: data/agent_out/*.json  (схема: agents/_RECORD_SCHEMA.md)
       prices_*.json   — записи цен (приводятся к формату ROWS)
       contacts_*.json — публичные контакты/реквизиты поставщиков
       control_*.json  — контрольные цены (госзакуп/ССЦ/stat) — в расчёт НЕ идут
Некорректные записи агентов НЕ загружаются, причины попадают в WARN (и в журнал).
"""
import glob, json, os, re, runpy, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
RESEARCH = os.path.join(ROOT, "..", "kp-koktobe-138", "scripts", "research_kz_2026.py")
AGENT_DIR = os.path.join(ROOT, "data", "agent_out")

VAT_OK = {"с НДС", "без НДС", "НДС не указан"}
REQUIRED = ["key", "position_name", "supplier", "price", "unit", "vat", "delivery", "conv", "url", "quote", "viewed_at"]
BAD_HOSTS = (".ru/", ".by/", ".cn/", ".com.cn", "alibaba", "1688.", "yandex", "avito", "wildberries", "ozon.")


def check_record(rec):
    """-> список ошибок (пусто = запись допустима)"""
    e = []
    for f in REQUIRED:
        if rec.get(f) in (None, "", []):
            e.append(f"нет поля {f}")
    if e:
        return e
    if not isinstance(rec["price"], (int, float)) or rec["price"] <= 0:
        e.append("price должна быть числом > 0")
    if rec["vat"] not in VAT_OK:
        e.append(f"vat ∈ {sorted(VAT_OK)}")
    if not isinstance(rec["conv"], (int, float)) or rec["conv"] <= 0:
        e.append("conv должен быть числом > 0")
    if rec["conv"] != 1 and not rec.get("conv_source"):
        e.append("conv≠1 требует conv_source (норма/ГОСТ/карточка)")
    url = rec["url"]
    if not re.match(r"https?://", url):
        e.append("url должен быть http(s)")
    elif any(b in url.lower() + "/" for b in BAD_HOSTS):
        e.append("источник не из РК (правило 1)")
    sup = rec["supplier"]
    if not isinstance(sup, dict) or not sup.get("name"):
        e.append("supplier.name обязателен")
    di = rec.get("date_iso")
    if di:
        try:
            d = datetime.date.fromisoformat(di)
            if d > datetime.date.today() + datetime.timedelta(days=1):
                e.append("date_iso в будущем")
            if rec.get("viewed_at", "")[:10] == di and rec.get("date_type") not in ("публикация", "обновление", "прайс-лист", "КП", "на дату"):
                e.append("date_iso совпадает с датой просмотра — укажите реальный date_type источника, иначе дата не принимается")
        except ValueError:
            e.append("date_iso не ISO (ГГГГ-ММ-ДД)")
        if not rec.get("date_type"):
            e.append("date_iso требует date_type")
        if not rec.get("date_quote"):
            e.append("date_iso требует date_quote — точную цитату/место даты на источнике (например «Прайс-лист с 01.03.2026», «dateUpdate:2026-11-02»)")
    if rec.get("quote") and str(int(rec["price"])) not in re.sub(r"[\s  ]", "", rec["quote"]):
        e.append("quote не содержит цену (цитата должна быть точной)")
    if isinstance(sup, dict) and not any(sup.get(f) for f in ("phone", "email", "whatsapp", "address", "site", "company_url")) and not rec.get("contact_note"):
        e.append("нет публичных контактов поставщика: заполните supplier.phone/email/address/site/company_url либо contact_note с причиной «не найдены»")
    return e


def load_all(verbose=True):
    g = runpy.run_path(RESEARCH)
    rows, ref = list(g["ROWS"]), list(g["REF"])
    contacts, control, warn = [], [], []
    for f in sorted(glob.glob(os.path.join(AGENT_DIR, "*.json"))):
        name = os.path.basename(f)
        try:
            data = json.load(open(f, encoding="utf-8"))
        except Exception as ex:
            warn.append(f"{name}: не читается JSON ({ex})"); continue
        if not isinstance(data, list):
            warn.append(f"{name}: ожидается JSON-массив"); continue
        if name.startswith("contacts_"):
            contacts += data
        elif name.startswith("control_"):
            control += [dict(x, _file=name) for x in data]
        elif name.startswith("prices_"):
            for i, rec in enumerate(data):
                errs = check_record(rec)
                if errs:
                    warn.append(f"{name}[{i}] {rec.get('key')} {rec.get('supplier', {}).get('name', '')}: " + "; ".join(errs)); continue
                sup = rec["supplier"]
                vat = rec["vat"]
                ex = rec["price"] * rec["conv"] / (1.16 if vat == "с НДС" else 1.0)
                note = (rec.get("note") or "") + (" | " if rec.get("note") else "") + "цитата: «" + rec["quote"][:200] + "»"
                if rec.get("volume_condition"):
                    note += " | условие объёма: " + rec["volume_condition"]
                if rec.get("conv_source"):
                    note += " | конверсия: " + rec["conv_source"]
                rows.append(dict(
                    key=rec["key"], what=rec["position_name"], sup=sup["name"], city=sup.get("city") or rec.get("region") or "Алматы",
                    url=rec["url"], date=rec.get("date_iso") or "", cls="A" if rec.get("date_iso") else "L", unit=rec["unit"],
                    price=rec["price"], vat=vat, deliv=rec["delivery"], avail=rec.get("availability", ""), conv=rec["conv"], ex=ex,
                    sel=True, note=note, agent=name, meta=sup, group=rec.get("group"), base_unit=rec.get("base_unit"),
                    date_iso=rec.get("date_iso"), date_quote=rec.get("date_quote"), contact_note=rec.get("contact_note"), date_type=rec.get("date_type"), valid_until=rec.get("valid_until"),
                    snapshot=rec.get("snapshot"), quote=rec["quote"], viewed_at=rec["viewed_at"]))
        else:
            warn.append(f"{name}: имя файла должно начинаться с prices_/contacts_/control_ — пропущен")
    if verbose and warn:
        print(f"ВНИМАНИЕ: отклонено/пропущено {len(warn)} записей агентов:")
        for w in warn[:30]:
            print("  -", w)
    return rows, ref, contacts, control, warn


if __name__ == "__main__":
    r, ref, c, k, w = load_all()
    print(f"строк: {len(r)} (в т.ч. агентских {sum(1 for x in r if x.get('agent'))}); контактов: {len(c)}; контрольных: {len(k)}; отклонено: {len(w)}")
