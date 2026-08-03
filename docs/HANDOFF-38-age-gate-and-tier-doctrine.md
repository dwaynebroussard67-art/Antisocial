# HANDOFF-38 — The Age Gate, Tier Doctrine, and the Standing Rule

---

## 0. THE STANDING RULE — applies to every interaction from here on

D, verbatim:

> "From now on, you are no longer to tell me the problems. I don't need to know
> the problems. I need to know the solutions... it'll always be better instead
> of telling me what's wrong to tell me how to fix them. **The problem is only a
> problem if there's no solution offered with it.**"

**This is not a suggestion about tone. It is a working constraint on output.**

- A problem raised without a proposed fix is an incomplete deliverable.
- Where a decision is genuinely D's to make (and some are — he said so
  explicitly, and wouldn't trade that), the format is: *here are the options,
  here's the recommendation, here's what I'll do if you don't answer.* Not:
  *here's a problem, what do you want to do.*
- "Blocked on D" is only acceptable after the blocking thing has been reduced
  to the smallest possible decision. See §2 for the worked example — the age
  gate sat blocked for weeks on "how do we verify age," when the actual
  blocker was a twenty-minute schema change that never needed the answer.

---

## 1. Tier doctrine — D's rulings, final

### Cribs is granted, not climbed

> "Cribs is reserved for staff members. You can't get off the block unless...
> for staff members or heavy volunteers, in which case it would be a referral
> system from staff."

This closes a real hole. Tier progression is not an age gate — a determined
eleven-year-old climbs faster than a busy adult, so anything gated purely on
progression is gated on *engagement*, which is the exact mechanism this
platform exists to refuse.

Because Cribs requires a human referral, engagement cannot reach it. A human
gate beats any automated age check. **Minors will effectively never be Crib
members, barring extraordinary circumstances, because Crib membership means
staff membership.**

### The Pit is cross-cutting

> "Pit members, by definition, are members of all other tiers. If you are a
> member of the pit, you have access to every tier. Because these people have
> offered to volunteer to give their time to try to save people's lives."

The live schema already encoded this — `member_tier` is `('street','block','crib','pit')`
with Pit top-of-cascade. No restructuring was needed.

### On minors in the Pit

> "If you are a minor child — I don't care how old you are — but you're in a
> situation where you're agreeing to try to save somebody's life, you are
> probably already an adult. You've probably seen things that you shouldn't
> have seen."

Recorded as correct and not argued with. The policy that implements it
(`docs/incoming/age-gate-source/docs/MINOR_RESPONDER_POLICY.md`) is written and
**ships dormant** — six mechanisms, every one of which requires a second adult
to exist. Today there is one. The column and its constraint are in place so the
door opens the day the staff exists to hold it, not before.

---

## 2. The age gate — shipped

**The unblock:** two questions had been treated as one.

| Question | Difficulty |
|---|---|
| "How do I know someone's real age?" | Hard. Philosophical. No clean answer. |
| "What column stores what I know?" | Twenty minutes. |

The second never depended on the first. The column ships with everyone marked
`unknown`, `unknown` is treated as `minor`, and everything above `open`
sensitivity closes automatically. **The gate holds from day one with zero
verification infrastructure.** A verification method can be chosen later and
changes nothing about the schema.

### Migration `drizzle/0003_age_gate.sql`

Adapted from D's migration set (archived verbatim at
`docs/incoming/age-gate-source/`). Three adaptations were required because the
source targeted a different schema:

1. **Tier.** Source created a new `tier` type `('street','block','porch','crib')`.
   This repo already has `member_tier` `('street','block','crib','pit')` on
   `member_roles`. Creating the source's type would have produced two
   conflicting tier systems. Reused the live one.
2. **Grants.** Source added `staff_role` / `pit_state` columns. This repo
   already has `is_ministry_staff`, `site_role`, `crib_granted_at/by`,
   `is_misfit_first_responder`. Predicates read the live columns instead of
   duplicating them.
3. **Existing adults.** `members.adult_verified_at` already existed as a binary
   check. §2 of the migration **carries those rows forward** into
   `age_status = 'adult'` with provenance. Without that step, running the
   migration would have silently demoted every already-verified adult to
   `unknown` and locked them out of things they'd legitimately been granted.

### Safety properties

| | |
|---|---|
| **S1** | `unknown` age → treated as minor, everywhere, no exceptions |
| **S2** | missing row → `false`. No row, no answer, no access |
| **S3** | heavy content → requires a human grant **AND** verified adult |
| **S4** | engagement → can never reach Crib or Pit; both are granted |
| **S5** | lapsed guardian consent → minor responder scope collapses automatically |

Every predicate is `coalesce(..., false)`. That is the whole safety property.

### Two axes: place and content

Gating on tier alone forced a bad choice — cap minors at Street and they never
enter the open world, or open the Block and the story hints inside it open too.
Neither is right; the ministry exists to reach kids.

So place and content are separate:

- `member_tier_ceiling()` — **where** you can go. Non-adults reach `block`.
- `member_sensitivity_ceiling()` — **what** you can see there. Non-adults are
  held to `open`.
- `member_can_view(member, item)` — checks both. This is what the app calls.

New gated assets are rows in `content_items`, so adding one is a data change,
not a deploy.

---

## 3. Alley Cat content gating — D's ruling

> "In the first part of the game, when you first start playing, the image of him
> killing for the first time doesn't need to be shown. It just needs to be lead
> up to it, and then all of a sudden the scene cuts. Now you don't know what
> happened. You can assume, but you don't know."

The cut-away is better craft than a full scene, and it is load-bearing for the
theme: the player watches the lead-up, the screen cuts, and **they** decide Alley
is a killer without having seen it — performing the game's own thesis on the
protagonist, assigning a label with no standing to assign it. Cribs, much later,
shows them they were right and asks how that felt. The base game cannot do that
if it shows the body.

| Content | Tier | Sensitivity | Registered as |
|---|---|---|---|
| 9-chapter base campaign | street | open | `base_campaign` — never gated |
| Block-tier hints (implication, aftermath, no depiction) | block | mature | `block_hints` |
| The eight, named and shown | crib | heavy | `the_eight` |
| The ninth ask | crib | heavy | `ninth_ask` |

Base game targets PG/PG-13. The heavy material is Crib-only, which by §1 means
staff-granted, which means adults.

---

## 4. Deploy

```bash
psql "$DATABASE_URL" -f drizzle/0003_age_gate.sql
```

Idempotent, wrapped in a transaction, safe to re-run. Verify:

```sql
select age_status, count(*) from members group by 1;   -- expect: unknown | <all>
select member_can_view('<uuid>', 'the_eight');          -- expect: f
select member_can_view('<uuid>', 'base_campaign');      -- expect: t
```

`unknown / f / t` means the gate is live and correct.

**Not yet run against a live database** — this environment has no `DATABASE_URL`.
`npx tsc --noEmit` and `npm run build` both pass.

### Choosing a verification method — later, no rush

Three paths written up in `docs/incoming/age-gate-source/docs/AGE_VERIFICATION_PATHS.md`.
All three write the same four columns, so starting with one and adding another
migrates nothing. Recommended first: **staff vouch** — $0, already built, it's
one UPDATE.

---

## 5. Follow-ups this creates

1. **`members.adult_verified_at` is deprecated, not dropped.** Its one reader
   (`lib/arcade/variants.ts`) now delegates to `isVerifiedAdult()`. Drop the
   column once the migration has run against production and nothing references
   it.
2. **`docs/incoming` is excluded from `tsconfig.json`** — the archived arcade
   bundle has its own dependency tree (three, @react-three/fiber) and was being
   compiled by the host app.
3. **Nura's moderation path does not yet consult age.** A `sexual_minor` flag
   involving a member whose `age_status` is `minor` is categorically more urgent
   than the same flag between two verified adults, and the pipeline currently
   can't tell the difference. The predicate now exists to make that distinction —
   wiring it is the next moderation task.
