# -*- coding: utf-8 -*-
"""
Renderer for the ALLEY CAT GDD.

Design notes / constraints handled here:
  * Body copy uses Helvetica (Type1 base14) because DejaVu ships NO italic face.
    Inline <i> is used heavily in the content, so a real oblique is required.
  * Technical/diagram blocks use DejaVu Sans Mono because Helvetica cannot
    render box-drawing glyphs (U+2500 block) or arrows used in the loop diagram.
  * A pre-flight glyph audit (verify.py) asserts every character routed to a
    Helvetica-family span is inside the WinAnsi-representable set, so we never
    silently emit a black box.
"""
import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph as _RLParagraph, Spacer,
    Table, TableStyle, PageBreak, KeepTogether, Image, Flowable,
    NextPageTemplate,
)

from content import BLOCKS, TITLE, SUBTITLE, DOCTYPE, VERSION, DATE
from typeset import fix

def Paragraph(text, style, **kw):
    """Choke point: every paragraph in the doc gets glyph fallback applied."""
    return _RLParagraph(fix(text), style, **kw)


HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(os.path.dirname(HERE), "art")
OUT = os.path.join(os.path.dirname(HERE), "ALLEY_CAT_Game_Design_Document.pdf")

# ---------------------------------------------------------------- fonts
DJ = "/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("Mono", f"{DJ}/DejaVuSansMono.ttf"))
pdfmetrics.registerFont(TTFont("Mono-Bold", f"{DJ}/DejaVuSansMono-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Disp", f"{DJ}/DejaVuSans-Bold.ttf"))
# Unicode fallback faces for glyphs outside Helvetica's WinAnsi set.
pdfmetrics.registerFont(TTFont("Uni", f"{DJ}/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Uni-Bold", f"{DJ}/DejaVuSans-Bold.ttf"))

BODY = "Helvetica"
BODY_B = "Helvetica-Bold"
BODY_I = "Helvetica-Oblique"

# ---------------------------------------------------------------- palette
INK      = colors.HexColor("#12161A")   # near-black body text
DIM      = colors.HexColor("#5A6570")   # secondary
EMBER    = colors.HexColor("#C8641E")   # sodium-light orange accent
EMBER_LT = colors.HexColor("#FBF0E4")   # callout fill
TEAL     = colors.HexColor("#1E4A52")   # deep teal (headers)
TEAL_LT  = colors.HexColor("#EAF1F2")   # table zebra
RULE     = colors.HexColor("#C9D2D6")
WARN_BD  = colors.HexColor("#8C2F13")
WARN_BG  = colors.HexColor("#FBEAE4")
PAPER    = colors.HexColor("#FFFFFF")
NIGHT    = colors.HexColor("#0C1114")   # cover field

PW, PH = LETTER
MARGIN_L = MARGIN_R = 0.85 * inch
MARGIN_T = 0.90 * inch
MARGIN_B = 0.85 * inch
CW = PW - MARGIN_L - MARGIN_R          # content width


# ---------------------------------------------------------------- styles
def _p(name, **kw):
    base = dict(name=name, fontName=BODY, fontSize=9.6, leading=14.4,
                textColor=INK, alignment=TA_JUSTIFY, spaceAfter=7)
    base.update(kw)
    return ParagraphStyle(**base)


S = {
    "p":      _p("p"),
    "lead":   _p("lead", fontSize=12.6, leading=18.5, textColor=TEAL,
                 fontName=BODY_I, alignment=TA_LEFT, spaceAfter=12,
                 spaceBefore=2),
    "h1":     _p("h1", fontName="Disp", fontSize=19, leading=23,
                 textColor=TEAL, alignment=TA_LEFT, spaceAfter=2,
                 spaceBefore=0, keepWithNext=1),
    "h2":     _p("h2", fontName="Disp", fontSize=12.4, leading=16,
                 textColor=EMBER, alignment=TA_LEFT, spaceAfter=5,
                 spaceBefore=13, keepWithNext=1),
    "h3":     _p("h3", fontName=BODY_B, fontSize=10.2, leading=13.5,
                 textColor=TEAL, alignment=TA_LEFT, spaceAfter=3,
                 spaceBefore=8, keepWithNext=1),
    "bul":    _p("bul", alignment=TA_LEFT, spaceAfter=4.5, leading=13.8),
    "th":     _p("th", fontName=BODY_B, fontSize=8.5, leading=11,
                 textColor=colors.white, alignment=TA_LEFT, spaceAfter=0),
    "td":     _p("td", fontSize=8.4, leading=11.6, alignment=TA_LEFT,
                 spaceAfter=0),
    "td_c":   _p("td_c", fontSize=8.4, leading=11.6, alignment=TA_CENTER,
                 spaceAfter=0),
    "kv_k":   _p("kv_k", fontName=BODY_B, fontSize=8.6, leading=11.8,
                 textColor=TEAL, alignment=TA_LEFT, spaceAfter=0),
    "kv_v":   _p("kv_v", fontSize=8.6, leading=11.8, alignment=TA_LEFT,
                 spaceAfter=0),
    "call_t": _p("call_t", fontName="Disp", fontSize=8.6, leading=11,
                 textColor=EMBER, alignment=TA_LEFT, spaceAfter=3.5),
    "call_b": _p("call_b", fontSize=9.2, leading=13.6, alignment=TA_LEFT,
                 spaceAfter=0),
    "warn_t": _p("warn_t", fontName="Disp", fontSize=8.6, leading=11,
                 textColor=WARN_BD, alignment=TA_LEFT, spaceAfter=3.5),
    "quote":  _p("quote", fontName=BODY_I, fontSize=14, leading=19,
                 textColor=TEAL, alignment=TA_CENTER, spaceAfter=2,
                 spaceBefore=4),
    "attrib": _p("attrib", fontSize=8.6, leading=12, textColor=DIM,
                 alignment=TA_CENTER, spaceAfter=0),
    "spec":   ParagraphStyle("spec", fontName="Mono", fontSize=7.9,
                             leading=11.6, textColor=INK, alignment=TA_LEFT,
                             spaceAfter=0),
    "cap":    _p("cap", fontSize=7.9, leading=11, textColor=DIM,
                 alignment=TA_CENTER, spaceAfter=0, spaceBefore=4),
}


class HRule(Flowable):
    """Thin full-width rule."""
    def __init__(self, w, color=RULE, thick=0.6, pad=6):
        Flowable.__init__(self)
        self.w, self.color, self.thick, self.pad = w, color, thick, pad
        self.height = thick + pad * 2

    def wrap(self, aw, ah):
        return (self.w, self.height)

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thick)
        self.canv.line(0, self.pad, self.w, self.pad)


class H1Rule(Flowable):
    """Accent rule under a chapter heading."""
    def __init__(self, w):
        Flowable.__init__(self)
        self.w = w
        self.height = 9

    def wrap(self, aw, ah):
        return (self.w, self.height)

    def draw(self):
        self.canv.setStrokeColor(EMBER)
        self.canv.setLineWidth(2.2)
        self.canv.line(0, 5, 62, 5)
        self.canv.setStrokeColor(RULE)
        self.canv.setLineWidth(0.7)
        self.canv.line(62, 5, self.w, 5)


def box(flows, fill, border, pad=9):
    """Wrap flowables in a single-cell tinted table = callout box."""
    t = Table([[flows]], colWidths=[CW])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill),
        ("BOX", (0, 0), (-1, -1), 0.9, border),
        ("LEFTPADDING", (0, 0), (-1, -1), pad + 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, -1), pad),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def accent_bar(t, color):
    """Add a thick left accent bar to a box table."""
    t.setStyle(TableStyle([("LINEBEFORE", (0, 0), (0, -1), 3.2, color)]))
    return t


# ---------------------------------------------------------------- cover
def draw_cover(canv, doc):
    canv.saveState()
    canv.setFillColor(NIGHT)
    canv.rect(0, 0, PW, PH, fill=1, stroke=0)

    img = os.path.join(ART, "cover_key_art.png")
    if os.path.exists(img):
        from reportlab.lib.utils import ImageReader
        ir = ImageReader(img)
        iw, ih = ir.getSize()
        # cover-fit the full page, anchored so the cat sits in view
        scale = max(PW / iw, PH / ih)
        dw, dh = iw * scale, ih * scale
        canv.drawImage(ir, (PW - dw) / 2.0, (PH - dh) / 2.0, dw, dh,
                       mask="auto")

    # Legibility scrim. Single continuous pass over the whole page using a
    # smoothstep falloff -- drawing two separate bands left a visible seam
    # where they met (caught on visual inspection of the raster).
    from reportlab.lib.colors import Color

    def smoothstep(t):
        t = max(0.0, min(1.0, t))
        return t * t * (3 - 2 * t)

    STEPS = 260
    for i in range(STEPS):
        y0 = PH * i / float(STEPS)
        yc = (y0 + PH * (i + 0.5) / STEPS) / 2.0
        f = yc / PH                      # 0 at bottom, 1 at top
        # bottom darkening for the title block
        a_bot = smoothstep((0.56 - f) / 0.56) * 0.94
        # gentle top darkening for the kicker
        a_top = smoothstep((f - 0.80) / 0.20) * 0.62
        a = max(a_bot, a_top)
        if a <= 0.004:
            continue
        canv.setFillColor(Color(0.047, 0.067, 0.078, alpha=a))
        canv.rect(0, y0, PW, PH / STEPS + 1.0, fill=1, stroke=0)

    # --- type
    canv.setFillColor(colors.HexColor("#E8B15E"))
    canv.setFont("Disp", 9.5)
    canv.drawString(MARGIN_L, PH - MARGIN_T + 6, "G A M E   D E S I G N   D O C U M E N T")

    canv.setFillColor(colors.white)
    canv.setFont("Disp", 63)
    canv.drawString(MARGIN_L, 3.30 * inch, TITLE)

    canv.setStrokeColor(colors.HexColor("#C8641E"))
    canv.setLineWidth(2.4)
    canv.line(MARGIN_L, 3.10 * inch, MARGIN_L + 1.55 * inch, 3.10 * inch)

    canv.setFillColor(colors.HexColor("#EFE6DA"))
    canv.setFont("Helvetica-Oblique", 16.5)
    canv.drawString(MARGIN_L, 2.68 * inch, SUBTITLE)

    canv.setFillColor(colors.HexColor("#AFC0C6"))
    canv.setFont(BODY, 10)
    canv.drawString(MARGIN_L, 2.34 * inch,
                    "3D action-platformer  \u2022  single-player  \u2022  "
                    "the fight is what happens when you run out of road")

    # tag chips
    x, y = MARGIN_L, 1.72 * inch
    canv.setFont("Helvetica-Bold", 7.4)
    for tag in ["3D ACTION-PLATFORMER", "MID-SIZE AA", "12\u201320 HRS",
                "TEEN / GRITTY-CLEAN", "UE5"]:
        w = canv.stringWidth(tag, "Helvetica-Bold", 7.4) + 15
        canv.setStrokeColor(colors.HexColor("#4A5A62"))
        canv.setFillColor(colors.HexColor("#161D22"))
        canv.setLineWidth(0.8)
        canv.roundRect(x, y, w, 17, 3.2, fill=1, stroke=1)
        canv.setFillColor(colors.HexColor("#C3D2D8"))
        canv.drawString(x + 7.5, y + 5.4, tag)
        x += w + 7

    canv.setStrokeColor(colors.HexColor("#2C3940"))
    canv.setLineWidth(0.8)
    canv.line(MARGIN_L, 1.30 * inch, PW - MARGIN_R, 1.30 * inch)

    canv.setFillColor(colors.HexColor("#8496A0"))
    canv.setFont(BODY, 8.4)
    canv.drawString(MARGIN_L, 1.06 * inch, f"{VERSION}  \u2014  {DATE}")
    canv.drawRightString(PW - MARGIN_R, 1.06 * inch,
                         "Systems bible \u2022 vertical pitch \u2022 "
                         "verification plan")
    canv.restoreState()


# ---------------------------------------------------------------- chrome
def draw_page(canv, doc):
    canv.saveState()
    canv.setFillColor(PAPER)
    canv.rect(0, 0, PW, PH, fill=1, stroke=0)

    # running head
    canv.setFont("Helvetica-Bold", 7.2)
    canv.setFillColor(TEAL)
    canv.drawString(MARGIN_L, PH - MARGIN_T + 26, "ALLEY CAT")
    canv.setFont(BODY, 7.2)
    canv.setFillColor(DIM)
    canv.drawString(MARGIN_L + 52, PH - MARGIN_T + 26,
                    "Eight Lives Wasted \u2014 One Soul Saved")
    pmap = getattr(doc, "_page_sect", {})
    pn = canv.getPageNumber()
    sect = pmap.get(pn)
    if not sect and pmap:
        prev = [k for k in pmap if k <= pn]
        if prev:
            sect = pmap[max(prev)]
    sect = sect or getattr(doc, "_sect", "") or DOCTYPE
    canv.drawRightString(PW - MARGIN_R, PH - MARGIN_T + 26, sect)
    canv.setStrokeColor(RULE)
    canv.setLineWidth(0.6)
    canv.line(MARGIN_L, PH - MARGIN_T + 20, PW - MARGIN_R, PH - MARGIN_T + 20)

    # footer
    canv.line(MARGIN_L, MARGIN_B - 20, PW - MARGIN_R, MARGIN_B - 20)
    canv.setFont(BODY, 7.2)
    canv.setFillColor(DIM)
    canv.drawString(MARGIN_L, MARGIN_B - 31, f"{VERSION}  \u2022  {DATE}")
    canv.setFont("Helvetica-Bold", 8.4)
    canv.setFillColor(TEAL)
    canv.drawRightString(PW - MARGIN_R, MARGIN_B - 32, str(canv.getPageNumber() - 1))
    canv.restoreState()


class Doc(BaseDocTemplate):
    def __init__(self, path, presolved=None, **kw):
        BaseDocTemplate.__init__(self, path, pagesize=LETTER,
                                 leftMargin=MARGIN_L, rightMargin=MARGIN_R,
                                 topMargin=MARGIN_T, bottomMargin=MARGIN_B,
                                 title="ALLEY CAT \u2014 Game Design Document",
                                 author="Arena.ai Agent Mode",
                                 subject=SUBTITLE, **kw)
        self._sect = ""
        # presolved: page -> section map from a previous pass. When present the
        # running head is correct on section-opening pages.
        self._page_sect = dict(presolved) if presolved else {}
        self._collected = {}
        frame = Frame(MARGIN_L, MARGIN_B, CW, PH - MARGIN_T - MARGIN_B,
                      id="body", leftPadding=0, rightPadding=0,
                      topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[frame], onPage=draw_cover),
            PageTemplate(id="body", frames=[frame], onPage=draw_page),
        ])

    def afterFlowable(self, flowable):
        if isinstance(flowable, _RLParagraph) and flowable.style.name == "h1":
            txt = flowable.getPlainText()
            self._sect = txt
            # Headers are drawn at page-begin, before this fires. Record the
            # section for THIS page so the running head names the section the
            # reader is actually looking at, not the previous one.
            # First h1 landing on a page wins that page's running head.
            self._collected.setdefault(self.page, txt)
            self.notify("TOCEntry", (0, txt, self.page))


# ---------------------------------------------------------------- build
def table_block(spec):
    cols = spec["cols"]
    rows = spec["rows"]
    widths = spec.get("widths")
    align = spec.get("align", ["l"] * len(cols))
    cw = [w * CW for w in widths] if widths else [CW / len(cols)] * len(cols)

    head = [Paragraph(c, S["th"]) for c in cols]
    data = [head]
    for r in rows:
        cells = []
        for i, c in enumerate(r):
            st = S["td_c"] if align[i] == "c" else S["td"]
            cells.append(Paragraph(str(c).replace("\n", "<br/>"), st))
        data.append(cells)

    t = Table(data, colWidths=cw, repeatRows=1, hAlign="LEFT")
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), TEAL),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 1), (-1, -1), 5.5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 1), (-1, -2), 0.4, RULE),
        ("BOX", (0, 0), (-1, -1), 0.8, TEAL),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), TEAL_LT))
    t.setStyle(TableStyle(style))
    return t


def build():
    story = []
    A = story.append

    # Switch off the cover template BEFORE breaking, or draw_cover paints
    # the key art onto every subsequent page. (Caught by postflight P5.)
    A(NextPageTemplate('body'))
    A(PageBreak())  # end cover page

    for kind, payload in BLOCKS:
        if kind == "cover":
            continue

        elif kind == "h1":
            A(Spacer(1, 2))
            A(Paragraph(payload, S["h1"]))
            A(H1Rule(CW))

        elif kind == "h2":
            A(Paragraph(payload, S["h2"]))

        elif kind == "h3":
            A(Paragraph(payload, S["h3"]))

        elif kind == "p":
            A(Paragraph(payload, S["p"]))

        elif kind == "lead":
            A(Paragraph(payload, S["lead"]))

        elif kind == "bul":
            for it in payload:
                A(Paragraph(it, S["bul"], bulletText="\u25aa"))
            A(Spacer(1, 4))

        elif kind == "num":
            for i, it in enumerate(payload, 1):
                A(Paragraph(it, S["bul"], bulletText=f"{i}."))
            A(Spacer(1, 4))

        elif kind == "kv":
            data = [[Paragraph(k, S["kv_k"]), Paragraph(v, S["kv_v"])]
                    for k, v in payload]
            t = Table(data, colWidths=[0.22 * CW, 0.78 * CW], hAlign="LEFT")
            st = [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (0, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
                ("LINEBEFORE", (0, 0), (0, -1), 2.4, EMBER),
            ]
            t.setStyle(TableStyle(st))
            A(t)
            A(Spacer(1, 8))

        elif kind == "table":
            A(table_block(payload))
            A(Spacer(1, 9))

        elif kind == "call":
            title, body = payload
            inner = [Paragraph(title, S["call_t"]),
                     Paragraph(body, S["call_b"])]
            A(KeepTogether(accent_bar(box(inner, EMBER_LT, colors.HexColor("#EBD9C4")), EMBER)))
            A(Spacer(1, 10))

        elif kind == "warn":
            title, body = payload
            inner = [Paragraph(title, S["warn_t"]),
                     Paragraph(body, S["call_b"])]
            A(KeepTogether(accent_bar(box(inner, WARN_BG, colors.HexColor("#E8C4B6")), WARN_BD)))
            A(Spacer(1, 10))

        elif kind == "quote":
            text, attrib = payload
            inner = [Paragraph(f"\u201c{text}\u201d", S["quote"])]
            if attrib:
                inner.append(Paragraph(attrib, S["attrib"]))
            A(KeepTogether(box(inner, colors.HexColor("#F4F8F8"),
                               colors.HexColor("#D9E4E6"), pad=11)))
            A(Spacer(1, 10))

        elif kind == "spec":
            inner = [Paragraph(ln.replace(" ", "&nbsp;"), S["spec"])
                     for ln in payload]
            A(KeepTogether(box(inner, colors.HexColor("#F2F5F6"),
                               colors.HexColor("#D3DCDF"), pad=9)))
            A(Spacer(1, 10))

        elif kind == "img":
            fname, caption, wfrac = payload
            path = os.path.join(ART, fname)
            if os.path.exists(path):
                from reportlab.lib.utils import ImageReader
                iw, ih = ImageReader(path).getSize()
                w = CW * wfrac
                h = w * ih / float(iw)
                # never let a plate exceed half the live frame height
                maxh = (PH - MARGIN_T - MARGIN_B) * 0.46
                if h > maxh:
                    h = maxh
                    w = h * iw / float(ih)
                im = Image(path, width=w, height=h)
                im.hAlign = "CENTER"
                grp = [im]
                if caption:
                    grp.append(Paragraph(caption, S["cap"]))
                A(KeepTogether(grp))
                A(Spacer(1, 11))

        elif kind == "closing_group":
            # Bind the closing heading + both paragraphs + the final quote into
            # ONE KeepTogether so the last line of the document cannot orphan
            # onto a page of its own. (Caught by postflight P4/P5.)
            grp = [
                Paragraph("Closing", S["h2"]),
                Paragraph(
                    "Every system in this document exists to make one input at the end of "
                    "chapter nine mean something: the moment a cat who has survived his "
                    "entire life by moving decides not to move. Traversal makes movement "
                    "feel like safety. Cornered makes violence feel like failure. The Names "
                    "make power feel like a purchase. The Collar makes fame feel like a "
                    "leash. Nine\u2019s question makes the player look at their own record.",
                    S["p"]),
                Paragraph(
                    "None of it is worth building if the last thirty seconds don\u2019t "
                    "land. Build the prototype, prove the traversal, and protect the "
                    "ending.", S["p"]),
                Spacer(1, 4),
                box([Paragraph("\u201cEight lives wasted. One soul saved.\u201d",
                               S["quote"])],
                    colors.HexColor("#F4F8F8"), colors.HexColor("#D9E4E6"), pad=11),
            ]
            A(KeepTogether(grp))

        elif kind == "quote_keep":
            text, attrib = payload
            inner = [Paragraph(f"\u201c{text}\u201d", S["quote"])]
            if attrib:
                inner.append(Paragraph(attrib, S["attrib"]))
            A(KeepTogether(box(inner, colors.HexColor("#F4F8F8"),
                               colors.HexColor("#D9E4E6"), pad=11)))

        elif kind == "rule":
            A(HRule(CW))

        elif kind == "pb":
            A(PageBreak())

    import copy

    # PASS 1 -- throwaway render purely to learn which section owns which page.
    scratch = os.path.join(HERE, "_pass1.pdf")
    d1 = Doc(scratch)
    d1.build(copy.deepcopy(story))
    page_map = dict(d1._collected)
    try:
        os.remove(scratch)
    except OSError:
        pass

    # PASS 2 -- real render with correct running heads.
    doc = Doc(OUT, presolved=page_map)
    doc.build(story)
    return OUT


if __name__ == "__main__":
    p = build()
    print("WROTE", p, os.path.getsize(p), "bytes")
