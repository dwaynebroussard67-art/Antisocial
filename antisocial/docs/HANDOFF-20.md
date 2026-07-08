# ANTISOCIAL — Handoff Document 20
**Checkpoint date:** this session (originally saved as HANDOFF-19.md — see
`docs/HANDOFF-21.md` for why it was renumbered).
**Supersedes HANDOFF-18 for the Arcade/War status described below. Does NOT
supersede HANDOFF-19 (Arcade UI wiring) — the two were parallel sessions
off the same HANDOFF-18 base and have both been merged; see HANDOFF-21.**

---

## 1. What happened this session

Continued the Arcade port per HANDOFF-18's own plan (6 sub-pieces, easiest to
hardest). This is **sub-piece 2 of 6: War** — the first head_to_head game,
which is why this session also had to fill in the rating-leaderboard branch
sub-piece 1 deliberately left as `not_found`.

**New files:**

```
src/lib/arcade/divisions.ts                         — bronze/silver/gold/platinum/elite thresholds
src/lib/arcade/elo.ts                                — standard Elo update, K=32
src/lib/arcade/matchmaking.ts                        — getOrCreateRating + FOR UPDATE SKIP LOCKED
                                                        queue join-or-match
src/lib/arcade/war/engine.ts                         — deck build, round resolution, war-chain
                                                        recursion, MAX_ROUNDS safeguard
scripts/test-war-engine.mjs                          — executable verification (see §2)
src/app/api/arcade/games/war/join/route.ts           — POST, join queue or get matched
src/app/api/arcade/games/war/leave-queue/route.ts    — POST
src/app/api/arcade/matches/[matchId]/route.ts        — GET, for client polling
src/app/api/arcade/matches/[matchId]/move/route.ts   — POST, play one round (War-specific
                                                        for now — see note in the file)
src/app/api/arcade/matches/active/[gameKey]/route.ts — GET, resume an in-progress match after refresh
src/hooks/use-polling.ts                             — NEW: shared polling hook, not in the project
                                                        yet despite HANDOFF-18 implying it existed
src/components/arcade/war-game.tsx (+ .module.css)   — client UI: queue, poll, play rounds
```

**Edited:** `src/app/api/arcade/leaderboard/[gameKey]/route.ts` (added the
`head_to_head`/rating branch), `src/lib/arcade/seed-games.ts` (registered
`war`).

**Rename convention:** none needed beyond what sub-piece 1 already
established — War never touches `blockMembers`/`members` naming directly,
it only goes through `arcadeRatings`/`arcadeMatches`, which were already
correctly named when sub-piece 1 laid down the full core schema.

---

## 2. A correction to HANDOFF-18's own claim, and what actually got verified

HANDOFF-18 said notifications had "a bell component" already built. **That
component does not exist in this codebase** — `src/hooks` didn't exist at
all before this session. Either it was described but never actually
written, or it was lost between sessions. Flagging this rather than quietly
building around it, per the same "don't let prose drift from the real repo"
principle HANDOFF-18 itself called out about HANDOFF-17. `use-polling.ts`
now exists for real, and War's UI uses it; notifications still has no UI.

**Verified, not assumed**, in this order:
1. `npx tsx scripts/test-war-engine.mjs` — actually run, all 3 tests pass:
   a full shuffled game terminates with card counts conserved, the
   round-cap safeguard fires and resolves by card count when forced to a
   boundary case, and a deck-exhaustion-mid-war-chain edge case resolves
   without hanging or crashing.
2. `npx next build` — actually run, twice. First run failed on a real type
   error in `src/lib/arcade/trivia/daily.ts` (pre-existing, from sub-piece
   1, not introduced this session — a `let questionId = existing?.questionId`
   inference gap). Fixed with an explicit `string | null | undefined`
   annotation. Second run: clean, all 26 routes compile (11 from before
   this session + Workshop/Mission Board/sub-piece-1 Arcade, + 5 new War
   routes this session).

---

## 3. What this gets you — and what it deliberately doesn't

**Works:** any Block+ member can queue for War, gets matched via division
(rating-banded, `FOR UPDATE SKIP LOCKED` so two simultaneous joins can never
double-claim the same waiting opponent), plays rounds one click at a time
(polling-based sync, 1.5s interval), and on completion both players' Elo
ratings update and the daily-streak counter fires. The `war` leaderboard
returns rating-ranked standings, optionally filtered by division.

**Deliberately NOT built this pass:**
- Chess, Mystery, Shooter, RPG — sub-pieces 3–6, untouched.
- The move route is War-specific (`if (match.game_key !== "war")` guard) —
  when Chess lands, this either becomes a shared dispatcher or Chess gets
  its own move route. Left undecided on purpose rather than guessing at
  Chess's shape now.
- No UI page renders `WarGame` yet — same "ported, not wired" caveat every
  prior sub-piece has carried. The component is ready to drop in (needs a
  `viewerId` prop from whatever the real session eventually provides).
- Notifications still has no UI, despite being claimed built in HANDOFF-18.

---

## 4. What's still NOT done (carried forward)

1. Still need the real `block-members`/session file, if one exists — `session.ts`
   is still an explicit stub returning `null`, which means every Block+ route
   (including all of War) currently 401s for real in production until this
   is wired to a real auth provider.
2. Chess, Mystery, Shooter, RPG (Arcade sub-pieces 3–6).
3. Wire Block Posts + Notifications + Workshop + Mission Board + Arcade
   (Trivia/Word Scramble/Reaction Timer/Coin Flip/War) into UI — routes and
   components exist for all of these now, nothing renders any of them on an
   actual page.
4. Build a real notifications UI (bell component) — claimed done previously,
   actually isn't.
5. `blindfolded-face.jpg` swap and remaining duplicate-image groups — untouched.
6. `NuraPresence`'s `--accent-gold` vs. the confirmed crimson accent — untouched.
7. No `triviaQuestions` seed content — real editorial content, not fabricated.

## 5. Real gaps — unchanged

Auth is still a stub (see §4.1 — this is now blocking every tier-gated
route in the app, not just a future concern). No database provisioned —
this session's code compiles and its pure-logic engine is unit-verified,
but nothing has been exercised against a real Postgres instance. No git
commit has been made of this session's work. Legal/liability review for
anything Narcan Watch-adjacent still outstanding.

---

## 6. What to say to me next session

Paste this file. If you have the real session/auth file, attach it —
it's now the single biggest thing blocking every tier-gated feature from
working for real, not just Arcade. Otherwise say "continue the Antisocial
build" and specify Chess (sub-piece 3 — reuses `matchmaking.ts`/`elo.ts`
directly, needs the `chess.js` package) or UI wiring for what's already
ported.
