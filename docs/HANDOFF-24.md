# ANTISOCIAL — Handoff Document 24
**Checkpoint date:** this session.
**Base:** `antisocial-project-session6-fixed.zip` (everything through
HANDOFF-23: the middleware anon-cookie fix, the anonymous-identity
read-only change, and the assign-tier upsert hardening).

**This sandbox HAD npm registry access** — so this is the first
`next build`-VERIFIED checkpoint since HANDOFF-22. `npm install` +
`npm run build` ran clean: TypeScript type-checking passed, all 26
routes generated, middleware compiled (83.3 kB). HANDOFF-23's three
hand-reviewed fixes all compile and hold up.

---

## 1. The one bug the build caught — FIXED

`src/app/api/arcade/games/word-scramble/round/route.ts` — the GET
handler reads nothing from the request (no cookies, no headers, no
params), so Next.js 14 **statically prerendered it at build time**.
It showed up as ○ (Static) in the route table while every other API
route was ƒ (Dynamic).

Consequence: `Math.random()` executed exactly once, during `next build`.
Every visitor, forever, would get the **same word with the same
scramble** until the next deploy. A hand-review can't catch this — the
code is correct in isolation; only the build output reveals how Next
classified it.

**Fix (one line):** `export const dynamic = "force-dynamic";` added to
the route. Rebuilt and confirmed it now shows as ƒ (Dynamic).

Worth remembering as a pattern: any future API route whose freshness
depends on `Math.random()`, `Date.now()`, or DB reads but which touches
nothing on the request object will hit this same trap. The coin-flip
and trivia routes are safe today because they read the viewer session
(dynamic by nature), but keep it in mind for pure "give me a random X"
endpoints.

## 2. Build verification details

- `npm install` — clean, no peer-dep conflicts across
  next 14.2.x / react 18.3 / @supabase/ssr 0.12 / drizzle-orm 0.31.
- `npm run build` — ✓ Compiled successfully, ✓ Linting and checking
  validity of types, 25 static pages generated after fix.
- Built with placeholder `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars (build needs them to exist,
  not to be real). Real values still required at deploy time.
- Route table highlights: `/` is ƒ dynamic (correct — AntisocialGate
  must run per-request), `/sign-in` is ○ static (fine — pure client
  component page), all API routes ƒ except word-scramble/round before
  the fix.
- **NOT verified:** anything touching a live database. `db:push`,
  `apply-schema`, `seed`, and the incognito-window homepage test from
  HANDOFF-23 §1 still need a real `DATABASE_URL` + Supabase env vars.

## 3. Still NOT done (carried from HANDOFF-23 §4, unchanged)

1. Chess, Mystery, Shooter, RPG — sub-pieces 3–6, untouched.
2. Word Scramble / Reaction Timer / Coin Flip Streak — play UI still
   needed; leaderboard/registry plumbing exists (and round endpoint now
   actually randomizes).
3. Trivia seed questions — real editorial content nobody's written.
4. `blindfolded-face.jpg` swap, duplicate images, NuraPresence accent
   color (gold vs. crimson — D's call).
5. Ministries → Antisocial button lives in the Ministries repo.
6. Live-database steps: `npm run db:push` / `apply-schema` / `seed`,
   then the fresh-incognito homepage test to confirm the HANDOFF-23
   cookie fix end-to-end.

## 4. What to say next session

Paste this file. The codebase is now build-verified — the next
highest-value step is DEPLOYMENT: push to GitHub, connect to Vercel
with the three Supabase env vars + `DATABASE_URL`, run the schema
scripts, and do the incognito homepage test. After that: Word
Scramble / Reaction Timer / Coin Flip Streak play UI, then Chess.

---

## Files changed this session
```
src/app/api/arcade/games/word-scramble/round/route.ts — EDITED (force-dynamic)
docs/HANDOFF-24.md                                     — NEW
```
Everything else unchanged from session6-fixed.
