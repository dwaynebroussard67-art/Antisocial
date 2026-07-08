# ANTISOCIAL — Handoff Document 13
**Checkpoint date:** this session, second build pass.
**This supersedes HANDOFF-12.md for status, but nothing in Section 2 (the
vision) has changed — read that one first if you haven't.**

---

## 1. What happened this session

Followed the priority order HANDOFF-12 laid out: **skipped #1** (no
`block-members`/session file was provided this session — still needed),
went straight to **#2: ported Block Posts + Notifications** from
`docs/salvaged/original-upload-reference.txt` into the real project
structure. That work is done and described below.

**10 new files, all under `antisocial-project.zip`:**

```
src/lib/db/schema/block-posts.ts      — blockPosts, blockPostReplies, blockPostCheers tables
src/lib/db/schema/notifications.ts    — notifications, memberPresence tables
src/lib/db/schema/moderation.ts       — moderationFlags table (posts/replies report into this)
src/lib/block/post-schema.ts          — zod validation for create-post / create-reply
src/lib/block/rate-limit.ts           — 5 posts/10min, 10 replies/5min per member
src/lib/moderation/flag.ts            — flagForReview() helper
src/lib/notifications/notify.ts       — notifyMember() helper
src/app/api/block/posts/route.ts               — GET (list/paginate) + POST (create)
src/app/api/block/posts/[id]/replies/route.ts  — GET (list) + POST (create)
src/app/api/block/posts/[id]/cheer/route.ts    — POST (toggle cheer)
src/app/api/notifications/route.ts             — GET (list + unread count)
src/app/api/notifications/mark-read/route.ts   — POST (mark all read)
src/app/api/presence/heartbeat/route.ts        — POST ("online now" ping)
```

**Rename applied throughout:** every `blockMembers` reference from the
salvage became `members`, pointing at this project's real `members.ts`
table (same fix HANDOFF-12 already applied to `member-roles.ts`). Access
checks were rewired from the salvage's ad-hoc auth calls to this project's
real `requireBlockAccess()` from `src/lib/auth/roles.ts`, which is the
cascade-aware one (Block tier and up can post; Pit and Crib members aren't
locked out just because the feature is *called* "Block" Posts).

**One real bug fixed, not just ported:** the salvage's GET handler for
replies built its filter with `isNull(...), eq(...)` — a bare JS comma
expression, not `and(isNull(...), eq(...))`. That silently drops the
"exclude deleted" half of the condition, meaning deleted replies would
have leaked back into the feed. Fixed in
`src/app/api/block/posts/[id]/replies/route.ts`. The salvage also had a
second, duplicate GET handler later in the same blob that had the correct
version — only the correct one was kept.

**Everything else is untouched from HANDOFF-12** — Street/Block/Crib/Pit
pages, the alert ledger, the imagery, the auth/DB stubs, all identical to
last session's state.

---

## 2. What this gets you

Block Posts is now a real, wireable feature: create a post in one of five
sections (general/prayer/wins/questions/announcements), reply to it, cheer
it, get rate-limited if you spam it, and — once wired — get flagged into
moderation if reported. Notifications has list/unread-count/mark-read and
a `notifyMember()` helper any other feature (replies, badges, workshop,
mission board) can call to push one in. Presence heartbeat is a stub
endpoint for "online now" indicators anywhere in the UI.

**None of this is wired to UI yet.** No React components call these
routes. That's next.

---

## 3. What's still NOT done (unchanged priority order from HANDOFF-12, minus #2)

1. **Still need the real `block-members`/session file**, if one exists —
   send it and I'll reconcile against `members.ts` before this goes
   further, since Workshop/Mission Board/Arcade all hang off the same
   table.
2. ~~Port Block Posts + Notifications~~ — **done this session.**
3. **Port Workshop + Mission Board** — not started. Ties to the Crib "real
   participation earns trust" model.
4. **Port the Arcade** — not started. Most self-contained, least urgent.
5. **Wire Block Posts + Notifications into actual page UI** — the API
   routes exist, nothing renders them yet.

## 4. The real gaps — unchanged from HANDOFF-12, still blocking a real launch

Auth is still a stub. No database is provisioned. Neuro is still just a
link-out. The `blindfolded-face.jpg` image (confirmed this session against
a screenshot of the live Ministries site) is still staged but unplaced.
Legal/liability review for anything Narcan Watch-adjacent is still
outstanding. None of that moved this session — it wasn't the priority.

---

## 5. What to say to me next session

Paste this file. If you have `block-members`/session, attach it first —
same as last time, it's still the biggest unblock. Otherwise say "continue
the Antisocial build" and I'll move to Workshop + Mission Board.
