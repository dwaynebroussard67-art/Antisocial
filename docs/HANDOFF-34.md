# ANTISOCIAL — Handoff Document 34
**Base:** HANDOFF-33.

## Mom-proofing the front door (found by D's mom, live)
She entered details in SIGN-IN mode with no account, got Supabase's raw
"Invalid login credentials", retried until rate-limited. Fixes
(build-verified, 31 pages):
1. LANDING: two explicit buttons — "Create account — get closer to the
   Block" (gold outline, /sign-in?mode=signup) and "Already a Misfit?
   Sign in" (silver, /sign-in?mode=signin). Ghost branch's "Sign back
   in" also targets ?mode=signin.
2. /sign-in split into server wrapper (reads ?mode=) + sign-in-form.tsx
   client. Opens in the right mode.
3. Human error translation in the form (friendly()): wrong-creds on
   signin -> "tap Create an account below"; already-registered on signup
   -> "tap Sign in below"; rate limit -> "door locks itself for a little
   while... wait 15–60 min, nothing is lost"; short password -> plain
   words. Unknown errors pass through.

## Unblocking Mom RIGHT NOW (no deploy needed)
Supabase dashboard -> Authentication -> Users -> Add user ->
her email + a password you choose -> check Auto Confirm -> create.
Dashboard creation bypasses the client rate limit entirely. Tell her the
password; she uses "Already a Misfit? Sign in". (Her failed attempts
never created an account, so no duplicate.) If sign-in itself is still
rate-limited on her device, it clears within the hour — or she signs in
on a different network (rate limit keys off IP+endpoint).

## Deploy
```
git add -A && git commit -m "Mom-proof sign-in: explicit modes + human errors (HANDOFF-34)" && git push
```
No migrations.

## Next (carried)
Smoke test -> Pit admittance -> Walls schema -> Nura in Signal -> Shooter.
