# ANTISOCIAL — Handoff Document 30
**Base:** session11-fixed zip (HANDOFF-29).

## 1. HANDOFF-29's #1 order executed: BUILD VERIFIED ✓
`npm install && npm run build` on session 11's hand-written work: clean
first try. 30 pages, zero type errors. The flagged drizzle
ilike/ne/or worry in members/search did not materialize. Room-creation
UI, knock UI, and member picker are compile-verified.

## 2. Re-knock policy — DECIDED + BUILT (HANDOFF-29 item 3)
In `createFrontPorchRequest` (service.ts), matching the words already on
the door ("Not now", not "never"):
- rejected → a new knock RESETS the existing row to pending (new prompt,
  new createdAt, resolvedAt cleared). unique(from,to,type) index holds.
- muted → knocker receives the same response shape as success, but no
  new pending is created and the receiver sees nothing. Telling a
  knocker they're muted invites escalation; silence protects.
- pending/accepted → idempotent, returns existing row.
Build re-verified after the change.

## 3. Deploy
```
git add -A && git commit -m "Build-verified s11 + re-knock policy (HANDOFF-30)" && git push
```
No new migrations.

## 4. Next, in order (carried from HANDOFF-29)
1. Live smoke test: create direct + group rooms, knock, reject, RE-KNOCK
   (verify reset), accept, message, mark.
2. Pit admittance flow (HANDOFF-28 §2 — decided: QR never grants Pit;
   only answered calls; responder+survivor pair admittance).
3. Hero Wall + Survivor Board schema (HANDOFF-28 §3 — decided:
   consent-first at DB level, three visibility levels, independent
   consent, revocable).
4. Nura moderation layer into Signal; then HANDOFF-27 queue (Shooter UI).
