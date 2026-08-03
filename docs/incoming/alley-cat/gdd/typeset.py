# -*- coding: utf-8 -*-
"""
Glyph fallback layer.

PROBLEM
  Body copy is set in Helvetica (a Type1 base-14 face) because DejaVu ships no
  italic, and the document uses inline <i> heavily. But Helvetica is limited to
  WinAnsi (cp1252): characters like U+2192 (arrow), U+2264 (<=), U+1D65
  (subscript v) are NOT in that set and reportlab emits a black box for them
  WITHOUT raising. That is a silent corruption -- it survives a visual skim of
  a 30-page document.

SOLUTION
  Wrap any non-WinAnsi run in <font name="Uni">...</font>, where Uni is
  DejaVu Sans (full Unicode coverage, verified). Helvetica keeps the body text
  and its real oblique; only the handful of exotic glyphs switch face, which is
  visually indistinguishable at 8-10pt for symbols.

INVARIANT
  after_transform(s) contains no non-WinAnsi character outside a Uni span.
  verify.py asserts this on the transformed output, not the source.
"""
import re

TAG_RE = re.compile(r"<[^>]+>")
UNI_FONT = "Uni"
UNI_FONT_B = "Uni-Bold"


def _is_winansi(ch):
    try:
        ch.encode("cp1252")
        return True
    except UnicodeEncodeError:
        return False


def _wrap_text_run(txt, bold=False):
    """Wrap maximal non-WinAnsi runs of a tag-free string in a font span."""
    if not txt:
        return txt
    out = []
    buf = []
    exotic = False

    def flush():
        if not buf:
            return
        s = "".join(buf)
        if exotic:
            name = UNI_FONT_B if bold else UNI_FONT
            out.append(f'<font name="{name}">{s}</font>')
        else:
            out.append(s)
        buf.clear()

    for ch in txt:
        e = not _is_winansi(ch)
        if e != exotic:
            flush()
            exotic = e
        buf.append(ch)
    flush()
    return "".join(out)


def fix(s):
    """
    Apply glyph fallback to a markup string, leaving tags untouched.
    Tracks <b> depth so a fallback glyph inside bold text stays bold.
    """
    if s is None:
        return s
    s = str(s)
    if all(_is_winansi(c) for c in TAG_RE.sub("", s)):
        return s  # fast path: nothing to do

    parts = []
    pos = 0
    bold_depth = 0
    for m in TAG_RE.finditer(s):
        text = s[pos:m.start()]
        if text:
            parts.append(_wrap_text_run(text, bold_depth > 0))
        tag = m.group(0)
        low = tag.lower().replace(" ", "")
        if low.startswith("<b>"):
            bold_depth += 1
        elif low.startswith("</b>"):
            bold_depth = max(0, bold_depth - 1)
        parts.append(tag)
        pos = m.end()
    tail = s[pos:]
    if tail:
        parts.append(_wrap_text_run(tail, bold_depth > 0))
    return "".join(parts)


def has_unrenderable(s, mono=False):
    """
    Post-transform audit helper. Returns list of (char, context) for any
    non-WinAnsi character NOT inside a <font name="Uni*"> span.
    Mono blocks are exempt (DejaVu Mono has full coverage).
    """
    if mono:
        return []
    bad = []
    depth = 0
    pos = 0
    s = str(s)
    for m in TAG_RE.finditer(s):
        seg = s[pos:m.start()]
        if depth == 0:
            for ch in seg:
                if not _is_winansi(ch):
                    bad.append((ch, seg[:50]))
        tag = m.group(0).lower()
        if tag.startswith("<font") and 'name="uni' in tag.replace(" ", "").lower():
            depth += 1
        elif tag.startswith("</font"):
            depth = max(0, depth - 1)
        pos = m.end()
    for ch in s[pos:]:
        if not _is_winansi(ch):
            bad.append((ch, s[pos:pos + 50]))
    return bad
