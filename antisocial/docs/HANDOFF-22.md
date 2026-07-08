# ANTISOCIAL — Handoff Document 22
**Checkpoint date:** this session.
**Supersedes HANDOFF-21 for status. This session had real network access
and every claim below is `next build`-verified, not hand-reviewed.**

---

## 0. Verification debt from HANDOFF-19/21 — CLOSED

This session ran `npm install && npm run build` on the merged codebase
(the HANDOFF-21 zip) **before** touching anything: clean pass, all routes
compiled, type-check included. Also verified the merged zip is a strict
superset of the older sub-piece-1 zip — the only 3 differing files are the
merged side being newer (head_to_head leaderboard branch, War seed row,
the trivia/daily.ts type fix). Nothing was lost in the HANDOFF-21 merge.
`npm run seed` still not run — no database reachable from this sandbox;
it runs on D's side once DATABASE_URL is set (§3).

---

## 1. What happened this session: REAL AUTH (HANDOFF-21's top priority)

Auth is Supabase — the **same Supabase project and same accounts as
Misfit Ministries** (`misfit-backend`, https://seoguauzvvrefoupxgom.supabase.co),
per D's direction. One email/password works on both sites. Note: separate
`*.vercel.app` subdomains cannot share the login cookie, so a member signs
in once per site with the same credentials; true single sign-on requires
both apps under one custom domain later.

**NEW files:**
```
src/lib/auth/supabase-server.ts      — request-scoped server client
src/lib/auth/supabase-browser.ts     — browser client (anon key only)
src/middleware.ts                    — session token refresh on every request
src/app/sign-in/page.tsx             — email/password sign-in + create account
                                        (the /sign-in link on the homepage was
                                        already there, previously a dead route)
src/app/api/auth/sync/route.ts       — post-sign-in: bumps signInCount,
                                        re-affirms tier (the "on every sign-in"
                                        contract from assign-tier.ts lives here)
src/app/api/auth/signout/route.ts    — POST, ends session, redirects home
```

**EDITED:**
```
src/lib/auth/session.ts        — stub REPLACED with real getViewer():
                                  resolves Supabase user -> members row by
                                  (1) auth_user_id, (2) email match, (3) the
                                  anonymous Street cookie — an anonymous
                                  visitor who signs up KEEPS their member row
                                  and game history — else (4) creates fresh.
                                  Link/create recomputes tier once (the
                                  Street -> Block promotion moment).
src/lib/db/schema/members.ts   — NEW COLUMN: auth_user_id (text, unique,
                                  nullable). Requires `npm run db:push`.
src/lib/db/index.ts            — postgres client now `prepare: false`,
                                  required for Supabase's transaction pooler.
src/package.json               — added @supabase/supabase-js, @supabase/ssr.
```

Env fallbacks (`|| "placeholder"`) are in both Supabase clients so build
and dev never crash on missing vars — same pattern that fixed the
Ministries black-screen. Middleware passes through when vars are unset.

---

## 2. What this unblocks

Everything HANDOFF-21 §2 item 1 listed as auth-blocked is now wireable
for real: War (needs `viewerId` from real auth — now exists), Workshop,
Mission Board, Notifications. WarGame component still isn't rendered on
any page — that's now the natural next UI-wiring task.

---

## 3. Required on D's side before this works live

1. `.env.local` (and later Vercel env) needs three vars:
   - NEXT_PUBLIC_SUPABASE_URL = https://seoguauzvvrefoupxgom.supabase.co
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = anon key from that project's
     dashboard (Settings → API)
   - DATABASE_URL = that project's transaction-pooler connection string
     (Connect → Transaction pooler URI, port 6543)
2. `npm run db:push` — creates all tables incl. new auth_user_id column.
3. `npm run seed` — game rows + any seed content.
4. If email confirmation is ON in that Supabase project's auth settings,
   new sign-ups get a confirmation email first; the sign-in page handles
   both modes.

---

## 4. Still NOT done (carried forward)

1. WarGame / Block Posts / Notifications / Workshop / Mission Board —
   built, auth-unblocked, still not rendered on any page.
2. Chess, Mystery, Shooter, RPG — sub-pieces 3–6, untouched.
3. Word Scramble / Reaction Timer / Coin Flip Streak play UI.
4. Trivia seed questions — still real editorial content nobody fabricated.
5. Nav link to /block/arcade; sign-in/sign-out links in NavBar (NavBar
   still untouched per HANDOFF-19's deliberate omission — now that
   sessions are real, a "Sign out" entry is worth adding next pass).
6. blindfolded-face.jpg swap, duplicate images, NuraPresence accent.
7. The "button on Misfit Ministries that links to Antisocial" — lives in
   the Ministries repo, not this one. Needs that repo plus Antisocial's
   deployed URL.

---

## 5. What to say next session

Paste this file. Best next moves, in leverage order: wire WarGame into a
page (auth was its only blocker), then Workshop/Mission Board/Notifications
UI, then Chess. If D reports the sign-in flow live-tested end to end,
record that here — everything in §1 is build-verified but not yet tested
against the real Supabase project.
