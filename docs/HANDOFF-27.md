# ANTISOCIAL — Handoff Document 27
**Base:** HANDOFF-26 (Mystery/Shooter/RPG engines ported, engine-only, no
routes/UI, no verification scripts, Chess not started).
**This session's focus:** Option (a) from HANDOFF-26's own recommended
order — verification scripts for the three new engines, so there's real
evidence before wiring UI to them.

---

## 1. What happened this session

Wrote and **ran** (not just hand-traced) the three verification scripts
HANDOFF-26 flagged as owed:

```
scripts/test-mystery-redaction.mjs — 18 assertions across 6 tests
scripts/test-shooter-engine.mjs    — 12 assertions across 6 tests
scripts/test-rpg-combat-engine.mjs — 17 assertions across 8 tests
```

All three pass. `npx tsc --noEmit` is clean across the whole project.
`scripts/test-war-engine.mjs` (existing, from HANDOFF-25) still passes —
no regressions.

**What each script actually exercises, briefly:**

- **Mystery** — deal integrity (no duplicate/leaked solution cards, balanced
  hands), player-count bounds (3–6), disprove correctly finds the first
  clockwise active player holding a match (and correctly finds no one when
  no one does), `resolveDisprove` rejects the wrong player/wrong card,
  accusations correctly win/eliminate, and — the part that actually matters
  most — `redactStateForViewer` never leaks another player's hand, the
  disprove candidate cards to a non-disprover, or the solution before game
  over.
- **Shooter** — fire cooldown and bullet cap hold under rapid input; **dt
  clamping actually prevents bullet tunneling** (verified by feeding a
  5000ms dt and confirming the bullet only ever moves the clamped 20px/tick,
  never skips through the player hitbox); i-frames absorb a second hit
  inside the invulnerability window and correctly expire; `gameOver` fires
  exactly at 0 lives and `tick()` becomes a true no-op after; level derives
  correctly from the score threshold.
- **RPG** — `baseDerivedStats` formulas checked against hand-computed
  expected values (not just "looks right"), crit/dodge caps hold, status
  modifiers apply uniformly and floor at 0, flee is blocked correctly by
  `unfleeable`, turn order is genuinely speed-sorted (faster combatant's
  log entry precedes the slower one), stun skips the turn with zero damage
  dealt, end-of-round poison tick can finish off a near-dead combatant and
  correctly flips status to `defeat`, victory triggers on last-enemy-death
  with the right `deadEnemyTemplateKeys`, and insufficient MP blocks a cast
  with zero MP deducted.

One bug caught by the process itself, worth noting: my first draft of the
Mystery disprove test had a fixture error (a "non-matching" player's hand
actually did match the suggested cards), which the script correctly failed
on. Fixed and re-run — this is exactly the kind of thing "reasoning by
hand" would have missed and running it caught immediately.

## 2. What's still NOT done (unchanged from HANDOFF-26, all still open)

- No API routes for Mystery, Shooter, or RPG.
- No React play UI for any of the three.
- Chess: not started. `chess.js` recommendation stands — no engine exists
  in the salvage, only a game-key registration line.

## 3. Still open (carried again, unchanged)
- blindfolded-face.jpg swap; duplicate images; NuraPresence accent (D's call)
- Ministries → Antisocial button (lives in Ministries repo)
- More trivia questions over time
- Known ticket: signed-out taps on some game areas need the explicit
  "Sign in to play" treatment War/Word Scramble/etc. already got

## 4. What to say to me next session

Paste this file. With engines now verified, the natural next move is (b)
from HANDOFF-26's list: **Shooter routes + UI** — it's the most
self-contained (single-player, no lobby/multiplayer state), so it's the
fastest path to something D can actually play. After that: (c) Mystery
routes + UI (multiplayer lobby, more surface area), (d) RPG routes + UI,
(e) Chess (chess.js wrapper). Or name the one you want directly.
