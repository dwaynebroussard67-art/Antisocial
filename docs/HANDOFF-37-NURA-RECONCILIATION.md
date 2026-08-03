# HANDOFF-37 — Nura reconciliation: one brain, three rulings

**Target:** Claude Code
**Repo:** antisocial (antisocial-eight.vercel.app)
**Backend:** Supabase `misfit-backend` (ref `seoguauzvvrefoupxgom`)
**Supersedes:** the Nura sections of HANDOFF-36 (§C3). The tables and classifier
shipped in PR #1 are replaced by what's below. HANDOFF-36's C1 (ladder) and C2
(games registry) are unaffected.

---

## 0. What happened

Two Nura implementations exist, built in parallel without knowledge of each other.

**A — the safety-layer build** (`nura-safety-layer-handoff.zip`, `nura-safety-layer-build.zip`).
A three-tier pipeline with per-site posture, a consequence engine, quiet mode,
and an admin console. Built against a sandbox schema.

**B — PR #1's moderation layer** (merged to `main` as `f687e0c`).
A two-band classifier with quarantine-before-visible, wired into the real repo's
block posts, replies, and Signal.

They collide: both define a table named `nura_actions`, with different shapes.
B's is already merged.

**Ruling: A is the architecture. B contributes three things A lacks and is
otherwise removed.** The three decisions below are the substance of that.

---

## 1. Decision one — one schema, and it's A's

### Why A wins

- **A has a `predation` flag; B has none.** A's `nura_flag` enum carries
  `predation` with its own lexicon — *"don't tell anyone," "how old are you,"
  "are your parents home," "let's move this somewhere private," "keep this
  secret."* Grooming is not hate speech and scores near zero on B's scale.
  For a ministry serving vulnerable people including minors, this is the gap
  that decides it.
- **A resolves context before judging; B judges text in isolation.** A's Tier 2
  weighs reciprocity, whether the target is actually in the room, playful
  markers, and escalation history. B would quarantine *"you're an idiot lol"*
  between two friends. In a community built on ribbing each other, that
  difference is the product.
- **A's crisis path summons help.** It dispatches a responder *and* posts a
  holding message. B quarantines and waits for staff to notice.
- **A has quiet mode.** Ship watching, not acting: log what it *would* have
  done. B enforces from the first commit, with no soak.
- **A is two sites, one brain** (`antisocial` / `misfit`) with per-site
  tolerance — `high_playful_bias` vs `iron_fist`. B knows one site.
- **A separates nomination from decision.** `decided_by: code | llm | human`,
  and the LLM only ever produces a label; code alone picks consequences.
- **A's config lives in the database** (`nura_config`, site-keyed, hot-editable,
  with an admin console already built). B's lexicon lives in an env var.

### What survives from B

Three things, and only these:

1. **Quarantine-before-visible.** A inserts the message, *then* runs the
   pipeline, *then* issues `remove_post`. That leaves a window where predation
   or crisis content is live in a room with minors in it. B writes content held
   and promotes it only once cleared. **B's ordering is adopted; A's
   `remove_post` becomes the fallback for anything that slipped through.**

2. **Signal coverage.** A states plainly: *"Ingest is public-commons only …
   never touches a Signal/private-DM table — there isn't one in this schema."*
   Antisocial has Signal, and private rooms are exactly where grooming happens.
   **The pipeline must ingest Signal messages, not only public commons.**

3. **Real-schema binding.** A targets a sandbox: `chapel_messages`,
   `members.handle`, integer member ids. This repo has uuid member ids, no
   `handle` column, and no `chapel_messages` table. A is a prototype and must
   be ported, not copied.

### Concretely

**Adopt from A:**
```
nura_config      site-keyed config + lexicons, hot-editable
nura_log         append-only decision log (mutation blocked by trigger)
nura_actions     site / target_type / target_id / action / active / reversed_*
nura_reminders   ambient room-wide nudges
enums: nura_site, nura_stage, nura_flag, nura_action, nura_decided_by,
       nura_target_type
```
Port to uuid member ids. `nura_log.member_id` and `nura_actions.target_id` are
`text` in A; keep them `text` so a target can be either a member uuid or a
message uuid without a polymorphic FK, but document that.

**Remove from B:**
```
content_quarantine    — replaced by A's nura_log + the hold columns below
nura_actions (B's)    — replaced by A's, same name, different shape
member_bans           — replaced by nura_actions where target_type='user'
                        and action='remove_user' and active=true
enums: nura_verdict, quarantine_status, nura_action_kind
lib/moderation/nura-bands.ts       — superseded by A's tiers + thresholds
lib/moderation/nura-classifier.ts  — superseded by A's tier1/tier2/tier3
```

**Keep from B — the hold mechanism is columns, not tables:**
```
block_posts.status = 'quarantined'      (enum value)
block_post_replies.status                (column)
signal_messages.quarantined_at           (column)
```
These are what make quarantine-before-visible work, and they survive the table
swap untouched. Reads already filter on them.

**Rewire:** `isBanned()` in `lib/auth/session.ts` currently reads `member_bans`.
It must read A's `nura_actions` instead — `target_type='user'`,
`action='remove_user'`, `active=true`. The ban-enforcement behaviour is
unchanged; only its source table moves.

---

## 2. Decision two — silence for cruelty, voice for crisis

Both systems were internally consistent and opposite to each other. The ruling
splits by situation rather than picking one wholesale.

| Situation | Nura's voice |
|---|---|
| Cruelty, hate, harassment | **Silent.** Content held, never visible. The author is never told — not at hold, not during review, not on removal. |
| Predation | **Silent to the actor, loud to staff.** Message held instantly, responders and staff alerted immediately. The actor learns nothing. |
| Crisis (self-harm, "I want to disappear") | **Speak.** Pastoral holding reply *and* responder dispatch. |
| Ambient hate rate across the room | **Room-wide, no names.** A's `nudge_public` is permitted because it aims at nobody. |

**Why crisis is the exception.** Silence is the right instrument for someone who
may have worded something badly, or whom Nura may have misread — the reason it
exists is to avoid accusing the innocent. A person saying they want to die is
not being accused of anything. Quiet removal is the wrong response to a cry for
help; *"I see you"* is the right one. B's blanket silence would have swallowed
exactly the message this ministry exists to answer.

**Boundary that must hold:** the ambient nudge may never be traceable to one
message or one person. It fires on a site-wide count over a window, carries no
names, and must not be emitted when the window contains only one incident —
otherwise "room-wide, no names" is a name with extra steps. Add that guard;
A's `ambientHateRateThreshold` should be `>= 2` and enforced, not merely
configured.

---

## 3. Decision three — predation holds and wakes, it does not auto-ban

### The defect

A's Tier 1 routes `predation` straight to `applyConsequence` →
`handlePredation` → `remove_user`. No Tier 2 pass, no human, on a single
lexicon match.

One of those lexicon entries is **"how old are you."**

Two twelve-year-olds meet in the Chapel. One asks the other how old they are.
Under this rule that child is removed from the site — from a ministry that may
be the only safe place they have — for asking an ordinary question. A has a
whole context-resolution stage built and simply doesn't use it here.

### The ruling

Predation stays the most serious flag. What changes is the consequence:

- **Hold the message immediately.** Instant, silent, before anyone reads it.
  Nobody is at risk while this is looked at.
- **Wake a human immediately.** Staff and responders alerted at once, not
  queued. This is the highest-priority alert in the system.
- **Do not `remove_user` on a Tier 1 match alone.**

`remove_user` for predation requires **either**:
- Tier 2 corroboration (target present and a minor, no reciprocity, escalation
  across messages, prior flags), **or**
- a human decision.

The dangerous message disappears instantly either way. The difference is only
whether a curious kid gets thrown out for it.

**Note the asymmetry with B's Band A, which is retained in spirit:** B required
two independent signals before an automatic ban. That brake was there for this
exact failure and should not be lost in the port.

---

## 4. Migration ordering

**Open question that gates everything: has `node apply-schema.mjs` run since
PR #1 merged?** The answer changes the first step and nothing else.

**If it has not run** — B's Nura tables never existed in Postgres. Remove them
from the code before any migration is applied; A's schema lands on clean ground.
No drop migration, no data to move.

**If it has run** — B's tables exist for real. They need an explicit drop
migration ordered *ahead* of A's, because `nura_actions` will otherwise fail to
create.

The same answer says whether production is currently healthy. Since the merge,
if the migration never ran, `main` has been deployed with Block posting broken
(every post writes a quarantine row) and the arcade dark (fail-closed with no
variants table) — both working as designed against tables that aren't there.

**Sequence:**

1. Answer the question above.
2. Drop B's Nura tables (or skip if never created).
3. Apply A's Nura schema, ported to uuid.
4. Wire the pipeline into block posts, replies, **and Signal**.
5. Rewire `isBanned()` onto `nura_actions`.
6. Ship with `quiet_mode.enabled = true` on both sites.
7. Soak. Read `nura_log` for what it *would* have done.
8. Flip quiet mode off, one site at a time.

Steps 6–8 are the same three-step shape as the age-enforcement rollout and for
the same reason: flipping enforcement on deploy day, against a lexicon nobody
has watched run, is how you remove people who did nothing.

---

## 5. Carried forward, unresolved

1. **Voice with no transcript is unscreened.** Nothing to read, so it passes.
   Closes when transcription is always-on.
2. **No staff review surface in this repo.** A ships an admin console
   (`/admin/nura`) against its sandbox schema; it needs porting alongside the
   pipeline, or Tier 1 holds accumulate with nothing to resolve them.
3. **No admin or moderator is seeded.** An alert with nobody to receive it is
   a hold that sits forever. Seed at least one before quiet mode comes off.
4. **`min_age` still has no writer.** `members.adult_verified_at` exists and
   nothing sets it. Unrelated to Nura, still true, still blocking the Crib
   Pac-Man build.

---

## 6. What this does not touch

The ladder (HANDOFF-36 C1), the games registry (C2), Chapel-as-a-space, the
`spaces` primitive, ranks, teaching sessions, and the lost-sheep tables are all
unaffected. The Foundation Rebuild build order stands, with this work slotting
in beside the age/child-safety PRs rather than after them — predation detection
and age status are the same layer, and §3's enforcement doctrine applies to
both: what protects a child belongs as close to the database as it can get.
