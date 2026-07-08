# ANTISOCIAL — Handoff Document 17
**Checkpoint date:** this session.
**Supersedes HANDOFF-16 for status. Vision (Section 2 of HANDOFF-12, restated in `docs/HANDOFF.md`) unchanged.**

---

## 1. What happened this session

Followed the priority order HANDOFF-16 laid out: skipped the still-outstanding
`block-members`/session file request (still needed), went straight to the next
item — **ported Workshop + Mission Board** from `docs/salvaged/original-upload-reference.txt`
into the real project structure, same pattern HANDOFF-13 used for Block Posts.

**12 new files:**

```
src/lib/db/schema/mission-board.ts        — missionBoardNeeds, missionBoardSignups tables
src/lib/db/schema/workshop.ts             — workshopProjects, workshopVolunteers, workshopUpdates, workshopDiscussionComments
src/lib/mission-board/schema.ts           — zod validation for creating a need
src/lib/mission-board/signup.ts           — signUpForNeed/cancelSignup, row-locked against overselling slots
src/lib/workshop/volunteers.ts            — joinProject/leaveProject/completeProject
src/lib/roles/events.ts                   — NEW: emitMemberEvent() — badges/memberEvents tables already
                                             existed in member-roles.ts, but nothing called them yet
src/app/api/mission-board/needs/route.ts                    — GET (list) + POST (create, Crib+)
src/app/api/mission-board/needs/[id]/signup/route.ts        — POST/DELETE (signup/cancel, Block+)
src/app/api/workshop/projects/route.ts                      — GET (list) + POST (create, Crib+)
src/app/api/workshop/projects/[id]/volunteers/route.ts      — POST/DELETE (join/leave, Block+)
src/app/api/workshop/projects/[id]/complete/route.ts        — POST (Crib+ only — triggers badge awards)
src/app/api/workshop/projects/[id]/comments/route.ts        — GET/POST (project discussion)
```

**Rename applied throughout, same convention as Block Posts:** `blockMembers` →
`members`; `requireHouseAccess` → `requireCribAccess`. `requireBlockAccess` stayed
as-is (the name didn't change between the salvage and this project).

**One bug caught before it shipped, not after:** while writing
`workshop.ts`, I started typing the exact same wrong import (`sql` from
`"drizzle-orm/pg-core"` instead of `"drizzle-orm"`) that HANDOFF-16 fixed
in `block-posts.ts`. Caught it by actually running `next build` before
declaring this done — first pass failed with the identical error, fixed
immediately after. Worth calling out because it's a easy mistake to repeat
across files; every future schema file that uses `sql` should import it
from `"drizzle-orm"`, not `"drizzle-orm/pg-core"`.

**Verified, not assumed:** ran `npm install` → `next build` end to end
after the port. Clean build, all 19 routes compile and export (11 from
before this session + 8 new ones). This matches the standard HANDOFF-16
set going forward: nothing in this handoff is claimed without having
actually run the build.

---

## 2. What this gets you

**Mission Board** is now real: post a need (Crib+ only — title, description,
category, virtual-or-location, slots needed, optional deadline), members
sign up (Block+), slot-count is enforced with a row lock so two people can't
grab the last slot simultaneously, and signups can be cancelled and later
re-activated without leaving duplicate rows.

**Workshop** is now real: create a project (Crib+, auto-enrolled as "Lead"),
members join/leave the volunteer roster (Block+), post discussion comments,
and mark a project complete (Crib+ only) — completion is the single path
that awards the `workshop_builder` badge to every active volunteer, via the
new `emitMemberEvent()` helper.

**None of this is wired to UI yet** — same caveat HANDOFF-13 gave for Block
Posts. No React components call these routes. That's the next step once
someone decides UI is the priority over further porting.

---

## 3. A gap worth flagging: the `workshop_builder` badge isn't seeded

`emitMemberEvent()` will log a `console.warn` and silently skip awarding
the badge the first time anyone completes a Workshop project, because no
seed data inserts a `workshop_builder` row into the `badges` table yet.
This is the same "loud, not silent" behavior the salvage's original code
had — it's not a bug, it's a deliberately visible gap. Before this feature
is used for real, someone needs to insert that badge row (via a seed
script or `drizzle-kit studio` directly). No seed script exists in this
project yet at all — that's a separate, standing gap, not new this session.

---

## 4. What's still NOT done (carried forward from HANDOFF-16, minus Workshop/Mission Board)

1. Still need the real `block-members`/session file, if one exists.
2. ~~Port Workshop + Mission Board~~ — **done this session.**
3. Port the Arcade — not started. The salvage's Arcade section alone (trivia,
   a full card-war engine, Elo-rated chess, a Clue-style multiplayer mystery
   game with server-side hand-redaction, a side-scrolling shooter, and a
   stat/quest/combat RPG) is larger than everything ported so far combined.
   Recommend treating it as several separate sessions, not one — it does not
   fit the "port one feature, verify the build, hand off" rhythm this session
   and HANDOFF-13 established.
4. Wire Block Posts + Notifications + Workshop + Mission Board into UI —
   routes exist for all four now, nothing renders any of them yet.
5. `blindfolded-face.jpg` swap and remaining duplicate-image groups — untouched.
6. `NuraPresence`'s `--accent-gold` vs. the confirmed crimson accent — untouched.
7. No seed script exists in this project (the salvage had one; it wasn't
   ported). Needed for the badge gap in §3, and generally useful before any
   real testing against a live database.

## 5. Real gaps — unchanged

Auth is still a stub. No database provisioned — none of this session's code
has been exercised against a real Postgres instance, only compiled. No git
commit has been made of this session's work yet (the repo itself now has
history, per HANDOFF-16 — this new work still needs its own `git add` /
`git commit` / `git push`). Legal/liability review for anything Narcan
Watch-adjacent still outstanding.

---

## 6. What to say to me next session

Paste this file. If you have the real `block-members`/session file, attach
it first — still the biggest unblock. Otherwise say "continue the
Antisocial build" and specify Arcade (recommend breaking it into sub-pieces:
trivia/scores first, then War, then Chess, then the Mystery game, then the
shooter, then the RPG — in that order, easiest-to-hardest) or UI wiring for
what's already ported.
