# ANTISOCIAL — Handoff Document 35
**Base:** HANDOFF-34.

## Nav doors bug — BUILT (D's live finding: admin locked out of tiers,
## different bug than HANDOFF-33)

HANDOFF-33 fixed the SERVER-side gate (`requireTierAccess`) so admin
passes every tier's access check. This handoff fixes a separate
CLIENT-side bug that made it look like that fix didn't work.

Root cause: `requireTierAccess` returns `tier` lifted only to the FLOOR
of whichever page is calling it — that's correct for the access check,
but every page was also feeding that same lifted `tier` straight into
`<NavBar viewerTier={tier} />`, and NavBar used it to decide which links
are clickable (`reachable = i <= viewerRank`). Result: on /street, tier
comes back as your real earned tier (no lift needed, 0 < 0 is false) —
so Block/Crib/Pit all render greyed-out and unclickable. On /crib, tier
lifts to "crib" — so Street/Block/Crib are clickable but Pit is
greyed out. Only on /pit did every link show as reachable. Direct URL
entry always worked (server check is fine) — only the nav links lied.

Fix: `requireTierAccess` now also returns `isAdmin` (the raw
`site_role === "admin"` check), separate from the per-page `tier`.
NavBar takes a new `isAdmin` prop and uses `isAdmin || i <= viewerRank`
for reachability, while `viewerTier` still drives which link is
highlighted as "current page." All four tier pages (street, block,
crib, pit) now destructure and pass `isAdmin` through.

Build-verified (`tsc --noEmit` clean, `npm run build` clean, all pages
compiled).

## Deploy
```
git add -A && git commit -m "Fix admin nav reachability across tiers (HANDOFF-35)" && git push
```
No migrations.

## Note on D's Supabase dashboard account
Separate from the above: if you created/edited your admin login directly
in the Supabase dashboard (as HANDOFF-34 describes doing for Mom), double
check that the resulting `member_roles` row for YOUR account actually has
`site_role = 'admin'` in Postgres — dashboard-created auth users link to
a `members` row automatically, but a brand-new row defaults `site_role`
to `'member'`. If your nav is still boxed in after this deploy, that's
the next thing to check (a one-line UPDATE in the DB, not a code fix).

## Next (carried)
Smoke test -> Pit admittance -> Walls schema -> Nura in Signal -> Shooter.
