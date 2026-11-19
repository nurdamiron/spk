# -*- coding: utf-8 -*-
"""
Выгрузка базы цен для сайта: price_base_KZ.xlsx -> data/export/price_base.json
(позиции, поставщики, записи цен, сводка). Читает значения листов «Справочник позиций», «Сводка», «Поставщики», «Прайсы».
Колонка «₸ без НДС» в xlsx — формула без кэша, поэтому считается здесь тем же правилом: цена × коэф / (1,16 если «с НДС»).
Запуск: python3 export_json.py
"""
import datetime, json, os, re
from openpyxl import load_workbook

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
wb = load_workbook(os.path.join(ROOT, "price_base_KZ.xlsx"), data_only=True)


def sheet_rows(name):
    ws = wb[name]
    head = [str(c.value or "").strip() for c in ws[1]]
    for row in ws.iter_rows(min_row=2, values_only=True):
        if all(v in (None, "") for v in row):
            continue
        yield {h: v for h, v in zip(head, row)}


def iso(d):
    if not d:
        return None
    s = str(d).strip()
    m = re.match(r"(\d\d)\.(\d\d)\.(\d{4})", s)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return s[:10] if re.match(r"\d{4}-\d\d-\d\d", s) else None


def num(v):
    try:
        return None if v in (None, "") else float(v)
    except Exception:
        return None


def txt(v):
    return None if v in (None, "") else str(v).strip()


# ---- позиции
summ = {r["ID позиции"]: r for r in sheet_rows("Сводка")}
ref = {r["ID позиции"]: r for r in sheet_rows("Справочник позиций") if str(r["ID позиции"]).startswith("P")}
positions = []
for pid, s in summ.items():
    r = ref.get(pid, {})
    positions.append(dict(
        pid=pid, key=txt(r.get("Ключ")) or pid, grp=txt(s["Группа"]), name=txt(s["Позиция"]), base_unit=txt(s["Базовая ед."]),
        volatile=(r.get("Волатильная (30 дн.)") == "да"), fresh_days=int(r.get("Срок актуальности, дн.") or 90),
        n_records=int(s["Записей всего"] or 0), a_suppliers=int(s["A-поставщиков"] or 0),
        median_a=num(s["Медиана A, ₸ без НДС"]), min_a=num(s["Min A"]), max_a=num(s["Max A"]), spread_a=num(s["Разброс A, %"]),
        newest=iso(s["Самая свежая дата (A/B)"]), rec_price=num(s["РЕКОМЕНДУЕМАЯ цена в расчёт, ₸ без НДС"]),
        ref_price=num(s["Ориентир (B + живые без даты), ₸ без НДС"]), old_price=num(s["Прежняя цена в ВОР (медиана всех выбранных), ₸"]),
        status=txt(s["Статус"]), explanation=txt(s["Чем объясняется разброс (>30%)"]),
        spread_all=num(s["Разброс по всем подтверждённым страницей, %"])))
pos_by_pid = {p["pid"]: p for p in positions}

# ---- поставщики
suppliers = []
for r in sheet_rows("Поставщики"):
    contact = txt(r.get("Телефон / e-mail / WhatsApp"))
    suppliers.append(dict(
        id=txt(r["ID"]), name=txt(r["Название (как на источнике)"]), form=txt(r.get("Форма")), bin=txt(r.get("БИН")), type=txt(r.get("Тип")),
        marketplace=txt(r.get("Площадка")), city=txt(r.get("Город (по записи)")), site=txt(r.get("Сайт")), company_url=txt(r.get("Страница компании (публичная)")),
        contacts_raw=contact, grp=txt(r.get("Группы товаров")), n_records=int(r.get("Записей цен") or 0), reliability=txt(r.get("Надёжность (A/B/C)")),
        contact_status=txt(r.get("Статус контактов")), last_price_date=iso(r.get("Последняя дата цены")), note=txt(r.get("Заметки"))))

# ---- записи
records = []
for r in sheet_rows("Прайсы"):
    price, conv = num(r["Цена «как на сайте»"]), num(r["Коэф. приведения к базовой ед."]) or 1.0
    vat = txt(r["НДС на сайте"])
    ex = None if price is None else price * conv / (1.16 if vat == "с НДС" else 1.0)
    act = txt(r.get("АКТУАЛЬНОСТЬ (статус)")) or ""
    kind = ("actual" if act.startswith("АКТУАЛЬНО") else "stale" if act.startswith("УСТАРЕЛО") else "expired" if act.startswith("ИСТЁК") else "nodate")
    records.append(dict(
        id=txt(r["ID записи"]), pid=txt(r["ID позиции"]), position_key=txt(r["Ключ"]), supplier_id=txt(r["ID поставщика"]),
        price=price, unit=txt(r["Единица «как на сайте»"]), vat=vat, delivery=txt(r["Доставка в цене"]), conv=conv, ex_vat=ex,
        price_date=iso(r.get("Дата цены")), date_type=txt(r.get("Тип даты")), valid_until=iso(r.get("Срок действия до")),
        age_days=(int(r["Возраст цены, дн."]) if r.get("Возраст цены, дн.") not in (None, "") else None),
        fresh_days=(int(r["Срок актуальности, дн."]) if r.get("Срок актуальности, дн.") not in (None, "") else None),
        actuality=act, act_kind=kind, cls=txt(r["Класс"]), class_reason=txt(r.get("Причина класса")), in_calc=(r.get("Берём в расчёт") == "да"),
        url=txt(r.get("Источник (URL)")), final_url=txt(r.get("Итоговый URL после редиректов")), snapshot=None,
        quote=txt(r.get("Цитата даты/цены (агент)")), check_text=txt(r.get("Сверка со страницей")), live=(r.get("Живая карточка (цена видна при сверке)") == "да"),
        region=txt(r.get("Город")), note=txt(r.get("Условия / примечание источника"))))

# ---- простые цифры по позиции: только подтверждённые на странице предложения (live), медиана и размах
import statistics
by_pid = {}
for r in records:
    if r["live"] and r["ex_vat"]:
        by_pid.setdefault(r["pid"], []).append(r["ex_vat"])
for p_ in positions:
    v = by_pid.get(p_["pid"], [])
    p_["n_live"] = len(v)
    p_["med_live"] = round(statistics.median(v), 2) if v else None
    p_["min_live"] = round(min(v), 2) if v else None
    p_["max_live"] = round(max(v), 2) if v else None

out = dict(built_at=datetime.datetime.now().isoformat(timespec="seconds"), positions=positions, suppliers=suppliers, records=records)
os.makedirs(os.path.join(ROOT, "data", "export"), exist_ok=True)
p = os.path.join(ROOT, "data", "export", "price_base.json")
json.dump(out, open(p, "w", encoding="utf-8"), ensure_ascii=False)
print(f"positions {len(positions)} suppliers {len(suppliers)} records {len(records)} -> {p} ({os.path.getsize(p)//1024} KB)")
import collections
print(collections.Counter(r["cls"] for r in records), collections.Counter(r["act_kind"] for r in records))
