# ANTISOCIAL — Handoff Document 33
**Base:** HANDOFF-32.

## Admin tier override — BUILT (D's live finding: admin couldn't enter Crib/Pit)
site_role and tier were two unconnected systems; admin passed role gates
but tier gates only looked at earned tier. Fix in requireTierAccess
(roles.ts, the single gate all tier pages call): site_role=admin passes
every tier floor; returned tier lifts to the floor entered (NavBar
renders right); the EARNED tier in the DB is untouched — admin is
oversight, not a ladder shortcut. requireActiveResponder still gates
Narcan Watch separately: admin ≠ on-call responder.
Nav links remain earned-tier-based; admin reaches /crib and /pit by URL
or the landing Continue. (Threading siteRole into NavBar = later polish.)
Build-verified, 31 pages.

## Nura's governance — CURRENT TRUTH (recorded so it stops getting fuzzy)
What EXISTS today: NuraPresence (the Talk-to-Nura button, UI only),
moderation_flags table + lib/moderation/flag.ts (human moderation
plumbing), moderator/admin site roles. What DOES NOT exist yet: any AI
moderation. Nura does not currently read, score, or act on anything.
The DESIGN (from the original Misfit stack + HANDOFF-28 known-limits):
Nura as safety layer inside Signal — scan messages for crisis signals,
escalate to watch alerts, flag abuse into moderation_flags for human
mods; witness-mode and pit-watch rooms are where she watches closest.
Human roles decide; Nura detects and escalates. STILL TO BUILD.

## Deploy
```
git add -A && git commit -m "Admin tier override (HANDOFF-33)" && git push
```
No migrations. Test: sign in as admin -> type /crib and /pit URLs ->
both should render; second (non-admin) account must still be refused.

## Next (carried)
Smoke test -> Pit admittance flow -> Walls schema -> NURA IN SIGNAL ->
Shooter UI.
