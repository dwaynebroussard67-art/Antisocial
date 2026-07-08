# ANTISOCIAL — Handoff Document 23
**Checkpoint date:** this session.
**Base:** the `antisocial-project-session5.zip` you uploaded (which already
included everything through HANDOFF-22, real Supabase auth, and — ahead of
what HANDOFF-22's own notes said — a NavBar with working Sign in/Sign out
links and an already-wired Arcade page with WarGame rendered on it). The
`antisocial-schema-fix.zip` you also uploaded was byte-identical to what
was already in session5's `apply-schema.mjs` / `drizzle/0000_*.sql` —
nothing new there, already covered.

**No network access in this sandbox** (`npm install` returns 403 from the
registry), so nothing here is `next build`-verified — this is a careful
hand-review, same method as HANDOFF-15. Treat it as "should compile and
run correctly" rather than "proven to."

---

## 1. The one bug that would have crashed the homepage — FIXED

`ensureAnonymousMember()` (`src/lib/auth/anonymous-identity.ts`) was
calling `cookieStore.set(...)` directly. It's called from `AntisocialGate`
— `src/app/page.tsx`, an async **Server Component**. Next.js only allows
writing cookies from a Server Action or a Route Handler; calling `.set()`
during a Server Component render throws:

> Cookies can only be modified in a Server Action or Route Handler.

That means **every brand-new visitor's very first page load would have
crashed** — the one entry point the whole site funnels through (both the
direct link and the future Ministries button land on `/`).

Your own `src/lib/auth/supabase-server.ts` already had a `try/catch`
around exactly this failure mode with a comment explaining it — the fix
for `anonymous-identity.ts` just hadn't been applied there too.

**Fix, in two files:**

- **`src/middleware.ts`** — now also assigns the `antisocial_anon_id`
  cookie (middleware is allowed to write cookies), alongside the existing
  Supabase session-refresh logic it already had. It sets the cookie on
  both the incoming `request` (so it's visible to the Server Component
  render that follows) and the outgoing `response` (so the browser keeps
  it). Order matters here: the Supabase `setAll` callback reassigns the
  `response` object, so the anon-cookie write happens *after* the
  Supabase logic runs, applied to whichever `response` object it ended up
  producing — otherwise it would get silently discarded.
- **`src/lib/auth/anonymous-identity.ts`** — `ensureAnonymousMember()` no
  longer writes the cookie at all. It only reads it (guaranteed present
  by the time it runs, since middleware runs first) and creates the
  matching `members` + `memberRoles` rows if needed. If the cookie is
  somehow missing, it throws a clear error naming the likely cause
  (middleware's matcher excluding the route) instead of silently
  creating an orphaned member row with no way to recognize that visitor
  next time.

**Test once you have a database wired up:** open the site in a fresh
incognito window (no `antisocial_anon_id` cookie yet) and confirm the
homepage loads without a 500.

---

## 2. Hardened: `computeAndApplyTier`'s silent-fail upsert

`src/lib/tiers/assign-tier.ts` — the closing step (`.update(memberRoles)
.set(...).where(...)`) was update-only. If it ever ran against a member
with no `memberRoles` row yet, the `WHERE` would match zero rows, the
write would silently no-op, and the function would still return
`nextTier` as though it had been persisted.

Not reachable today — every current caller (`session.ts`'s
`ensureRoleRow`, `anonymous-identity.ts`) creates the role row first. But
it was a silent-failure trap waiting for the next call site that forgets
to. Changed to `.insert(...).onConflictDoUpdate(...)` (using the existing
unique constraint on `memberRoles.memberId`), so it's correct on its own
regardless of call order. No behavior change for any path that works
today.

---

## 3. Everything else — reviewed, no bugs found

Went through, file by file: `session.ts` (real `getViewer`, the
auth_user_id → email → anonymous-cookie → create resolution chain),
`api/auth/sync` and `api/auth/signout`, `supabase-server.ts` /
`supabase-browser.ts`, `roles.ts` (tier cascade + `requireActiveResponder`
+ `requireSiteRole`), `sign-in/page.tsx`, `NavBar.tsx`, the Arcade page and
its three widgets' wiring, all four tier pages (street/block/crib/pit),
all `api/block/*` and `api/notifications/*` and `api/alert-ledger`
routes, and every db schema file. All of it holds together — the
cascade logic, the rate-limiting, the cheer-toggle transaction, the
Crib/Pit-are-grants-not-computations rule, all check out. Nothing else
stood out as broken.

One thing worth a note, not a fix: HANDOFF-22 said NavBar was "still
untouched" and WarGame "isn't rendered on any page" — but this zip's
NavBar already has working Sign in/Sign out links and an Arcade link, and
`src/app/block/arcade/page.tsx` already renders `<WarGame viewerId=.../>` .
Looks like that work happened but didn't make it into HANDOFF-22's own
notes. Worth mentioning next session so nobody re-does it from scratch.

---

## 4. Still NOT done (carried forward from HANDOFF-22 §4, unchanged)

1. Chess, Mystery, Shooter, RPG — sub-pieces 3–6, untouched.
2. Word Scramble / Reaction Timer / Coin Flip Streak — need actual play
   UI; the leaderboard/registry plumbing exists.
3. Trivia seed questions — still real editorial content nobody's written.
4. `blindfolded-face.jpg` swap, duplicate images, NuraPresence accent
   color (gold vs. crimson — your call, not mine to auto-pick).
5. The "button on Misfit Ministries that links to Antisocial" lives in
   the Ministries repo, not this one.
6. `npm run db:push` / `npm run apply-schema` / `npm run seed` — still
   need a live `DATABASE_URL` + the three Supabase env vars; nothing in
   this sandbox can reach a database to run or verify them.

---

## 5. What to say next session

Paste this file. This session's two fixes are small and self-contained
(`src/middleware.ts`, `src/lib/auth/anonymous-identity.ts`,
`src/lib/tiers/assign-tier.ts`) — safe to diff against whatever you're
holding and merge in directly. Once you have real network access
somewhere (your machine, Vercel, a Codespace), the highest-value next
step is simply running `npm install && npm run build` for the first
`next build`-verified checkpoint since HANDOFF-22 — that will catch
anything a hand-review can miss (type errors across package versions,
subtle JSX issues, etc.). After that: Word Scramble/Reaction
Timer/Coin Flip Streak play UI, then Chess.

---

## Files changed this session
```
src/middleware.ts                    — EDITED (anon-id cookie assignment added)
src/lib/auth/anonymous-identity.ts   — EDITED (no longer writes cookies)
src/lib/tiers/assign-tier.ts         — EDITED (upsert instead of update-only)
```
All three are included in the attached zip, applied on top of your
session5 upload — everything else in the zip is unchanged from what you
sent.
