# ANTISOCIAL — Handoff Document 19
**Checkpoint date:** this session.
**Supersedes HANDOFF-18 for status.**

---

## 0. Environment, unchanged from HANDOFF-18

Same sandbox limitation as last session: **no network access**. `npm
install` still fails (403 on the registry), so nothing in this repo has
ever actually been through `next build` or `tsc`. That was HANDOFF-18's
first-priority ask for next session and I could not do it either — worth
flagging plainly again rather than letting it quietly drop. What I did
instead, same as HANDOFF-18 describes for its own files: hand-reviewed
every file I touched, brace/paren/bracket-balance-checked the *entire*
`src/` and `scripts/` tree (61 files, all balanced), and grep-verified
every `@/...` import in the project actually resolves to a real file (zero
missing). That is still not the same as a real compile — treat this session
as **compiled-in-good-faith, not verified**, same caveat as HANDOFF-18.

I also re-checked HANDOFF-18 §0's specific claims before building on them:
no `blockMembers`/`requireHouseAccess` calls remain anywhere in real code
(only historical comments documenting the rename, which is correct and
worth keeping), and `docs/HANDOFF.md` already matches the 4-tier
Street/Block/Crib/Pit reality. No stale `HANDOFF-17-1.md` file was present
in this upload to delete. §0 is genuinely closed, not just claimed closed.

---

## 1. What happened this session

HANDOFF-18 §6 offered two next-session options: run the build, or continue
with either the War sub-piece or UI wiring for what's already ported. Since
the build-with-network-access step wasn't available to me either, I took
the UI-wiring path — it's the lower-risk option when nothing can be
compiled, since it composes existing, already-reviewed components rather
than adding new game logic and API surface.

**1 new file, 2 edited:**

```
NEW:
src/app/block/arcade/page.tsx   — the first page anywhere in this project
                                   that renders TriviaWidget and
                                   ArcadeLeaderboardWidget (both existed
                                   since HANDOFF-18 but were unwired)

EDITED:
src/app/block/page.tsx   — "Better games" card now links to /block/arcade
                            instead of being static, non-interactive text
src/app/crib/page.tsx    — "The best games" card links to the same
                            /block/arcade page, with copy that's honest
                            about there being no Crib-exclusive games yet
                            (there's no game content gated above Block in
                            this project — inventing a distinct Crib arcade
                            page would have been decorative, not real)
```

**A real design conflict I found and resolved, not carried forward
silently:** `requireBlockAccess()` is a floor check by design (see
`src/lib/auth/roles.ts` — that's the whole point of the tier cascade), so
using it alone on the Arcade page would let a Pit-tier viewer cascade in.
But `docs/HANDOFF.md` §2 is explicit: *"Pit: no games here at all."* I
didn't treat the generic cascade helper as an excuse to skip that rule —
`src/app/block/arcade/page.tsx` calls `requireBlockAccess()` for the normal
floor check, then adds one extra line redirecting `tier === "pit"` to
`/pit`. This is the one page in the project that intentionally opts out of
the default cascade behavior, and it's commented in place as such so a
future session doesn't "simplify" it back to a plain floor check.

Street's "Games" card was deliberately left as static text, not linked —
Street tier doesn't have Arcade access (`requireBlockAccess` is the floor),
so linking it would just 403 real visitors. Fixing that honestly requires
either a Street-tier game or a sign-in prompt, neither of which existed to
wire up this session.

---

## 2. What this gets you — and what it still doesn't

**Now visible in the UI (pending the build-verification gap in §0):**
Block and Crib members can reach `/block/arcade` and actually play Daily
Trivia, plus see leaderboards for Trivia, Word Scramble, Reaction Timer,
and Coin Flip Streak. Word Scramble, Reaction Timer, and Coin Flip Streak
have working API routes (`src/app/api/arcade/games/...`, per HANDOFF-18 §1)
but **no play UI** — their leaderboard boards will legitimately show "no
scores yet" until someone builds widgets for them, same as Trivia would
have before this session.

**Deliberately NOT built this pass:**
- Play UI for Word Scramble, Reaction Timer, or Coin Flip Streak — the API
  routes exist (HANDOFF-18) but no component calls them. This is the
  natural next UI-wiring task if that path gets picked again.
- Any nav link to `/block/arcade` from `NavBar.tsx` — the Arcade is reached
  today only via the Block/Crib page cards, not the top nav. Adding a nav
  entry is a small, easy follow-up but I didn't want to touch the nav's
  tier-visibility logic without also deciding whether Pit should see a
  (disabled, since it 403s) Arcade link there — that's a product-feel
  question, not a coding one, and better left for you to call.
- War, Chess, Mystery, Shooter, RPG — still fully untouched, per every
  handoff since HANDOFF-17.
- Block Posts / Notifications / Workshop / Mission Board widgets still
  aren't wired into any page either — same "ported, not wired" caveat
  HANDOFF-18 §4 item 4 already named; this session only closed that gap
  for Arcade specifically.

---

## 3. What's still NOT done (carried forward from HANDOFF-18, minus this session's slice)

1. Confirm `members.ts`/`session.ts` is the source of truth — unchanged,
   still open.
2. Arcade sub-pieces 2–6: War, Chess, Mystery, Shooter, RPG — not started.
3. ~~No UI page renders TriviaWidget or ArcadeLeaderboardWidget~~ — **done
   this session**, for Block/Crib. Play UI for the other 3 solo-score games
   still doesn't exist.
4. Wire Block Posts + Notifications + Workshop + Mission Board into UI —
   still nothing renders any of them.
5. `blindfolded-face.jpg` swap and remaining duplicate-image groups —
   untouched.
6. `NuraPresence`'s `--accent-gold` vs. the confirmed crimson accent —
   untouched.
7. Trivia question content — still no rows exist; `/api/arcade/games/trivia/today`
   still honestly returns `{ question: null, empty: true }` until someone
   seeds real questions.
8. No `next.config.js`/`.mjs`/`.ts` exists anywhere in this project, in any
   session's output. Not something I introduced or fixed — flagging it
   since a real `next build` (§0) is the point where its absence would
   first actually matter, and it's cheap to add once someone has network
   access to confirm what's actually needed (image domains, etc., though
   nothing here uses remote image URLs today).

---

## 4. What to say to me next session

Paste this file. First priority is still the same as HANDOFF-18 left it:
run `npm install && npm run build` (and `npm run seed` against a real
database) somewhere with real network access — that's now two sessions in
a row that couldn't do it. After that, pick one:
- Play UI for Word Scramble / Reaction Timer / Coin Flip Streak (fastest
  way to make the leaderboards on `/block/arcade` actually fill up), or
- The next Arcade sub-piece (War), or
- Wiring Block Posts / Notifications / Workshop / Mission Board into pages,
  the same way this session did for Arcade.
