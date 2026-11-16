"""Чистовое КП (для отправки заказчику) из VOR_KP_Koktobe_138.xlsx.

Отличия от черновиков: нет плашек «черновик», ⚠️ и внутренних замечаний;
нулевые позиции (учтены в других расценках) убраны из ведомости;
сумма строки = показанное кол-во × показанная цена (сходится при проверке калькулятором).

Запуск: python3 scripts/build_kp_final.py VOR_KP_Koktobe_138.xlsx OUT.docx nvk|blag
  nvk  = КП № 1 (насосная станция и резервуары), blag = КП № 2 (благоустройство и озеленение)
"""
import re, math, sys
from openpyxl import load_workbook
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from num2words import num2words

XLSX, OUT = sys.argv[1], sys.argv[2]
wb = load_workbook(XLSX)
ws = wb["ВОР и расчёт"]
wk = wb["КП (свод)"]


def find(label):
    for r in range(1, wk.max_row + 1):
        v = wk.cell(r, 1).value
        if isinstance(v, str) and v.startswith(label):
            return wk.cell(r, 2).value


NR, RISK, PROF, VAT = find("Накладные расходы, %"), find("Резерв на риски, %"), find("Прибыль, %"), find("НДС, %")
K = (1 + NR) * (1 + RISK) * (1 + PROF)

# ---------- вычисление формул ВОР без Excel (как в build_kp_docx.py)
cells = {r: dict(A=ws.cell(r, 1).value, B=ws.cell(r, 2).value, C=ws.cell(r, 3).value,
                 D=ws.cell(r, 4).value, G=ws.cell(r, 7).value) for r in range(6, ws.max_row + 1)}
cache = {}


def val(col, r):
    k = (col, r)
    if k in cache:
        return cache[k]
    if col == "H":
        d, g = val("D", r), val("G", r)
        v = d * g if isinstance(d, (int, float)) and isinstance(g, (int, float)) else ""
    else:
        x = cells[r][col]
        if isinstance(x, str) and x.startswith("="):
            e = x[1:].replace("^", "**").replace("PI()", "math.pi").replace("SQRT", "math.sqrt")
            e = re.sub(r"SUM\(([^)]*)\)", lambda m: "S([" + m.group(1) + "])", e)
            e = re.sub(r"([DGH])(\d+)", lambda m: f"val('{m.group(1)}',{m.group(2)})", e)
            v = eval(e, {"math": math, "val": val, "S": lambda l: sum(i for i in l if isinstance(i, (int, float)))})
        else:
            v = x
    cache[k] = v
    return v


# ---------- чистка текста для заказчика
NAME_FIX = {
    "Вывоз излишнего грунта (выемка − обратная засыпка)": "Вывоз излишнего грунта",
    "Вывоз излишнего грунта от резервуаров (выемка − обратная засыпка)": "Вывоз излишнего грунта от резервуаров",
    "Бетонная подготовка C8/10, t=100 мм (фунд. плита 5,5 + приямок 0,21)": "Бетонная подготовка C8/10, t=100 мм",
    "Арматура резервуаров А500С (по аналогу НС: 133 кг/м³)": "Арматура резервуаров А500С",
    "Лоток «ЗКЦ» (в ведомости лотков)": "Лоток ЗКЦ",
    "Посадка: Туя (в ведомости «Туя Самарканд»)": "Посадка: Туя «Самарканд»",
}
NAME_RE = [
    (r"\s*\(в спецификации [^)]*\)", ""),
    (r"\s*\(по аналогии ПС-07[^)]*\)", ""),
    (r"\s*\(Wilo/ГОСТ 13547-79\)", ", ГОСТ 13547-79"),
]
SECTION_TITLE = {
    1: "Насосная станция пожаротушения. Земляные работы и монолитные ж/б конструкции (VG-03/2026-АС)",
    2: "Насосная станция пожаротушения. Оборудование, трубопроводы, арматура, монтаж и пусконаладка (VG-03/2026-ВК)",
    3: "Пожарные резервуары 2×200 м³ (VG-03/2026-НВК.ТХ)",
    4: "Благоустройство: покрытия, бордюры, ограждения, водоотвод, укрепление откосов (ГП л. 6.1, ПС-06, ПС-07)",
    5: "Озеленение: посадочный материал и посадка (ГП л. 6.1, ведомость озеленения)",
}
SECTION_SHORT = {
    1: "Насосная станция: земляные работы и монолитные ж/б конструкции",
    2: "Насосная станция: оборудование, трубопроводы, монтаж и пусконаладка",
    3: "Пожарные резервуары 2×200 м³",
    4: "Покрытия, бордюры, ограждения, водоотвод, укрепление откосов",
    5: "Озеленение",
}


def clean(s):
    s = NAME_FIX.get(s, s)
    for a, b in NAME_RE:
        s = re.sub(a, b, s)
    s = s.replace(" — ", ", ").replace("—", "-").replace("–", "-").replace("−", "-").replace("⚠️", "")
    s = s.replace("…", "...")
    return re.sub(r"\s{2,}", " ", s).strip()


def qty_round(q, unit):
    # точность показа: тонны 3 знака, прочие дробные 2 знака, целые как есть
    nd = 3 if unit == "т" else 2
    return round(q, nd)


# ---------- сбор позиций
sections, cur = [], None
for r in range(6, ws.max_row + 1):
    c = cells[r]
    if c["D"] is None and c["G"] is None:
        if c["B"] is None and isinstance(c["A"], str):
            cur = [c["A"], []]
            sections.append(cur)
        continue
    d, g = val("D", r), val("G", r)
    if not isinstance(g, (int, float)):
        raise SystemExit(f"Строка {r}: нет цены ({c['B']}). Чистовик собирается только при полном итоге.")
    if g == 0:
        continue  # учтено в других расценках, в ведомость заказчику не выводим
    unit = c["C"]
    q = qty_round(d, unit)
    price = round(g * K)
    cur[1].append(dict(name=clean(c["B"]), unit=unit, qty=q, price=price, total=round(q * price)))

assert len(sections) == 6 and not sections[0][1], "ожидались разделы 0..5, раздел 0 без платных позиций"
sections = sections[1:]  # раздел 0 (разбивка осей) учтён в накладных
for i, s in enumerate(sections, 1):
    s[0] = SECTION_TITLE[i]

# ---------- выбор КП
SCOPE = sys.argv[3] if len(sys.argv) > 3 else ""
if SCOPE not in ("nvk", "blag"):
    raise SystemExit("Третий аргумент: nvk (КП № 1) или blag (КП № 2)")
IDX = [0, 1, 2] if SCOPE == "nvk" else [3, 4]
sections = [sections[i] for i in IDX]
SHORT = [SECTION_SHORT[i + 1] for i in IDX]
sec_sums = [sum(i["total"] for i in s[1]) for s in sections]
TOTAL = sum(sec_sums)
VATSUM = round(TOTAL * VAT)
GRAND = TOTAL + VATSUM

fmt = lambda x: f"{x:,.0f}".replace(",", " ")


def fmtq(x):
    if abs(x - round(x)) < 1e-9:
        return f"{x:,.0f}".replace(",", " ")
    s = f"{x:,.3f}".rstrip("0").rstrip(".")
    return s.replace(",", " ").replace(".", ",")


COMMON_EXCL = "Охрана объекта, электроэнергия и вода на период строительства, технический и авторский надзор."
TXT = {
    "nvk": dict(
        num="№ 1",
        sub="на выполнение строительно-монтажных работ под ключ:\nнасосная станция пожаротушения и пожарные резервуары",
        subject="насосную станцию пожаротушения и два пожарных резервуара по 200 м³.",
        other="Благоустройство территории предлагается отдельным коммерческим предложением № 2.",
        basis="рабочая документация ТОО «Axis Projects»: VG-03/2026-ВК, VG-03/2026-НВК.ТХ, VG-03/2026-АС.",
        scope=[
            "Земляные работы: разработка котлованов, вывоз излишнего грунта, обратная засыпка с послойным уплотнением.",
            "Монолитные ж/б конструкции насосной станции и резервуаров (бетон C20/25 W6 F150), армирование, "
            "обмазочная гидроизоляция, металлоконструкции лестницы, навеса и щитов.",
            "Поставка и монтаж насосного оборудования Wilo, шкафов управления, прибора «Поток-3Н», узлов управления, "
            "запорной и обратной арматуры, трубопроводов Ø89-219 мм, дренажных насосов.",
            "Гидравлические испытания, промывка и дезинфекция, испытание резервуаров на водонепроницаемость, "
            "индивидуальные испытания и пусконаладка насосной станции."],
        srok=["120 календарных дней с даты получения аванса и передачи строительной площадки.",
              "Срок поставки насосного оборудования Wilo уточняется при заказе.",
              "Бетонные работы при температуре воздуха ниже +5 °C выполняются с прогревом по согласованию."],
        garan=["2 года на строительно-монтажные работы с даты подписания акта приёмки.",
               "На оборудование: гарантия производителя."],
        incl=["Все работы и материалы по указанной рабочей документации.",
              "Геодезическая разбивка, опалубочные работы, доставка бетона и материалов.",
              "Исполнительная документация и акты освидетельствования скрытых работ."],
        excl=["Электроснабжение, автоматика, вентиляция и отопление насосной станции (разделы ЭОМ, АНС, ОВ, АР).",
              "Наружные сети водопровода от насосной станции, пожарные гидранты, подключение к городским сетям.",
              "Выпуск дренажной канализации от приямка насосной станции.",
              "Устройство искусственного основания резервуаров на просадочных грунтах и водопонижение.",
              "Благоустройство территории (коммерческое предложение № 2).",
              COMMON_EXCL],
        cond=["Стоимость рассчитана по объёмам рабочей документации, перечисленной в разделе 1.",
              "Стоимость пожарных резервуаров определена по технологическому разделу VG-03/2026-НВК.ТХ и подлежит "
              "уточнению после выдачи раздела КЖ резервуаров.",
              "Состав насосного оборудования принят по экспликации раздела ВК.",
              "Изменение объёмов оформляется дополнительным соглашением по единичным ценам Приложения 1."],
    ),
    "blag": dict(
        num="№ 2",
        sub="на выполнение работ по благоустройству и озеленению территории",
        subject="благоустройство территории: покрытия проездов, тротуаров и площадок, бордюры, ограждения, "
                "водоотвод, укрепление откосов, озеленение.",
        other="Насосная станция пожаротушения и пожарные резервуары предлагаются отдельным коммерческим предложением № 1.",
        basis="рабочая документация ТОО «Axis Projects»: генеральный план, лист 6.1, ПС-06, ПС-07 (редакция от 15.10.2026).",
        scope=[
            "Покрытия: проезды из асфальтобетона 3 916 м², парковка с газонной решёткой 1 234 м², тротуары, "
            "площадки с травмобезопасным покрытием, отмостка.",
            "Устройство оснований: корыто, планировка и уплотнение, конструктивные слои по ПС-06.",
            "Бордюрный камень 2 675 шт., тактильные плиты, ограждения 477 п.м.",
            "Водоотвод: лотки с решётками, смотровые блоки, быстротоки, ж/б лоток; укрепление откосов "
            "геокаркасом 3 320 м².",
            "Озеленение: газоны, посадка деревьев и кустарников по ведомости озеленения (14 позиций)."],
        srok=["90 календарных дней в строительный сезон с даты получения аванса и передачи фронта работ.",
              "Асфальтобетонные, плиточные работы и озеленение выполняются при температуре воздуха не ниже +5 °C."],
        garan=["2 года на строительно-монтажные работы с даты подписания акта приёмки.",
               "Озеленение: гарантия приживаемости 1 вегетационный период при обеспечении заказчиком полива и ухода."],
        incl=["Все работы и материалы по указанной рабочей документации.",
              "Геодезическая разбивка, доставка материалов, вывоз строительного мусора.",
              "Исполнительная документация и акты освидетельствования скрытых работ."],
        excl=["Монолитная плита перекрытия паркинга и её гидроизоляция.",
              "Вертикальная планировка территории, наружное освещение, малые архитектурные формы, игровое и "
              "спортивное оборудование, площадка ТБО.",
              "Берегоукрепление ручья, работы по существующему газопроводу.",
              "Насосная станция и пожарные резервуары (коммерческое предложение № 1).",
              COMMON_EXCL],
        cond=["Стоимость рассчитана по объёмам рабочей документации, перечисленной в разделе 1.",
              "Конструкции покрытий приняты по листу ПС-06, площади по ведомости листа 6.1.",
              "Изменение объёмов оформляется дополнительным соглашением по единичным ценам Приложения 1."],
    ),
}
T = TXT[SCOPE]

# ---------- документ
doc = Document()
st = doc.styles["Normal"]
st.font.name = "Arial"
st.font.size = Pt(10)
st.element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
s0 = doc.sections[0]
s0.page_width, s0.page_height = Cm(21), Cm(29.7)
s0.left_margin = s0.right_margin = Cm(1.8)
s0.top_margin = s0.bottom_margin = Cm(1.6)
BLUE = "1F3864"
R, C = WD_ALIGN_PARAGRAPH.RIGHT, WD_ALIGN_PARAGRAPH.CENTER


def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), color)
    tcPr.append(sh)


def para(text="", bold=False, size=10, align=None, color=None, space=3, italic=False):
    p = doc.add_paragraph()
    for k, line in enumerate(text.split("\n")):
        if k:
            p.add_run().add_break()
        r = p.add_run(line); r.bold = bold; r.italic = italic; r.font.size = Pt(size)
        if color:
            r.font.color.rgb = RGBColor.from_string(color)
    if align is not None:
        p.alignment = align
    p.paragraph_format.space_after = Pt(space); p.paragraph_format.space_before = Pt(0)
    return p


def h(text):
    p = para(text, bold=True, size=11, color=BLUE, space=4)
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.keep_with_next = True
    return p


def bullets(items):
    for t in items:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(1)
        p.add_run(t).font.size = Pt(10)


def set_cell(cell, text, bold=False, size=9, align=None):
    cell.text = ""
    p = cell.paragraphs[0]
    r = p.add_run(str(text)); r.bold = bold; r.font.size = Pt(size)
    p.paragraph_format.space_after = Pt(0)
    if align is not None:
        p.alignment = align


def sign():
    para("Директор ТОО «______________________»          ______________  /______________/", space=0)
    para("М.П.", size=9, space=0)


# шапка
para("ТОО «______________________»", bold=True, size=12, space=0)
para("БИН ____________  ИИК ______________________  БИК __________  Банк ______________________", size=9, space=0)
para("Адрес: ______________________________________  Тел.: ______________  E-mail: ______________", size=9, space=0)
para("Плательщик НДС", size=9, space=8)
t = doc.add_table(rows=1, cols=2)
set_cell(t.rows[0].cells[0], "Исх. № ______ от «___» ____________ 2026 г.", size=10)
set_cell(t.rows[0].cells[1], "Руководителю ______________________", size=10, align=R)
para("", space=6)
para(f"КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ {T['num']}", bold=True, size=14, align=C, space=2)
para(T["sub"], size=10, align=C, space=10)

h("1. Предмет предложения")
para("Объект: «Строительство жилых домов с паркингами, мкр. Коктобе, ул. Бигельдинова (Азербаева), д. 138, "
     "Медеуский район, г. Алматы».")
para("Предлагаем выполнить под ключ, с поставкой материалов и оборудования, " + T["subject"])
para(T["other"])
para("Основание: " + T["basis"])

h("2. Состав работ")
bullets(T["scope"])

h("3. Стоимость работ")
para("Цены в тенге. Стоимость включает материалы, оборудование, доставку, работы, механизмы, накладные расходы и "
     "прибыль подрядчика.", size=9, space=4)
tb = doc.add_table(rows=1, cols=5)
tb.style = "Table Grid"; tb.alignment = WD_TABLE_ALIGNMENT.CENTER
for c_, t_ in zip(tb.rows[0].cells, ["№", "Раздел", "Без НДС, ₸", f"НДС {int(VAT * 100)}%, ₸", "С НДС, ₸"]):
    set_cell(c_, t_, bold=True, align=C); shade(c_, "D9E2F3")
for i, (label, amount) in enumerate(zip(SHORT, sec_sums), 1):
    v = round(amount * VAT)
    row = tb.add_row().cells
    set_cell(row[0], i, align=C); set_cell(row[1], label)
    for j, x in ((2, amount), (3, v), (4, amount + v)):
        set_cell(row[j], fmt(x), align=R)
row = tb.add_row().cells
set_cell(row[0], ""); set_cell(row[1], "ИТОГО", bold=True)
for j, x in ((2, TOTAL), (3, VATSUM), (4, GRAND)):
    set_cell(row[j], fmt(x), bold=True, align=R)
for c_ in row:
    shade(c_, "D9E2F3")
for row in tb.rows:
    for c_, w in zip(row.cells, (1.0, 8.2, 3.2, 2.6, 3.2)):
        c_.width = Cm(w)
para("", space=2)
para(f"Итого с НДС: {fmt(GRAND)} ({num2words(GRAND, lang='ru')}) тенге.", bold=True, space=4)
para("Детализация по позициям, количествам и ценам приведена в Приложении 1.", size=9, italic=True)

h("4. Сроки выполнения")
bullets(T["srok"])
para("Детальный график производства работ согласовывается при заключении договора.", space=3)

h("5. Условия оплаты")
bullets(["Аванс 30% на закупку материалов и оборудования.",
         "Промежуточные платежи ежемесячно по актам выполненных работ (КС-2) и справкам о стоимости (КС-3).",
         "Окончательный расчёт после подписания акта приёмки и передачи исполнительной документации."])

h("6. Гарантийные обязательства")
bullets(T["garan"])

h("7. Включено и не включено в стоимость")
para("Включено:", bold=True, space=1)
bullets(T["incl"])
para("Не включено:", bold=True, space=1)
bullets(T["excl"])

h("8. Условия предложения")
bullets(T["cond"])

h("9. Срок действия предложения")
para("30 календарных дней с даты выставления. По истечении срока цены на металл, бетон и асфальтобетон "
     "подлежат актуализации.")

h("10. Квалификация")
para("Государственная лицензия на строительно-монтажные работы № ____________ от ____________, категория ____. "
     "Опыт выполнения аналогичных работ, справка об отсутствии налоговой задолженности предоставляются по запросу.")
para("", space=14)
sign()

# ---------- Приложение 1
new = doc.add_section()
new.orientation = WD_ORIENT.LANDSCAPE
new.page_width, new.page_height = Cm(29.7), Cm(21)
new.left_margin = new.right_margin = Cm(1.2)
new.top_margin = new.bottom_margin = Cm(1.2)
para(f"Приложение 1 к коммерческому предложению {T['num']}", bold=True, size=12, color=BLUE, space=0)
para("Ведомость объёмов работ и стоимости", bold=True, size=11, space=2)
para("Цены за единицу и суммы указаны в тенге без НДС.", size=8, italic=True, space=4)
ta = doc.add_table(rows=1, cols=6)
ta.style = "Table Grid"
for c_, t_ in zip(ta.rows[0].cells, ["№", "Наименование работ, материалов, оборудования", "Ед. изм.", "Кол-во",
                                      "Цена за ед., ₸", "Сумма, ₸"]):
    set_cell(c_, t_, bold=True, size=8, align=C); shade(c_, "D9E2F3")
trPr = ta.rows[0]._tr.get_or_add_trPr(); hdr = OxmlElement("w:tblHeader"); hdr.set(qn("w:val"), "true"); trPr.append(hdr)


def total_row(label, x, size=9):
    row = ta.add_row().cells
    m = row[0].merge(row[4]); set_cell(m, label, bold=True, size=size, align=R)
    set_cell(row[5], fmt(x), bold=True, size=size, align=R)


for si, (s, tot) in enumerate(zip(sections, sec_sums), 1):
    row = ta.add_row().cells
    m = row[0].merge(row[5]); set_cell(m, f"{si}. {s[0]}", bold=True, size=8); shade(m, "EDEDED")
    for k, it in enumerate(s[1], 1):
        row = ta.add_row().cells
        set_cell(row[0], f"{si}.{k}", size=8, align=C)
        set_cell(row[1], it["name"], size=8)
        set_cell(row[2], it["unit"], size=8, align=C)
        set_cell(row[3], fmtq(it["qty"]), size=8, align=R)
        set_cell(row[4], fmt(it["price"]), size=8, align=R)
        set_cell(row[5], fmt(it["total"]), size=8, align=R)
    total_row(f"Итого по разделу {si}", tot, size=8)
total_row("ВСЕГО без НДС", TOTAL)
total_row(f"НДС {int(VAT * 100)}%", VATSUM)
total_row("ВСЕГО с НДС", GRAND)
for row in ta.rows:
    for c_, w in zip(row.cells, (1.2, 15.3, 1.6, 2.4, 3.4, 3.6)):
        c_.width = Cm(w)
para("", space=10)
sign()

doc.save(OUT)
print(SCOPE, "sections", [fmt(x) for x in sec_sums], "TOTAL", fmt(TOTAL), "VAT", fmt(VATSUM),
      "GRAND", fmt(GRAND), "items", sum(len(s[1]) for s in sections))
