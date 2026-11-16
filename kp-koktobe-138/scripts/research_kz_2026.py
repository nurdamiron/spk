# -*- coding: utf-8 -*-
"""
Исследование цен поставщиков/подрядчиков Республики Казахстан, 2026 год (просмотр 16.11.2026).

Строка = поставщик × компонент. Выбранные строки (sel=True) дают медиану цены в ₸ без НДС,
которая подставляется в build_vor.py через M(key).

Класс подтверждения даты:
  A — у прайса/страницы есть дата 2026 (прайс «с 01.03.2026», «информация обновлена 20.06.2026», статья от 14.07.2026 и т.п.)
  L — «живая» карточка товара/услуги казахстанского поставщика (Satu.kz, сайт компании) на момент просмотра
      16.11.2026: цена и наличие показаны, но дата публикации на странице НЕ указана.
      По жёсткому правилу заказчика «без даты — не принимать» это спорные цены: в xlsx выделены классом L,
      итог считается и с ними, и в отчёте приведена доля A и L.

База: ₸ без НДС. Если источник НДС не указал — принято как «без НДС» (консервативно, пометка «НДС не указан»).
"""
import statistics

LIVE = "16.11.2026 (просмотр; живая карточка, дата публикации не указана)"
ROWS = []


def r(key, sup, city, url, unit, price, vat="НДС не указан", deliv="не указана", avail="в наличии",
      conv=1.0, cls="L", date=None, note="", sel=True, what=""):
    """conv — множитель приведения к единице расчёта (напр. 1.36 т/м³, 1/20 за рейс 20 м³)."""
    base = price * conv / (1.16 if vat == "с НДС" else 1.0)
    ROWS.append(dict(key=key, what=what, sup=sup, city=city, url=url, date=date or LIVE, cls=cls, unit=unit,
                     price=price, vat=vat, deliv=deliv, avail=avail, conv=conv, ex=base, sel=sel, note=note))


def S(pid, slug="x"):
    return f"https://satu.kz/p{pid}-{slug}.html"


ALM = "Алматы"

# ---------------------------------------------------------------- асфальтобетон (₸/т)
r("ab_dense", "АБЗ «Каратас» (БИН 210940014609)", ALM, "https://asfaltcom.kz/files/karatas-price-2026-03-01.pdf", "₸/т", 30500, "с НДС",
  "самовывоз с АБЗ (доставка по запросу)", "прайс", cls="A", date="прайс-лист с 01.03.2026", what="Асфальтобетон горячий плотный м/з тип Б, м.1 (фр. 5–20)")
r("ab_dense", "TOO «ASFALTCOM.KZ» (Satu)", ALM, S(123559081, "asfaltobetonnye-smesi"), "₸/т", 25300, what="Горячая плотная м/з см. тип Б, м.1 (фр. 5–20)")
r("ab_dense", "KAZJOL (блог/прайс)", ALM, "https://kaz-jol.kz/blog/cena-asfalta-za-tonnu-almaty/", "₸/т", 31500, "НДС не указан",
  "без доставки", "ориентир", cls="A", date="публикация 14.07.2026",
  note="Диапазон на странице 28 000–35 000 ₸/т (мелкозернистая тип Б); взята середина диапазона", what="Асфальтобетон мелкозернистый тип Б")
r("ab_porous", "АБЗ «Каратас» (БИН 210940014609)", ALM, "https://asfaltcom.kz/files/karatas-price-2026-03-01.pdf", "₸/т", 28900, "с НДС",
  "самовывоз с АБЗ (доставка по запросу)", "прайс", cls="A", date="прайс-лист с 01.03.2026", what="Асфальтобетон горячий пористый к/з, м.1 (без мин. порошка)")
r("ab_porous", "TOO «ASFALTCOM.KZ» (Satu)", ALM, S(123559099, "asfaltobetonnye-smesi"), "₸/т", 23200, what="Горячая пористая к/з см. м.1")

# ---------------------------------------------------------------- нерудные материалы (₸/м³)
W = "Щебень 20–40 / 40–70"
r("sheben", "MG Group (Satu)", ALM, S(134588415, "scheben"), "₸/м³", 2800, what="Щебень 20–40")
r("sheben", "TASYMA.KZ (Satu)", ALM, S(116644787, "scheben"), "₸/м³", 3000, what="Щебень 20–40")
r("sheben", "TASYMA.KZ (Satu)", ALM, S(129881884, "scheben-136"), "₸/т", 2600, conv=1.36, note="«от»; 1,36 т/м³ — по карточке", what="Щебень 20–40")
r("sheben", "TASYMA.KZ (Satu), Иссык Тас", ALM, S(128765055, "scheben-issyk-tas"), "₸/т", 2200, conv=1.36, note="плотность 1,36 по соседней карточке Tasyma", what="Щебень 20–40")
r("sheben", "ТОО Прэвайд (Satu)", ALM, S(108232816, "scheben"), "₸/т", 5214, conv=1.36, note="плотность 1,36 т/м³ принята по Tasyma", what="Щебень 20–40")
r("sheben", "MG Group (Satu)", ALM, S(134588507, "scheben"), "₸/м³", 4200, what="Щебень 40–70")
r("sheben", "TASYMA.KZ (Satu)", ALM, S(124202183, "scheben"), "₸/м³", 3000, what="Щебень 40–70")
r("sheben", "TASYMA.KZ (Satu)", ALM, S(129881894, "scheben-1335"), "₸/т", 4200, conv=1.335, note="«от»; 1,335 т/м³ по карточке", what="Щебень 40–70")
r("sheben", "TASYMA.KZ (Satu), Тас Кум", ALM, S(128787199, "scheben-tas-kum"), "₸/т", 3600, conv=1.335, what="Щебень 40–70")
r("haul", "TASYMA.KZ (Satu) — самосвал до 30 т / 20 м³", ALM, S(129898320, "samosval"), "₸/рейс", 40000, conv=1 / 20, deliv="услуга доставки", note="«от 40 000 ₸/рейс», 20 м³ по карточке", what="Доставка сыпучих (самосвал) по Алматы")
r("haul", "TASYMA.KZ (Satu) — самосвал до 25 т / 16 м³", ALM, S(129027018, "samosval"), "₸/рейс", 35000, conv=1 / 16, deliv="услуга доставки", what="Доставка сыпучих (самосвал) по Алматы")
r("haul", "ТОО Прэвайд (Satu) — Хово", ALM, S(111017648, "dostavka-hovo-pesok"), "₸/рейс", 65000, conv=1 / 20, deliv="услуга доставки", sel=False,
  note="вместимость Хово в карточке не указана (при 20 м³ → 3 250 ₸/м³) — в расчёт не взято")
r("pesok", "TASYMA.KZ (Satu), мытый фр. 1,9", ALM, S(116671024, "pesok-mytyj-fraktsiya"), "₸/м³", 2000, note="«от»", what="Песок мытый")
r("pesok", "TASYMA.KZ (Satu), мытый фр. 0,9", ALM, S(116644843, "pesok-mytyj-fraktsiya"), "₸/м³", 2000, note="«от»", what="Песок мытый")
r("pesok", "ТОО Прэвайд (Satu), мытый с доставкой", ALM, S(108232810, "pesok-mytyj-dostavka"), "₸/т", 4363, conv=1.6, deliv="с доставкой", sel=False,
  note="с доставкой, плотность 1,6 принята — не в расчёт (доставка считается отдельно)")
r("psch", "TASYMA.KZ (Satu), щебень 0–20", ALM, S(134295024, "scheben-148"), "₸/т", 2100, conv=1.48, note="«от»; 1,48 т/м³ по карточке; аналог ПЩС", what="Щебень 0–20 (аналог ПЩС)")
r("psch", "TASYMA.KZ (Satu), ГЩС", ALM, S(116645899, "gravijno-schebenochnaya-smes"), "₸/м³", 2700, what="Гравийно-щебёночная смесь (аналог ПЩС)")
r("pgs", "MG Group (Satu)", ALM, S(134589657, "pgs"), "₸/м³", 1000, what="ПГС")
r("pgs", "TASYMA.KZ (Satu)", ALM, S(116645898, "peschano-gravijnaya-smes"), "₸/м³", 1200, what="ПГС")
r("pgs", "ТОО «AS Delivery» (Satu)", ALM, S(2947142, "pgs"), "₸/т", 3600, conv=1.9, note="плотность 1,9 т/м³ принята", what="ПГС")
r("chernozem", "TASYMA.KZ (Satu)", ALM, S(116706265, "chernozem-verhnyj-sloj"), "₸/м³", 5000, note="«от»", what="Чернозем (верхний слой) / растительный грунт")
r("chernozem", "QAZ-NUR (Satu)", ALM, S(132625772, "plodorodnyj-grunt"), "₸/м³", 6000, note="«от», почвогрунт универсальный", what="Плодородный грунт")
r("chernozem", "QAZ-NUR (Satu)", ALM, S(134244196, "chernozem-plodorodnyj-grunt"), "₸/т", 9800, conv=1.3, note="плотность 1,3 т/м³ принята", what="Чернозем плодородный")
r("geotex", "ТОО «Kaz Stroy Montage» (Satu)", ALM, S(123467070, "geotekstil-200"), "₸/м²", 300, what="Геотекстиль 200 г/м²")
r("geotex", "Казахстан Геосинт (Satu), Дорнит 200", ALM, S(107635472, "geotekstil-dornit-200"), "₸/м²", 209.30, note="единица в карточке «шт.» (рулон 6×50 м); цена трактована как за м²", what="Геотекстиль Дорнит 200 г/м²")

# ---------------------------------------------------------------- штучные дорожные материалы
r("plitka", "ТОО «ШтайнПром» (Satu)", ALM, S(89740928, "trotuarnaya-plitka-kvadrat"), "₸/м²", 3500, note="«от»; 198×198×60", what="Тротуарная плитка 60 мм")
r("plitka", "ТОО R-Tas (Satu)", ALM, S(123786031, "trotuarnaya-plitka-pryamougolnaya"), "₸/м²", 3900, note="200×100×60", what="Тротуарная плитка 60 мм")
r("bord30", "ТОО «Азия Темир ЛТД» (Satu)", ALM, S(101940964, "bortovoj-kamen-br1003015"), "₸/шт (1 м)", 3800, what="Бортовой камень БР100.30.15")
r("bord30", "ТОО «ADK MACHINERY» (Satu)", ALM, S(125038243, "dorozhnyj-bordyur-br1003015"), "₸/шт (1 м)", 2200, note="«от»", what="Бортовой камень БР100.30.15")
r("bord30", "STROYHOLDING.KZ (Satu)", ALM, S(118407908, "bordyur-dorozhnyj"), "₸/шт (1 м)", 3500, note="«от»", what="Бордюр дорожный")
r("bord20", "ТОО «Азия Темир ЛТД» (Satu)", ALM, S(101940965, "bortovoj-kamen-br100208"), "₸/шт (1 м)", 900, what="БР100.20.8")
r("bord20", "Ertas (Satu)", ALM, S(100571773, "porebrik-1000h200h80"), "₸/шт (1 м)", 900, what="Поребрик 1000×200×80")
r("bord20", "ТОО «ADK MACHINERY» (Satu)", ALM, S(108762984, "porebrik-trotuarnyj-bordyur"), "₸/шт (1 м)", 1000, what="Поребрик 1000×200×80")
r("bord20", "ТОО Rubilon-поставщик №1 (Satu)", ALM, S(123354443, "bordyurnyj-kamen-100208"), "₸/шт (1 м)", 800, note="«от»", what="БР100.20.8")
r("bord20", "Центр Брусчатки (Satu)", ALM, S(131589676, "bordyur-1000x200x80mm"), "₸/шт (1 м)", 1200, note="«от»", what="Бордюр 1000×200×80")
r("bord20", "Блоки и Плитка KZ (Satu)", ALM, S(43583372, "bordyur-trotuarnyj-1000h200h80"), "₸/шт (1 м)", 1200, what="Бордюр тротуарный 1000×200×80")
r("takt", "Тифлоцент Казахстана (Satu)", ALM, S(131996675, "betonnaya-taktilnaya-plitka"), "₸/шт", 650, note="300×300×40", what="Тактильная плитка бетонная 300×300 (конус)")
r("takt", "ИП ISTEL (Satu)", ALM, S(64956871, "taktilnaya-plitka-beton"), "₸/шт", 1000, avail="под заказ", note="«от»; 300×300×40", what="Тактильная плитка бетонная 300×300")
r("takt_lay", "—", ALM, "", "₸/плита", 0, sel=False, note="см. укладку плитки")

# ---------------------------------------------------------------- гидроизоляция, утеплитель
r("tehno", "R&A PARTNERS QAZAQSTAN (Satu)", ALM, S(130559331, "tehnoelast-epp"), "₸/м²", 3200, what="Техноэласт ЭПП")
r("tehno", "ТОО Rubilon-поставщик №1 (Satu)", ALM, S(123339137, "rulonnaya-krovlya-tehnonikol"), "₸/рулон 1×10 м", 17200, conv=0.1, note="«от»; рулон 10 м²", what="Техноэласт ЭПП 1×10 м")
r("tehno", "TOO СтройДом СД (Satu)", ALM, S(135425997, "tehnoelast-epp-tehnonikol"), "₸/рулон 10 м²", 32500, conv=0.1, what="Техноэласт ЭПП 10 м²")
r("tehno", "ТОО IZO-MARKET КМ (Satu), «Гиндере ЭПП»", ALM, S(134273769, "gidroizolyatsiya-epp"), "₸/м²", 1750, sel=False, note="другой бренд (Гиндере) — не взято")
r("bikrost", "R&A PARTNERS QAZAQSTAN (Satu)", ALM, S(130557806, "bikrost-tpp"), "₸/м²", 1200, what="Бикрост ТПП")
r("bikrost", "ТОО GEODOR (Satu)", ALM, S(77579805, "bikrost-tpp"), "₸/м²", 1160, what="Бикрост ТПП")
r("bikrost", "TOO СтройДом СД (Satu)", ALM, S(135425930, "bikrost-tpp-tehnonikol"), "₸/рулон 15 м²", 18800, conv=1 / 15, what="Бикрост ТПП 15 м²")
r("bikrost", "ТОО VID STROY (Satu)", ALM, S(136703951, "bikrost-tpp-1rul15kvm"), "₸/рулон 15 м²", 14590, conv=1 / 15, what="Бикрост ТПП (1 рул = 15 м²)")
r("bikrost", "Tijara Stone (Satu)", ALM, S(134490459, "bikrost-tehnonikol-tpp"), "₸/м²", 1084, what="Бикрост Технониколь ТПП")
r("epps", "R&A PARTNERS QAZAQSTAN (Satu)", ALM, S(130560488, "plity-penopolistirolnye-ekstruzionnye"), "₸/м³", 47500, what="ТЕХНОНИКОЛЬ CARBON PROF 1180×580×100")
r("epps", "ТОО Rubilon-поставщик №1 (Satu), Carbon Solid 500", ALM, S(123338599, "teploizolyatsiya-tehnonikol-carbon"), "₸/упак. 4 плиты 2400×600×100", 38172, conv=1 / 0.576, what="Carbon Solid 500, 100 мм (0,576 м³ в упаковке)")
r("epps", "ТОО Rubilon-поставщик №1 (Satu), Carbon Prof", ALM, S(123338583, "teploizolyatsiya-tehnonikol-carbon"), "₸/упак. 4 плиты 1180×580×100", 10516, conv=1 / 0.2737, note="Carbon Eco (ближайший аналог)", what="Carbon Eco 1180×580×100 (0,2737 м³ в упаковке)")
r("kauchuk", "ТОО «Polmarket Almaty» (Satu)", ALM, S(94098333, "rezinovaya-plitka-standart"), "₸/плита 1000×1000×30", 15700, note="толщина 30 мм (40 мм у поставщиков не найдена)", what="Резиновая плитка 30 мм")
r("kauchuk", "ТОО «Polmarket Almaty» (Satu)", ALM, S(94098334, "rezinovaya-plitka-standart"), "₸/плита 500×500×30", 3950, conv=4, note="«от», толщина 30 мм", what="Резиновая плитка 30 мм")
r("gazon_rul", "Moses Grass (Satu), рулонный газон Johnsons", ALM, S(87752278, "gazon-rulonnyj-zhivoj"), "₸/м²", 3400, note="«от»", what="Рулонный газон")
r("gazon_rul", "ТОО «Polmarket Almaty»", ALM, "", "₸/м²", 0, sel=False, note="искусственный газон — не то")

r("drymix", "ТОО «Армоснаб» (Satu)", ALM, S(134832072, "smes-suhaya-universalnaya"), "₸/мешок 50 кг", 1141.14, conv=1700 / 50,
  note="сухая универсальная смесь М-150; плотность 1 700 кг/м³ принята (инженерное допущение) для пересчёта в ₸/м³", what="Сухая смесь М150 (для подготовки/стяжки/ЦПР)")

# ---------------------------------------------------------------- бетон
BET = {
 "bet_b10": [("TASYMA.KZ (Satu)", 134348040, "beton-marka-m150", 15000, "М150 В12,5, «от»"),
             ("ТОО Dostavkabetona (Satu)", 36271506, "beton-m150", 21000, "М150, «от»"),
             ("MG Бетон (Satu)", 108115560, "beton-marki-m150", 23000, "М150")],
 "bet_b15": [("ТОО Dostavkabetona (Satu)", 34677559, "beton-v15-m200", 18500, "В15 М200"),
             ("ТОО АКСС (Satu)", 23184497, "beton-200", 18200, "В15 М200"),
             ("ГК «Фирма «Бент» (Satu)", 128954733, "beton-v15-200", 22300, "В15 М-200, «от»"),
             ("TASYMA.KZ (Satu)", 134348041, "beton-marka-m200", 15500, "М200 В15, «от»")],
 "bet_b25": [("ТОО Dostavkabetona (Satu)", 36428678, "beton-m350-tsena", 25000, "М350, «от»"),
             ("ТОО АКСС (Satu)", 23185309, "beton-350", 20800, "В25 М350"),
             ("ГК «Фирма «Бент» (Satu)", 128954736, "beton-v25-350", 22300, "В25 М350"),
             ("TASYMA.KZ (Satu)", 134348047, "beton-marka-m350", 17500, "М350 В25, «от»"),
             ("ТОО MDV BETON (Satu)", 136355883, "beton-m350", 27000, "М350"),
             ("MG Бетон (Satu)", 108115693, "beton-marki-m350", 27000, "М350")],
 "bet_b30": [("MG Бетон (Satu)", 108115713, "beton-marki-m400", 28000, "М400")],
}
for k, lst in BET.items():
    for sup, pid, slug, pr, nt in lst:
        r(k, sup, ALM, S(pid, slug), "₸/м³", pr, note=nt + "; F/W по карточке не всегда указаны", what={"bet_b10": "Бетон В7,5–В10 (М100–М150)", "bet_b15": "Бетон В15", "bet_b25": "Бетон В25 (М350)", "bet_b30": "Бетон В30 (М400)"}[k])
for k, nm, p, nt in (("bet_b10", "М150 В10 П4 F100 W4", 22500, ""), ("bet_b15", "М200 В15 П4 F100 W4", 24600, ""),
                     ("bet_b25", "М350 В25 П4 F200 W8", 31000, "F200/W8 выше требуемых F150/W6"), ("bet_b30", "М400 В30 (F/W не указаны)", 33700, "")):
    r(k, "РБУ БетонСервис (rbubeton.kz), Коксай", ALM, "https://rbubeton.kz/", "₸/м³", p, "НДС не указан", "самовывоз; миксер по городу от 2 000 ₸/м³ отдельно", "прайс на сайте",
      note=nm + ". " + nt, what="Товарный бетон")

# ---------------------------------------------------------------- арматура и металл (₸/т)
r("arm", "Трубное Решение (truboproduct.kz)", ALM, "https://almaty.truboproduct.kz/price-list/", "₸/т", 426000, what="Арматура А500С Ø12", note="прайс на сайте без даты; НДС не указан")
r("arm", "STROYHOLDING.KZ", ALM, S(118051767, "armatura-a500s"), "₸/т", 315000, note="от 5 т — 310 000", what="Арматура А500С Ø12")
r("arm", "ТОО «КазСпецСплав» (Satu)", ALM, S(133719785, "armatury-a500s-f12"), "₸/т", 380000, note="«от»", what="Арматура А500С Ø12")
r("arm", "ТОО СПК «СтальКом» (Satu)", ALM, S(132022735, "armatura"), "₸/т", 300000, note="«от»", what="Арматура")
r("arm", "\"SD Commerce\" (Satu)", ALM, S(121427276, "armatura-a500s-11700"), "₸/т", 320000, note="«от»; Ø14", what="Арматура А500С Ø14")
r("arm", "МетПромИнтекс (Satu)", ALM, S(118400553, "armatura-mernost"), "₸/т", 349037, note="«от»; Ø10", what="Арматура Ø10")
r("arm", "Юнистил (unisteel.kz), обзор цен", ALM, "https://unisteel.kz/tseny-na-metalloprokat-v-almaty-i-kazahstane-2026/", "₸/т", 395000, "НДС не указан",
  "не указана", "ориентир", cls="A", date="публикация 24.05.2026", note="Диапазон 360 000–430 000 (Ø10–16); взята середина; безнал с НДС дороже на 12%", what="Арматура А500С Ø10–16")
r("a240", "МетПромИнтекс (Satu)", ALM, S(117098741, "armatura"), "₸/т", 332412, note="«от»; Ø8 А240", what="Арматура А240 Ø8", sel=False)
r("a240", "Металпро1 (Satu)", ALM, S(136050938, "armatura-gladkaya-a240"), "₸/т", 375000, note="375 ₸/кг, А1 (А240) Ø6,5", what="Арматура А240", sel=False)
r("ugolok", "Юнистил (unisteel.kz)", ALM, "https://unisteel.kz/tseny-na-metalloprokat-v-almaty-i-kazahstane-2026/", "₸/т", 445000, cls="A", date="публикация 24.05.2026", note="Диапазон 400 000–490 000; середина", what="Уголок 50×50×5, 75×75×6")
r("shveller", "Юнистил (unisteel.kz)", ALM, "https://unisteel.kz/tseny-na-metalloprokat-v-almaty-i-kazahstane-2026/", "₸/т", 465000, cls="A", date="публикация 24.05.2026", note="Диапазон 420 000–510 000; середина", what="Швеллер № 10–20")
r("shveller", "СТАЛЬТЭК (Satu)", ALM, S(133525039, "shveller-stalnoj-gost"), "₸/т", 418000, what="Швеллер 14П")
r("list", "Юнистил (unisteel.kz)", ALM, "https://unisteel.kz/tseny-na-metalloprokat-v-almaty-i-kazahstane-2026/", "₸/т", 420000, cls="A", date="публикация 24.05.2026", note="Диапазон 380 000–460 000; середина", what="Лист г/к 2–10 мм")
r("list", "СТАЛЬТЭК (Satu)", ALM, S(133526028, "list-stalnoj-goryachekatanyj"), "₸/т", 397000, note="«от»", what="Лист стальной г/к")
r("list", "ALMAMETAL.KZ (Satu)", ALM, S(135328570, "list-stalnoj-goryachekatanyj"), "₸/т", 400000, note="«от»; 6×1500×6000", what="Лист стальной г/к 6 мм")
r("trprof", "Юнистил (unisteel.kz)", ALM, "https://unisteel.kz/tseny-na-metalloprokat-v-almaty-i-kazahstane-2026/", "₸/т", 490000, cls="A", date="публикация 24.05.2026", note="Диапазон 440 000–540 000 (профильная труба малых сечений); середина", what="Профильная труба")
r("tr", "СТАЛЬТЭК (Satu)", ALM, S(133522167, "truba-elektrosvarnaya-gost"), "₸/т", 407000, note="«от»; электросварная ГОСТ 10704", what="Труба электросварная")
r("tr", "ma-metall.kz", ALM, "https://ma-metall.kz/truby-stalnye-elektrosvarnye-st-20-razmer-219-6/", "₸/т", 470000, "НДС не указан", "самовывоз/доставка по запросу", "на сайте",
  note="219×6 ст.20; на странице есть «2026 году» в заголовке, даты публикации нет", what="Труба электросварная 219×6")
r("profnastil", "ТОО «Евразия Строй Снаб» (Satu)", ALM, S(122353935, "profilnyj-list-ns35"), "₸/м (шир. ~1 м)", 2260, avail="под заказ", note="«от»; толщина не указана, ширина 1 м принята", what="Профнастил НС35")

# ---------------------------------------------------------------- оборудование ВК
r("tmw", "Монтаж PRO (Satu)", ALM, S(61515887, "drenazhnyj-nasos-wilo"), "₸/шт", 101510, what="Wilo TMW 32/11 Twister")
r("tmw", "ТОО «Насосные системы Мамонт» (Satu)", ALM, S(109245517, "tmw-3211-4048414"), "₸/шт", 94000, what="Wilo TMW 32/11 (4048414)")
r("tmw", "San4Life (Satu)", ALM, S(129873154, "nasos-drenazhnyj-wilo"), "₸/шт", 117000, what="Wilo TMW 32/11 Twister 220В")
r("tmw", "ТОО «ТоргПром» (Satu)", ALM, S(132207334, "nasos-wilo-tmw"), "₸/шт", 107520, what="Wilo TMW 32-11")
r("bolid", "Digital Flow (Satu)", ALM, S(135956976, "bolid-potok-pribor"), "₸/шт", 77478.5, what="Болид Поток-3Н")
r("bolid", "PRO Безопасность (Satu)", ALM, S(136305775, "bolid-potok-pribor"), "₸/шт", 80755, what="Болид Поток-3Н")
r("bolid", "TradeKZ (Satu)", ALM, S(118494510, "potok-pribor-upravleniya"), "₸/шт", 68892, note="«от»", what="Поток-3Н")
r("uu", "ТОО «FERROOM NS» (Satu)", ALM, S(133775620, "uzel-upravleniya"), "₸/шт", 565000, note="«от»; УУ-С100/1,6В-ВФ.О4-01 прямоточный водозаполненный", what="УУ-С100/1,6В-ВФ.04")
r("uu", "ТОО «Antipozhar» (Satu)", ALM, S(103845779, "uzel-upravleniya"), "₸/шт", 550000, note="«от»; УУ-С100/1,6В-ВФ.О4 «Прямоточный»", what="УУ-С100/1,6В-ВФ.04")
r("uu", "TradeKZ (Satu)", ALM, S(43758282, "uzel-upravleniya-sprinklernyj"), "₸/шт", 559830, avail="под заказ", note="«от»; водозаполненный УУ-С100/1,6В-ВФ.04 «Прямоточный»", what="УУ-С100/1,6В-ВФ.04")
r("z100", "ТОО «MV Company Almaty» (Satu)", ALM, S(128219277, "zatvor-diskovyj-100"), "₸/шт", 48500, what="Затвор дисковый DN100 PN16 чугун-EPDM")
r("z100", "ТОО «JT Group» (Satu)", ALM, S(88204409, "tk200100-diskovyj-povorotnyj"), "₸/шт", 47980.8, what="Затвор TK200100 DN100 PN16")
r("z100", "ТОО «Технострой Групс» (Satu)", ALM, S(132067321, "zatvor-diskovyj-mezhflantsevyj"), "₸/шт", 16600, what="Затвор DN100 PN16")
r("z100", "ТОО «Армоснаб» (Satu)", ALM, S(134833143, "zatvor-diskovyj-povorotnyj"), "₸/шт", 10800, what="Затвор DN100 PN16 Kell")
r("z100", "Би Энд Би Инжиниринг (Satu)", ALM, S(133052852, "dzi100-zatvor-diskovyj"), "₸/шт", 85411, what="Затвор NK-DZi100 DN100 PN16")
r("z150", "ТОО «MV Company Almaty» (Satu)", ALM, S(128219304, "zatvor-diskovyj-150"), "₸/шт", 67000, what="Затвор дисковый DN150 PN16 чугун-EPDM")
r("z200", "ТОО «MV Company Almaty» (Satu)", ALM, S(128219319, "zatvor-diskovyj-200"), "₸/шт", 111000, what="Затвор DN200 PN16")
r("z200", "ТОО «Haiao» (Satu)", ALM, S(120023311, "zatvor-povorotnyj-diskovyj"), "₸/шт", 109500, what="Затвор DN200 PN16 Haiao")
r("z200", "ТОО Ecg Company (Satu)", ALM, S(136676056, "zatvor-povorot-chug"), "₸/шт", 32000, what="Затвор Ду200 Ру16 Benarmo")
r("v100", "Монтаж PRO (Satu)", ALM, S(54993940, "gibkaya-vstavka-flantsevaya"), "₸/шт", 17560, what="Гибкая вставка DN100 PN16")
r("v100", "ТОО «CTMC-CK» (Satu)", ALM, S(74981012, "vstavka-gibkaya-flantsevaya"), "₸/шт", 15580, what="Вставка DN100 PN16")
r("v100", "SAgroups (Satu)", ALM, S(70952793, "gibkaya-vstavka-flantsevaya"), "₸/шт", 28546, what="Вставка DN100 PN16")
r("v150", "Монтаж PRO (Satu)", ALM, S(54993942, "gibkaya-vstavka-flantsevaya"), "₸/шт", 30950, what="Гибкая вставка DN150 PN16")
r("v150", "ТОО «ЭВЕРЕСТ МИГ» (Satu)", ALM, S(49985157, "kompensator-rezinovyj-flantsevyj"), "₸/шт", 37100, what="Компенсатор AYVAZ DN150 PN16")
r("v150", "ТОО «AUHAL» (Satu)", ALM, S(123952405, "gibkaya-vstavka-150"), "₸/шт", 73600, note="«от»; Brandoni Италия", what="Гибкая вставка DN150")
r("v200", "Монтаж PRO (Satu)", ALM, S(54993944, "gibkaya-vstavka-flantsevaya"), "₸/шт", 53120, what="Гибкая вставка DN200 PN16")
r("v200", "ТОО «ЭВЕРЕСТ МИГ» (Satu)", ALM, S(49985179, "kompensator-rezinovyj-flantsevyj"), "₸/шт", 53100, what="Компенсатор AYVAZ DN200 PN16")
r("v200", "ТОО «CTMC-CK» (Satu)", ALM, S(74981029, "vstavka-gibkaya-flantsevaya"), "₸/шт", 43460, what="Вставка DN200 PN16")
r("v200", "ТОО Nekei (Satu)", ALM, S(117777522, "gibkaya-vstavka-200"), "₸/шт", 43460, what="Гибкая вставка D200")
r("ok80", "ТОО «MANSVALVE GROUP» (Satu)", ALM, S(129427194, "klapan-obratnyj-p"), "₸/шт", 69736, what="Клапан обратный фланцевый 19с76нж DN80 PN16")
r("ok80", "AVS Engineering (Satu)", ALM, S(128541101, "klapan-obratnyj-mezhflantsevyj"), "₸/шт", 69736, what="Клапан обратный межфл. чугун PN16 DN80")
r("ok100", "ТОО «MANSVALVE GROUP» (Satu)", ALM, S(129427195, "klapan-obratnyj-po"), "₸/шт", 92090, what="Клапан обратный фланцевый 19с76нж DN100 PN16")
r("ok100", "AVS Engineering (Satu)", ALM, S(128541104, "klapan-obratnyj-mezhflantsevyj"), "₸/шт", 38000, what="Клапан обратный межфл. чугун PN16 DN100")
r("ok32", "Монтаж PRO (Satu)", ALM, S(106529377, "klapan-obratnyj-latunnyj"), "₸/шт", 3150, what="Клапан обратный латунный Ду32")
r("ok32", "САНТЕХКОМПЛЕКТ (Satu)", ALM, S(51849750, "klapan-obratnyj-latunnyj"), "₸/шт", 4110, note="«от»; Ду32 Ру16 пружинный муфтовый", what="Клапан обратный латунный Ду32 Ру16")
r("ok32", "ТОО «JT Group» (Satu)", ALM, S(89043951, "klapan-obratnyj-dn32mm"), "₸/шт", 3465, note="«от»; 1¼″ PN10", what="Клапан обратный 1¼″ Dn32")
r("zadv80", "ТОО «Алмалит» (Satu)", ALM, S(129488603, "zadvizhka-chug"), "₸/шт", 20400, what="Задвижка чугун. фланц. с обрезиненным клином Dn80 PN16")
r("zadv80", "Монтаж PRO (Satu)", ALM, S(100513207, "zadvizhka-obrezinennym"), "₸/шт", 40392, what="Задвижка 30ч39р Ду80 Ру16 с обрезиненным клином")
r("mano", "TOO «Теплоресурс Азия» (Satu)", ALM, S(119692346, "manometr-radialnyj"), "₸/шт", 3223, what="Манометр радиальный МП100М 0–1,6 МПа")
r("mano", "VECTHERM (Satu)", ALM, S(115264108, "manometr-radialnyj-mp10016"), "₸/шт", 3900, what="Манометр МП100/1.6 МПа")
r("mano", "ИП SIE (Satu)", ALM, S(99958850, "manometr-radialnyj-yumas"), "₸/шт", 2080, what="Манометр МП100М 0–1,6 МПа")
r("mano_ek", "Интернет-магазин Ватцап (Satu)", ALM, S(126881617, "manometr-e"), "₸/шт", 22500, what="Манометр электроконтактный YXC100")
r("mano_ek", "ТОО «КАЗБАРРЕЛЬ» (Satu)", ALM, S(118574255, "manometr-elektrokontaktnyj-ekm"), "₸/шт", 22500, what="Манометр электроконтактный ЭКМ-100")
r("kran3x", "ТОО «AUHAL» (Satu)", ALM, S(45008470, "kran-probkovyj-trehh"), "₸/шт", 1200, what="Кран трёхходовой 11Б18бк")
r("kran3x", "AVS Engineering (Satu)", ALM, S(103577694, "kran-trehhodovoj-dlya"), "₸/шт", 843.96, note="«от»", what="Кран трёхходовой для манометра")
r("kran3x", "ТОО СПК «СтальКом» (Satu)", ALM, S(135012527, "kran-probkovyj-trehhodovoj"), "₸/шт", 2470, note="«от»; с контрольным фланцем", what="Кран трёхходовой 11Б18бк с фланцем")
r("kr25", "ТОО КазГидроПром Групп (Satu)", ALM, S(36132598, "kran"), "₸/шт", 2430, what="Кран шаровой латунный 11Б27П1 Ду25 Ру16")
r("kr25", "ТОО «АлматыТехЭнерго» (Satu)", ALM, S(5228815, "kran-sharovyj-muftovyj"), "₸/шт", 540, what="Кран шаровой муфтовый латунный Ду25")
r("kr25", "ТОО «AUHAL» (Satu)", ALM, S(1774528, "kran-sharovyj-standart"), "₸/шт", 5200, what="Кран шаровой М-М 1″ General Fittings")
r("kr32", "ТОО КазГидроПром Групп (Satu)", ALM, S(36132484, "kran-sharovyj-latunnyj"), "₸/шт", 3620, note="11Б27П10/1 Ду32 Ру16", what="Кран шаровой латунный Ду32 Ру16")
r("kr32", "САНТЕХКОМПЛЕКТ (Satu)", ALM, S(51758737, "kran-sharovoj-latunnyj"), "₸/шт", 4990, what="Кран шаровой латунный муфтовый Ду32 Ру25")
r("gm80", "ТОО «Antipozhar» (Satu)", ALM, S(46660398, "golovka-soedinitelnaya"), "₸/шт", 2500, note="«от»", what="Головка соединительная ГМ-80")
r("gm80", "Global Security KZ (Satu)", ALM, S(49516332, "golovka-muftovaya"), "₸/шт", 2230, note="«от»", what="Головка муфтовая ГМ-80")
r("gm80", "ТОО Ecg Company (Satu)", ALM, S(136686726, "golovka-muftovaya-80mm"), "₸/шт", 719.53, note="«от»; Цветлит ZW90068", what="Головка муфтовая 80 мм ГМ-80-1,6")
r("bak50", "ТОО «AUHAL» (Satu)", ALM, S(124018172, "bak-membrannyj-dlya"), "₸/шт", 47500, note="Wester WAV 50 л 10 бар", what="Бак мембранный Wester WAV 50")
r("bak50", "San4Life (Satu)", ALM, S(128343793, "bak-rasshiritelnyj-wester"), "₸/шт", 50000, what="Бак расширительный Wester WAV 50")
r("bak50", "Azbukatepla (Satu)", ALM, S(96437186, "baki-wester-wav"), "₸/шт", 48600, what="Баки Wester WAV 50")
r("ot108", "Монтаж PRO (Satu)", ALM, S(50060617, "otvod-stalnoj-1085"), "₸/шт", 2862, note="«от»; Ду100 108×5", what="Отвод стальной 108×5 ГОСТ 17375")
r("ot108", "ТОО «ПКФ СТАЛЬ» (Satu)", ALM, S(102225170, "otvod-stal-besshovnyj"), "₸/шт", 4460, note="отвод бесшовный 90° Дн 108×4,0", what="Отвод 108×4")
r("ot108", "МетПромИнтекс (Satu)", ALM, S(118402648, "otvod-stalnoj"), "₸/шт", 5891, note="«от»; 108×6", what="Отвод крутоизогнутый 108×6")
r("ot159", "Монтаж PRO (Satu)", ALM, S(50060794, "otvod-stalnoj-1595"), "₸/шт", 6426, note="«от»; 159×5", what="Отвод стальной 159×5")
r("ot159", "МетПромИнтекс (Satu)", ALM, S(118402659, "otvod-stalnoj-kru"), "₸/шт", 6671, note="«от»; 159×4,5 крутоизогнутый", what="Отвод 159×4,5")
r("ot219", "Монтаж PRO (Satu)", ALM, S(50060820, "otvod-stalnoj-2197"), "₸/шт", 17323, note="«от»; 219×7", what="Отвод стальной 219×7")
r("fl80", "Монтаж PRO (Satu)", ALM, S(100683439, "flanets-stalnoj-privarnoj"), "₸/шт", 3251, what="Фланец плоский приварной Ду80 Ру16")
r("fl100", "Монтаж PRO (Satu)", ALM, S(100683440, "flanets-stalnoj-privarnoj"), "₸/шт", 4212, what="Фланец плоский приварной Ду100 Ру16")
r("fl150", "Монтаж PRO (Satu)", ALM, S(100683442, "flanets-stalnoj-privarnoj"), "₸/шт", 6890, what="Фланец плоский приварной Ду150 Ру16")
r("fl200", "Монтаж PRO (Satu)", ALM, S(100683443, "flanets-stalnoj-privarnoj"), "₸/шт", 10444, what="Фланец плоский приварной Ду200 Ру16")
r("lyuk", "ТОО «Partners trade» (Satu)", ALM, S(67641660, "lyuk-chugunnyj-tip"), "₸/шт", 35000, note="«от»; тип Т с запорным устройством", what="Люк чугунный тип Т")
r("lyuk", "AVS Engineering (Satu)", ALM, S(128526392, "lyuk-chugunnyj"), "₸/шт", 101598, note="тип Т 25 т с шарнирным замком", what="Люк чугунный тип Т")
r("lyuk", "ТОО «Strong Steel Kazakhstan» (Satu)", ALM, S(129465449, "lyuki-chugunnye-620x750"), "₸/шт", 44604, note="ВЧШГ ГОСТ 3634-99 620×750", what="Люк чугунный")
r("lyuk", "ACGroup (Satu)", ALM, S(130979305, "lyuk-chugunnyj-tyazhelyj"), "₸/шт", 60298, note="тяжёлый С250, ГОСТ 3634-2019", what="Люк чугунный тяжёлый")
r("kolco", "ТОО «Азия Темир ЛТД» (Satu)", ALM, S(132506051, "koltso"), "₸/шт", 22000, what="Кольцо КС 7.9")
r("ros", "ТОО Fortune PROM (Satu)", ALM, S(102801284, "datchik-rele-urovnya"), "₸/шт", 44520, note="«от»; РОС-301-УХЛ3-1", what="Датчик-реле уровня РОС-301")
r("ros", "ТОО Fortune PROM (Satu)", ALM, S(104988893, "rele-ros-301"), "₸/шт", 63000, note="«от»; РОС-301 с 3 электродами 1 м", what="Реле РОС-301 в комплекте с электродами")
r("dren_ok", "Монтаж PRO (Satu)", ALM, S(106529377, "klapan-obratnyj-latunnyj"), "₸/шт", 3150, what="Клапан обратный латунный Ду32")
r("dren_ok", "САНТЕХКОМПЛЕКТ (Satu)", ALM, S(51849750, "klapan-obratnyj-latunnyj"), "₸/шт", 4110, what="Клапан обратный латунный Ду32 Ру16")

# ---------------------------------------------------------------- водоотвод, ограждения, георешётка
r("lot", "ТОО «DKSTOK» (Satu)", ALM, S(113317839, "lotok-vodootvodnyj-betonnyj"), "₸/шт (1 м)", 34000, note="бетонный лоток с чугунной решёткой 165×165 мм", what="Лоток бетонный с решёткой")
r("lot", "«PREALUX DSS» ТОО (Satu)", ALM, S(86415234, "lotok-vodootvodnyj-betonnyj"), "₸/шт (1 м)", 58000, note="DN300 бетонный с решёткой ВЧ кл. D (мощнее DN200)", what="Лоток бетонный с решёткой DN300")
r("lot", "Оптово-розничный интернет-магазин (Satu)", ALM, S(115988840, "lotok-vodootvodnyj-u200280"), "₸/шт (1 м)", 29990, note="лоток U200/280, материал не указан", what="Лоток водоотводный U200/280")
r("zhb_lot", "ТОО «Армоснаб» (Satu)", ALM, S(134822350, "vodootvodnyj-betonnyj-lotok"), "₸/шт", 12522, note="ЛК 300.30.30-1 — аналог, не ТП 320-55", what="Водоотводный бетонный лоток ЛК 300.30.30-1")
r("zhb_lot", "ТОО AlatauAlemKz (Satu)", ALM, S(3624658, "zhb-lotok-vodosbornyj"), "₸/шт", 8000, note="ЛВС 100.20.20 — аналог", what="Ж/б лоток водосборный ЛВС 100.20.20")
r("b6", "ТОО Nekei (Satu)", ALM, S(107205944, "lotok-teleskopicheskij"), "₸/шт", 2960, what="Лоток телескопический Б-6 540×520×250/200")
r("b6", "ТОО Rubilon-поставщик №1 (Satu)", ALM, S(123357301, "teleskopicheskij-lotok"), "₸/шт", 2960, what="Телескопический лоток Б-6")
r("b6", "ТОО «Азия Сталь Инвест» (Satu)", ALM, S(87037662, "lotok-teleskop"), "₸/шт", 2000, what="Лоток телескопический Б-6")
r("geo", "Казахстан Геосинт (Satu), ГлобалГео 420/100", ALM, S(107635407, "georeshetka-globalgeo"), "₸/м²", 340.05, what="Георешётка ГлобалГео объёмная 420/100 (ближайшая по ячейке к 440/100)")
r("ogr", "ТОО «Мир Сетки» (Satu)", ALM, S(135419654, "panel-ograzhdeniya-otsinkovannoe"), "₸/панель 1,5×2,5 м", 11500, note="панель 3D 3,8 мм; монтаж отдельно (в расчёт не взято — нет 2 источников по высоте/типу)", sel=False, what="Панель 3D ограждения")
r("ogr", "GM Company (Satu)", ALM, S(88209031, "setka"), "₸/шт", 12000, note="«от»; сетка 3D", sel=False, what="Сетка 3D")
r("ogr", "ТОО DANEX LTD-Almaty (Satu)", ALM, S(114510236, "zabory-ograzhdeniya"), "₸/п.м", 12360, note="«от»; заборы 3D и ограждения (материал+?)", what="Забор 3D, п.м")

# ---------------------------------------------------------------- работы и услуги
r("exc", "Spectehnica.kz", ALM, "https://spectehnica.kz/razrabotka-grunta/", "₸/м³", 1900, "НДС не указан", "n/a", "услуга", cls="A",
  date="«Информация обновлена: 20.06.2026»", note="«от»: суглинок и глина (III категория) от 1 900; песок/супесь I–II кат. от 1 500; плотная глина IV кат. от 2 600. В ВОР — суглинок", what="Разработка котлована (суглинок III кат.)")
r("vyvoz", "TASYMA.KZ (Satu) — самосвал 20 м³", ALM, S(129898320, "samosval"), "₸/рейс", 40000, conv=1 / 20, deliv="услуга", note="«от»; полигон не учтён; 1 м³ в разрыхлённом состоянии", what="Вывоз грунта")
r("vyvoz", "TASYMA.KZ (Satu) — самосвал 16 м³", ALM, S(129027018, "samosval"), "₸/рейс", 35000, conv=1 / 16, deliv="услуга", note="полигон не учтён", what="Вывоз грунта")
r("vyvoz", "Spectehnica.kz", ALM, "https://spectehnica.kz/vyvoz-grunta/", "₸/м³", 1500, "НДС не указан", "услуга", "услуга", cls="A", date="«Информация обновлена: 20.06.2026»",
  note="«от 1 500 ₸/м³» при объёме от 100 м³, техника парка")
r("vyvoz", "Spectehnica.kz", ALM, "https://spectehnica.kz/vyvoz-grunta/", "₸/рейс 20 т", 45000, conv=1 / 13, deliv="услуга", cls="A", date="«Информация обновлена: 20.06.2026»",
  note="«от 45 000 ₸/рейс» самосвала 20 т, 12–14 м³ рыхлой массы (принято 13)", what="Вывоз грунта")
r("monolit_w", "СК «СПЕКТР» (ilt.kz) — фундаментная плита", ALM, "https://ilt.kz/almaty/monolithic-works/stoimost-monolitnyh-rabot/", "₸/м³", 20000, "НДС не указан", "n/a", "услуга",
  note="«от»; только работа без бетона и арматуры; опалубка и вязка арматуры в составе; дата на странице не указана (© 2026)", what="Монолитные работы: плита")
r("monolit_w", "СК «СПЕКТР» (ilt.kz) — стены", ALM, "https://ilt.kz/almaty/monolithic-works/stoimost-monolitnyh-rabot/", "₸/м³", 20000, "НДС не указан", "n/a", "услуга", note="«от»", what="Монолитные работы: стены")
r("monolit_w", "СК «СПЕКТР» (ilt.kz) — перекрытия", ALM, "https://ilt.kz/almaty/monolithic-works/stoimost-monolitnyh-rabot/", "₸/м³", 21000, "НДС не указан", "n/a", "услуга", note="«от 22 000» и «от 20 000» на одной странице — среднее", what="Монолитные работы: перекрытия")
r("podg_w", "СК «СПЕКТР» (ilt.kz)", ALM, "https://ilt.kz/almaty/monolithic-works/stoimost-monolitnyh-rabot/", "₸/м²", 2500, "НДС не указан", "n/a", "услуга", note="«от»; бетонная подготовка, работа; толщина 0,1 м ⇒ 25 000 ₸/м³", what="Бетонная подготовка (работа)")
r("otmost_w", "СК «СПЕКТР» (ilt.kz)", ALM, "https://ilt.kz/almaty/monolithic-works/stoimost-monolitnyh-rabot/", "₸/м²", 3500, "НДС не указан", "n/a", "услуга", note="«от»; отмостка и дорожки (работа)", what="Отмостка/дорожки бетон (работа)")
r("lay_plitka", "Razak Qurylys Group (Satu)", ALM, S(132417559, "ukladka-trotuarnoj-plitki"), "₸/м²", 5000, deliv="услуга", note="«от»", what="Укладка тротуарной плитки")
r("lay_plitka", "ТОО «Alen Stroy» (Satu)", ALM, S(129863521, "ustrojstvo-bruscha"), "₸/м²", 1500, deliv="услуга", note="«от»", what="Устройство брусчатки и тротуарной плитки")
r("lay_plitka", "ТОО «GulDar Group» (Satu)", ALM, S(99250637, "ukladka-bruschatki"), "₸/м²", 3000, deliv="услуга", note="«от»", what="Укладка брусчатки")
r("lay_plitka", "GOLDEN STROI (Satu)", ALM, S(122963072, "ukladka-trotuarnoj-plitki"), "₸/м²", 2500, deliv="услуга", what="Укладка тротуарной плитки")
r("lay_bord", "ТОО «ТаймассДорСтрой» (Satu)", ALM, S(44359009, "ustanovka-dorozhnogo-bordyura"), "₸/шт (1 м)", 2800, deliv="услуга", what="Установка дорожного бордюра")
r("lay_bord", "«FG» First Garden (Satu)", ALM, S(32762561, "ustanovka-bordyurov"), "₸/шт (1 м)", 2300, deliv="услуга", what="Установка бордюров")
r("lay_bord", "GOLDEN STROI (Satu)", ALM, S(122963164, "ustanovka-bordyura"), "₸/шт (1 м)", 2300, deliv="услуга", what="Установка бордюра")
r("fab_met", "ТОО «MSG» (Satu)", ALM, S(130407730, "izgotovlenie-metall"), "₸/т", 180000, deliv="услуга", note="«от»; изготовление металлоконструкций", what="Изготовление металлоконструкций")
r("mont_met", "ТОО «MSG» (Satu)", ALM, S(120569040, "montazh-metallokonstruktsij"), "₸/т", 180000, deliv="услуга", note="«от»; монтаж металлоконструкций", what="Монтаж металлоконструкций")
r("mont_nas", "ТОО «КазТеплоСтандарт» (Satu)", ALM, S(82474399, "professionalnaya-ustanovka-nasosnyh"), "₸/компл.", 850000, deliv="услуга", note="«от»; профессиональная установка насосных станций (единственный источник)", what="Установка насосных станций")

# ---------------------------------------------------------------- озеленение (питомники Алматы, Satu); цены «от» — меньшие размеры
PL = [
 ("pl_tuya_smar", "«FG» First Garden (Satu)", 30737432, "tuya-smaragd", 10000, "«от»; размер не указан", "Туя Смарагд"),
 ("pl_tuya_smar", "Питомник Жасыл бақ (Satu)", 93881542, "tuya-smaragd", 8000, "«от»; размер не указан", "Туя смарагд"),
 ("pl_blue", "«FG» First Garden (Satu)", 30660329, "mozhzhevelnik-skalnyj-blue", 25000, "«от»", "Можжевельник скальный Blue Arrow"),
 ("pl_blue", "Питомник Жасыл бақ (Satu)", 105576672, "mozhzhevelnik-skalnyj-blyu", 45000, "высота до 1,5–2 м", "Можжевельник скальный Блю Эрроу"),
 ("pl_globozum", "«FG» First Garden (Satu)", 31808907, "klen-ostrolistnyj-globozum", 15000, "«от»; Глобозум шар (штамб не указан)", "Клён остролистный Глобозум"),
 ("pl_forz", "«FG» First Garden (Satu)", 32317062, "forzitsiya", 6000, "", "Форзиция"),
 ("pl_forz", "Питомник Жасыл бақ (Satu)", 105575214, "forzitsiya-lynwood", 8000, "Lynwood", "Форзиция Lynwood"),
 ("pl_forz", "Питомник Жасыл бақ (Satu)", 105575239, "forzitsiya-lynwood", 6000, "", "Форзиция Lynwood"),
 ("pl_klen_kr", "«FG» First Garden (Satu)", 33734747, "klen-krasnyj", 5000, "«от»; размер/штамб не указан", "Клён красный"),
 ("pl_klen_kr", "«FG» First Garden (Satu)", 31814787, "klen-ostrolistnyj-royal", 15000, "«от»; Роял Ред", "Клён остролистный Роял Ред"),
 ("pl_golden", "«FG» First Garden (Satu)", 31270975, "tuya-zapadnaya-golden", 6000, "«от»", "Туя западная Golden Globe"),
 ("pl_dub", "«FG» First Garden (Satu)", 31550347, "dub-chereshchatyj", 4000, "«от»; размер не указан", "Дуб черешчатый"),
 ("pl_bereza", "«FG» First Garden (Satu)", 31934562, "bereza-povislaya", 3000, "«от»; размер не указан", "Берёза повислая"),
 ("pl_topol", "«FG» First Garden (Satu)", 31934206, "topol-piramidalnyj", 3000, "«от»", "Тополь пирамидальный"),
 ("pl_topol", "Питомник Жасыл бақ (Satu)", 105576608, "topol-oks", 2000, "", "Тополь ОКС"),
 ("pl_el", "«FG» First Garden (Satu)", 31269788, "kolyuchaya-glauca-globosa", 11700, "«от»; ель колючая Glauca Globosa", "Ель колючая голубая"),
 ("pl_el", "«FG» First Garden (Satu)", 30716789, "sizaya", 11000, "«от»; ель сизая", "Ель сизая"),
 ("pl_kiz", "«FG» First Garden (Satu)", 32316970, "kizilnik", 4500, "", "Кизильник"),
 ("pl_kiz", "Питомник Жасыл бақ (Satu)", 105568181, "kizilnik-lucidus", 6000, "lucidus", "Кизильник блестящий"),
]
for k, sup, pid, slug, pr, nt, what in PL:
    r(k, sup, ALM, S(pid, slug), "₸/шт", pr, avail="в наличии", note=nt + "; без посадки", what=what)



# ---------------------------------------------------------------- Kaspi Объявления: датированные объявления КЗ (поля dateUpdate/expiryDate 2026)
import json as _json, os as _os
_KD = {x["url"].split("-")[-1]: x for x in _json.load(open(_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "kaspi_dump_2026-11-16.json"), encoding="utf8"))}


def k(key, ad, price, unit, note="", what="", conv=1.0, sel=True):
    x = _KD[str(ad)]
    r(key, "Kaspi Объявления: " + x["title"].split(":")[0][:48], ALM, x["url"], unit, price, "НДС не указан", "не указана", "объявление активно",
      conv=conv, cls="A", date=f"обновлено {x['upd']}, действует до {x['exp']}",
      note=(f"на сайте: «{x['price']}». " + note).strip(), sel=sel, what=what or x["title"].split(":")[0][:70])


# укладка рулонного газона, ₸/м² (работа)
for ad, pr, nt in ((118217631, 2000, ""), (114195241, 1500, ""), (118851239, 1500, ""), (115315549, 2250, "диапазон 2 000–2 500: середина"),
                   (110980121, 2000, "диапазон 1 500–2 500: середина"), (110599533, 2000, "")):
    k("lay_gazon", ad, pr, "₸/м²", nt, "Укладка рулонного газона")
# посадка деревьев/кустарников, ₸/шт (работа)
for ad, pr, nt in ((118719692, 5000, "«от»"), (110678832, 7500, "диапазон 5 000–10 000: середина"), (123883753, 5000, ""), (123625933, 5000, "")):
    k("plant_work", ad, pr, "₸/шт", nt, "Посадка деревьев (работа)")
# монтаж бордюров, ₸/п.м
for ad, pr, nt in ((120894398, 1800, "«от»; поребрики, бордюры"), (121304089, 3000, "диапазон 2 500–3 500: середина"),
                   (113535022, 2500, "диапазон 1 500–3 500: середина"), (114584442, 2300, "диапазон 1 800–2 800: середина; укладка плитки и бордюров")):
    k("lay_bord", ad, pr, "₸/п.м", nt, "Установка бордюров")
# укладка плитки/брусчатки, ₸/м²
for ad, pr, nt in ((121803747, 2250, "диапазон 2 000–2 500: середина"), (114584442, 2300, "диапазон 1 800–2 800: середина"),
                   (122562620, 5000, "диапазон 2 500–7 500: середина"), (114267882, 3500, "диапазон 3 000–4 000: середина; гарантия 1 год")):
    k("lay_plitka", ad, pr, "₸/м²", nt, "Укладка брусчатки/тротуарной плитки")
# монолитные работы, ₸/м³ (единица в объявлении не указана — принято ₸/м³ как у СК «Спектр»)
for ad, pr, nt in ((120608901, 17500, "диапазон 15 000–20 000: середина"), (119422698, 24000, "диапазон 18 000–30 000: середина"),
                   (118227366, 32500, "диапазон 30 000–35 000: середина (с армированием)"), (115419548, 45000, "диапазон 30 000–60 000: середина; ТОО с лицензией, собственная опалубка")):
    k("monolit_w", ad, pr, "₸/м³ (принято)", "единица в объявлении не указана — принято ₸/м³. " + nt, "Монолитные работы")
# материалы
k("bet_b25", 122201494, 29000, "₸/м³", "бетон М350 с доставкой", "Бетон М350 с доставкой")
k("arm", 107702487, 310000, "₸/т", "А500С Ø8–32; склад Алматы, доставка до объекта; производство РФ, цена в ₸ у алматинского продавца", "Арматура А500С")
k("arm", 107359224, 320000, "₸/т", "А500С Ø12; склад Алматы; производство РФ, цена в ₸ у алматинского продавца", "Арматура А500С Ø12")
k("shveller", 103854615, 385000, "₸/т", "швеллер 8п и 10п (МеталлоСклад)", "Швеллер 8п/10п")
k("ugolok", 108929181, 420000, "₸/т", "уголок 40×4, цены оптовые со склада", "Уголок 40×4")
k("lyuk", 108655779, 32000, "₸/шт", "люки чугунные тип «Т»", "Люк чугунный тип Т")
k("lyuk", 117253598, 35000, "₸/шт", "тип Т (С-250) с шарниром и замком, ТОО Partners trade", "Люк чугунный тип Т С-250")
k("gazon_rul", 118519565, 90000, "₸/рулон 50 м²", "рулон 2×25 м = 50 м²", "Газон рулонный", conv=1 / 50)
k("ogr", 121528651, 10000, "₸/п.м (принято)", "«от»; 3D-заборы под ключ (единица в объявлении не указана — принято п.м)", "3D-ограждение под ключ")
k("pl_blue", 112713316, 17000, "₸/шт", "130–150 см — 17 000 (40–60 см — 6 000; 80–90 — 8 000; 120–130 — 15 000; 180–200 — 28 000)", "Можжевельник Блю Эрроу 130–150 см")
k("pl_blue", 119870667, 20000, "₸/шт", "170–210 см", "Можжевельник Блю Эрроу 170–210 см")
k("pl_blue", 123233885, 40000, "₸/шт", "1,3–1,6 м, пышные", "Можжевельник Блю Эрроу 1,3–1,6 м")
# справочные (не в расчёте): асфальтирование «под ключ» (материал+работа), ₸/м²
for ad, pr, nt in ((112095098, 3750, "диапазон 2 500–5 000"), (123261682, 5000, "«от»"), (110837256, 4000, "«от»"), (112109378, 4500, "диапазон 4 000–5 000"), (123217651, 4500, "диапазон 4 000–5 000")):
    k("ab_turnkey", ad, pr, "₸/м²", "асфальтирование под ключ (смесь+работа), толщина не указана. " + nt, "Асфальтирование под ключ")


# ---------------------------------------------------------------- второй проход: закрытие пропусков (Kaspi 2026 + датированный прайс питомника GreenMax)
for ad, pr, nt in ((121661773, 3750, "диапазон 3 500–4 000"), (119459450, 5750, "диапазон 5 500–6 000"), (123994753, 4250, "диапазон 2 500–6 000: середина")):
    k("ab_turnkey", ad, pr, "₸/м²", "асфальтирование под ключ (смесь+работа), толщина не указана. " + nt, "Асфальтирование под ключ")
k("lay_rulon", 105101872, 2000, "₸/м² (принято)", "мягкая кровля рулонно-наплавляемым материалом (Бикрост, Унифлекс и др.), работа; диапазон 1 500–2 500, середина; единица в объявлении не указана — принято ₸/м² за слой", "Укладка наплавляемой гидроизоляции")
k("gidro_w", 121837103, 1250, "₸/м² (принято)", "гидроизоляция фундамента и подвалов: нанесение обмазочных материалов; диапазон 500–2 000, середина; единица не указана — принято ₸/м²", "Обмазочная гидроизоляция (работа+материал)")
k("gidro_w", 113156252, 1000, "₸/м² (принято)", "гидроизоляция цокольных этажей, подвалов, ёмкостей, обмазочная и др.; «от»; единица не указана — принято ₸/м²", "Обмазочная гидроизоляция (работа+материал)")
r("ker", "ТОО Concrete Market (concrete-market.kz)", ALM, "https://concrete-market.kz/almaty/", "₸/м³", 27000, "НДС не указан", "без доставки (доставка отдельно)", "прайс на сайте",
  note="Керамзитобетон М100; М75 — 26 500, М150 — 27 500. Дата на странице не указана. Единственный доступный источник (Pulscen — антибот 503/403; zavod-beton.kz недоступен; его цена 17 000 — на 01.09.2025, не принята)", what="Керамзитобетон М100 (В7,5)")
r("setka5", "Стальная Марка — Алматы.kz (Satu)", ALM, S(134704166, "setka-kladochnaya-5h100h100"), "₸/м²", 1420, note="«от»; сетка кладочная Вр-1 5×100×100, карта 3×2 м", what="Сетка Вр-1 5×100×100")
r("setka5", "МетПромИнтекс (Satu)", ALM, S(118404666, "setka-svarnaya-armaturnaya"), "₸/м²", 1434, note="сетка сварная арматурная Ø5", what="Сетка сварная Ø5 мм")
r("setka5", "МетПромКо (Satu)", ALM, S(118454975, "setka-svarnaya-armaturnaya"), "₸/м²", 1432.62, note="сетка сварная арматурная Ø5", what="Сетка сварная Ø5 мм")
r("setka4", "Стальная Марка — Алматы.kz (Satu)", ALM, S(134704210, "setka-kladochnaya-4h150h150"), "₸/м²", 520, note="Вр-1 4×150×150", what="Сетка Вр-1 4×150×150")
r("setka4", "Стальная Марка — Алматы.kz (Satu)", ALM, S(134704244, "setka-kladochnaya-4h150h150"), "₸/м²", 350, note="Вр-1 4×150×150, 3×2 м", what="Сетка Вр-1 4×150×150")
r("pvl406", "ТОО Rubilon-поставщик №1 (Satu)", ALM, S(123337150, "list-stalnoj-prosechno"), "₸/лист 1×2 м", 9360, conv=0.5, note="ПВЛ-406, лист 1×2 м = 2 м²", what="Лист просечно-вытяжной ПВЛ-406")
r("sgon", "ТОО «Юнайтед Термо» (Satu)", ALM, S(89626628, "sgon-latunnyj-razemnyj"), "₸/шт", 4657, note="сгон 1¼″ В/Н латунный разъёмный «американка» Varmega (аналог «М-П» 1¼″)", what="Муфта разъёмная латунная 1¼″")
GM = "https://www.greenmax.kz/index.php/price"
GMD = "прайс-лист питомника GreenMax «от 15.09.2026 (осень)», страница сформирована 16.11.2026"
def gm(key, price, name, size):
    r(key, "Питомник GreenMax (Талгарский р-н Алматинской обл.)", "Алматинская обл. (Талгар)", GM, "₸/шт", price, "НДС не указан", "самовывоз (рассылки нет)", "в прайсе", cls="A", date=GMD,
      note=f"{name}, {size}, контейнер С3–С5, ЗКС; размер меньше типового для озеленения", what=name)
gm("pl_tuya_smar", 2000, "Туя западная Smaragd", "20–40 см")
gm("pl_tuya_smar", 3500, "Туя западная Brabant", "100–120 см")
gm("pl_golden", 1500, "Туя западная Golden Globe", "20–40 см")
gm("pl_forz", 1500, "Форзиция промежуточная Lynwood", "40–60 см")
gm("pl_dub", 1000, "Дуб черешчатый", "40–60 см")
gm("pl_bereza", 2000, "Берёза бородавчатая/пушистая", "1,5–2 м")
gm("pl_topol", 2000, "Тополь Симона (китайский)", "1,5–2 м")


# ---------------------------------------------------------------- третий проход: питомник PLANTS (Алматы, прайс «Осень 2026»), газонная решётка, ВГП, отводы
PLD = "прайс-лист питомника PLANTS (Алматы) «Сезон: Осень 2026 года»"
PLU = "http://plants.kz/download/price.pdf"
def pls(key, price, name, size, note=""):
    r(key, "Питомник PLANTS (plants.kz), Алматы", ALM, PLU, "₸/шт", price, "НДС не указан", "не указана", "в прайсе", cls="A", date=PLD,
      note=f"{name}, {size}. {note}".strip(), what=name)
pls("pl_tuya_smar", 40000, "Туя западная «Смарагд»", "1,5 м")
pls("pl_blue", 30000, "Можжевельник скальный «Скайрокет» (аналог Blue Arrow, не тот же сорт)", "1,5 м")
pls("pl_golden", 20000, "Туя шаровидная «Голден глоб»", "до 0,5 м")
pls("pl_klen_kr", 100000, "Клён краснолистный", "до 2 м")
pls("pl_dub", 15000, "Дуб черешчатый", "2 м")
pls("pl_bereza", 15000, "Берёза повислая", "2 м")
pls("pl_topol", 10000, "Тополь казахстанский (с комом)", "2 м")
pls("pl_el", 65000, "Ель колючая (голубая)", "1–2 м")
pls("pl_kiz", 8000, "Кизильник", "до 0,5 м")
pls("pl_forz", 8000, "Форзиция средняя", "до 1 м")
pls("pl_yasen", 15000, "Ясень зелёный (Fraxinus pennsylvanica)", "3 м", "штамб в прайсе не указан; в ВОР — «на штамбе»")
# газонная решётка (₸/м²): цена за шт. ÷ площадь шт.
r("gazon_resh", "ТОО Rubilon-поставщик №1 (Satu)", ALM, S(123344088, "reshetka-gazonnaya-standartpark"), "₸/шт 600×400", 2048, conv=1 / 0.24, note="Standartpark РГ-60.40.5,1, 0,24 м² в шт.", what="Решётка газонная пластиковая 600×400×51")
r("gazon_resh", "ТОО Nekei (Satu)", ALM, S(108255562, "gazonnaya-reshetka-chernaya"), "₸/шт 600×400", 1560, conv=1 / 0.24, note="600×400×50 мм", what="Решётка газонная 600×400×50")
r("gazon_resh", "ИП Приходько (Satu)", ALM, S(73537011, "art-602-gazonnaya"), "₸/шт 600×400", 2600, conv=1 / 0.24, avail="под заказ", note="Gidrolica Eco Super РГ-60.40.6,4", what="Решётка газонная Gidrolica Eco Super 600×400×64")
r("gazon_resh", "ТОО DVIV CORP (Satu)", ALM, S(78232859, "gazonnaya-reshetka-ecoteck"), "₸/шт 593×593", 2200, conv=2.84, note="Ecoteck Parking: 2,84 шт. на 1 м² (по карточке)", what="Решётка газонная Ecoteck Parking")
# труба ВГП оцинк. Ду32×3,2 (₸/т) и отвод Ду40
for pid, sl, sup_, pr, nt in ((118456310, "truba-otsinkovannaya-vgp", "МетПромКо", 473937.64, "«от»; Ду32, s=3,2"), (118405826, "truba-otsinkovannaya-vgp", "МетПромИнтекс", 478536, "«от»; Ду32, s=3,2"),
                               (114696958, "truba-otsinkovannaya-stenka", "ТОО Инметпром", 422704.94, "«от»; оцинкованная 32 мм"), (107201614, "truba-vodogazoprovodnaya-vgp", "ТОО Nekei", 260728, "«от»; ВГП 32 мм оцинк."),
                               (69305182, "truba-otsinkovannaya", "ТОО СПК «СтальКом»", 600000, "«от»; труба оцинкованная")):
    r("vgp", f"{sup_} (Satu)", ALM, S(pid, sl), "₸/т", pr, note=nt, what="Труба ВГП оцинкованная Ду32×3,2")
r("otvod40", "Монтаж PRO (Satu)", ALM, S(50060541, "otvod-stalnoj-403"), "₸/шт", 454, note="Ду40×3 (в ВОР 40×2,5 — стенка 2,5 мм)", what="Отвод стальной Ду40×3 ГОСТ 17375")
r("otvod40", "ТОО «ПКФ СТАЛЬ» (Satu)", ALM, S(102225204, "otvod-stal-besshovnyj"), "₸/шт", 440, note="бесшовный 90° 48,3×3,0 (Ду40)", what="Отвод 48,3×3,0")
r("otvod40", "ТОО «MANSVALVE GROUP» (Satu)", ALM, S(134222864, "otvod-stalnoj-483h3"), "₸/шт", 651, note="90° 48,3×3 ГОСТ 17375", what="Отвод 90° 48,3×3")


# ---------------------------------------------------------------- четвёртый проход: Spectehnica.kz (обновлено 20.06.2026) — засыпка, уплотнение, траншея; аналоги ШКП
SPD = "«Информация обновлена: 20.06.2026»"
def sp(key, page, price, unit, note, what, sel=True):
    r(key, "Spectehnica.kz", ALM, f"https://spectehnica.kz/{page}/", unit, price, "НДС не указан", "n/a", "услуга", cls="A", date=SPD, note="«от». " + note, what=what, sel=sel)
sp("zasyp", "obratnaya-zasypka", 600, "₸/м³", "пазухи фундамента с ручной доборкой у стен, слоями с уплотнением (учёт по уплотнённому телу)", "Обратная засыпка пазух")
sp("zasyp", "obratnaya-zasypka", 450, "₸/м³", "засыпка грунтом с объекта, слоями (общая ставка)", "Обратная засыпка", sel=False)
sp("upl", "planirovka-uchastka", 250, "₸/м²", "укатка виброплитой либо катком, проходы по нужной плотности", "Уплотнение/укатка основания")
sp("compact_base", "planirovka-uchastka", 800, "₸/м²", "база под дорогу и парковку: укатка до заданной плотности", "Подготовка и уплотнение основания под дорогу")
sp("trench", "rytye-transhey", 1100, "₸/п.м", "водопровод и самотёчная канализация, ковш 40–60 см, отметка 1,2–1,8 м", "Рытьё траншеи")
sp("backfill_tr", "rytye-transhey", 600, "₸/п.м", "засыпка слоями с виброплитой 20–30 см", "Засыпка траншеи с уплотнением")
sp("bedding", "rytye-transhey", 500, "₸/п.м", "песчаная постель под трубу 10–15 см (работа; песок отдельно)", "Песчаная постель")
# аналоги шкафов управления пожарными насосами (по функции; точной мощности 37–45 кВт в КЗ не найдено)
r("shkp45", "380.kz торгово-производственная компания (Satu)", "Астана", S(117381148, "shkaf-upravleniya-nasosnoj-stantsiej"), "₸/шт", 547756, avail="под заказ",
  note="«от»; шкаф управления насосной станцией пожаротушения ШУНП5115-4274, 150 А, 75 кВт — аналог ШКП-45 по функции (мощность больше); город — Астана", what="Шкаф управления пожарной насосной станцией 75 кВт")
r("shkp45", "ТОО «PureFlow Technology» (Satu)", ALM, S(135651586, "shkaf-upravleniya-nasosami"), "₸/шт", 800000, note="«от»; шкаф управления насосами ШУН «для всех типов насосов», мощность не указана", what="Шкаф управления насосами ШУН")
r("shkp4", "TradeKZ (Satu)", ALM, S(117864571, "rubezh-shun-v-15-00-r3"), "₸/шт", 317465, avail="под заказ", note="«от»; Рубеж ШУН/В-1,5-00-R3 — пожарный шкаф управления электродвигателем 1,5 кВт", what="Шкаф управления пожарный ШУН/В-1,5 кВт")
r("shkp4", "ТОО «Группа «Три А» (Satu)", ALM, S(113328143, "shkaf-upravleniya-pozharnyj"), "₸/шт", 226354.4, avail="под заказ", note="«от»; шкаф управления пожарный ШУН/В-R3, мощность не указана", what="Шкаф управления пожарный ШУН/В-R3")


# окраска стальных труб (работа, ₸/м²): антикоррозионная/малярная покраска металла, Алматы (Satu, услуги)
r("okras", "STROYHOLDING.KZ (Satu)", ALM, S(133121845, "antikorrozionnaya-pokraska"), "₸/м²", 1500, deliv="услуга", note="«от»; антикоррозионная покраска металлоконструкций", what="Антикоррозионная покраска металла")
r("okras", "ТОО «Evolution It Group» (Satu)", ALM, S(80815812, "antikorrozionnaya-zaschita"), "₸/м²", 1000, deliv="услуга", note="«от»; антикоррозионная защита металлоконструкций AlpinPro", what="Антикоррозионная защита металла")
r("okras", "Dekar СтройМаркет (Satu)", ALM, S(135502517, "uslugi-pokraski"), "₸/м²", 1000, deliv="услуга", note="«от»; услуги покраски под ключ / малярные услуги", what="Покраска под ключ")


# «Смотровой блок» (ГП, ведомость лотков): рыночное название — смотровой блок ЛЖК-250 (ж/б, Алматы)
for sup_, pid, sl, pr, nt in (("ТОО ЖБИ Алматы", 128529568, "smotrovoj-blok-lzhk", 36000, ""), ("Холлис Групп", 134242469, "smotrovoj-blok-lzhk", 28000, "ЛЖК-250 ЖБИ в Алматы"),
                              ("ТОО «ТРИАД Construction»", 56196211, "smotrovoj-blok-lzhk", 39000, "«от»"), ("ТОО «ONAY CONCRETE»", 135168004, "smotrovoj-blok-lzhk", 32000, "«от»")):
    r("smotr", f"{sup_} (Satu)", ALM, S(pid, sl), "₸/шт", pr, note=("Смотровой блок ЛЖК-250. " + nt).strip(), what="Смотровой блок ЛЖК-250")


r("mont_tr", "Kurylys Profi (Satu)", ALM, S(127724611, "prokladka-truboprovoda-i-kanalizatsij"), "₸/п.м", 5000, deliv="услуга", note="«от»; «прокладка трубопровода и канализаций» — тип труб и сварка не указаны; 1 источник. Ставка ТОО «Сталепромышленная компания KAZTEMIR» 18 144 ₸/п.м не принята (карточка старше 2026)", what="Прокладка/монтаж трубопровода")

# ---------------------------------------------------------------- справочные строки (не в расчёте) — для запросов дилерам
REF = [
 ("Wilo CO-2 Helix V 5202", "Sadyr Engineering, КлимаТехника, Насосные системы МАМОНТ (Satu, Алматы)", "станции CO-2 Helix V: 1015 — 2 642 700; 2203 — 4 071 000; 3605/K — 8 578 000 ₸ (под заказ); установки пожаротушения CO-2 Helix V SK-FFS: 6,5–9,9 млн ₸ (КлимаТехника); отдельные насосы Helix V 5202: от 1 362 200 до 6 405 000 ₸ в зависимости от исполнения (КлимаТехника, МАМОНТ). Станция именно 5202/K/CC-02 не найдена, собирать цену из насосов+шкафа без цены шкафа нельзя", "https://satu.kz/p79726263-x.html"),
 ("Wilo CO-1 Helix V 412", "КлимаТехника (Satu)", "насос Helix V 412-1/16/E/S/400-50 (один насос без шкафа) — 2 177 000 ₸; сама станция CO-1 не найдена", "https://satu.kz/p133506100-x.html"),
 ("Wilo Atmos GIGA-N 65/250-37/2", "ТОО «КазТеплоСтандарт» (Satu)", "карточка «Wilo-Atmos GIGA-N» 13 651 000 ₸ — цена-заглушка (та же у других моделей), не взята", "https://satu.kz/p81019310-x.html"),
 ("Wilo — официальные дилеры в Алматы (список с wilo.com/kz «Где купить?»)", "wilo.com/kz/ru", "Каталоги и цены дилеры не публикуют (проверены enko.kz, almatherm.kz). Запрос КП: ТОО «Энергетическая компания» (enko.kz, +7 727 228 85 00, ул. Жарокова 280Б); ТОО «Almatherm» (almatherm.kz, +7 727 259 25 92); ТОО «Technical Engineering Support Company» (tes-co.kz, +7 727 220 82 25); ТОО «ISV plus» (isvplus.kz, +7 727 328 94 80); ТОО «IVAN Heating» (ivan-company.kz, +7 777 502 11 21); ТОО «ИнКаз Инжиниринг Казахстан» (in-kaz.kz, +7 727 338 39 88); ТОО «DUX Engineering» (dux.kz, +7 727 352 77 22); ТОО «SAPA Group» (sapa-group.com, +7 727 327 35 50). Головной офис WILO Central Asia: пос. Байсерке, ул. Султана Бейбарса 1, +7 727 312-40-10, info.kz@wilo.com", "https://wilo.com/kz/ru/Контакты/Где-купить/"),
 ("Керамзитобетон М100/В7,5 (слой 0,2 м, ПС-06)", "Kaspi Объявления, Satu, Flagma", "Принята единственная цена КЗ: concrete-market.kz М100 — 27 000 ₸/м³ без доставки (дата на странице не указана). Не принято: zavod-beton.kz 17 000 (прайс на 01.09.2025 — старше 2026), Pulscen (антибот). Датированной цены 2026 нет — запросить бетонные заводы Алматы (РБУ БетонСервис, АКСС, Dostavkabetona, MG Бетон, Concrete Market). Ориентир по сырью: керамзит 28–29 тыс. ₸/м³ (Kaspi, 11.11.2026).", "https://obyavleniya.kaspi.kz/a/keramzit-117600734"),
 ("Асфальтирование «под ключ» (рынок, за слой неизвестной толщины)", "Kaspi Объявления (5 объявлений, 2026)", "8 объявлений Kaspi 2026: медиана 4 375 ₸/м² «под ключ» (материал+работа, толщина не указана); KAZJOL (14.07.2026): от 7 000 ₸/м². Раздельной цены работы нет: в p_ab работа выведена расчётом (рынок под ключ − смесь 5 см) — допущение по толщине.", "https://obyavleniya.kaspi.kz/a/asfaltirovanie-112095098"),
 ("Монтаж/наладка/гидроиспытания/окраска/проходки (НС)", "Kaspi Объявления (сварка, сантехника, монтаж насосов)", "Объявления частных мастеров без объёма и единицы (1 000–100 000 ₸) — для промышленной НС не применимы. Нужен запрос монтажной организации с лицензией.", ""),
 ("ШУН-37 / ШКП-45 / ШКП-4", "TradeKZ, Группа «Три А» (Satu)", "найдены только ШУН/В малой мощности (Рубеж ШУН/В-1,5-00-R3 — 317 465; ШУН/В-3-00-УПП — 490 795; ШУН/В-5,5-00-ПЧ — 868 680 ₸; PureFlow «ШУН для всех типов насосов» от 800 000 ₸ без указания мощности); 37–45 кВт в РК не найден", "https://satu.kz/p113328143-x.html"),
]


def M(key):
    vals = [x["ex"] for x in ROWS if x["key"] == key and x["sel"] and x["price"]]
    if not vals:
        raise KeyError(key)
    import os
    sc = os.environ.get("KZ_SCEN")
    if sc == "min":
        return round(min(vals), 2)
    if sc == "max":
        return round(max(vals), 2)
    return round(statistics.median(vals), 2)


def src(key):
    rows = [x for x in ROWS if x["key"] == key and x["sel"] and x["price"]]
    n = len(rows)
    nA = sum(1 for x in rows if x["cls"] == "A")
    names = "; ".join(sorted({x["sup"].split(" (")[0] for x in rows}))
    return f"{key}: медиана {n} предл. ({names})" + (f", из них с датой 2026: {nA}" if nA else "")


def cls_of(*keys):
    """A — только если все использованные ключи опираются на датированные источники (медиана включает хотя бы A и ≥2 предложений)."""
    return "L"


def write_xlsx(path, extra_notes=None):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    wb = Workbook()
    ws = wb.active
    ws.title = "Цены поставщиков КЗ 2026"
    thin = Side(style="thin", color="BBBBBB")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    hfill = PatternFill("solid", fgColor="1F3864")
    ws["A1"] = "Цены поставщиков и подрядчиков Республики Казахстан, 2026 год (просмотр 16.11.2026) — строка = поставщик × позиция"
    ws["A1"].font = Font(bold=True, size=12, name="Arial")
    ws["A2"] = ("Класс: A — у прайса/страницы/объявления есть дата 2026 (прайс «с 01.03.2026»; Kaspi Объявления — поля «обновлено/действует до» 2026; статьи и страницы с датой); L — живая карточка поставщика КЗ (Satu, сайты компаний) без даты публикации (на 16.11.2026 цена и наличие показаны). "
                "База: ₸ без НДС; если НДС не указан — принято как «без НДС». «Выбрано» — строка вошла в медиану. РФ/Европа/курсы не использовались.")
    ws["A2"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells("A2:N2"); ws.row_dimensions[2].height = 45
    heads = ["Ключ позиции", "Что за товар/услуга", "Поставщик", "Город", "URL", "Дата цены", "Класс даты", "Ед. на сайте", "Цена на сайте",
             "База НДС", "Доставка", "Наличие", "Коэф. приведения", "Цена, ₸ без НДС за ед. расчёта", "Выбрано в расчёт", "Примечание"]
    for i, h in enumerate(heads, 1):
        c = ws.cell(4, i, h); c.font = Font(bold=True, color="FFFFFF", name="Arial", size=10); c.fill = hfill
        c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center"); c.border = border
    rr = 5
    for x in ROWS:
        if not x["price"]:
            continue
        vals = [x["key"], x["what"], x["sup"], x["city"], x["url"], x["date"], x["cls"], x["unit"], x["price"], x["vat"], x["deliv"], x["avail"],
                x["conv"], round(x["ex"], 2), "да" if x["sel"] else "нет", x["note"]]
        for i, v in enumerate(vals, 1):
            c = ws.cell(rr, i, v); c.border = border; c.alignment = Alignment(wrap_text=True, vertical="top"); c.font = Font(name="Arial", size=9)
        ws.cell(rr, 9).number_format = "#,##0.00"; ws.cell(rr, 14).number_format = "#,##0.00"
        rr += 1
    for i, w in enumerate([12, 34, 32, 9, 44, 26, 7, 16, 11, 11, 18, 10, 9, 14, 9, 52], 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "C5"
    # сводка по ключам
    w2 = wb.create_sheet("Медианы (в расчёт)")
    w2["A1"] = "Медианы выбранных предложений — ₸ без НДС за единицу расчёта"; w2["A1"].font = Font(bold=True, size=12, name="Arial")
    for i, h in enumerate(["Ключ", "Единица", "Медиана, ₸ без НДС", "Предложений", "из них класс A (дата 2026)", "Мин.", "Макс."], 1):
        c = w2.cell(3, i, h); c.font = Font(bold=True, color="FFFFFF", name="Arial", size=10); c.fill = hfill; c.border = border
    keys = []
    for x in ROWS:
        if x["price"] and x["sel"] and x["key"] not in keys:
            keys.append(x["key"])
    for j, k in enumerate(keys, 4):
        rs = [x for x in ROWS if x["key"] == k and x["sel"] and x["price"]]
        ex = [x["ex"] for x in rs]
        for i, v in enumerate([k, rs[0]["unit"], round(statistics.median(ex), 2), len(rs), sum(1 for x in rs if x["cls"] == "A"), round(min(ex), 2), round(max(ex), 2)], 1):
            c = w2.cell(j, i, v); c.border = border; c.font = Font(name="Arial", size=10)
        for i in (3, 6, 7): w2.cell(j, i).number_format = "#,##0.00"
    for i, w in enumerate([16, 22, 18, 12, 16, 12, 12], 1):
        w2.column_dimensions[get_column_letter(i)].width = w
    w3 = wb.create_sheet("Не найдено — запрос")
    w3["A1"] = "Справочно: найденные ориентиры, не взятые в расчёт, и позиции, которых нет в РК за 2026 (нужен запрос)"; w3["A1"].font = Font(bold=True, size=12, name="Arial")
    for i, h in enumerate(["Позиция", "Где смотрели", "Что нашли / почему не взято", "URL"], 1):
        c = w3.cell(3, i, h); c.font = Font(bold=True, color="FFFFFF", name="Arial", size=10); c.fill = hfill
    rows3 = list(REF) + (extra_notes or [])
    for j, row in enumerate(rows3, 4):
        for i, v in enumerate(row, 1):
            c = w3.cell(j, i, v); c.alignment = Alignment(wrap_text=True, vertical="top"); c.border = border; c.font = Font(name="Arial", size=10)
    for i, w in enumerate([34, 34, 90, 40], 1):
        w3.column_dimensions[get_column_letter(i)].width = w
    wb.save(path)
