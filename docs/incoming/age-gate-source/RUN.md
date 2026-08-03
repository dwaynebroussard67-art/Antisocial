# Age Gate — Deploy Runbook

> ## ⚠️ ARCHIVED SOURCE — DO NOT RUN STEP 2 FROM THIS FILE
>
> This is the original migration set as delivered, kept verbatim for
> provenance. **It targets a schema this repo never adopted.**
>
> **Step 1 (the migration) was adapted** into `drizzle/0003_age_gate.sql`.
> Run that one. It reuses the live `member_tier`, reads the live grant
> columns, and carries existing `adult_verified_at` rows forward instead
> of demoting verified adults to `unknown`.
>
> **Step 2 below is wrong for this database.** It writes `staff_role` and
> `pit_state` (lines ~62 and ~73) — columns that do not exist here. Running
> it produces `ERROR: column "staff_role" of relation "members" does not
> exist`. The live equivalents are `members.is_ministry_staff`,
> `member_roles.site_role`, `member_roles.crib_granted_at/by`, and
> `member_roles.is_misfit_first_responder`.
>
> **For grants, use `sql/grants.sql`** — one canonical write per door, plus
> an audit query showing who holds what.
>
> `docs/AGE_VERIFICATION_PATHS.md` in this same folder **is** accurate:
> every path there writes `members.age_status` / `age_verified_at` /
> `age_verified_by` / `age_method`, which is exactly what the live
> `member_is_adult()` reads. No drift in that file.

**Two steps. The second one is optional today.**

---

## Step 1 — Run the migration

```bash
psql "$DATABASE_URL" \
  -f migrations/001_age_status.sql \
  -f migrations/002_staff_pit.sql \
  -f migrations/003_access.sql \
  -f migrations/004_content_sensitivity.sql
```

Each file is idempotent and wrapped in a transaction. Safe to re-run. If one
fails, it rolls back alone and the others are unaffected.

**What happens:** every existing member lands on `age_status = 'unknown'`,
which is treated as minor. Everything above `open` sensitivity closes. Nothing
breaks, nothing opens.

### Verify it took

```sql
select age_status, count(*) from members group by 1;
-- expect: unknown | <all of them>

select member_can_view('<any member uuid>', 'the_eight');
-- expect: f

select member_can_view('<any member uuid>', 'base_campaign');
-- expect: t
```

If those three return `unknown / f / t`, the gate is live and correct.

---

## Step 2 — Pick a verification path (later, no rush)

See `docs/AGE_VERIFICATION_PATHS.md`. Recommendation: **Path A (staff vouch)**,
which is already built — it's one UPDATE statement. Nothing in the schema changes
regardless of which you pick.

---

## Grant an adult (Path A)

```sql
update members
   set age_status = 'adult', age_verified_at = now(),
       age_verified_by = 'staff:<your uuid>', age_method = 'staff_vouch'
 where id = '<member uuid>';
```

## Grant staff (opens Cribs)

```sql
update members
   set staff_role = 'minister', staff_granted_by = '<your uuid>',
       staff_granted_at = now()
 where id = '<member uuid>';
```

Cribs also requires `age_status = 'adult'`. Both conditions, enforced in the DB.

## Grant Pit

```sql
update members
   set pit_state = 'active', pit_granted_by = '<your uuid>',
       pit_granted_at = now()
 where id = '<member uuid>';
```

The constraint `members_pit_adult_ck` will **reject** this if the member is not a
verified adult and does not carry `pit_minor_scope`. That refusal is the policy
working, not a bug.

---

## In application code

Call **one** function. Never read the columns directly.

```sql
select member_can_view($1, $2);   -- (member_uuid, content_code)
```

Content codes live in `content_items`. Add new gated assets there with their two
axes; the gate picks them up with no code change.

---

## Tests

```bash
python3 test_access.py
```

Exhaustive truth table over 1,104 member states — every combination of age status,
tier progress, Pit state, staff role, consent age, and minor scope.

Current result:

```
non-adult states         : 704
  can enter the Block    : 664
  see ANY sensitive item : 0
states reaching THE EIGHT: 320   (all adult, all human-granted)
states with base game    : 1104 / 1104
```

Re-run after any change to `003_access.sql` or `004_content_sensitivity.sql`.

---

## Rollback

```bash
psql "$DATABASE_URL" -f migrations/999_rollback.sql
```

Drops the audit trail. Export `age_status_audit` first if you need the record.
