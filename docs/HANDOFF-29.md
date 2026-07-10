# ANTISOCIAL — Handoff Document 29
**Base:** session10 zip (HANDOFF-28). This session: built the two missing
Signal UI pieces flagged as "next" in HANDOFF-28 — room creation and
front-porch knock, plus the member picker both needed.

## What was built

1. **`src/app/api/members/search/route.ts`** — new API route. Signed-in
   only, excludes viewer, matches on `displayName` via `ilike` (email is
   never searchable — this is a "who do I know" picker, not a directory
   lookup). Requires 2+ chars, returns id/displayName/tier, capped at 10.

2. **`src/components/signal/member-picker.tsx`** — `MemberPicker` client
   component. Debounced (250ms) search-as-you-type against the route
   above, chip-based multi-select, optional `max` (used as `max={1}` for
   direct rooms and knocks). Shared by both forms below.

3. **`src/components/signal/new-room-form.tsx`** — `NewRoomForm`. Posts to
   existing `POST /api/signal`. Room-type dropdown is filtered client-side
   by `allowedTypes(viewerTier)`, a hand-kept mirror of `canCreateRoom` in
   `lib/signal/permissions.ts` (server still enforces — this just avoids
   showing options that would 403). Slug is auto-generated as
   `slugify(name)-Date.now()`, guaranteeing uniqueness even with duplicate
   room names. Direct rooms require exactly one picked member; other types
   allow zero or more.

4. **`src/components/signal/knock-form.tsx`** — `KnockForm`. Posts to
   existing `POST /api/signal/requests` with `mode: "front-porch"`. Single
   member picker (`max={1}`) + prompt textarea. On success routes to
   `/signal/front-porch`.

5. **Two new pages**:
   - `src/app/signal/rooms/new/page.tsx` — renders `NewRoomForm`, passes
     `viewer.tier` down. Signed-out state matches the pattern in the
     existing board/porch pages.
   - `src/app/signal/front-porch/new/page.tsx` — renders `KnockForm`.

6. **Nav wiring**: both `src/app/signal/page.tsx` and
   `src/app/signal/front-porch/page.tsx` now import `signal.module.css`
   directly and render a `+ New Room` / `+ Knock` link (`styles.newLink`)
   above the list.

7. **CSS**: added `.label`, `.input`, `.newLink`, `.chipRow`, `.chip`,
   `.chipRemove`, `.pickerResults`, `.pickerResult` to
   `src/components/signal/signal.module.css`, using the same
   `var(--surface-2)` / `var(--border)` / `var(--radius-sm)` tokens as the
   rest of the file — no new design-system concepts introduced.

## Not build-verified
No network access this session, so `npm run build` could not be run.
Everything was checked by hand against the existing patterns in
`composer.tsx`, `room-view.tsx`, and the `/api/signal` routes (same fetch-
and-`router.refresh()` shape, same zod-validated POST bodies, same
`getSignalViewer()` 401 guard). Run `npm run build` first thing next
session before doing anything else — if drizzle's `ilike`/`ne`/`or`
imports in the new members-search route have any signature mismatch
against this project's drizzle-orm version, that's the most likely spot.

## Deploy steps
```
git add -A && git commit -m "Signal: room-creation + knock UI (HANDOFF-29)" && git push
```
No new migrations — this session only added routes/components/pages, no
schema changes.

## Next, in order
1. `npm run build` — verify the new route/components compile clean.
2. Smoke-test live: create a direct room, create a group room, send a
   knock, accept it from the other account.
3. Front-porch re-knock-after-rejection policy (flagged in HANDOFF-28,
   still open: `signal_requests` unique(from,to,type) will reject a second
   knock after the first was rejected — decide delete-old-row vs allow).
4. Pit admittance flow (HANDOFF-28 §2, decided but not built).
5. Hero Wall + Survivor Board schema (HANDOFF-28 §3, decided but not
   built).
