# -*- coding: utf-8 -*-
"""
Inventory of strings drawn directly on the canvas (drawString / drawRightString)
by render.draw_cover and render.draw_page.

These bypass the Paragraph choke point, so typeset.fix() cannot rescue them.
Kept as an explicit list so verify.py T6 can audit them. If a literal is added
to a canvas call in render.py, add it here too -- T7 below asserts the count
matches the number of drawString calls found by static scan.
"""
import os
import re

import content

VERSION = content.VERSION
DATE = content.DATE

CANVAS_STRINGS = [
    ("cover.kicker", "G A M E   D E S I G N   D O C U M E N T", "Disp"),
    ("cover.title", content.TITLE, "Disp"),
    ("cover.subtitle", content.SUBTITLE, "Helvetica-Oblique"),
    ("cover.tagline",
     "3D action-platformer  \u2022  single-player  \u2022  "
     "the fight is what happens when you run out of road", "Helvetica"),
    ("cover.chip1", "3D ACTION-PLATFORMER", "Helvetica-Bold"),
    ("cover.chip2", "MID-SIZE AA", "Helvetica-Bold"),
    ("cover.chip3", "12\u201320 HRS", "Helvetica-Bold"),
    ("cover.chip4", "TEEN / GRITTY-CLEAN", "Helvetica-Bold"),
    ("cover.chip5", "UE5", "Helvetica-Bold"),
    ("cover.version", f"{VERSION}  \u2014  {DATE}", "Helvetica"),
    ("cover.right", "Systems bible \u2022 vertical pitch \u2022 verification plan",
     "Helvetica"),
    ("head.title", "ALLEY CAT", "Helvetica-Bold"),
    ("head.sub", "Eight Lives Wasted \u2014 One Soul Saved", "Helvetica"),
    ("head.sect", "\u2014 section names are h1 text \u2014", "Helvetica"),
    ("foot.version", f"{VERSION}  \u2022  {DATE}", "Helvetica"),
    ("foot.page", "999", "Helvetica-Bold"),
]


def static_scan_count():
    """Count drawString/drawRightString calls in render.py for drift detection."""
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "render.py")
    src = open(p, encoding="utf-8").read()
    return len(re.findall(r"\.draw(?:Right)?String\(", src))
