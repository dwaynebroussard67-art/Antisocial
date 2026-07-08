# ANTISOCIAL — Handoff Document 18
**Checkpoint date:** this session.
**Supersedes HANDOFF-17 for status.**

---

## 0. A real inconsistency found and resolved this session

HANDOFF-17's own text (and the still-uploaded HANDOFF-17-1.md) describes a
3-tier world (Street/Block/House) with a `blockMembers` table and
`requireHouseAccess()`. **The actual code in the project has moved past
that**: it's a 4-tier system (Street/Block/**Crib**/Pit), the table is
`members` (not `blockMembers`), and access checks are
`requireBlockAccess()` / `requireCribAccess()` / `requirePitAccess()` via a
single `requireTierAccess()`. `docs/HANDOFF.md` (the living vision doc)
confirms the 4-tier/Crib/Pit version is correct and current.

This means: **HANDOFF-17's own prose was already stale relative to its own
repo** when it was written. Everything below was built against the real
code (`members`, Crib, `requireBlockAccess`), not against HANDOFF-17's
prose. Worth fixing in HANDOFF.md or deleting the stale HANDOFF-17-1.md
copy so this doesn't happen again.

Also found already done, contrary to what HANDOFF-17 implied was still
open: `src/lib/db/schema/members.ts`, `member-roles.ts`, and
`src/lib/auth/roles.ts` all exist and are real (session lookup itself,
`src/lib/auth/session.ts`, is still an explicit stub returning `null`).
Notifications (schema + routes + bell component) also already exist.

---

## 1. What happened this session

Started the Arcade port, per HANDOFF-17 §4.3's own recommendation to break
it into sub-pieces rather than one session. This is **sub-piece 1 of 6**:
**Arcade Core (registry schema) + Trivia + the three simplest solo-score
games (Word Scramble, Reaction Timer, Coin Flip Streak) + a solo-score
leaderboard.** War, Chess, Mystery, Shooter, and the RPG are NOT started —
they're larger, mostly head_to_head/multiplayer, and depend on real-time
sync patterns (polling, `FOR UPDATE SKIP LOCKED` matchmaking) that aren't
worth rushing.

**16 new files, 2 edited:**

```
NEW:
src/lib/db/schema/arcade-core.ts     — arcadeGames, arcadeRatings, arcadeScores,
                                        arcadeMatches, arcadeMatchmakingQueue,
                                        arcadeDailyStreaks (full schema now,
                                        head_to_head/multiplayer kinds declared
                                        but unused — no migration needed later)
src/lib/db/schema/trivia.ts          — triviaQuestions, triviaDailyRotation, triviaAttempts
src/lib/arcade/streaks.ts            — recordArcadeActivity(), site-wide daily streak
src/lib/arcade/trivia/daily.ts       — NOT in salvage: safely assigns today's
                                        rotation row if missing (salvage assumed
                                        one always existed)
src/lib/arcade/word-scramble/words.ts
src/lib/badges/seed-badges.ts        — closes HANDOFF-17 §3's badge gap + adds arcade_7_day_streak
src/lib/arcade/seed-games.ts         — registers trivia/word_scramble/reaction_timer/coin_flip_streak
scripts/seed.ts                      — closes HANDOFF-17 §4.7 ("no seed script exists")
src/app/api/arcade/games/[gameKey]/score/route.ts        — generic solo-score submit (Reaction Timer uses this directly)
src/app/api/arcade/leaderboard/[gameKey]/route.ts         — solo_score leaderboard only, see §3
src/app/api/arcade/games/trivia/today/route.ts
src/app/api/arcade/games/trivia/submit/route.ts
src/app/api/arcade/games/word-scramble/round/route.ts
src/app/api/arcade/games/word-scramble/submit/route.ts
src/app/api/arcade/games/coin-flip-streak/flip/route.ts
src/components/arcade/leaderboard-widget.tsx (+ .module.css)
src/components/arcade/trivia-widget.tsx (+ .module.css)

EDITED:
src/lib/roles/events.ts   — added arcade_7_day_streak to BADGE_RULES
package.json              — added tsx devDependency + "seed" script
```

**Rename convention, consistent with the real repo (not HANDOFF-17's stale
prose):** `blockMembers` → `members`. `requireBlockAccess` reused as-is —
Block tier already exists and is correct for Arcade access. No House/Crib
rename was needed here since nothing in this sub-piece is Crib-gated.

---

## 2. A real gap fixed while porting, not carried forward silently

The salvage's `trivia/today` implementation assumed a
`trivia_daily_rotation` row for today already existed — it never said how.
Left as-is, the first visitor on any day with no pre-seeded rotation would
hit a broken state. `lib/arcade/trivia/daily.ts` (not in the salvage) fixes
this: it assigns today's question transactionally, re-checking inside the
transaction so two concurrent first-visitors can't race into inserting two
different questions for the same day.

**Named gap this does NOT fix:** no `triviaQuestions` seed data exists.
`seed.ts` seeds badges and the games registry, but not actual trivia
question content — that's real editorial content (see the same caveat the
salvage's `STREET_COPY` placeholder already established), not something to
fabricate. Until someone inserts real questions, `/api/arcade/games/trivia/today`
will honestly return `{ question: null, empty: true }`.

---

## 3. What this gets you — and what it deliberately doesn't

**Works (pending the build-verification gap in §5):** any Block+ member can
play daily Trivia (once seeded), Word Scramble, Reaction Timer, and Coin
Flip Streak, and see a solo-score leaderboard per game. Daily activity
across any of these feeds one site-wide streak counter, which fires the new
`arcade_7_day_streak` badge via the existing `emitMemberEvent()` at 7/14/21…
days.

**Deliberately NOT built this pass:**
- The leaderboard route's `head_to_head` branch (rating-based board) —
  returns `not_found` for any non-solo_score game rather than a wrong or
  empty leaderboard. Add it back in the War/Chess sub-piece, alongside
  `arcadeRatings`/`divisions.ts`/`elo.ts`, none of which exist yet.
- War, Chess, Mystery, Shooter, RPG — untouched, per HANDOFF-17's own
  advice to split these across sessions.
- No UI page renders `TriviaWidget` or `ArcadeLeaderboardWidget` yet — same
  "ported, not wired" caveat every prior handoff has given for its
  features. Components exist and are ready to drop into a page.

---

## 4. What's still NOT done (carried forward from HANDOFF-17, minus this session's slice)

1. Still need the real `block-members`/session file, OR: per §0 above,
   confirm the repo's own `members.ts`/`session.ts` (with its explicit
   `getViewer()` stub) is now simply the source of truth and stop looking
   for a separate salvage file that may not exist.
2. ~~Port Arcade sub-piece 1 (Core + Trivia + 3 solo games)~~ — **done this session.**
3. Arcade sub-pieces 2–6: War, Chess, Mystery, Shooter, RPG — not started.
4. Wire Block Posts + Notifications + Workshop + Mission Board + this
   session's Arcade widgets into UI — nothing renders any of them yet.
5. `blindfolded-face.jpg` swap and remaining duplicate-image groups — untouched.
6. `NuraPresence`'s `--accent-gold` vs. the confirmed crimson accent — untouched.
7. Seed script now exists (`npm run seed`) but only seeds badges + the
   games registry — no trivia question content, no RPG zone/quest content
   (that content doesn't exist in this project at all yet; it only exists
   in the still-unported salvage reference).

## 5. Real gaps — unchanged, plus one new one

Auth is still a stub (`getViewer()` returns `null`). No database
provisioned. **This sandbox had no network access this session — `npm
install` failed (403 on the registry) and `next build` was never run.**
Every file in §1 was hand-reviewed and brace/paren-balance-checked, but
that is explicitly NOT the same as a real compile, and per this project's
own stated practice this should not be treated as verified until someone
runs `npm install && next build` in an environment with real network
access. Treat this as a **compiled-in-good-faith, not verified** handoff —
the first of this project's sessions to say that, and worth saying plainly
rather than implying otherwise. No git commit has been made of this
session's work yet.

---

## 6. What to say to me next session

Paste this file. First priority: run `npm install && npm run build` (and
`npm run seed` against a real database) somewhere with network access and
report back — if anything in §1 doesn't compile, that's the very first
thing to fix. After that, say "continue the Antisocial build" and specify
either the next Arcade sub-piece (War is next, easiest-to-hardest per
HANDOFF-17) or UI wiring for what's already ported.
