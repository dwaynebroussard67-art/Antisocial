# HANDOFF-40 — Alley Cat: Scope and Rating, Ruled

---

> Standing rule (HANDOFF-38 §0) applies. Problems arrive with fixes attached.

## 1. Ruling — scope: the two-hour first cut

**Ruled 2026-08-03 by D. This is the build target. It supersedes the GDD v1.0
scope as the plan of record; the GDD remains the north-star document for what
expansion looks like after the first game ships.**

- **Runtime:** ~2 hours.
- **Chapters:** 1, 2, and 9 — the collar established, the Scribe's question,
  and the ending that carries the whole thesis.
- **World:** two districts.
- **Kept (the non-negotiables):** 3D presentation, Momentum, Cornered, the
  Name system, and Stay.
- **Cut:** everything else. Everything cut is *expansion*, and expansion is
  what gets built after the first one is out.

**Why this ruling ended the argument:** the GDD scope (55–70 core team, 30
months, UE5, 12–20 hours ≈ 150 person-years) had no milestone where anything
partial counted as finished — 33 months with nothing playable to show anyone,
waiting on a budget that does not exist. The two-hour cut is the version that
can be finished by the team that actually exists.

**Design load-bearers already on record that the cut must honor:**

- Chapter 1's first kill is **cut-away only** (HANDOFF-38 §3): lead up, cut,
  the player fills in the rest. The player assigning the label without standing
  to assign it *is* the thesis. The base game can never show the body.
- The empty ninth setting belongs to Whiskers; freedom and damnation are the
  same act. Chapter 4 stands verbatim — the Big Dog sold Alley protection
  Alley had already earned three times over (HANDOFF-39 / session 2026-08-03).
- The Stay mechanic is taught by the eighth flashback: input dead in memory,
  live for the first time in the finale. Remembering vs. choosing.

## 2. Ruling — rating: ESRB Teen (13+)

**Ruled 2026-08-03 by D. Decided on purpose, ending the drift from the
original 9–15 audience.** Eight killings is a Teen game even with the cut-away —
softening further than the cut-away carries would have cut the spine out of
the story.

Consequences:

- This **supersedes the "PG/PG-13" line in HANDOFF-38 §3** and the 9–15
  audience assumption everywhere it appears (including the GDD).
- **Nothing in the database changes.** The content architecture already
  assumes exactly this: the base campaign is `street + open` and never gated,
  the cut-away is the only depiction, `block_hints` is adult-only (mature),
  and `the_eight` / `ninth_ask` sit at `crib + heavy` — staff-granted,
  adult-verified. The rating ruling and the age gate are now aligned by
  decision rather than by approximation.
- Store pages, pitch material, and platform copy must not describe the game
  as suitable for children under 13.

## 3. What this unblocks

- The Alley Cat production conversation is now scoped to something buildable:
  a scene-and-systems breakdown of chapters 1/2/9 across two districts, with
  Momentum, Cornered, Name, and Stay as the four mechanics to prototype in
  that order of risk.
- The Choice (see workspace `the-choice.html`) is the game that ships first —
  it is finished writing, the engine rules are implemented, and it needs only
  to be uploaded as `index.html` to the `the-choice` repo. It does not require
  the age gate (no accounts, no content above open).
- Alley Cat's gated content (`the_eight`, `ninth_ask`) remains blocked on the
  operator step: run `drizzle/0003_age_gate.sql` in Supabase, verify with the
  three-query check in HANDOFF-38 §4 (`unknown / f / t`), then merge PR #3.

## 4. Open follow-ups (unchanged, in priority order)

1. **Operator:** run the migration, verify, merge PR #3.
2. **Operator:** upload `the-choice.html` as `index.html` to the `the-choice`
   repo so the finished game is actually somewhere.
3. **Next artifact:** the two-hour cut production brief — scenes, districts,
   and which of the four mechanics gets prototyped first.
4. HANDOFF-38 §5 items (drop deprecated `adult_verified_at` after the gate is
   live; wire Nura's moderation path to consult `member_is_adult()`, which is
   the next moderation task).
