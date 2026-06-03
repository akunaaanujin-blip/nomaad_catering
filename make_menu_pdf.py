"""
NOMAAD Catering — Постер меню PDF үүсгэгч
Гаралт: NOMAAD_Menu_2026.pdf
"""

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, white
import os

# ── Фонт бүртгэх (Монгол Кирилл) ──────────────────────
FONT_PATH = "/Library/Fonts/Arial Unicode.ttf"
pdfmetrics.registerFont(TTFont("ArialU", FONT_PATH))
pdfmetrics.registerFont(TTFont("ArialU-Bold", FONT_PATH))  # bold alias

F  = "ArialU"       # энгийн текст
FB = "ArialU"       # bold (ижил фонт, размер томроор ялгана)

# ── Өнгө ───────────────────────────────────────────────
C_GREEN      = HexColor("#1F4A38")
C_GREEN2     = HexColor("#2E6049")
C_GREEN_SOFT = HexColor("#E3EDE7")
C_AMBER      = HexColor("#C8743F")
C_AMBER_SOFT = HexColor("#F5E2D5")
C_SAND       = HexColor("#D9C7A3")
C_BG         = HexColor("#F5F0E6")
C_WHITE      = white
C_INK        = HexColor("#20271F")
C_MUTED      = HexColor("#8A8276")
C_LINE       = HexColor("#E2E6DF")
C_DARK       = HexColor("#163528")

W, H = A4          # 595 × 842 pt
OUT  = "/Users/anujinninj/Desktop/NOMAAD CATERING/NOMAAD_Menu_2026.pdf"


def rr(c, x, y, w, h, r, fill_color, stroke_color=None):
    """Rounded rectangle helper."""
    c.setFillColor(fill_color)
    if stroke_color:
        c.setStrokeColor(stroke_color)
        c.setLineWidth(0.5)
    else:
        c.setLineWidth(0)
    c.roundRect(x, y, w, h, r, fill=1, stroke=1 if stroke_color else 0)


def txt(c, text, x, y, size=10, color=C_INK, bold=False, align="left"):
    c.setFont(FB if bold else F, size)
    c.setFillColor(color)
    if align == "center":
        c.drawCentredString(x, y, text)
    elif align == "right":
        c.drawRightString(x, y, text)
    else:
        c.drawString(x, y, text)


def band(c):
    """Дээд зурвас — NOMAAD nomad band."""
    seg = W / 4
    colors = [C_GREEN, C_GREEN2, C_SAND, C_AMBER]
    for i, col in enumerate(colors):
        c.setFillColor(col)
        c.rect(i * seg, H - 5, seg, 5, fill=1, stroke=0)


def header(c):
    """Толгой хэсэг."""
    # Ногоон дэвсгэр
    c.setFillColor(C_GREEN)
    c.rect(0, H - 90, W, 85, fill=1, stroke=0)

    # Gradient effect (дотоод хэлбэр)
    c.setFillColor(C_DARK)
    c.rect(0, H - 90, W * 0.4, 85, fill=1, stroke=0)

    # Лого дугуй
    cx, cy = 42, H - 52
    c.setFillColor(HexColor("#ffffff30"))
    c.circle(cx, cy, 20, fill=1, stroke=0)
    txt(c, "🍽", cx - 8, cy - 6, size=16)

    # Нэр
    txt(c, "NOMAAD Catering", 72, H - 44, size=18, color=C_WHITE, bold=True)
    txt(c, "Чимун ХХК  ·  Эвент ба байгууллагын кейтеринг", 72, H - 60, size=9, color=HexColor("#ffffffbb"))

    # Tag
    rr(c, W - 110, H - 68, 95, 22, 11, HexColor("#ffffff20"))
    txt(c, "МЕНЮ 2026", W - 62, H - 59, size=8, color=C_WHITE, bold=True, align="center")


def hero(c):
    """Hero текст."""
    y = H - 130
    txt(c, "Байгальд тааруулсан тансаг хоол", W / 2, y, size=14, color=C_GREEN, bold=True, align="center")
    txt(c, "Гүн хөлдөөгчтэй технологи  ·  Шинэлэг амт  ·  Арга хэмжээний газарт халуунаар", W / 2, y - 16, size=8.5, color=C_MUTED, align="center")


def tier_cards(c):
    """Үнийн 3 карт."""
    y0 = H - 215
    cw = (W - 60) / 3
    cx = 20

    tiers = [
        ("Порц хоол",   "38,000", "/хүн",  C_GREEN,  C_GREEN_SOFT, "Албан хурал · уулзалт"),
        ("Буфет",       "54,000", "/хүн",  C_AMBER,  C_AMBER_SOFT, "Том найр · team-building"),
        ("Хонь боодог", "900,000","/бүтэн",C_SAND,   HexColor("#EFE7D2"), "8–12 хүнд · захиалгаар"),
    ]

    for i, (name, price, unit, accent, soft, note) in enumerate(tiers):
        x = cx + i * (cw + 10)
        # Карт
        rr(c, x, y0, cw, 74, 8, C_WHITE, C_LINE)
        # Дээд зурвас
        c.setFillColor(accent)
        c.roundRect(x, y0 + 70, cw, 4, 2, fill=1, stroke=0)

        txt(c, name,           x + 10, y0 + 58, size=10, color=C_INK, bold=True)
        txt(c, f"₮ {price}",  x + 10, y0 + 38, size=14, color=accent, bold=True)
        txt(c, unit,           x + 10, y0 + 25, size=8,  color=C_MUTED)
        # Badge
        bw = c.stringWidth(note, F, 7) + 14
        rr(c, x + 10, y0 + 6, bw, 14, 7, soft)
        txt(c, note, x + 10 + bw/2, y0 + 10, size=7, color=accent, align="center")


def section_label(c, label, y, color=C_GREEN):
    """Хэсгийн гарчиг."""
    c.setStrokeColor(color)
    c.setLineWidth(2)
    c.line(20, y, 20, y - 14)
    txt(c, label, 30, y - 10, size=11, color=color, bold=True)
    c.setStrokeColor(C_LINE)
    c.setLineWidth(0.5)
    c.line(30 + c.stringWidth(label, FB, 11) + 8, y - 5, W - 20, y - 5)


def dish_list(c, dishes, x, y, col_w, row_h=15):
    """Хоолны жагсаалт."""
    for i, (name, meat, desc) in enumerate(dishes):
        ry = y - i * row_h
        # Тоо
        num = f"{i+1:02d}"
        txt(c, num, x, ry, size=7.5, color=C_MUTED)
        # Нэр
        txt(c, name, x + 20, ry, size=8.5, color=C_INK, bold=True)
        # Мах тэмдэглэгээ
        if meat:
            mw = c.stringWidth(meat, F, 7) + 10
            mx = x + 20 + c.stringWidth(name, FB, 8.5) + 5
            rr(c, mx, ry - 3, mw, 12, 6, C_GREEN_SOFT)
            txt(c, meat, mx + mw/2, ry + 1, size=7, color=C_GREEN, align="center")
        # Тайлбар
        if desc:
            txt(c, desc, x + 20, ry - 10, size=7, color=C_MUTED)


def two_col_items(c, items, x, y, col_w, row_h=13):
    """2 баганат энгийн жагсаалт."""
    half = len(items) // 2 + len(items) % 2
    for i, item in enumerate(items):
        col = i // half
        row = i % half
        cx2 = x + col * (col_w / 2 + 10)
        ry  = y - row * row_h
        c.setFillColor(C_GREEN)
        c.circle(cx2 + 4, ry + 2, 2, fill=1, stroke=0)
        txt(c, item, cx2 + 12, ry, size=8, color=C_INK)


def divider(c, y):
    c.setStrokeColor(C_LINE)
    c.setLineWidth(0.5)
    c.line(20, y, W - 20, y)


def footer_box(c):
    """Footer — холбоо барих."""
    y = 20
    h = 52
    rr(c, 0, y, W, h, 0, C_GREEN)

    items = [
        ("📞", "99xxxxxx"),
        ("🕐", "09:00–19:00"),
        ("🌐", "nomaadcatering.mn"),
        ("📍", "Улаанбаатар"),
    ]
    seg = W / len(items)
    for i, (icon, val) in enumerate(items):
        cx = i * seg + seg / 2
        txt(c, icon, cx - 30, y + 30, size=12)
        txt(c, val,  cx - 20, y + 30, size=9, color=C_WHITE, bold=True)

    txt(c, "© 2026 NOMAAD Catering · Чимун ХХК", W/2, y + 8, size=7.5, color=HexColor("#ffffff88"), align="center")


# ═══════════════════ PDF ҮҮСГЭХ ═══════════════════
c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("NOMAAD Catering — Меню 2026")
c.setAuthor("NOMAAD Catering · Чимун ХХК")

# Дэвсгэр
c.setFillColor(C_BG)
c.rect(0, 0, W, H, fill=1, stroke=0)

band(c)
header(c)
hero(c)
tier_cards(c)

# ─── ПОРЦ ХООЛ ───────────────────────────────────────
y = H - 240
section_label(c, "🍱  ПОРЦ ХООЛ  —  ₮38,000 / хүн", y, C_GREEN)

POR_DISHES = [
    ("Соусанд жигнэсэн хонины мах", "Хонь",    "Зөөлөн жигнэсэн, гэрийн соустай"),
    ("Гахайн цорой",                 "Гахай",   "Шаржигнуулсан, карамелжсан"),
    ("Жеюүг — гахайн амталсан мах",  "Гахай",   "Халуун ногоотой маринадад дэвтээсэн"),
    ("Терияки соустай тахиа",        "Тахиа",   "Кунжуттай, гялгар терияки соустай"),
    ("Шаржигнуур тахиа",             "Тахиа",   "Шинээр шарсан, шаржигнуур гадаргуутай"),
    ("Мини шорлог",                   "Гахай·Тахиа","Шорон дээр шарсан холимог"),
    ("Цуйван",                        "Холимог", "Гар гоймон, мах ногоотой"),
    ("Хуушуур (4 ш)",                 "Холимог", "Гүн шарсан, алтан бор"),
]

# 2 багана
half = 4
for i, (name, meat, desc) in enumerate(POR_DISHES):
    col = i // half
    row = i % half
    x = 20 + col * 280
    ry = y - 18 - row * 28
    # Мөрийн дэвсгэр
    if i % 2 == 0:
        c.setFillColor(HexColor("#00000006"))
        c.rect(x - 4, ry - 12, 268, 24, fill=1, stroke=0)
    txt(c, f"{i+1:02d}", x, ry, size=7.5, color=C_MUTED)
    txt(c, name, x + 18, ry, size=8.5, color=C_INK, bold=True)
    # Meat tag
    mw = c.stringWidth(meat, F, 7) + 10
    rr(c, x + 18 + c.stringWidth(name, FB, 8.5) + 5, ry - 2, mw, 11, 5, C_GREEN_SOFT)
    txt(c, meat, x + 18 + c.stringWidth(name, FB, 8.5) + 5 + mw/2, ry + 1, size=7, color=C_GREEN, align="center")
    txt(c, desc, x + 18, ry - 10, size=7, color=C_MUTED)

# ─── БУФЕТ ───────────────────────────────────────────
y2 = y - 18 - half * 28 - 16
divider(c, y2 + 10)
section_label(c, "🍴  БУФЕТ  —  ₮54,000 / хүн", y2, C_AMBER)

txt(c, "Гол мах — 3 төрлийг сонгоно:", 20, y2 - 18, size=8, color=C_MUTED, bold=True)

BUF_MEATS = [
    "Соусанд жигнэсэн хонины мах",
    "Хонь шарсан хавирга",
    "Гахайн цорой",
    "Терияки соустай тахиа",
    "Шаржигнуур тахиа",
    "Мини шорлог",
]

# 3 багана
for i, item in enumerate(BUF_MEATS):
    col = i % 3
    row = i // 3
    x = 20 + col * 185
    ry = y2 - 32 - row * 16
    c.setFillColor(C_AMBER)
    c.circle(x + 4, ry + 3, 2.5, fill=1, stroke=0)
    txt(c, item, x + 12, ry, size=8.5, color=C_INK)

y3 = y2 - 32 - (len(BUF_MEATS) // 3) * 16 - 10

txt(c, "Дагалдах (оруулсан үнэнд):", 20, y3 - 2, size=8, color=C_MUTED, bold=True)

BUF_SIDES = [
    "Улирлын 2 төрлийн салад",
    "Халуун шөл",
    "Хачир (төмс / ногоо)",
    "Цагаан будаа",
]
for i, item in enumerate(BUF_SIDES):
    x = 20 + (i % 2) * 270
    ry = y3 - 16 - (i // 2) * 14
    c.setFillColor(HexColor("#6B8E6F"))
    c.circle(x + 4, ry + 3, 2, fill=1, stroke=0)
    txt(c, item, x + 12, ry, size=8, color=C_INK)

# ─── ХОНЬ БООДОГ ─────────────────────────────────────
y4 = y3 - 16 - (len(BUF_SIDES) // 2) * 14 - 18
divider(c, y4 + 10)

# Ногоон карт
rr(c, 20, y4 - 50, W - 40, 56, 10, C_GREEN)
txt(c, "🐑", 38, y4 - 18, size=16)
txt(c, "Хонь боодог", 70, y4 - 15, size=13, color=C_WHITE, bold=True)
txt(c, "Уламжлалт арга  ·  Улаасан чулуу  ·  8–12 хүнд  ·  Урьдчилан захиалах шаардлагатай", 70, y4 - 30, size=7.5, color=HexColor("#ffffffbb"))
txt(c, "₮900,000", W - 40, y4 - 15, size=15, color=C_SAND, bold=True, align="right")
txt(c, "/ бүтэн хонь", W - 40, y4 - 30, size=8, color=HexColor("#ffffffaa"), align="right")

# ─── НЭМЭЛТ / СНАК ───────────────────────────────────
y5 = y4 - 60
divider(c, y5 + 6)
section_label(c, "🍕  НЭМЭЛТ / SNACK  (нэмэлт төлбөртэй)", y5, HexColor("#7a5a10"))

SNACKS = ["Жимсний платер", "Cup cake & Egg tart", "Мини пицца", "Мини бургер", "Cheese ball"]
for i, item in enumerate(SNACKS):
    x = 20 + (i % 3) * 185
    ry = y5 - 16 - (i // 3) * 14
    c.setFillColor(HexColor("#C8743F"))
    c.circle(x + 4, ry + 3, 2, fill=1, stroke=0)
    txt(c, item, x + 12, ry, size=8, color=C_INK)

FREE = ["Халуун цай (үнэгүй)", "Кофе (үнэгүй)"]
for i, item in enumerate(FREE):
    x = 20 + (5 + i) % 3 * 185 if False else 20 + i * 185
    # place after snacks
    ri = 5 + i
    x = 20 + (ri % 3) * 185
    ry = y5 - 16 - (ri // 3) * 14
    c.setFillColor(C_GREEN)
    c.circle(x + 4, ry + 3, 2, fill=1, stroke=0)
    txt(c, item, x + 12, ry, size=8, color=C_GREEN, bold=True)

# ─── ДООД ТЭМДЭГЛЭЛ ──────────────────────────────────
note_y = 84
rr(c, 20, note_y, W - 40, 28, 8, C_AMBER_SOFT)
txt(c, "⚠  Захиалгын нөхцөл: Үнэ нь нэг хүний/нэгж дүн. Тээвэр, үйлчлэгч, тоног төхөөрөмжийг хэмжээнээс хамааруулан тооцно.", 30, note_y + 17, size=7.5, color=HexColor("#7a4f23"))
txt(c, "Хүний тоо болон цэсийг урьдчилан баталгаажуулна уу. Хонь боодог захиалгыг хамгийн багадаа 2 хоногийн өмнө хийнэ.", 30, note_y + 6, size=7.5, color=HexColor("#7a4f23"))

footer_box(c)

c.save()
print(f"✅ PDF үүслээ: {OUT}")
