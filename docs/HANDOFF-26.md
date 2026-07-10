# ANTISOCIAL — Handoff Document 26
**Base:** HANDOFF-25 (build-verified, deployed live, auth working end-to-end).
**This session's focus, per D's pick:** Chess / Mystery / Shooter / RPG —
the last four Arcade sub-pieces.

---

## 1. What happened this session — and an honest scope call

This turned out to be a much bigger lift than one session covers cleanly.
Rather than half-build all four and risk not getting you a handoff at all,
I ported what the salvage actually had, deeply and correctly, and I'm
stopping here with tokens still in reserve so this document doesn't get
skipped a third time.

**Fully ported, engine-only (no routes/UI wired yet):**

```
src/lib/db/schema/mystery.ts     — mysteryLobbies, mysteryLobbyPlayers,
                                    mysteryPrivateReveals tables
src/lib/arcade/mystery/engine.ts — full Cluedo-style deduction engine:
                                    initializeGame, makeSuggestion,
                                    resolveDisprove, makeAccusation
src/lib/arcade/mystery/redact.ts — server->client state redaction (the
                                    ONLY thing allowed to build what a
                                    client receives — never send raw
                                    engine state)
src/lib/arcade/shooter/engine.ts — full ShooterEngine class: dt-clamped
                                    tick loop, i-frames, non-piercing
                                    bullets, level scaling
src/lib/rpg/stats.ts             — BaseStats, derived-stat formulas,
                                    status modifiers, xpToNextLevel
src/lib/rpg/combat-engine.ts     — full advanceRound(): speed-ordered
                                    turns, abilities, statuses (poison/
                                    stun/buff/debuff/regen), simple
                                    stated enemy AI, flee handling
```

**Not started — Chess.** Unlike the other three, there was no Chess engine
anywhere in the salvage — only a single line registering it as a game key
(`{ key: "chess", name: "Chess", kind: "head_to_head", ... }`). Hand-
rolling legal-move validation, check/checkmate, castling, en passant, and
promotion from scratch is a different, larger job than porting — my
recommendation for next session is `chess.js` (MIT-licensed, handles all
of that correctly) rather than reinventing it, with a thin engine.ts
wrapper around it matching this project's conventions. Flagging this now
rather than shipping something half-correct.

## 2. What's NOT done that you should know before deploying anything

- **No API routes for Mystery, Shooter, or RPG yet.** War's pattern
  (`src/app/api/arcade/matches/...`) and Word Scramble/Reaction Timer's
  pattern (`src/app/api/arcade/games/<key>/...`) both exist as references
  — Mystery needs lobby routes (create/join/suggest/disprove/accuse) on
  the match pattern; Shooter needs a `score` route on the solo pattern
  (there's a stray one already referenced in salvage at
  `src/app/api/arcade/games/reaction-timer/score/route.ts` worth checking
  isn't accidentally shooter's); RPG needs session start/action routes.
- **No React play UI for any of the three** — same situation Word
  Scramble/Reaction Timer/Coin Flip were in before HANDOFF-25 built theirs.
- **No verification scripts recreated.** The salvage referenced
  `scripts/test-mystery-redaction.mjs`, `scripts/test-shooter-engine.mjs`,
  and `scripts/test-rpg-combat-engine.mjs` (seeded PRNG, deterministic) as
  the actual evidence these engines behave correctly — per this project's
  own stated principle, reasoning through them by hand isn't evidence.
  These don't exist in the project yet; only `war`'s equivalent does.
- Chess: not started at all, see above.

## 3. Still open (unchanged from HANDOFF-25, carried again)
- blindfolded-face.jpg swap; duplicate images; NuraPresence accent (D's call)
- Ministries → Antisocial button (lives in Ministries repo)
- More trivia questions over time
- Known ticket: signed-out taps on some game areas need the explicit
  "Sign in to play" treatment War/Word Scramble/etc. already got

## 4. What to say to me next session

Paste this file. Reasonable next moves, in order of "smallest gap to a
playable feature": (a) verification scripts for the three new engines, so
there's real evidence before wiring UI to them; (b) Shooter routes + UI —
it's the most self-contained of the three, single-player, no lobby
concept; (c) Mystery routes + UI — most complex, multiplayer lobby state;
(d) RPG routes + UI; (e) Chess, starting with the chess.js decision above.
Or just tell me which one you want and I'll go straight there.
