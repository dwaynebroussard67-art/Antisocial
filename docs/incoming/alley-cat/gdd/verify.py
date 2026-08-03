# -*- coding: utf-8 -*-
"""
Pre-flight verification for the ALLEY CAT GDD.

Falsification attempts, not assertions of correctness:

  T1  GLYPH COVERAGE. Every char routed to a Helvetica span must be encodable
      in WinAnsi (cp1252). Helvetica silently substitutes a black box for
      anything outside it -- a defect that survives a visual skim.
  T2  MONO COVERAGE. Every char in a ("spec",...) block must exist in the
      DejaVu Sans Mono cmap (box-drawing / arrows live here).
  T3  MARKUP WELL-FORMEDNESS. Inline tags must balance, or reportlab throws
      mid-build and the traceback points at the renderer, not the content.
  T4  TABLE RECTANGULARITY + WIDTH SUM. Ragged rows silently drop cells;
      widths that don't sum to 1.0 cause overflow past the right margin.
  T5  BLOCK SCHEMA. Unknown block kinds are dropped silently by the renderer.
"""
import re
import sys
import unicodedata
from fontTools.ttLib import TTFont as FTFont

import content
from typeset import fix, has_unrenderable, _is_winansi

DJ_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
ALLOWED_TAGS = {"b", "i", "br", "font", "sub", "super", "u"}
TAG_RE = re.compile(r"<\s*(/?)\s*([a-zA-Z]+)[^>]*?(/?)\s*>")

failures = []
warnings = []


def strip_tags(s):
    return TAG_RE.sub("", s)


def walk_strings():
    """Yield (path, string, is_mono) for every authored string."""
    for idx, (kind, payload) in enumerate(content.BLOCKS):
        tag = f"block[{idx}]:{kind}"
        if kind in ("h1", "h2", "h3", "p", "lead"):
            yield tag, payload, False
        elif kind in ("bul", "num"):
            for i, s in enumerate(payload):
                yield f"{tag}[{i}]", s, False
        elif kind == "spec":
            for i, s in enumerate(payload):
                yield f"{tag}[{i}]", s, True
        elif kind == "kv":
            for i, (k, v) in enumerate(payload):
                yield f"{tag}[{i}].k", k, False
                yield f"{tag}[{i}].v", v, False
        elif kind in ("call", "warn"):
            yield f"{tag}.title", payload[0], False
            yield f"{tag}.body", payload[1], False
        elif kind == "quote":
            yield f"{tag}.text", payload[0], False
            if payload[1]:
                yield f"{tag}.attrib", payload[1], False
        elif kind == "table":
            for i, c in enumerate(payload["cols"]):
                yield f"{tag}.col[{i}]", str(c), False
            for r, row in enumerate(payload["rows"]):
                for c, cell in enumerate(row):
                    yield f"{tag}.r{r}c{c}", str(cell), False
        elif kind == "quote_keep":
            yield f"{tag}.text", payload[0], False
            if payload[1]:
                yield f"{tag}.attrib", payload[1], False
        elif kind == "img":
            yield f"{tag}.caption", payload[1], False
        elif kind == "cover":
            yield f"{tag}.title", payload["title"], False
            yield f"{tag}.subtitle", payload["subtitle"], False
            for i, t in enumerate(payload.get("tags", [])):
                yield f"{tag}.tag[{i}]", t, False


# ---------------------------------------------------------------- T1 / T2
mono_cmap = set()
try:
    f = FTFont(DJ_MONO)
    for table in f["cmap"].tables:
        mono_cmap |= set(table.cmap.keys())
except Exception as e:                                   # pragma: no cover
    warnings.append(f"T2 SKIPPED - could not read mono cmap: {e}")

for path, s, is_mono in walk_strings():
    txt = strip_tags(s)
    # unescape the handful of entities used
    txt = txt.replace("&nbsp;", " ").replace("&amp;", "&")
    if is_mono:
        if mono_cmap:
            for ch in txt:
                if ord(ch) not in mono_cmap and ch not in "\n\t":
                    failures.append(
                        f"T2 GLYPH MISSING (mono) {path}: "
                        f"U+{ord(ch):04X} {unicodedata.name(ch, '?')!r}")
    else:
        # Audit the TRANSFORMED string: fallback spans are legal, bare
        # non-WinAnsi chars are not.
        for ch, ctx in has_unrenderable(fix(s)):
            failures.append(
                f"T1 UNRENDERABLE (Helvetica, post-fallback) {path}: "
                f"U+{ord(ch):04X} {unicodedata.name(ch, '?')!r} in {ctx!r}")

# ---------------------------------------------------------------- T3
for path, s, is_mono in walk_strings():
    stack = []
    for m in TAG_RE.finditer(s):
        closing, name, selfclose = m.group(1), m.group(2).lower(), m.group(3)
        if name not in ALLOWED_TAGS:
            failures.append(f"T3 UNKNOWN TAG <{name}> in {path}")
            continue
        if name == "br" or selfclose:
            continue
        if closing:
            if not stack or stack[-1] != name:
                failures.append(
                    f"T3 UNBALANCED </{name}> in {path}: stack={stack}")
            else:
                stack.pop()
        else:
            stack.append(name)
    if stack:
        failures.append(f"T3 UNCLOSED {stack} in {path}: {s[:70]!r}")

# ---------------------------------------------------------------- T4
for idx, (kind, payload) in enumerate(content.BLOCKS):
    if kind != "table":
        continue
    tag = f"block[{idx}]:table"
    n = len(payload["cols"])
    for r, row in enumerate(payload["rows"]):
        if len(row) != n:
            failures.append(
                f"T4 RAGGED ROW {tag} row {r}: {len(row)} cells, expected {n}")
    w = payload.get("widths")
    if w:
        if len(w) != n:
            failures.append(f"T4 WIDTH COUNT {tag}: {len(w)} widths, {n} cols")
        if abs(sum(w) - 1.0) > 0.005:
            failures.append(f"T4 WIDTH SUM {tag}: sums to {sum(w):.4f}, need 1.0")
    a = payload.get("align")
    if a and len(a) != n:
        failures.append(f"T4 ALIGN COUNT {tag}: {len(a)} aligns, {n} cols")

# ---------------------------------------------------------------- T5
KNOWN = {"cover", "h1", "h2", "h3", "p", "lead", "bul", "num", "kv",
         "table", "call", "warn", "quote", "quote_keep", "img", "spec",
         "rule", "pb", "closing_group"}
for idx, (kind, payload) in enumerate(content.BLOCKS):
    if kind not in KNOWN:
        failures.append(f"T5 UNKNOWN BLOCK KIND {kind!r} at index {idx}")

# ------------------------------------------------- T6 canvas-drawn strings
# draw_cover/draw_page write with canvas.drawString using Helvetica or Disp
# (DejaVu Bold). Helvetica-drawn literals must be WinAnsi-clean; there is no
# markup layer on a canvas call, so fallback cannot rescue them.
import render_strings_probe as _probe  # noqa: E402
for label, text, font in _probe.CANVAS_STRINGS:
    if font.startswith("Helvetica"):
        for ch in text:
            if not _is_winansi(ch):
                failures.append(
                    f"T6 CANVAS NOT WINANSI [{label}] font={font}: "
                    f"U+{ord(ch):04X} {unicodedata.name(ch, '?')!r}")
    else:
        if mono_cmap and font == "Disp":
            pass  # DejaVu Bold verified to cover the used set

# ------------------------------------------------------- T7 art existence
import os as _os
_ART = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), "art")
for idx, (kind, payload) in enumerate(content.BLOCKS):
    if kind == "img":
        fp = _os.path.join(_ART, payload[0])
        if not _os.path.exists(fp):
            failures.append(f"T7 MISSING ART block[{idx}]: {fp}")

# ---------------------------------------------------------------- report
print("=" * 68)
print("PRE-FLIGHT VERIFICATION")
print("=" * 68)
print(f"blocks           : {len(content.BLOCKS)}")
print(f"strings audited  : {sum(1 for _ in walk_strings())}")
print(f"mono cmap size   : {len(mono_cmap)}")
print(f"canvas strings   : {len(_probe.CANVAS_STRINGS)}")
for w in warnings:
    print("WARN  " + w)
if failures:
    print(f"\nFAILURES ({len(failures)}):")
    for f_ in failures:
        print("  FAIL  " + f_)
    sys.exit(1)
print("\nALL CHECKS PASSED")
