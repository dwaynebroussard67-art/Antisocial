# ANTISOCIAL — HandoFF Document 31
**Base:** HANDOFF-30 (pushed as f47a3c5). This session: ACCOUNT IDENTITY,
built on D's live-site observation that you can't tell who you're signed
in as, and there's no account button.

## Built (build-verified, 31 pages)
1. `Viewer` type now carries `displayName` — threaded through all four
   resolution paths in `src/lib/auth/session.ts`. Every page that already
   passes `viewer` gets the name for free.
2. **NavBar**: gold account link between Signal and Sign out, labeled
   with displayName (fallback: email prefix, then "Account"), links to
   /account. Ellipsized at 9rem so long names don't break the bar.
3. **/account page**: shows display name (headline), email, tier, role,
   member-since + Sign out. Reuses signal.module.css tokens.
4. **AccountForm**: edit display name inline.
5. **API `/api/members/me`**: GET (details) + PATCH (displayName).
   Validation: trim, 2–32 chars, `/^[A-Za-z0-9 ._'-]+$/` — no `@` so a
   name can never impersonate an email in the member picker. (Was a
   unicode-flag regex; tsconfig targets es5, so ASCII class. If
   accented/Ge'ez names are wanted later, bump tsconfig target and
   restore `\p{L}\p{N}` with /u.)

## Why it matters beyond convenience
The Signal member picker searches displayName ONLY. Until members set
names, nobody can be knocked. The account page is the missing on-ramp
for the entire consent flow.

## Known open
- displayName has NO unique constraint — two members can share a name.
  Picker shows tier alongside, which helps, but decide: unique index +
  availability check, or allow dupes forever. (Impersonation surface.)
- No display-name profanity/reserved-word screening yet (e.g. "Nura",
  "admin"). Cheap to add to the PATCH validator.

## Deploy
```
git add -A && git commit -m "Account page + display name in nav (HANDOFF-31)" && git push
```
No migrations. Then: sign in → set your display name FIRST, on both test
accounts → re-run the HANDOFF-30 smoke test (picker will actually find
people now).

## Next (carried)
Smoke test → Pit admittance flow → Hero Wall/Survivor Board schema →
Nura moderation in Signal → Shooter UI.
