# -*- coding: utf-8 -*-
"""
Content model for the ALLEY CAT game design document.
Pure data. No rendering logic. Renderer walks BLOCKS and dispatches on type.

Block schema:
  ("cover",   {...})
  ("h1", str) ("h2", str) ("h3", str)
  ("p", str)
  ("lead", str)              # larger intro paragraph
  ("bul", [str, ...])
  ("num", [str, ...])
  ("kv",  [(k, v), ...])
  ("table", {"cols":[...], "rows":[[...]], "widths":[...], "align":[...]})
  ("call", (title, body))    # accent callout box
  ("warn", (title, body))    # hard-constraint box
  ("quote", (text, attrib))
  ("spec", [str, ...])       # monospaced technical lines
  ("img", (path, caption, width_frac))
  ("rule", None)
  ("pb", None)               # page break
"""

TITLE = "ALLEY CAT"
SUBTITLE = "Eight Lives Wasted \u2014 One Soul Saved"
DOCTYPE = "Game Design Document \u2014 Vertical Pitch + Systems Bible"
VERSION = "v1.0"
DATE = "July 2026"

BLOCKS = []
B = BLOCKS.append


# ----------------------------------------------------------------------------
# COVER
# ----------------------------------------------------------------------------
B(("cover", {
    "title": TITLE,
    "subtitle": SUBTITLE,
    "doctype": DOCTYPE,
    "version": VERSION,
    "date": DATE,
    "tags": ["3D ACTION-PLATFORMER", "MID-SIZE AA", "12\u201320 HRS",
             "TEEN / GRITTY-CLEAN", "SINGLE-PLAYER"],
}))


# ----------------------------------------------------------------------------
# 00 — THE PITCH
# ----------------------------------------------------------------------------
B(("h1", "00 \u2014 The Pitch"))

B(("lead",
   "You are a street cat who has never lost a fight, in a game that will not let you "
   "win one."))

B(("p",
   "<b>ALLEY CAT</b> is a 3D action-platformer set in an unnamed Gulf-South city of animals. "
   "You play Alley \u2014 fast, famous, and owned. Around his neck is a collar set with eight "
   "diamonds and one empty socket. The hood reads that collar as status: the Big Dog's "
   "favorite, the one cat nobody touches. Alley knows what it actually is. It is a leash."));

B(("p",
   "When his best friend Whiskers \u2014 a rat, released from a long sentence suspiciously "
   "early \u2014 goes missing, Alley goes looking. The street runs three theories on why. "
   "Two of them are about violence. The third one is about a small storefront church up the "
   "road called Misfit Ministries, run by the only human left in the world."))

B(("call", ("THE ONE-LINE HOOK",
   "An action-platformer whose combat system exists to be avoided. Every fight you take is "
   "the game telling you that you ran out of better ideas \u2014 and the world remembers "
   "which cat you chose to be.")))

B(("h2", "Design Pillars"))
B(("table", {
    "cols": ["#", "Pillar", "What it means at the controller", "Fails if\u2026"],
    "widths": [0.05, 0.19, 0.46, 0.30],
    "rows": [
        ["1", "Momentum is safety",
         "A moving cat cannot be caught. The entire moveset is about never touching the "
         "ground for longer than you have to.",
         "Players find standing still viable."],
        ["2", "Combat is the failure state",
         "There is no attack button in the default moveset. Violence unlocks only when the "
         "world has physically cornered you.",
         "Players seek fights for reward."],
        ["3", "Names are mechanics",
         "Labels other characters put on you are literal, powerful buffs \u2014 and they are "
         "sticky, and they change what you are.",
         "Labels read as a cosmetic morality meter."],
        ["4", "The city has an opinion",
         "The collar makes Alley recognizable everywhere. You cannot hide. You can only "
         "change what people are recognizing.",
         "Reputation feels like an invisible number."],
        ["5", "Earned, never preached",
         "The ministry is depicted honestly and is never a quest-giver dispensing objective "
         "markers. It is a place, with people in it.",
         "The game becomes an advertisement."],
    ],
}))

B(("h2", "The Thesis, Stated Plainly"))
B(("p",
   "The premise is about labels \u2014 <i>cat, player, baller, big dog, boss, legend</i> \u2014 "
   "words that are a compliment in the hood and a sentence when you wear them. A design "
   "document that puts that theme only in the script has failed. In <b>ALLEY CAT</b> the "
   "theme is the button layout: accepting what people call you grants real, measurable, "
   "tempting power, and the strongest and least removable label in the game is the one the "
   "player chooses to put on themselves."))

B(("pb", None))


# ----------------------------------------------------------------------------
# A — SEARCH SPACE
# ----------------------------------------------------------------------------
B(("h1", "A \u2014 Search Space: Candidate Architectures"))

B(("p",
   "Five core-loop architectures were specified and scored before any system was designed in "
   "detail. Scoring is 1\u20135 against the fitness function {correctness, efficiency, "
   "maintainability, minimality}, with content-safety integrity treated as a hard "
   "pass/fail constraint rather than a scored dimension \u2014 a candidate that violates it "
   "is not on the frontier at all."))

B(("kv", [
    ("Correctness",
     "Fidelity to the delivered spec: 3D action-platformer, combat as last resort, "
     "an investigation plot, nine chapters, theme carried by mechanics."),
    ("Efficiency",
     "Cost to build and cost to run at mid-size AA budget and console frame targets."),
    ("Maintainability",
     "Whether 12\u201320 hours of content can be authored by a mid-size team without every "
     "hour being bespoke."),
    ("Minimality",
     "System count. Unnecessary mechanics are scored as defects of equal weight to bugs."),
    ("Safety (hard)",
     "Teen-rating integrity, duty of care in depicting a real-world-adjacent ministry and "
     "testimony, and no dark-pattern monetisation of a redemption narrative."),
]))

B(("table", {
    "cols": ["Candidate", "Corr.", "Eff.", "Main.", "Min.", "Safety", "Verdict"],
    "widths": [0.32, 0.09, 0.09, 0.09, 0.09, 0.11, 0.21],
    "align": ["l", "c", "c", "c", "c", "c", "l"],
    "rows": [
        ["A. Flow-State Momentum Purist\n<i>Bomb Rush Cyberfunk grammar</i>",
         "3", "5", "4", "5", "PASS", "Non-dominated. Loses on plot."],
        ["B. Stealth-Platformer\n<i>Sly Cooper grammar</i>",
         "1", "3", "3", "3", "PASS", "<b>Eliminated \u2014 thematic invalidation.</b>"],
        ["C. Chase Gauntlet\n<i>set-piece pursuit chain</i>",
         "2", "4", "2", "4", "PASS", "Eliminated \u2014 fatigue + bespoke cost."],
        ["D. Open-Hub Investigation\n<i>Spider-Man 2 grammar</i>",
         "4", "2", "3", "2", "PASS", "Eliminated \u2014 open-world scope risk."],
        ["<b>E. Chaptered Momentum-Investigation\nwith Cornered failure state</b>",
         "<b>5</b>", "<b>4</b>", "<b>4</b>", "<b>4</b>", "<b>PASS</b>",
         "<b>SELECTED</b>"],
    ],
}))

B(("h2", "Why B Was Eliminated \u2014 A Real Finding, Not a Formality"))
B(("p",
   "Stealth was the obvious genre answer to \u201ccombat is a last resort,\u201d and it is "
   "wrong. Stealth games are built on the fantasy of <i>not being known</i>. Alley's entire "
   "problem is that he is <i>already known</i> \u2014 the collar is a recognition device and "
   "the premise states outright that the hood reads it on sight. A mechanic whose win "
   "condition is anonymity directly contradicts the protagonist's central condition."))
B(("p",
   "This is the single most valuable output of the search phase: the first-viable solution "
   "was thematically invalid, and only comparative scoring surfaced it. The replacement "
   "insight \u2014 <i>you cannot hide, you can only outrun and out-choose</i> \u2014 became "
   "the foundation of the selected architecture."))

B(("h2", "Selected Architecture (E)"))
B(("spec", [
    "STRUCTURE   9 authored chapters. No open world. Each chapter = one district,",
    "            reconfigured by story state rather than rebuilt.",
    "PRIMARY     Momentum traversal (parkour) across a dense vertical hood.",
    "SECONDARY   Investigation: talk, follow, observe, corroborate.",
    "ESCALATION  Chases (authored) + Cornered encounters (systemic).",
    "COMBAT      Locked behind the Cornered state. Never volitional. Never rewarded.",
    "PROGRESSION Names (labels) + Collar (recognition). No XP. No skill tree.",
]))

B(("call", ("PARETO HONESTY",
   "E does <b>not</b> strictly dominate A. A is cheaper, simpler and more minimal, and a "
   "pure momentum game would ship faster and tighter. E was selected because the "
   "correctness gap is decisive: the delivered spec is an investigation with a redemption "
   "arc, and A cannot hold a plot. The tie-break criterion was <i>spec fidelity over "
   "production comfort</i>. This is a stated tradeoff, not a silent one.")))

B(("pb", None))


# ----------------------------------------------------------------------------
# B — CORE LOOP
# ----------------------------------------------------------------------------
B(("h1", "B \u2014 Core Loop: Momentum"))

B(("p",
   "Alley's moveset is built on one resource: <b>Momentum</b>. It is not a meter the player "
   "manages in the UI; it is the speed and continuity of motion itself, surfaced through "
   "camera, audio and fur. It is legible without a number."))

B(("table", {
    "cols": ["Tier", "Trigger", "Feel", "World Effect"],
    "widths": [0.16, 0.26, 0.30, 0.28],
    "rows": [
        ["<b>Cold</b>", "Standing, walking, grounded >3s",
         "Camera pulls in. Ambient city audio dominant. Fur settles.",
         "Enforcers can path to you. Cornered checks are live."],
        ["<b>Warm</b>", "2+ chained traversal anchors",
         "Camera eases back. A low bass pulse enters.",
         "Pursuit AI loses direct-path solutions."],
        ["<b>Hot</b>", "6+ chained anchors, no ground contact",
         "FOV widens, edges bloom, score's drum layer locks in.",
         "Enforcers switch to prediction; you can outrun any pursuit."],
        ["<b>Sailing</b>", "Sustained Hot across a district gap",
         "Wind and score only. City noise ducks to near-silence.",
         "Alley narrates. This is where his VO monologues live."],
    ],
}))

B(("h2", "The Verbs"))
B(("bul", [
    "<b>Run / Wallrun</b> \u2014 surface-agnostic. Brick, chain-link, sheet metal, wet "
    "canal concrete each carry distinct grip values and distinct audio.",
    "<b>Anchor Leap</b> \u2014 context jump to the nearest valid anchor. Generous assist; "
    "the fantasy is feline precision, not the player's failure to aim.",
    "<b>Squeeze</b> \u2014 traversal through gaps no dog can follow. The core asymmetry "
    "between Alley and every threat in the game.",
    "<b>Cling</b> \u2014 hold a vertical surface briefly to re-solve a route. Bleeds "
    "Momentum. The game's built-in \u201cthink\u201d button.",
    "<b>Drop</b> \u2014 controlled fall. Cats do not take fall damage; they take "
    "<i>time</i>, which in a chase is the same currency.",
    "<b>Read</b> \u2014 stop and observe. The investigation verb. Explicitly costs all "
    "Momentum, which is the deliberate tension: knowing requires standing still.",
]))

B(("call", ("WHY \u2018READ\u2019 COSTS MOMENTUM",
   "The investigation layer and the traversal layer must not be two games bolted together. "
   "Making the detective verb consume the platformer resource fuses them: every time Alley "
   "stops to understand something, he becomes catchable. The story is about a cat who has "
   "survived by never stopping, being asked to stop.")))

B(("h2", "Loop Diagram (textual)"))
B(("spec", [
    "  LEAD ──▶ TRAVERSE ──▶ ARRIVE ──▶ READ / TALK ──▶ NEW LEAD",
    "             │                        │",
    "             │ (detected)             │ (pressed / refused)",
    "             ▼                        ▼",
    "          CHASE ─────(escape)──────▶ back to TRAVERSE",
    "             │",
    "             │ (route exhausted \u2014 no anchor in reach)",
    "             ▼",
    "         ╔═══════════╗",
    "         ║  CORNERED ║   ◀── the only door to combat",
    "         ╚═══════════╝",
]))

B(("pb", None))


# ----------------------------------------------------------------------------
# C — CORNERED
# ----------------------------------------------------------------------------
B(("h1", "C \u2014 Cornered: Combat as a Failure State"))

B(("warn", ("HARD DESIGN CONSTRAINT",
   "There is no attack input in the default moveset. The player cannot choose to start a "
   "fight from a neutral state. If a fight is happening, the systems have already judged "
   "that traversal failed.")))

B(("h2", "Entry Condition"))
B(("p",
   "<b>Cornered</b> is evaluated only when all of the following are simultaneously true. It "
   "is a systemic state, not a scripted trigger, and the player can always see it coming."))
B(("num", [
    "Momentum tier is <b>Cold</b>.",
    "No valid traversal anchor exists within reach of Alley's current position.",
    "A hostile is inside the closing radius and has line of sight.",
    "The encounter volume has no unblocked <b>Squeeze</b> exit.",
]))
B(("p",
   "When all four hold, the game changes state visibly and audibly: the camera drops to a "
   "tight low angle, the musical score strips to a single held note, the colour grade "
   "desaturates, and Alley's ears flatten. <b>The traversal button remaps to the defensive "
   "verb.</b> The player is told, in the language of the game rather than a tutorial popup, "
   "that something has gone wrong."))

B(("h2", "How Fighting Feels"))
B(("table", {
    "cols": ["Conventional action-platformer combat", "ALLEY CAT \u2014 Cornered"],
    "widths": [0.5, 0.5],
    "rows": [
        ["Combo strings, escalating flourish, rewarding rhythm",
         "Three or four frantic, ugly exchanges. No combos. No flourish."],
        ["Camera pulls out to show off animation",
         "Camera crowds in until it is uncomfortable to watch."],
        ["Music swells to hype the player",
         "Music leaves. You fight to breathing and impact."],
        ["Victory grants XP, loot, upgrades",
         "Victory grants nothing. You are simply still alive."],
        ["Damage regenerates between encounters",
         "Damage becomes permanent scarring on the character model."],
        ["Enemies exist to be fought",
         "Every hostile has a name, a face, and a reason to be there."],
    ],
}))

B(("h2", "The Cost Model"))
B(("p",
   "Fighting is never punished by a failure screen \u2014 that would make it a lose "
   "condition and teach the player to reload. It is punished by <b>consequence that "
   "persists</b>, which teaches the player something far more useful: that you can win and "
   "still be worse off."))
B(("bul", [
    "<b>Permanent scarring.</b> Alley's model accumulates damage across the whole campaign. "
    "By chapter 7 a violent playthrough and a restrained playthrough are visually "
    "unmistakable at a glance.",
    "<b>Voice drift.</b> Alley's first-person narration is recorded in three hardness "
    "registers. The mix is selected by cumulative violence. He gets colder to listen to.",
    "<b>The city's read hardens.</b> Fear opens doors and closes others. Informants who "
    "would have talked to a cat with a story instead talk to a cat with a reputation, "
    "which yields worse information, faster.",
    "<b>Whiskers notices.</b> The single most reliable barometer in the game. He is the one "
    "character who knew Alley before the collar.",
]))

B(("img", ("plate_cornered.png",
           "CORNERED \u2014 The Canal, Ch.3. Momentum is zero, the walls are sheer, and "
           "there is no anchor in reach. The camera crowds in, the score drops out, and "
           "the traversal button becomes something else. The collar is the only thing in "
           "frame still catching light.", 1.0)))

B(("call", ("THE DESIGN TRAP, DELIBERATELY SET",
   "Cornered combat is <i>winnable</i> and it is <i>fast</i>. It is often the most "
   "efficient way out of a bad situation in the short term. That is the point. A last "
   "resort that is mechanically useless is not a temptation, and a theme about a violent "
   "world is worthless if violence does not actually work.")))

B(("pb", None))


# ----------------------------------------------------------------------------
# D — THE NAME SYSTEM
# ----------------------------------------------------------------------------
B(("h1", "D \u2014 The Name System"))

B(("lead",
   "\u201cOnly the one who made a thing has the right to name it.\u201d"))

B(("p",
   "The Name system is the game's progression mechanic. It replaces XP, skill trees and "
   "gear entirely. Throughout the campaign, characters put labels on Alley. Each label is "
   "offered in dialogue, and the player either <b>takes it</b> or <b>lets it pass</b>."))

B(("h2", "Taking a Name"))
B(("bul", [
    "A taken Name grants a <b>real, immediate, permanent mechanical buff</b>. Not a "
    "cosmetic. Not a small percentage. Something the player will feel on the next rooftop.",
    "A taken Name is <b>displayed on the collar</b> \u2014 etched into the band, visible on "
    "the character model.",
    "A taken Name <b>changes NPC dialogue routing</b> across the whole city. It is a public "
    "fact about you.",
    "A taken Name is <b>extremely difficult to remove</b>, and the game does not tell you "
    "how until chapter 8.",
]))

B(("table", {
    "cols": ["Name", "Offered by", "Buff (real)", "Cost (real)"],
    "widths": [0.15, 0.20, 0.34, 0.31],
    "rows": [
        ["<b>Player</b>", "Ch.2 \u2014 street corner crew",
         "Dialogue: unlocks charm routes; NPCs volunteer information unprompted.",
         "Nobody believes anything you say when it matters. Ch.8 fails harder."],
        ["<b>Baller</b>", "Ch.3 \u2014 the pawn-lot ferrets",
         "Economy: prices drop citywide; doors open on money alone.",
         "Whiskers stops asking you for help. He assumes you're bought."],
        ["<b>Legend</b>", "Ch.5 \u2014 the crowd after the job",
         "Traversal: +Momentum retention, longer Sailing windows.",
         "Hostiles escalate permanently. You are worth attacking now."],
        ["<b>Big Dog</b>", "Ch.7 \u2014 the Cane Corso himself",
         "Authority: minor enforcers stand down without a fight.",
         "The ninth setting. Taking this is the game's darkest branch."],
        ["<b>Nobody</b>", "Ch.4 \u2014 Alley, to himself",
         "Stealth-adjacent: the city's read on you cools rapidly.",
         "<b>Self-applied. See below.</b>"],
    ],
}))

B(("h2", "The Curse You Put On Your Own Head"))
B(("warn", ("SELF-APPLIED NAMES ARE A SEPARATE CLASS",
   "A Name Alley gives himself has <b>double the mechanical strength</b> of any Name given "
   "by another character \u2014 and it is the only class of Name that cannot be removed by "
   "any in-game action available before the final chapter. You believe it absolutely. "
   "That is why it is the strongest, and that is why it is the hardest to break.")))

B(("p",
   "This is the mechanical statement of the source theme, and it is designed to be "
   "discovered rather than explained. A player optimising for power will naturally "
   "gravitate to self-applied Names, because they are objectively the best buffs in the "
   "game. The realisation \u2014 usually around chapter 6 \u2014 that the most powerful "
   "thing they equipped is the thing they cannot take off is the intended emotional "
   "event."))

B(("h2", "Letting a Name Pass"))
B(("p",
   "Refusal grants nothing. There is no hidden \u201crefusal bonus,\u201d because a moral "
   "system that pays out for virtue is just a differently-shaped reward loop. What refusal "
   "grants is <b>optionality</b>: an unlabelled Alley keeps more branches open, and the "
   "endgame reads the count of unetched space on the collar. The reward for restraint is "
   "that you still have room to become something."))

B(("pb", None))


# ----------------------------------------------------------------------------
# E — THE COLLAR
# ----------------------------------------------------------------------------
B(("h1", "E \u2014 The Collar: Recognition, Not Reputation"))

B(("p",
   "Most open-world games model reputation as a scalar the player cannot see, driving "
   "faction attitudes. That would be the wrong model here. The collar is not a measure of "
   "how much people like Alley \u2014 it is a measure of <b>what people think he is when "
   "they see him</b>, and it is diegetic, visible, and worn."))

B(("h3", "Physical state"))
B(("bul", [
    "Eight diamonds, one empty ninth setting. The empty setting is visible from the very "
    "first frame of the game and is never explained until chapter 7.",
    "Names taken are etched into the band and are readable on the model.",
    "The diamonds dull with grime and brighten when the Big Dog's people service the "
    "collar \u2014 a maintenance ritual Alley cannot refuse, staged in chapters 1, 4 and 7 "
    "as a recurring, escalating scene of ownership.",
]))

B(("h3", "The Read"))
B(("p",
   "Every NPC in the city performs a <b>Read</b> on Alley when he enters their awareness, "
   "resolving to one of five postures. The Read is computed from Names taken, cumulative "
   "Cornered encounters, chapter state, and district."))

B(("table", {
    "cols": ["Read", "NPC behaviour", "Information quality"],
    "widths": [0.18, 0.47, 0.35],
    "rows": [
        ["<b>Untouchable</b>", "Defers, avoids eye contact, clears a path.",
         "Almost none. Nobody tells the truth to power."],
        ["<b>Useful</b>", "Approaches. Wants something. Trades.",
         "Transactional and often false."],
        ["<b>Dangerous</b>", "Withdraws. Warns others. Doors close ahead of you.",
         "Zero, and the city closes behind you."],
        ["<b>Unreadable</b>", "Hesitates. Doesn't know which script to run.",
         "<b>Best in game.</b> Uncertainty produces honesty."],
        ["<b>Known</b>", "Uses his name, not his title. Only available at Misfit "
         "Ministries and only after Ch.6.",
         "Complete. This is the reward state."],
    ],
}))

B(("call", ("THE INVERSION THAT MAKES THE SYSTEM WORK",
   "Power is anti-correlated with information. The more the city fears Alley, the less "
   "anyone will tell him \u2014 and the whole game is a search for something only a person "
   "would tell you. The optimal play for finding Whiskers is to be less frightening, and "
   "the player discovers this by failing at it first.")))

B(("pb", None))


# ----------------------------------------------------------------------------
# F — NINE
# ----------------------------------------------------------------------------
B(("h1", "F \u2014 Nine's Question"))

B(("p",
   "Three times in the campaign, a black cat that no other character can account for "
   "appears and asks Alley a single question:"))

B(("quote", ("How many lives you got left?", "\u2014 Nine")))

B(("p",
   "Per the design constraint, <b>the nine lives are not a mechanic.</b> There is no life "
   "counter, no death economy, no resurrection currency. Deaths use conventional "
   "checkpointing and carry no narrative weight. This is deliberate: a life-counter would "
   "turn the game's central metaphor into a resource bar, and players optimise resource "
   "bars rather than feeling them."))

B(("h2", "How the Question Is Answered"))
B(("p",
   "The player is never given a dialogue menu in response. Instead, the game answers on the "
   "player's behalf, by showing them what they have actually done. On each encounter, the "
   "screen holds and a silent, unscored montage plays \u2014 assembled at runtime from the "
   "player's own recorded telemetry."))

B(("table", {
    "cols": ["Encounter", "Placement", "What the montage shows"],
    "widths": [0.14, 0.28, 0.58],
    "rows": [
        ["<b>First</b>", "Ch.1, before the church",
         "Nothing. The montage is empty \u2014 black frames. Alley has no idea who he is "
         "yet, and neither does the player. Nine leaves without waiting."],
        ["<b>Second</b>", "Ch.5, after the job",
         "Every Cornered encounter the player has entered, in order, with the audio "
         "stripped out. Just the faces."],
        ["<b>Third</b>", "Ch.8, at the lowest point",
         "Every Name on the collar, etched one at a time \u2014 and then, held longest, "
         "the one Alley gave himself."],
    ],
}))

B(("h2", "Nine / Nura"))
B(("p",
   "<b>Nine</b> is what the street calls her. It is a number \u2014 a count of lives, a "
   "thing to be spent. It is a label, and it was applied by strangers."))
B(("p",
   "<b>Nura</b> is her name. It was given by whoever made her. In the third encounter, when "
   "Alley finally asks her something instead of being asked, she tells him \u2014 and the "
   "game's central thesis turns on that hinge: <i>only the one who made a thing has the "
   "right to name it.</i> Everything the street called her was a guess. Everything the "
   "street called him was too."))

B(("call", ("AMBIGUITY IS PRESERVED",
   "The game never confirms what Nura is. She is not explained, not statted, not fought, "
   "and does not appear on any map. Three appearances, three questions, one name. Players "
   "who want her to be an angel may have that. Players who want her to be a stray cat who "
   "showed up three times may have that too. The design does not adjudicate, and no "
   "collectible, codex entry or achievement ever refers to her.")))

B(("pb", None))


# ----------------------------------------------------------------------------
# G — WORLD
# ----------------------------------------------------------------------------
B(("h1", "G \u2014 The City"))

B(("p",
   "An unnamed Gulf-South city: humid, low, built on and around water it is losing to. "
   "Drainage canals, elevated interstate, cypress in the drowned lots, sodium light and "
   "wet concrete. Not a named real place \u2014 the texture is regional, the geography is "
   "invented. Animals only, with a single human exception."))

B(("table", {
    "cols": ["District", "Vertical character", "Traversal grammar", "Chapters"],
    "widths": [0.20, 0.26, 0.32, 0.22],
    "rows": [
        ["<b>The Bricks</b>", "Low, dense, endless fire escapes",
         "Tight anchor chains. Learn the grammar here.", "1, 2, 9"],
        ["<b>The Canal</b>", "Deep concrete channels, sheer walls",
         "Wallrun-heavy. Punishing to be caught in \u2014 Cornered risk is highest.",
         "3, 5"],
        ["<b>Under the Interstate</b>", "Massive columns, huge vertical gaps",
         "Sailing country. Longest chains in the game.", "4, 5, 8"],
        ["<b>The Pawn Lot</b>", "Flat, open, exposed",
         "Anti-traversal by design. Almost no anchors. You must walk.", "3, 7"],
        ["<b>Up the Road</b>", "Gentle rise, thinning density",
         "Anchors get sparse the closer you get to the church. Momentum naturally "
         "bleeds off.", "1, 2, 6, 9"],
    ],
}))

B(("call", ("LEVEL DESIGN CARRIES THE THEME",
   "The road to Misfit Ministries is deliberately the hardest place in the game to keep "
   "Momentum. Anchor density drops as you approach. The closer Alley gets to the church, "
   "the more he has to slow down and walk \u2014 and the player feels that in their hands "
   "long before anyone says a word about it.")))

B(("h2", "Misfit Ministries"))
B(("p",
   "A storefront church in a failed strip unit. Folding chairs, a donated PA, a "
   "hand-painted sign. It is the only location in the game with <b>no hostiles, no "
   "objective markers and no fail state</b>, and the only place Alley can reach the "
   "<b>Known</b> Read. It is also, mechanically, a dead zone: Momentum cannot be built "
   "inside it. There is nowhere to run and nothing chasing you. That is the entire point."))

B(("img", ("plate_church.png",
           "MISFIT MINISTRIES \u2014 Up the Road. Folding chairs, a donated PA, a "
           "hand-painted sign. No hostiles, no objective markers, no fail state, and no "
           "Momentum. The only place in the game with nothing chasing you.", 1.0)))

B(("pb", None))


# ----------------------------------------------------------------------------
# H — CAST
# ----------------------------------------------------------------------------
B(("h1", "H \u2014 Cast"))

B(("h2", "Alley \u2014 player character"))
B(("p",
   "A street cat who got the collar young: big-eyed, fighting alone, and calculating that "
   "if he was number one with the boss then nobody would ever come for him. That was the "
   "trade, and nobody has ever said it out loud. He is fast, funny, watchful, and entirely "
   "certain that he is nobody's victim \u2014 a certainty the game spends nine chapters "
   "gently dismantling. Narration is first-person, present tense, and drifts colder with "
   "cumulative violence."))

B(("h2", "Whiskers \u2014 the missing"))
B(("p",
   "A rat. Alley's best friend since before the collar, and the only character who "
   "remembers him as a small animal rather than a title. Out of a long sentence "
   "suspiciously early. He is not a damsel and he is not dead \u2014 he is somewhere, on "
   "purpose, and the reason is the plot. His scenes are the game's warmth and its "
   "conscience, and he is the sole reliable read on what Alley is becoming."))

B(("h2", "The Iron Scribe \u2014 the only human"))
B(("p",
   "An old convict who found his way out. Respected and a little feared \u2014 the fear is "
   "residue from who he was, and he neither leans on it nor pretends it isn't there. "
   "Preaches in a hoodie and a flag mask. Calls the ministry a rebellion, because the "
   "darkness is already here and it is after our babies."))
B(("p",
   "His testimony is told straight, never as a set piece: he was pulled out of the fire "
   "while he was still burning. He begged to know how to repay it. He was told there were "
   "still people down there."))
B(("quote", ("Are you coming?", "\u2014 the end of every sermon")))
B(("p",
   "Every sermon ends pointed at the camera the same way. See section J for the "
   "fourth-wall specification, which is the single most carefully-constrained element in "
   "this document."))

B(("h2", "The Big Dog \u2014 the Cane Corso"))
B(("p",
   "Never introduced with a threat, never raises his voice, never appears in more than four "
   "scenes before chapter 7. He is warm to Alley, consistently and genuinely, which is "
   "precisely the horror of him: the premise states he is the only thing in the world that "
   "can give Alley an order, and he is not good, which means being his favourite is not "
   "good either. He has been filling the collar since Alley was a kitten and he has one "
   "setting left."))

B(("h2", "Nine / Nura \u2014 the black cat"))
B(("p",
   "Three appearances. One question, asked three times. One name, given once. Not statted, "
   "not fought, not explained. See section F."))

B(("h2", "Supporting"))
B(("kv", [
    ("Marlo", "Pit bull. Big Dog's second. Believes he is Alley's friend, and is, in the "
              "only way available to him."),
    ("The Ferret Brothers", "Pawn Lot. Sell information by weight, not accuracy."),
    ("Sister Ovid", "An old barn owl at Misfit Ministries. Runs the folding chairs. "
                    "Has no interest whatsoever in Alley's reputation."),
    ("Dice", "A young cat, maybe eleven, wearing a collar with one diamond in it. "
             "Introduced Ch.4. He is what Alley was, and the game never says so."),
]))

B(("pb", None))


# ----------------------------------------------------------------------------
# I — CHAPTERS
# ----------------------------------------------------------------------------
B(("h1", "I \u2014 Chapter Breakdown"))

B(("p",
   "Nine chapters. Eight of them are lives wasted. The ninth is the one that isn't. "
   "Target 12\u201320 hours; chapter length is deliberately uneven, with chapters 2 and 6 "
   "running short and quiet by design."))

_CH = [
    ("1", "Nobody Touches You", "The Bricks \u2192 Up the Road", "~2.0 hr",
     "Establishes the collar, the city's Read, and the full traversal grammar. Whiskers is "
     "gone. The street runs three theories: it's a hit for the Big Dog; he's protecting his "
     "partner; or he's trying to get Whiskers up the road to the new church. "
     "<b>First Cornered encounter is scripted and unavoidable</b> \u2014 the player must "
     "learn what fighting feels like before they can be trusted to avoid it. Ends at "
     "Misfit Ministries, where Alley sees Whiskers alive through a window and leaves "
     "without going in. <b>Nine's first question.</b>"),

    ("2", "Asking For Myself", "Up the Road", "~1.0 hr",
     "The return. Alley walks in with a cover story \u2014 he's asking about a place for "
     "himself \u2014 and is really checking that Whiskers is still there and sizing up "
     "whether the Scribe is legitimate or just a different flavour of hustle. Almost no "
     "traversal. No combat is possible. The chapter is a conversation, and it is where the "
     "Name system opens: the corner crew outside offers <i>Player</i> on the way in. "
     "First full sermon. First <i>Are you coming?</i>"),

    ("3", "The Long Sentence", "The Canal \u2192 The Pawn Lot", "~2.5 hr",
     "Why did Whiskers get out early? Three-thread investigation with the Ferret Brothers "
     "as an unreliable hub. The Pawn Lot is the game's first anti-traversal space \u2014 "
     "flat, open, no anchors \u2014 and Cornered risk spikes hard. Teaches the "
     "power/information inversion: whichever Read the player has cultivated, they get a "
     "measurably different and mostly worse answer. <i>Baller</i> is offered."),

    ("4", "Favorite", "Under the Interstate", "~2.0 hr",
     "Alley is called in. The collar is serviced \u2014 second staging of the ownership "
     "ritual. What being the favourite actually costs, delivered entirely through warmth "
     "rather than threat. Introduces Dice, eleven years old, one diamond. Alley is invited "
     "to name himself, and the self-applied Name <i>Nobody</i> becomes available: the "
     "strongest buff yet offered and the first one that cannot be removed."),

    ("5", "Nine Blocks", "The Canal \u2192 Under the Interstate", "~2.5 hr",
     "The job. The game's largest chase sequence and its structural midpoint. Whatever the "
     "player does here, the city's Read on Alley changes permanently and the crowd offers "
     "<i>Legend</i>. <b>Nine's second question</b> \u2014 the montage of every face he has "
     "been cornered with, in silence."),

    ("6", "Are You Coming", "Up the Road \u2192 flashback", "~1.5 hr",
     "The Scribe's testimony, told fully and told straight. A playable flashback at human "
     "scale and human speed: no parkour, no Momentum, no verbs but walking and looking. The "
     "hardest tonal chapter in the game and the reason the traversal grammar had to be so "
     "good \u2014 taking it away has to hurt. Unlocks the <b>Known</b> Read. Whiskers "
     "finally explains himself."),

    ("7", "The Ninth Setting", "The Pawn Lot \u2192 Under the Interstate", "~2.0 hr",
     "What the empty socket is for. The Big Dog explains it himself, kindly, and offers "
     "<i>Big Dog</i> as an inherited Name \u2014 the darkest branch in the game and "
     "genuinely, tangibly the most powerful. Third and final collar servicing. The chapter "
     "is structured so that accepting is the obvious tactical play and the player knows "
     "exactly what it costs."),

    ("8", "Curse On Your Own Head", "Under the Interstate", "~1.5 hr",
     "Alley at his lowest, wearing whatever he has chosen to wear, discovering what it "
     "actually costs to take a Name off \u2014 and that self-applied ones don't come off at "
     "all by any means he's been given. <b>Nine's third question</b>, the collar montage, "
     "and the <b>Nura</b> reveal. The thesis lands here, not in the finale."),

    ("9", "One Soul Saved", "The Bricks \u2192 Up the Road", "~1.5 hr",
     "The confrontation. See section I.2 \u2014 the ending is specified separately because "
     "it is the one place where the entire design either pays off or collapses."),
]

B(("table", {
    "cols": ["Ch", "Title", "District", "Est.", "Content"],
    "widths": [0.04, 0.16, 0.16, 0.07, 0.57],
    "rows": [[a, "<b>" + b + "</b>", c, d, e] for (a, b, c, d, e) in _CH],
}))

B(("pb", None))

B(("h2", "I.2 \u2014 The Ending"))

B(("p",
   "Nine chapters of design converge on a single input, and the whole architecture is built "
   "to make that input mean something."))

B(("p",
   "The finale is engineered as the most complete <b>Cornered</b> state in the game. Every "
   "entry condition is satisfied and satisfied maximally: Momentum is zero, there is not a "
   "single valid anchor in the volume, every Squeeze exit is blocked, and the Cane Corso is "
   "inside the closing radius. The camera drops. The score leaves. The traversal button "
   "remaps. The game has spent twelve to twenty hours teaching the player to read this "
   "exact moment, and it means: <i>you ran out of better ideas.</i>"))

B(("p", "<b>Three inputs are live.</b>"))

B(("table", {
    "cols": ["Input", "What happens", "What it costs"],
    "widths": [0.16, 0.46, 0.38],
    "rows": [
        ["<b>Fight</b>",
         "It works. It is the only Cornered encounter in the game that is unambiguously "
         "winnable, and it is the most satisfying combat the game has. Alley takes the "
         "collar off the body.",
         "He puts it on. The ninth setting gets filled from the inside. The city's Read "
         "resolves to <b>Untouchable</b>, permanently, and nobody ever tells him the truth "
         "again."],
        ["<b>Run</b>",
         "It works too \u2014 the one anchor the player never noticed is behind them, and "
         "the game will let them take it.",
         "Whiskers is still in the room. This is the ending most players get on their "
         "first attempt, and it is not framed as a failure. It is framed as the eighth "
         "life."],
        ["<b>Stay</b>",
         "No prompt. No button glyph. No tutorial has ever taught it. The player must "
         "simply not press anything, and keep not pressing anything, for longer than feels "
         "survivable.",
         "Everything Alley has. The collar comes off from the outside, by someone else's "
         "hands, and the ninth setting is never filled."],
    ],
}))

B(("call", ("WHY \u2018STAY\u2019 IS UNPROMPTED",
   "Every other verb in the game has been taught. Staying has not, because Alley has never "
   "done it \u2014 he got the collar at all because he was a kitten who calculated that "
   "movement and favour were the only two forms of safety. The one thing the character has "
   "never tried is the one thing the player has never been shown. Holding still while a "
   "Cane Corso closes is the hardest input in the game precisely because nothing in the "
   "game has prepared you for it, and that is the correct difficulty curve for this story.")))

B(("p",
   "The Scribe's sermon ends every chapter pointed at the camera. Eight times the game holds "
   "and accepts no input. On the ninth, it accepts one."))

B(("pb", None))


# ----------------------------------------------------------------------------
# J — CONTENT CONSTRAINTS
# ----------------------------------------------------------------------------
B(("h1", "J \u2014 Content Constraints (Hard)"))

B(("p",
   "These are treated as constraint violations that invalidate a build, not as objectives "
   "to be balanced against schedule. A candidate that ships in violation of any of these is "
   "not on the frontier."))

B(("h2", "J.1 \u2014 Register: Gritty, Clean"))
B(("bul", [
    "<b>Zero profanity in shipped text or VO.</b> No bleeps, no substitution comedy, no "
    "\u2018clean version\u2019 toggle. The dialogue is written to be hard without being "
    "coarse, which is a craft problem and is solvable.",
    "Violence is <b>consequential and non-graphic</b>: impact, breath, aftermath, "
    "permanent scarring. No blood system. No dismemberment. No killing blows on-screen.",
    "No sexual content. No substance depiction beyond implication. No gambling mechanics of "
    "any kind, which also removes an entire class of monetisation risk.",
    "<b>Target: ESRB Teen / PEGI 12.</b> The document is written so that a prison-ministry "
    "reading group and a church youth group can both run the game without a chaperone "
    "editing it.",
]))

B(("h2", "J.2 \u2014 The Ministry Is Not a Quest Giver"))
B(("bul", [
    "Misfit Ministries never dispenses an objective marker. Nothing that happens there "
    "advances a checklist.",
    "The Scribe never asks Alley to believe anything. He tells what happened to him and he "
    "asks one question.",
    "There is no faith stat, no conversion meter, no piety currency, and no achievement "
    "that rewards attending a sermon.",
    "The <b>Known</b> Read is unlocked by chapter progression and by the player's own "
    "restraint \u2014 never by an act of professed belief.",
]))

B(("warn", ("WHY THIS IS A HARD CONSTRAINT",
   "A game that mechanically rewards the player for going to church has converted a "
   "sincere thing into a farming loop, and players correctly resent it. The ministry earns "
   "its place in the game by being the only location with no hostiles, no markers, no fail "
   "state and no Momentum \u2014 which is a mechanical statement about rest, not about "
   "doctrine. The one moment of direct address is Section J.3, and it is rationed.")))

B(("h2", "J.3 \u2014 The Fourth Wall"))
B(("p",
   "The Scribe looks into the game camera at the end of each sermon and asks <i>Are you "
   "coming?</i> This is the only fourth-wall break in the game and it is governed by three "
   "rules that are not negotiable:"))
B(("num", [
    "<b>The game never accepts an input.</b> Eight times, it holds on his face for four "
    "full seconds and cuts. No prompt appears. The player cannot answer.",
    "<b>It is never mocked and never winked at.</b> No character comments on it. No "
    "achievement fires. It is not a joke and it is not a meme.",
    "<b>On the ninth occurrence, the game accepts one input</b> \u2014 and whatever the "
    "player does, including nothing, the game does not grade it, does not display a result, "
    "and does not save a flag that any other system reads.",
]))

B(("h2", "J.4 \u2014 Duty of Care on the Testimony"))
B(("p",
   "The Iron Scribe is drawn from real-world testimony. Formerly-incarcerated collaborators "
   "must be paid consultants on the script, not sensitivity-read volunteers, and the "
   "testimony's originator must hold approval on his depiction and likeness in writing "
   "before vertical slice. The character can be feared and can be flawed; he cannot be "
   "made ridiculous and he cannot be made a saint, because both are lies and the second one "
   "is worse."))

B(("h2", "J.5 \u2014 Technical Safety Surface"))
B(("p",
   "The minimal-surface principle applies to security as much as to systems. The game is "
   "single-player and offline-capable by default."))
B(("table", {
    "cols": ["Surface", "Decision", "Rationale"],
    "widths": [0.24, 0.20, 0.56],
    "rows": [
        ["User-generated content", "<b>CUT</b>",
         "Any UGC channel in a game about a real ministry is a moderation liability with no "
         "design upside. Removes an entire attack class."],
        ["Online leaderboards", "<b>CUT</b>",
         "Would reward speedrunning the traversal, which directly incentivises skipping the "
         "conversations the game is made of."],
        ["Telemetry", "Opt-in, aggregate",
         "The Nine montages are assembled from a <b>local-only</b> event log. It never "
         "leaves the device."],
        ["Save data", "Signed, versioned",
         "Append-only local event log + periodic snapshot. Integrity check on load; corrupt "
         "saves roll back to last valid snapshot rather than failing hard."],
        ["Monetisation", "Premium, one purchase",
         "No microtransactions. Selling power in a game whose thesis is that accepting "
         "power costs you something would be self-refuting."],
    ],
}))

B(("pb", None))


# ----------------------------------------------------------------------------
# K — TECH
# ----------------------------------------------------------------------------
B(("h1", "K \u2014 Technical Scope & Complexity Bounds"))

B(("kv", [
    ("Engine", "Unreal Engine 5. Chosen for animation tooling and traversal-locomotion "
               "maturity, not for Nanite/Lumen \u2014 the art direction is stylised and "
               "does not need either."),
    ("Platforms", "PS5, Xbox Series X|S, PC. Switch 2 as a stretch \u2014 the stylised "
                  "target makes it plausible; it is not a launch commitment."),
    ("Frame target", "60 fps locked at 1440p internal on current-gen consoles. "
                     "Non-negotiable: a momentum platformer at 30 fps is a different, "
                     "worse game."),
    ("Team", "~55\u201370 core over 30 months, plus outsourcing for environment art."),
    ("Budget class", "Mid-size AA. Comparable scope: <i>A Plague Tale</i>, "
                     "<i>Hi-Fi Rush</i>, <i>Sifu</i>."),
    ("Runtime", "12\u201320 hours, single playthrough. High replay pressure from the Name "
                "system and the three endings; no New Game+ grind loop."),
]))

B(("h2", "Complexity Bounds \u2014 Core Systems"))
B(("p",
   "Stated before implementation. Unnecessary complexity is scored as a defect of equal "
   "severity to a bug, so each of these is specified at the lowest complexity class that "
   "satisfies correctness."))

B(("table", {
    "cols": ["System", "Approach", "Time", "Space", "Budget"],
    "widths": [0.24, 0.34, 0.14, 0.13, 0.15],
    "rows": [
        ["Anchor query\n<i>(traversal solver)</i>",
         "Uniform spatial hash over pre-baked anchors; query k-nearest in a forward cone.",
         "O(k) amortised\nper query", "O(A)",
         "\u2264 64 candidates/frame; 0.4 ms"],
        ["Momentum state",
         "Finite state machine, 4 tiers, hysteresis on transitions to prevent flicker.",
         "O(1)", "O(1)", "negligible"],
        ["Cornered check",
         "Evaluated only on entry to Cold tier, not per-frame. Reuses the anchor query "
         "result already computed.",
         "O(k)", "O(1)", "amortised free"],
        ["Name system",
         "Bitmask over \u2264 32 labels + a small modifier table. No inheritance, no "
         "stacking rules engine.",
         "O(1)", "O(1)", "negligible"],
        ["Collar Read\n<i>(recognition)</i>",
         "District-level aggregate written on state change; per-NPC posture resolved "
         "lazily on first awareness. <b>Not</b> an N\u00b2 gossip sim.",
         "O(1) write\nO(n\u1d65) read", "O(D + N)",
         "n\u1d65 = NPCs in view, \u2264 40"],
        ["Nine montage",
         "Local append-only event log, replayed as camera cuts. Bounded ring buffer.",
         "O(E)", "O(E), E \u2264 4096",
         "assembled on load"],
        ["Save",
         "Append-only event log + snapshot every chapter boundary.",
         "O(1) write", "O(E)", "< 2 MB"],
    ],
}))

B(("call", ("THE ONE PLACE WE REFUSED THE CLEVER SOLUTION",
   "An early candidate modelled the collar's Read as a genuine gossip propagation network "
   "\u2014 NPCs telling other NPCs, information diffusing through the city over time. It is "
   "a beautiful system. It is O(N\u00b2) per tick, it is untestable, it produces "
   "non-reproducible bug reports, and no player would ever be able to distinguish it from "
   "the district-aggregate model that costs a thousandth as much. Rejected on minimality "
   "grounds. This is what \u2018unnecessary complexity is a defect\u2019 means in practice.")))

B(("pb", None))


# ----------------------------------------------------------------------------
# L — ADVERSARIAL PASS
# ----------------------------------------------------------------------------
B(("h1", "L \u2014 Adversarial Pass: Failure Modes and Survival"))

B(("p",
   "Each design claim below was attacked before being retained. Listed are the failure "
   "modes the design was mutated against, and the specific mechanism by which the shipped "
   "design survives each. Two consecutive passes produced no new class of defect, which is "
   "the convergence criterion used."))

_ADV = [
    ("Players will farm combat anyway.",
     "Some players attack everything on principle, regardless of framing.",
     "Cornered cannot be entered volitionally \u2014 there is no attack input from a "
     "neutral state. A player who wants to fight must first deliberately strand themselves "
     "with no Momentum and no anchors, which is slow, obvious, and self-evidently a choice. "
     "The game lets them, and scars them for it. <b>Survives.</b>"),

    ("\u2018Combat is a last resort\u2019 becomes \u2018combat is badly made.\u2019",
     "Deliberately unsatisfying combat reads to reviewers as incompetence, not intent.",
     "Cornered combat is <i>tight, responsive and winnable</i> \u2014 it is high-quality "
     "and it is unpleasant, which are different axes. The ugliness is delivered through "
     "camera, score-removal, colour and permanence, never through input latency or unfair "
     "hit detection. The finale proves the combat is good by making one fight genuinely "
     "great. <b>Survives.</b>"),

    ("The Name system is just a morality meter with extra steps.",
     "Players pattern-match to good/evil sliders and optimise for the \u2018good\u2019 end.",
     "Names have no valence. <i>Legend</i> is not evil; it is a traversal buff with an "
     "aggro cost. There is no numeric readout, no ending gated on a threshold, and refusal "
     "grants nothing at all. There is nothing to optimise toward, only tradeoffs to "
     "choose. <b>Survives.</b>"),

    ("Refusing every Name is strictly optimal, so the system is fake.",
     "If restraint always wins, the temptation is theatre.",
     "It is not optimal. A no-Name playthrough is measurably harder: worse traversal, worse "
     "prices, more fights survived by the skin of the teeth. The player pays for restraint "
     "in real difficulty and receives only optionality. <b>Survives.</b>"),

    ("The player never finds the \u2018Stay\u2019 ending.",
     "An unprompted no-input solution is undiscoverable, so the true ending goes unseen.",
     "This is accepted, not solved. <b>Run</b> is the designed first-playthrough ending and "
     "is authored as a complete, non-punitive, emotionally coherent conclusion \u2014 the "
     "eighth life. <b>Stay</b> is the ninth, and the game's title tells the player there is "
     "one more. Eight sermons of unanswerable direct address prime the input. "
     "<b>Survives \u2014 with a stated risk; see M.1.</b>"),

    ("The religious content alienates a secular audience.",
     "The ministry reads as proselytising and the game loses most of its market.",
     "The Scribe asks one question and never asks the player to believe anything. There is "
     "no faith mechanic, no reward for attendance, no doctrine in any codex. The ministry is "
     "characterised mechanically as <i>the only place with nothing chasing you</i>, which "
     "is legible to any player of any belief. <b>Survives.</b>"),

    ("The religious content is too soft for the audience that wants it.",
     "The inverse failure \u2014 the ministry audience finds it hollow and hedged.",
     "The testimony is delivered whole, uncut and unironised, in a dedicated chapter with "
     "no gameplay competing for attention. <i>Are you coming?</i> is the last line of the "
     "game. Nothing is hedged; it is simply never made compulsory. <b>Survives.</b>"),

    ("The investigation layer and the platformer layer are two different games.",
     "Traversal players skip dialogue; dialogue players resent traversal.",
     "<b>Read</b> \u2014 the investigation verb \u2014 consumes Momentum, the platformer "
     "resource. The systems share one currency, so neither can be ignored. Additionally the "
     "power/information inversion means combat-forward play degrades investigation quality "
     "measurably. <b>Survives.</b>"),

    ("Nine is a magical-guide clich\u00e9 who explains the theme.",
     "A mysterious figure who shows up to deliver the moral is the oldest bad habit in "
     "narrative design.",
     "Nine has one line of dialogue, repeated three times, and one name given once. She "
     "never explains, never advises, and never appears on a map. The montages are assembled "
     "from the <i>player's own</i> telemetry \u2014 the theme is delivered by the player's "
     "record, not by her mouth. <b>Survives.</b>"),

    ("Permanent scarring punishes struggling players.",
     "Low-skill players get cornered more, get scarred more, and are punished for lacking "
     "execution.",
     "<b>Genuine defect found. Design changed.</b> Scarring is now driven by Cornered "
     "encounters <i>entered</i>, not by damage taken or fights lost \u2014 it tracks the "
     "route decision, not the execution. Accessibility options that lower hostile pressure "
     "reduce the frequency of the state without touching its narrative weight. "
     "<b>Survives after revision.</b>"),

    ("The Pawn Lot's anti-traversal design is just an unfun level.",
     "Removing the core verb produces frustration rather than tension.",
     "<b>Partially conceded.</b> Anti-traversal spaces are capped at roughly eight minutes "
     "of contiguous play and are always bounded by high-anchor-density approach and exit. "
     "Chapter 6's flashback \u2014 the total removal of traversal \u2014 is the deliberate "
     "extreme and is placed after the player has 8+ hours of grammar to lose. "
     "<b>Survives with a scope cap.</b>"),

    ("An animal-crime-drama with a Christian ministry is tonally incoherent.",
     "Talking-cat fable plus prison testimony plus a redemption arc reads as three pitches "
     "stapled together.",
     "The animal frame is load-bearing, not decorative: the entire theme is about what "
     "you are <i>called</i> \u2014 cat, dog, rat, player, baller, legend \u2014 and a world "
     "where species is literally a label makes that inescapable. <i>Zootopia</i> and "
     "<i>BoJack</i> both established that an animal cast can carry adult weight. "
     "<b>Survives.</b>"),
]

B(("table", {
    "cols": ["Attack", "Failure mode", "How the design survives"],
    "widths": [0.22, 0.28, 0.50],
    "rows": [["<b>" + a + "</b>", b, c] for (a, b, c) in _ADV],
}))

B(("pb", None))


# ----------------------------------------------------------------------------
# M — UNRESOLVED
# ----------------------------------------------------------------------------
B(("h1", "M \u2014 Unresolved Tradeoffs"))

B(("p",
   "Cases where no candidate strictly dominated. Stated plainly, with the criterion used to "
   "break the tie, so a reviewer can disagree with the criterion rather than having to "
   "reverse-engineer the reasoning."))

B(("h2", "M.1 \u2014 Discoverability of the \u2018Stay\u2019 ending"))
B(("kv", [
    ("Tension", "Signposting the input makes it findable and destroys its meaning. Not "
                "signposting it means most players never see the ending the game is named "
                "after."),
    ("Rejected", "A button prompt; a hint after N failed attempts; an accessibility toggle "
                 "that reveals it. All three convert a moral act into a puzzle solution."),
    ("Decision", "Ship it unprompted. <b>Run</b> is authored as a complete and dignified "
                 "ending so that the common outcome is not a bad one."),
    ("Criterion", "The player who runs has still had the intended experience. Preserve the "
                  "meaning of the rare ending over maximising the number of players who "
                  "reach it."),
    ("Open risk", "<b>Unresolved.</b> Requires playtest data at vertical slice. If fewer "
                  "than ~15% of players reach Stay across two playthroughs, revisit. The "
                  "most likely mitigation is lengthening the hold window, not adding a "
                  "prompt."),
]))

B(("h2", "M.2 \u2014 Nine chapters against a 12\u201320 hour target"))
B(("kv", [
    ("Tension", "Nine chapters is thematically mandatory. It also implies uneven pacing: "
                "chapters 2 and 6 are short and quiet, which is a documented cause of "
                "mid-game drop-off."),
    ("Rejected", "Merging 2 into 1, or padding 6 with traversal. Both destroy the specific "
                 "thing those chapters are for."),
    ("Decision", "Keep nine. Accept the pacing dip and stage it deliberately \u2014 the "
                 "quiet chapters are placed immediately after the two largest action "
                 "chapters (1 and 5) so they read as exhalation rather than as a stall."),
    ("Criterion", "Structural fidelity to the premise outranks retention-curve smoothing."),
]))

B(("h2", "M.3 \u2014 First-person narration against a third-person camera"))
B(("kv", [
    ("Tension", "The spec calls for Alley, first person. A 3D action-platformer requires a "
                "third-person camera for traversal legibility. These are in direct "
                "conflict."),
    ("Rejected", "A literal first-person camera. Cat-scale parkour in first person is "
                 "nauseating and illegible, and it would hide the scarring and the collar "
                 "\u2014 two systems that must be visible on the model."),
    ("Decision", "Third-person camera, first-person voice. Alley narrates his own story "
                 "throughout in present tense, and the reader-facing intimacy of first "
                 "person is delivered through VO rather than through lens position."),
    ("Criterion", "Preserve the <i>function</i> of first person (subjectivity, unreliable "
                  "self-assessment, voice) rather than its literal implementation."),
]))

B(("h2", "M.4 \u2014 Naming the city"))
B(("kv", [
    ("Tension", "Regional specificity buys enormous authenticity. Naming a real city "
                "attaches a real place's real reputation to a fictional criminal "
                "organisation."),
    ("Decision", "Gulf-South texture, invented geography, no name. The interstate, the "
                 "canals, the humidity and the cypress do the work."),
    ("Criterion", "Authenticity without liability, and without asking a real community to "
                  "host the story's villain."),
]))

B(("pb", None))


# ----------------------------------------------------------------------------
# N — ASSUMPTIONS
# ----------------------------------------------------------------------------
B(("h1", "N \u2014 Assumptions Surfaced"))

B(("p",
   "The spec was underdetermined in the following places. Each was resolved by an explicit "
   "assumption rather than a silent one. Every item below is cheap to reverse if the "
   "assumption is wrong \u2014 flag any of them and the affected sections can be rebuilt "
   "without disturbing the rest of the architecture."))

B(("table", {
    "cols": ["#", "Underdetermined", "Assumption taken", "Reversal cost"],
    "widths": [0.05, 0.24, 0.53, 0.18],
    "rows": [
        ["1", "\u2018First person\u2019 for a 3D platformer",
         "Interpreted as first-person <i>narration</i> with a third-person camera. See M.3.",
         "Low \u2014 VO direction only"],
        ["2", "Chapter count",
         "Nine, mapping to the title. The premise specified chapters 1 and 2 explicitly; "
         "the remaining seven are extrapolated.",
         "Medium"],
        ["3", "Setting",
         "Unnamed Gulf-South US city. Inferred from tone; not stated in the premise.",
         "Low \u2014 art pass"],
        ["4", "Whiskers' fate",
         "Alive and at the church throughout, by his own choice. The premise implies the "
         "third theory is true; this makes it true and makes the reason the plot.",
         "High \u2014 structural"],
        ["5", "The ninth setting",
         "Interpreted as the Big Dog's claim on the last thing Alley has. The premise "
         "states the empty setting exists but not what it is for.",
         "High \u2014 structural"],
        ["6", "Nura",
         "Treated as the black cat's true name, in contrast to the street's label "
         "\u2018Nine\u2019. This is the thematic keystone and is an interpretation.",
         "Medium"],
        ["7", "The Big Dog's disposition",
         "Written as warm rather than menacing, because the premise says Alley is his "
         "favourite and that this is not a good thing.",
         "Low \u2014 script"],
        ["8", "\u2018Gritty but clean\u2019",
         "Read as a hard content constraint (Section J.1), not a stylistic preference. Zero "
         "profanity, non-graphic violence, Teen rating.",
         "Low"],
        ["9", "Audience",
         "Teen-and-up players, with explicit viability for prison-ministry and youth-group "
         "settings, inferred from the register selection.",
         "Low"],
        ["10", "Dice",
         "Invented. Not in the premise. Added because the theme needs a visible instance of "
         "the trade Alley made as a kitten, shown rather than narrated.",
         "Low \u2014 cuttable"],
    ],
}))

B(("pb", None))


# ----------------------------------------------------------------------------
# O — VERIFICATION
# ----------------------------------------------------------------------------
B(("h1", "O \u2014 Verification Plan"))

B(("p",
   "Design claims are hypotheses. Each core claim below is paired with a falsifiable test "
   "and an explicit kill condition. A claim that fails its test is not defended \u2014 the "
   "system is changed."))

B(("h2", "Unit level \u2014 does the system behave at its boundaries?"))
B(("table", {
    "cols": ["System", "Boundary case", "Required behaviour"],
    "widths": [0.20, 0.34, 0.46],
    "rows": [
        ["Anchor query", "Zero anchors in the forward cone",
         "Returns empty; Momentum decays to Cold; Cornered check arms. Must not stall or "
         "fall back to a distant anchor."],
        ["Anchor query", "Anchor occluded mid-leap by a dynamic object",
         "Leap resolves to Cling on the occluder, or to a controlled Drop. Never a "
         "T-pose, never a fall through geometry."],
        ["Momentum FSM", "Oscillation at a tier boundary",
         "Hysteresis band prevents flicker; audio layers must never stutter."],
        ["Cornered", "Two hostiles enter from opposite ends of a corridor simultaneously",
         "Single Cornered instance, deterministic hostile ordering, no double-entry."],
        ["Cornered", "Player triggers Cornered inside Misfit Ministries",
         "<b>Must be impossible.</b> The volume is flagged no-hostile; assert in editor at "
         "cook time, not at runtime."],
        ["Name system", "All 32 Names taken (not reachable in a normal run)",
         "Modifiers clamp; no overflow; no contradictory dialogue routing."],
        ["Name system", "Zero Names taken through Ch.9",
         "Fully supported path. All three endings must remain reachable."],
        ["Collar Read", "Player enters a district with no prior state",
         "Defaults to <b>Unreadable</b>, not to null. Never a missing-posture fallback."],
        ["Nine montage", "Second encounter with zero Cornered encounters recorded",
         "Plays as held black, identical in duration to a populated montage. The absence "
         "is the content \u2014 must not be skipped or shortened."],
        ["Save", "Corrupt or truncated event log",
         "Integrity check fails \u2192 roll back to last chapter snapshot with a clear "
         "notice. Never a silent partial load."],
    ],
}))

B(("h2", "Integration level \u2014 do contracts hold under real callers?"))
B(("bul", [
    "Does <b>Read</b> (investigation) draining Momentum ever soft-lock a player mid-chase "
    "with no route out? <i>Test: force Read at every scripted chase beat. Required: an "
    "escape route exists at every point, or Read is suppressed for the duration.</i>",
    "Does the Collar Read starve a critical-path informant of dialogue at maximum "
    "<b>Dangerous</b>? <i>Test: play the full campaign at maximum violence. Required: every "
    "critical lead has at least one Dangerous-viable acquisition path. Non-critical leads "
    "may and should close.</i>",
    "Does a taken Name ever contradict a scripted line? <i>Test: automated pass over the "
    "dialogue graph asserting that every node has a valid variant for all reachable Name "
    "bitmasks.</i>",
    "Does the Ch.6 flashback's removal of traversal break input muscle memory on return? "
    "<i>Test: measure time-to-first-Hot-tier on re-entry to Ch.7. Kill condition: median "
    "> 45 seconds.</i>",
]))

B(("h2", "Systemic level \u2014 are invariants preserved?"))
B(("num", [
    "<b>Combat can never be the optimal route.</b> Instrument every encounter volume. If "
    "any volume shows fighting as faster <i>and</i> lower-risk than traversal for median "
    "players, the volume is redesigned. This is a build-blocking metric.",
    "<b>Restraint is never mechanically rewarded.</b> Audit that no refused Name grants a "
    "hidden buff and no low-violence flag unlocks content. Restraint yields optionality "
    "only.",
    "<b>The ministry never gates progression.</b> Assert that no critical-path objective "
    "resolves inside the Misfit Ministries volume outside of the authored story chapters "
    "2 and 6.",
    "<b>Ordering invariant.</b> Nine's three encounters must fire in order and exactly "
    "once. Assert on chapter transition; a skipped or repeated encounter is a release "
    "blocker.",
    "<b>Idempotency.</b> Reloading a checkpoint must not re-award a Name, re-etch the "
    "collar, or duplicate an event-log entry. Test by reloading every checkpoint in the "
    "game twice and diffing the log.",
    "<b>Ratings invariant.</b> Automated profanity scan across all shipped text and VO "
    "transcripts on every build. Non-zero result fails the build.",
]))

B(("h2", "Playtest gates"))
B(("table", {
    "cols": ["Gate", "Question", "Kill condition"],
    "widths": [0.16, 0.50, 0.34],
    "rows": [
        ["Slice", "Do players understand Cornered is a failure without being told?",
         "< 70% articulate it unprompted after 90 min."],
        ["Alpha", "Do players feel the cost of a self-applied Name?",
         "Players describe Names as \u2018upgrades\u2019 with no cost recalled."],
        ["Alpha", "Does the power/information inversion land?",
         "Players do not notice that fear costs them answers."],
        ["Beta", "Is Ch.6 experienced as weight or as a chore?",
         "Drop-off in Ch.6 exceeds drop-off in any other chapter."],
        ["Beta", "Does <b>Run</b> feel like a real ending, not a failure?",
         "Players who Run report feeling punished."],
        ["Beta", "Is the fourth-wall address respected or mocked?",
         "Majority report it as awkward rather than arresting."],
    ],
}))

B(("pb", None))


# ----------------------------------------------------------------------------
# P — ROADMAP
# ----------------------------------------------------------------------------
B(("h1", "P \u2014 Production Roadmap"))

B(("table", {
    "cols": ["Phase", "Dur.", "Goal", "Exit criterion"],
    "widths": [0.18, 0.10, 0.38, 0.34],
    "rows": [
        ["<b>Concept</b>", "3 mo",
         "This document. Script bible for Ch.1\u20132. Testimony rights secured in writing.",
         "Signed likeness approval from the testimony's originator. No exceptions."],
        ["<b>Prototype</b>", "4 mo",
         "Momentum grammar only. One grey-box block of The Bricks. No story, no combat.",
         "Traversal is fun for 20 minutes with zero narrative and zero enemies."],
        ["<b>Vertical slice</b>", "6 mo",
         "Chapter 1 complete and shippable: traversal, first Cornered, the Read, Nine's "
         "first question, final art on one district.",
         "Slice playtest: \u2265 70% articulate that fighting was a failure, unprompted."],
        ["<b>Production A</b>", "9 mo",
         "Chapters 1\u20135. Full Name system. All districts grey-boxed.",
         "Playable to midpoint end-to-end at 60 fps."],
        ["<b>Production B</b>", "6 mo",
         "Chapters 6\u20139. Three endings. Full VO in three hardness registers.",
         "Content complete. Automated profanity scan clean."],
        ["<b>Polish</b>", "5 mo",
         "Perf, accessibility, the Stay-window tuning pass, localisation.",
         "M.1 playtest resolved. All systemic invariants asserted in CI."],
    ],
}))
B(("p", "<b>Total: 33 months.</b> Buffer is carried in Polish, not in Production B."))

B(("h2", "Highest-Risk Items"))
B(("num", [
    "<b>Testimony rights (Concept phase).</b> A blocking dependency on a real person's "
    "consent. If it is not secured in writing before Prototype, the Scribe is rewritten as "
    "wholly fictional and this document's section H and J.4 are revised. Do not start "
    "Production on a handshake.",
    "<b>Momentum grammar (Prototype).</b> If traversal is not fun with no story attached, "
    "nothing downstream saves the project. This is the single hardest gate and it is "
    "deliberately placed early and cheap.",
    "<b>The Stay window (Polish).</b> See M.1. Unresolved by design until real data exists.",
    "<b>Tonal coherence (Vertical slice).</b> The animal fable / prison testimony fusion is "
    "the pitch's biggest question mark. The slice must be shown to both a general games "
    "audience and a ministry audience, and it must land with both.",
]))

B(("rule", None))

B(("closing_group", None))
