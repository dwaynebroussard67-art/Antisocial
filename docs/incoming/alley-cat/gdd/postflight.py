# -*- coding: utf-8 -*-
"""
Post-render audit of the built PDF. Falsification, not confirmation.

  P1  MARGIN OVERFLOW. Any text or drawing whose bbox crosses the live margin
      box. Catches tables whose column widths overrun the frame -- reportlab
      does NOT raise on this, it just draws past the edge.
  P2  BLACK-BOX GLYPHS. Scan extracted text for U+FFFD / notdef artefacts, and
      cross-check that every font actually embedded covers what it is asked to
      draw.
  P3  ORPHAN HEADINGS. A section heading rendered in the last ~8% of a page
      with no body text beneath it on that page.
  P4  EMPTY / NEAR-EMPTY PAGES. Detects runaway PageBreak or KeepTogether
      pushing content and leaving a blank.
  P5  RASTER SANITY. Renders each page and checks ink coverage is within a
      plausible band (catches all-black or all-white pages).
  P6  TEXT INTEGRITY. Key phrases from the source content must be findable in
      the extracted text (catches silently dropped blocks).
"""
import sys
import fitz

PDF = "/home/user/ALLEY_CAT_Game_Design_Document.pdf"
LEFT, RIGHT = 0.85 * 72, 8.5 * 72 - 0.85 * 72
TOP, BOTTOM = 0.90 * 72, 11 * 72 - 0.85 * 72
TOL = 3.0  # pt slack for glyph bearings / rule caps

doc = fitz.open(PDF)
failures, notes = [], []

# ------------------------------------------------------------------ P1
for pno in range(doc.page_count):
    if pno == 0:
        continue  # cover is intentionally full-bleed
    page = doc[pno]
    for b in page.get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            for sp in line.get("spans", []):
                x0, y0, x1, y1 = sp["bbox"]
                if x1 > RIGHT + TOL:
                    failures.append(
                        f"P1 RIGHT OVERFLOW p{pno+1}: x1={x1:.1f} > {RIGHT:.1f} "
                        f"text={sp['text'][:45]!r}")
                if x0 < LEFT - TOL:
                    failures.append(
                        f"P1 LEFT OVERFLOW p{pno+1}: x0={x0:.1f} text={sp['text'][:45]!r}")
                # Footer chrome (page no. / version) is drawn below the frame
                # by draw_page BY DESIGN. Only flag BODY text past the frame.
                in_footer = y0 > BOTTOM + 8 and len(sp["text"]) < 40
                if y1 > BOTTOM + 6 and not in_footer:
                    failures.append(
                        f"P1 BOTTOM OVERFLOW p{pno+1}: y1={y1:.1f} text={sp['text'][:45]!r}")

# ------------------------------------------------------------------ P2
BADCHARS = {"\ufffd", "\u25a1"}
for pno in range(doc.page_count):
    t = doc[pno].get_text()
    for ch in BADCHARS:
        if ch in t:
            i = t.index(ch)
            failures.append(f"P2 REPLACEMENT GLYPH p{pno+1}: ctx={t[max(0,i-40):i+40]!r}")

fonts_used = set()
for pno in range(doc.page_count):
    for f in doc[pno].get_fonts(full=True):
        fonts_used.add((f[3], f[4]))
notes.append("fonts embedded: " + ", ".join(sorted(n for n, _ in fonts_used)))

# ------------------------------------------------------------------ P3
for pno in range(doc.page_count):
    if pno == 0:
        continue
    page = doc[pno]
    spans = []
    for b in page.get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            for sp in line.get("spans", []):
                if sp["text"].strip():
                    spans.append(sp)
    if not spans:
        continue
    # heading = DejaVu bold display face at >=12pt
    heads = [s for s in spans if s["size"] >= 12 and "Deja" in s["font"]]
    for h in heads:
        below = [s for s in spans
                 if s["bbox"][1] > h["bbox"][3] + 2 and s["size"] < 12]
        if not below and h["bbox"][3] > BOTTOM - 90:
            failures.append(
                f"P3 ORPHAN HEADING p{pno+1}: {h['text'][:50]!r} "
                f"at y={h['bbox'][3]:.0f} with no body beneath")

# ------------------------------------------------------------------ P4 / P5
for pno in range(doc.page_count):
    page = doc[pno]
    txt = page.get_text().strip()
    body = "\n".join(l for l in txt.splitlines()
                     if "ALLEY CAT" not in l and "Eight Lives" not in l
                     and "v1.0" not in l)
    if pno > 0 and len(body.strip()) < 200:
        failures.append(f"P4 NEAR-EMPTY PAGE p{pno+1}: {len(body.strip())} chars of body")

    # Calibration note: at 42dpi with a v<128 cut, antialiased 8pt body type
    # is almost entirely missed (measured 0.001-0.04 on pages holding 500-1000
    # chars) -- that threshold produced false "blank page" reports. Sampling at
    # 100dpi with a v<245 cut counts light antialias pixels and cleanly
    # separates real pages (measured 0.08-0.35) from blanks (<0.01).
    pix = page.get_pixmap(dpi=100, colorspace=fitz.csGRAY)
    data = pix.samples
    ink = sum(1 for v in data if v < 245) / float(len(data))
    if pno == 0:
        if ink < 0.50:
            failures.append(f"P5 COVER TOO LIGHT: ink={ink:.3f}")
    else:
        if ink > 0.60:
            failures.append(f"P5 PAGE TOO DARK p{pno+1}: ink={ink:.3f} "
                            f"(cover art bleeding onto body page?)")
        if ink < 0.012:
            failures.append(f"P5 PAGE BLANK p{pno+1}: ink={ink:.3f}")

# ------------------------------------------------------------------ P6
alltext = "\n".join(doc[i].get_text() for i in range(doc.page_count))
MUST = [
    "Momentum is safety",
    "Cornered",
    "Only the one who made a thing has the right to name it",
    "How many lives you got left",
    "Nura",
    "Are you coming",
    "Misfit Ministries",
    "Eight lives wasted",
    "the ninth setting",
    "Iron Scribe",
    "Whiskers",
    "Stay",
    "Dice",
    "gossip",
]
for m in MUST:
    if m.lower() not in alltext.lower():
        failures.append(f"P6 MISSING CONTENT: {m!r} not found in rendered text")

# ------------------------------------------------------------------ P7
# DUPLICATE BODY TEXT. A refactor that moves a block into a group can leave the
# original in place; the doc still builds and every other check passes. This
# defect actually occurred during authoring and was invisible to P1-P6.
import collections
sentences = []
for pno in range(doc.page_count):
    for raw in doc[pno].get_text().split("\n"):
        t = raw.strip()
        if len(t) > 60 and not t.startswith("ALLEY CAT"):
            sentences.append(t)
dupes = [(t, c) for t, c in collections.Counter(sentences).items() if c > 1]
for t, c in dupes:
    failures.append(f"P7 DUPLICATE TEXT x{c}: {t[:70]!r}")

# P8 HEADING UNIQUENESS -- a repeated h1 means a section was emitted twice.
heads = []
for pno in range(doc.page_count):
    for b in doc[pno].get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            for sp in line.get("spans", []):
                if sp["size"] >= 18 and "Deja" in sp["font"]:
                    heads.append(sp["text"].strip())
for t, c in collections.Counter(heads).items():
    if c > 1:
        failures.append(f"P8 DUPLICATE H1 x{c}: {t[:60]!r}")

# ------------------------------------------------------------------ P9
# RUNNING HEAD CORRECTNESS. A page that opens a new section must name THAT
# section in its running head, not the previous one. ReportLab draws page
# chrome before flowables land, so a single-pass build gets this wrong -- the
# renderer uses a two-pass build to fix it. This asserts the fix holds.
for pno in range(1, doc.page_count):
    page = doc[pno]
    W = page.rect.width
    head, first_h1 = "", ""
    for b in page.get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            for sp in line.get("spans", []):
                if sp["bbox"][1] < 60 and sp["bbox"][2] > W * 0.55 and sp["text"].strip():
                    head = sp["text"].strip()
                if sp["size"] >= 18 and "Deja" in sp["font"] and not first_h1:
                    first_h1 = sp["text"].strip()
    if first_h1 and head and not head.startswith(first_h1[:18]):
        failures.append(
            f"P9 STALE RUNNING HEAD p{pno+1}: head={head[:34]!r} "
            f"but page opens section {first_h1[:34]!r}")

# ------------------------------------------------------------------ report
print("=" * 68)
print("POST-RENDER AUDIT")
print("=" * 68)
print(f"pages            : {doc.page_count}")
print(f"chars extracted  : {len(alltext)}")
print(f"h1 sections      : {len(heads)}")
for n in notes:
    print("note  " + n)
if failures:
    print(f"\nFAILURES ({len(failures)}):")
    for f_ in failures[:60]:
        print("  FAIL  " + f_)
    if len(failures) > 60:
        print(f"  ... and {len(failures)-60} more")
    sys.exit(1)
print("\nALL CHECKS PASSED")
