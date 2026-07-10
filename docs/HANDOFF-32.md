# ANTISOCIAL — Handoff Document 32
**Base:** HANDOFF-31 (pushed as 9c8a69f).

## Ghost-identity bug — FOUND BY D ON THE LIVE SITE, FIXED
Symptom: sign out -> landing page says "Continue to the Block" but the
Block refuses you, and there's no way to sign back in from that state.

Root cause: when a Street visitor signs up, their anonymous row is
upgraded IN PLACE (session.ts case 3 — deliberately, so Street history
survives). But the anon cookie kept pointing at that now-Block-tier row,
and the landing gate resolved identity BY COOKIE ONLY — never checking
the real session. Signed-out = ghost Block identity. (Signed-IN members
were getting the right page only by luck, via the same cookie.)

Three-part fix, build-verified (31 pages):
1. `src/app/page.tsx` — gate resolves the REAL session first
   (getViewer()), cookie second. Ghost state (no session + auth-linked
   row) renders as Street with a "Sign back in" gold CTA ("Your account —
   and everything you built — is right behind the door") plus a "Just
   walk the Street" secondary.
2. `src/app/api/auth/signout/route.ts` — sign-out now DELETES the
   antisocial_anon_id cookie; middleware mints a fresh device id on the
   next request. Clean Street identity, account intact behind sign-in.
3. `src/lib/auth/anonymous-identity.ts` — ensureAnonymousMember returns
   { id, authLinked } so callers can detect upgraded rows. (Only caller
   is the gate; middleware only reads the cookie name.)

Fix 1 also heals devices with stale cookies already in the wild (like
D's phone) without waiting for their next sign-out.

## Deploy
```
git add -A && git commit -m "Fix ghost identity after sign-out (HANDOFF-32)" && git push
```
No migrations.

## Next (carried)
Display names on both accounts -> full smoke test (knock/reject/
re-knock/accept/message/mark) -> Pit admittance flow -> Hero Wall +
Survivor Board schema -> Nura in Signal -> Shooter UI.
