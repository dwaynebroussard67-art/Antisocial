# ANTISOCIAL — Handoff Document 28
**Base:** session9 zip (HANDOFF-27). This session: full SIGNAL MESSENGER
integration from the reconstructed zips, build-verified. Plus major design
decisions (not yet built) on Pit admittance and the Walls.

## 1. Signal messenger — INTEGRATED & BUILD-VERIFIED

Consent-first messaging spine, live in the codebase:
- `src/lib/db/schema/signal.ts` — 6 tables (rooms, room_members, messages,
  requests, marks, aftercare). Text-enum columns.
- `drizzle/0001_signal_tables.sql` — idempotent migration; apply-schema.mjs
  picks up all drizzle/*.sql automatically. RUN `npm run apply-schema`.
- `src/lib/signal/{types,permissions,service,viewer}.ts`
- API: /api/signal (board+create), /api/signal/[roomId] (read/send/mark),
  /api/signal/requests (+ accept/reject). All safeParse + 401/400/403.
- UI: /signal (board), /signal/front-porch (requests), /signal/rooms/[id]
  (room view + composer). Components in src/components/signal/, converted
  from the reconstruction's Tailwind to tokens.css (project has no Tailwind).
- NavBar: Signal link for all signed-in members, every tier incl. pit.

### Reconstruction fixes (v2-extractor damage, all documented in-file)
1. `tierOrder` was referenced but never defined in permissions.ts —
   defined to mirror roles.ts TIER_RANK: street < block < crib < pit.
2. **The known message-send permission gap is CLOSED**: new
   `canSendInRoom` enforces muted / canPost / canReply / boundaryOnly;
   sendSignalMessage calls it. boundaryOnly members can only send
   check-in and mark kinds.
3. `RoomType` was missing "pit-watch" (schema had it; permissions
   compared against it) — restored.
4. Five truncated service function bodies completed deterministically
   (listSignalBoard, createRoom, getRoom, createFrontPorch/createCheckIn,
   accept/rejectRequest). acceptRequest on a front-porch creates the
   direct room (consent-first: no thread until receiver says yes).
5. db.query.* → db.select(): this project's drizzle instance has NO
   schema object, so the relational API doesn't exist here.
6. Drizzle self-reference fix: parent_message_id needs
   `(): AnyPgColumn =>` annotation.
7. Re the old "missing 'mission' in a pgEnum" note: verified 'mission'
   IS present in both signal room type and request type enums here.

### Known limits (deliberate, next sessions)
- No UI yet for creating rooms or sending front-porch requests (APIs
  exist; board/porch/room UIs are read+act). Member picker needed.
- signal_requests unique(from,to,type) means a re-knock after rejection
  hits the unique index — decide policy (delete old row vs allow dupes).
- Fade visibility and burn expiry are honored on read (expired/deleted
  filtered) but no background sweeper deletes rows.
- Voice messages: schema+UI render voiceUrl, but no upload path yet.
- Nura moderation layer not wired into Signal yet.

## 2. PIT ADMITTANCE — DECIDED (D's doctrine, not yet built)
QR on Narcan kits NEVER grants Pit access. Three layers:
1. Life-saving info on scan: ungated, always (Narcan steps, 911, crisis).
2. "I need someone" on scan: one tap → watch alert. Near-zero friction.
3. PIT MEMBERSHIP: ONLY by answering the call — verified location
   response to a real alert. Responder AND survivor admitted together
   as a pair/team, to carry the grief together and later guide others.
   Scanning alone can route someone toward Block/house, never Pit.

## 3. HERO WALL + SURVIVOR BOARD — DECIDED (not yet built)
- Hero Wall: one picture per life saved, visible on every other tier.
- Survivor Board: alongside it; "your worst day wasn't your last day."
- Incentives = perks for proven members (recognition, merch drawings,
  covered meals for responder+survivor pairs), NEVER purchase/entry.
  Tier is never bought or won. Louisiana note: CASH drawings = licensed
  charitable gaming — paperwork before any cash raffle exists.
- CONSENT-FIRST AT THE DB LEVEL: default invisible; three levels (full
  photo+name / silhouette+date-or-number / off); responder and survivor
  consent independently; pair story only if both yes; revocable anytime.
- Builds on Alert Ledger (event) + pair admittance (relationship).

## 4. Deploy steps
```
git add -A && git commit -m "Signal messenger integration (HANDOFF-28)" && git push
npm run apply-schema   # Termux, DATABASE_URL exported — creates 6 signal tables
```
Vercel auto-deploys. Then sign in → Signal in the nav.

## 5. Next, in order
1. apply-schema + smoke-test Signal live (two accounts: knock, accept, message)
2. Front-porch send UI + room creation UI (member picker)
3. Pit admittance flow (alert response verification → pair admittance)
4. Hero Wall + Survivor Board schema (consent columns) + tier-page strips
5. Then back to HANDOFF-27's queue (Shooter etc.)

## 6. PWA layer — ADDED this session (28b)
Antisocial is now installable ("Add to Home Screen"): app/manifest.ts,
generated icons in public/icons/ (192/512/maskable/apple-touch, gold "A."
on near-black), minimal public/sw.js registered via
src/components/pwa/register-sw.tsx in the root layout.
SW doctrine: caches ONLY static assets (/_next/static, /icons, /images);
NEVER touches /api or pages — a safety platform must not serve stale
state. Web push for Narcan Watch alerts is the next PWA step (works on
Android; iOS requires the PWA installed first). If push ever proves
insufficient for the Watch, the move is a thin native notification
wrapper pointing at this same site — never a rebuild.
