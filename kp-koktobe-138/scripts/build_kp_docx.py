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

# --- параметры наценок из свода
def find(label):
    for r in range(1, wk.max_row + 1):
        v = wk.cell(r, 1).value
        if isinstance(v, str) and v.startswith(label):
            return wk.cell(r, 2).value
NR, RISK, PROF, VAT = find("Накладные расходы, %"), find("Резерв на риски, %"), find("Прибыль, %"), find("НДС, %")
K = (1 + NR) * (1 + RISK) * (1 + PROF)

# --- вычисление ячеек (D, G) без Excel
cells = {}
for r in range(6, ws.max_row + 1):
    cells[r] = dict(A=ws.cell(r, 1).value, B=ws.cell(r, 2).value, C=ws.cell(r, 3).value, D=ws.cell(r, 4).value,
                    G=ws.cell(r, 7).value, I=ws.cell(r, 9).value, F=ws.cell(r, 6).value)
cache = {}
def val(col, r):
    k = (col, r)
    if k in cache: return cache[k]
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

sections = []   # (title, [items])
cur = None
for r in range(6, ws.max_row + 1):
    c = cells[r]
    if c["D"] is None and c["G"] is None:
        if c["B"] is None and isinstance(c["A"], str):
            cur = [c["A"], []]; sections.append(cur)
        continue
    d, g = val("D", r), val("G", r)
    priced = isinstance(g, (int, float))
    unit_kp = round(g * K) if priced else None
    total = round(d * unit_kp) if priced else None
    cur[1].append(dict(name=c["B"], unit=c["C"], qty=d, unit_kp=unit_kp, total=total, priced=priced))

SCOPE = sys.argv[3] if len(sys.argv) > 3 else "all"
SECIDX = {"all": [0, 1, 2, 3, 4, 5], "nvk": [0, 1, 2, 3], "blag": [4, 5]}[SCOPE]
sections = [sections[i] for i in SECIDX]
def sec_total(s): return sum(i["total"] for i in s[1] if i["priced"])
sec_sums = [sec_total(s) for s in sections]
TOTAL = sum(sec_sums)
VATSUM = round(TOTAL * VAT)
GRAND = TOTAL + VATSUM
n_unpriced = sum(1 for s in sections for i in s[1] if not i["priced"])
fmt = lambda x: f"{x:,.0f}".replace(",", " ")
fmtq = lambda x: (f"{x:,.2f}".replace(",", " ").replace(".", ",") if abs(x - round(x)) > 1e-9 else f"{x:,.0f}".replace(",", " "))


TXT = {
 "all": dict(num="", sub="на выполнение строительно-монтажных работ под ключ",
   banner="ЧЕРНОВИК. Не для отправки заказчику.",
   subject="насосная станция пожаротушения, два пожарных резервуара по 200 м³, благоустройство территории с водоотводом и озеленением.",
   basis="VG-03/2026-ВК, VG-03/2026-НВК.ТХ, VG-03/2026-АС (КЖ), генеральный план (лист 6.1, ПС-06, ПС-07, версии от 15.10.2026).",
   bullets=["Насосная станция пожаротушения, два пожарных резервуара, благоустройство с водоотводом и озеленением по документации."],
   incl=["Все работы и материалы по присланной документации."], srok="Срок не определён.", garan="2 года на СМР; на оборудование — гарантия производителя."),
 "nvk": dict(num=" № 1", sub="на выполнение строительно-монтажных работ под ключ: насосная станция пожаротушения и пожарные резервуары (НВК)",
   banner="ЧЕРНОВИК КП №1 (НВК). Не для отправки заказчику: цены — медианы предложений поставщиков РК за 2026 г., не подтверждены счетами. Итог НЕПОЛНЫЙ: нет цены КЗ на насосные установки Wilo, шкафы ШКП/УУ-С100, часть монтажных работ и испытаний. КЖ насосной (6×6 м) не согласован с ВК (6×9 м), КЖ резервуаров нет — объёмы резервуаров по аналогии. См. файл расчёта.",
   subject="насосная станция пожаротушения и два пожарных резервуара по 200 м³ (НВК). Благоустройство территории выполняется по отдельному КП № 2.",
   basis="рабочая документация ТОО «Axis Projects» VG-03/2026-ВК (альбом №1, ВК), VG-03/2026-НВК.ТХ (пожарные резервуары), VG-03/2026-АС (КЖ насосной станции).",
   bullets=["Насосная станция пожаротушения: заглублённое монолитное ж/б здание (по КЖ 6×6 м; котлован ≈875 м³, бетон C20/25 W6 F150 ≈60 м³), насосные установки Wilo, шкафы управления, обвязка Ø89–219, дренажный приямок.",
            "Два пожарных резервуара по 200 м³ (монолитный ж/б) с горловинами, люками, датчиками уровня и отводящими трубопроводами В2 до насосной.",
            "Исполнительная документация и акты скрытых работ по перечню проекта."],
   incl=["Все работы и материалы по документации ВК, НВК.ТХ, АС(КЖ).", "Земляные работы с вывозом излишнего грунта, обратная засыпка с уплотнением.",
         "Гидравлические испытания, промывка и дезинфекция, испытания резервуаров на водонепроницаемость, индивидуальные испытания и пусконаладка насосной станции.", "Исполнительная документация, акты скрытых работ."],
   excl=["Разделы АР, ЭОМ, АНС, ОВ, КМ насосной станции (не предоставлены): электроснабжение, кабели, автоматика, диспетчеризация, вентиляция, отопление.",
         "Наружные сети водопровода В2 от насосной до сети и гидранты; подключение к городским сетям, технические условия.",
         "Выпуск дренажной канализации К3Н (Ø32) от приямка насосной до точки сброса.",
         "Мероприятия по основанию резервуаров на просадочных грунтах II типа, водопонижение (в проекте не предусмотрены).",
         "Благоустройство территории — по КП № 2.",
         "Охрана объекта, электроэнергия и вода на период СМР (предоставляются заказчиком), строительный контроль и авторский надзор."],
   srok="[___] календарных дней с даты аванса и передачи площадки. ⚠️ Срок зависит от поставки насосных установок Wilo (под заказ) и сезона (бетонные работы при t < +5 °C).",
   garan="2 года на строительно-монтажные работы; на оборудование — гарантия производителя (Wilo и др.)."),
 "blag": dict(num=" № 2", sub="на выполнение работ по благоустройству: покрытия, водоотвод, укрепление откосов, озеленение",
   banner="ЧЕРНОВИК КП №2 (благоустройство). Не для отправки заказчику: цены — медианы предложений поставщиков РК за 2026 г., не подтверждены счетами. Составные покрытия (проезды, тротуары над паркингом, площадки, озеленение над паркингом) учтены без части слоёв/работ; не оценены лоток «ЗКЦ» и смотровые блоки (в ГП не расшифрованы). См. файл расчёта.",
   subject="благоустройство территории: покрытия проездов, тротуаров и площадок, бордюры, водоотводные лотки, укрепление откосов, озеленение. НВК (насосная станция и резервуары) — по отдельному КП № 1.",
   basis="генеральный план (лист 6.1 «План покрытий проездов и площадок», ПС-06 «Конструкции», ПС-07 «Водоотвод и укрепление откосов», версии от 15.10.2026), ТОО «Axis Projects».",
   bullets=["Покрытия: проезды а/б 3 916 м², парковка с газонной решёткой 1 234 м², тротуары, площадки, отмостка; бордюры 2 675 п.м; тактильные плиты.",
            "Водоотвод: лотки бетонные DN200 с решётками, смотровые блоки, быстротоки, ж/б лоток от отмостки; укрепление откосов геокаркасом 3 320 м².",
            "Озеленение: деревья, кустарники, газон (14 позиций посадочного материала по ведомости).",
            "Исполнительная документация и акты скрытых работ."],
   incl=["Все работы и материалы по листам ГП 6.1, ПС-06, ПС-07.", "Корыто, планировка и уплотнение оснований, устройство конструктивных слоёв по ПС-06.", "Бордюры с бетонным основанием, укладка плитки и асфальтобетона.", "Исполнительная документация, акты скрытых работ."],
   excl=["Монолитная плита перекрытия паркинга и её гидроизоляция (лежит под покрытиями).",
         "Игровое и спортивное оборудование, малые архитектурные формы, наружное освещение, площадка ТБО, объекты поз. 9 и 10 на генплане (листов ГП-1…ГП-5 нет).",
         "Берегоукрепление габионами по ручью и защита/вынос существующего газопровода (показаны на топооснове, в ведомостях ГП отсутствуют).",
         "Вертикальная планировка территории и ливневая канализация сверх указанной в ГП.",
         "Насосная станция и пожарные резервуары — по КП № 1.",
         "Охрана объекта, электроэнергия и вода на период СМР (предоставляются заказчиком), строительный контроль и авторский надзор."],
   srok="[___] календарных дней с даты аванса и передачи площадки. ⚠️ Асфальтирование, укладка плитки и озеленение — сезонные работы: в холодный период (t < +5 °C) — перерыв до весны.",
   garan="2 года на строительно-монтажные работы; озеленение — гарантия приживаемости [__] месяцев на согласованных условиях."),
}
T = TXT[SCOPE]

# --- документ
doc = Document()
st = doc.styles["Normal"]; st.font.name = "Arial"; st.font.size = Pt(10)
st.element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
sec0 = doc.sections[0]
sec0.page_width, sec0.page_height = Cm(21), Cm(29.7)
for m in ("left_margin", "right_margin"): setattr(sec0, m, Cm(1.8))
sec0.top_margin = Cm(1.6); sec0.bottom_margin = Cm(1.6)

def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr(); sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), color); tcPr.append(sh)
def para(text="", bold=False, size=10, align=None, color=None, space=3, italic=False):
    p = doc.add_paragraph(); r = p.add_run(text); r.bold = bold; r.italic = italic; r.font.size = Pt(size)
    if color: r.font.color.rgb = RGBColor.from_string(color)
    if align: p.alignment = align
    p.paragraph_format.space_after = Pt(space); p.paragraph_format.space_before = Pt(0)
    return p
def h(text):
    p = para(text, bold=True, size=11, color="1F3864", space=4); p.paragraph_format.space_before = Pt(8); return p
def bullets(items):
    for t in items:
        p = doc.add_paragraph(style="List Bullet"); p.paragraph_format.space_after = Pt(1)
        r = p.add_run(t); r.font.size = Pt(10)
def set_cell(cell, text, bold=False, size=9, align=None):
    cell.text = ""; p = cell.paragraphs[0]; r = p.add_run(str(text)); r.bold = bold; r.font.size = Pt(size)
    p.paragraph_format.space_after = Pt(0)
    if align: p.alignment = align

# черновик-плашка
t = doc.add_table(rows=1, cols=1); t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.style = "Table Grid"
set_cell(t.rows[0].cells[0], T["banner"], bold=True, size=9)
shade(t.rows[0].cells[0], "FFF2CC")
para("", space=2)

para("[НАИМЕНОВАНИЕ ПОДРЯДЧИКА, ТОО]", bold=True, size=12, space=0)
para("БИН [____________], адрес: [____________________], ИИК [____________], БИК [________], банк [____________]\nТел.: [__________], e-mail: [__________]. Плательщик НДС (16%): да", size=9, space=6)
t = doc.add_table(rows=1, cols=2);
set_cell(t.rows[0].cells[0], "Исх. № [____] от [__.__.2026]", size=10)
set_cell(t.rows[0].cells[1], "[Наименование заказчика / застройщика]\n[ФИО руководителя]", size=10, align=WD_ALIGN_PARAGRAPH.RIGHT)
para("", space=4)
para("КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ" + T["num"], bold=True, size=14, align=WD_ALIGN_PARAGRAPH.CENTER, space=2)
para(T["sub"], size=10, align=WD_ALIGN_PARAGRAPH.CENTER, space=8)

h("1. Предмет предложения")
para("Объект: «Строительство жилых домов с паркингами, мкр. Коктобе, ул. Бигельдинова (Азербаева), д. 138, Медеуский район, г. Алматы». "
     "Предлагаем выполнить под ключ (с поставкой материалов и оборудования): " + T["subject"])
para("Основание: " + T["basis"])

h("2. Краткое описание решения")
bullets(T["bullets"])

h("3. Стоимость работ")
para("Цены указаны в тенге. Цена включает материалы, оборудование, доставку, работы, механизмы, накладные расходы и прибыль подрядчика.", size=9, space=4)
tb = doc.add_table(rows=1, cols=5); tb.style = "Table Grid"; tb.alignment = WD_TABLE_ALIGNMENT.CENTER
hd = ["№", "Раздел", "Стоимость без НДС, ₸", f"НДС {int(VAT*100)}%, ₸", "Стоимость с НДС, ₸"]
for c, t_ in zip(tb.rows[0].cells, hd):
    set_cell(c, t_, bold=True, size=9, align=WD_ALIGN_PARAGRAPH.CENTER); shade(c, "D9E2F3")
short = {0: "Подготовительные работы (разбивка осей)", 1: "Насосная станция: земляные работы и монолитные ж/б конструкции",
         2: "Насосная станция: оборудование, трубопроводы, арматура, монтаж и наладка",
         3: "Пожарные резервуары 2×200 м³ (оценка до получения КЖ)", 4: "Благоустройство, покрытия, водоотвод, откосы", 5: "Озеленение (посадочный материал и посадка)"}
n = 0
for i, (s, tot) in enumerate(zip(sections, sec_sums)):
    if tot == 0: continue
    n += 1
    v = round(tot * VAT)
    row = tb.add_row().cells
    set_cell(row[0], n, align=WD_ALIGN_PARAGRAPH.CENTER); set_cell(row[1], short.get(SECIDX[i], s[0]))
    for j, x in ((2, tot), (3, v), (4, tot + v)): set_cell(row[j], fmt(x), align=WD_ALIGN_PARAGRAPH.RIGHT)
for label, a, b_, c_, bold in (("ИТОГО", TOTAL, VATSUM, GRAND, True),):
    row = tb.add_row().cells
    set_cell(row[0], ""); set_cell(row[1], label, bold=True)
    for j, x in ((2, a), (3, b_), (4, c_)): set_cell(row[j], fmt(x), bold=True, align=WD_ALIGN_PARAGRAPH.RIGHT)
    for c in row: shade(c, "EDEDED")
for row in tb.rows:
    for c, w in zip(row.cells, (1.0, 8.2, 3.2, 2.6, 3.2)): c.width = Cm(w)
words = num2words(GRAND, lang="ru")
para("", space=2)
para(f"Итого с НДС: {fmt(GRAND)} тенге ({words} тенге).", bold=True, space=4)
para("Детализация по позициям, количествам и ценам — Приложение 1." + (f" Не включены {n_unpriced} позиций без цены (отмечены «—»)." if n_unpriced else ""), size=9, italic=True)

h("4. Сроки выполнения")
para(T["srok"])
h("5. Условия оплаты")
para("Аванс [__]% на закупку материалов и оборудования; промежуточные платежи по актам выполненных работ (КС-2) и справкам (КС-3) ежемесячно; окончательный расчёт — после подписания акта приёмки и передачи исполнительной документации. [Подлежит согласованию.]")
h("6. Гарантия")
para(T["garan"])
h("7. Что включено и не включено")
para("Включено:", bold=True, space=1)
bullets(T["incl"])
para("Не включено:", bold=True, space=1)
bullets(T.get("excl", []))
h("8. Срок действия предложения")
para("15 календарных дней с даты выставления. Цены на металл, бетон и асфальт волатильны; по истечении срока подлежат пересмотру.")
h("9. Квалификация")
para("Лицензия на строительно-монтажные работы: [категория, номер, дата]. Опыт аналогичных работ: [перечислить]. ЭЦП и справки об отсутствии налоговой задолженности — по запросу.")
para("", space=8)
para("Директор [НАИМЕНОВАНИЕ ТОО] ______________ [Ф.И.О.]          М.П.", space=0)

# --- Приложение 1 (альбомная секция)
new = doc.add_section()
new.orientation = WD_ORIENT.LANDSCAPE
new.page_width, new.page_height = Cm(29.7), Cm(21)
new.left_margin = new.right_margin = Cm(1.2); new.top_margin = new.bottom_margin = Cm(1.2)
para("Приложение 1. Ведомость объёмов и цен" + T["num"].replace(" №", " к КП №"), bold=True, size=12, color="1F3864", space=2)
para(f"Цены за единицу — с учётом накладных ({int(NR*100)}%), резерва на риски ({int(RISK*100)}%) и прибыли ({int(PROF*100)}%), без НДС. «—» — цена не определена, позиция не входит в итог.", size=8, italic=True, space=4)
ta = doc.add_table(rows=1, cols=6); ta.style = "Table Grid"
for c, t_ in zip(ta.rows[0].cells, ["№", "Наименование", "Ед.", "Кол-во", "Цена за ед., ₸ без НДС", "Сумма, ₸ без НДС"]):
    set_cell(c, t_, bold=True, size=8, align=WD_ALIGN_PARAGRAPH.CENTER); shade(c, "D9E2F3")
for si, (s, tot) in enumerate(zip(sections, sec_sums)):
    row = ta.add_row().cells
    m = row[0].merge(row[5]); set_cell(m, s[0], bold=True, size=8); shade(m, "EDEDED")
    for k, it in enumerate(s[1], 1):
        row = ta.add_row().cells
        set_cell(row[0], k, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell(row[1], it["name"], size=8); set_cell(row[2], it["unit"], size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell(row[3], fmtq(it["qty"]), size=8, align=WD_ALIGN_PARAGRAPH.RIGHT)
        set_cell(row[4], fmt(it["unit_kp"]) if it["priced"] else "—", size=8, align=WD_ALIGN_PARAGRAPH.RIGHT)
        set_cell(row[5], fmt(it["total"]) if it["priced"] else "—", size=8, align=WD_ALIGN_PARAGRAPH.RIGHT)
    row = ta.add_row().cells
    set_cell(row[1], "Итого по разделу", bold=True, size=8); set_cell(row[5], fmt(tot), bold=True, size=8, align=WD_ALIGN_PARAGRAPH.RIGHT)
row = ta.add_row().cells
set_cell(row[1], "ВСЕГО без НДС", bold=True, size=9); set_cell(row[5], fmt(TOTAL), bold=True, size=9, align=WD_ALIGN_PARAGRAPH.RIGHT)
row = ta.add_row().cells
set_cell(row[1], f"НДС {int(VAT*100)}%", size=9); set_cell(row[5], fmt(VATSUM), size=9, align=WD_ALIGN_PARAGRAPH.RIGHT)
row = ta.add_row().cells
set_cell(row[1], "ВСЕГО с НДС", bold=True, size=9); set_cell(row[5], fmt(GRAND), bold=True, size=9, align=WD_ALIGN_PARAGRAPH.RIGHT)
for row in ta.rows:
    for c, w in zip(row.cells, (1.0, 15.5, 1.6, 2.4, 3.4, 3.6)): c.width = Cm(w)
doc.save(OUT)
print("direct sums", [fmt(x) for x in sec_sums], "TOTAL", fmt(TOTAL), "VAT", fmt(VATSUM), "GRAND", fmt(GRAND), "K", round(K, 5), "unpriced", n_unpriced)
