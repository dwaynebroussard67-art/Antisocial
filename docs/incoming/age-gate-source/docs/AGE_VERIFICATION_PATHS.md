# Age Verification — Three Paths

**Status:** schema shipped, gate live, verification method *not yet chosen*.
**Nothing below changes the schema.** Each path writes to the same three columns
(`age_status`, `age_verified_at`, `age_verified_by`, `age_method`). You can start
with A, add B later, and never migrate anything.

**No rush on this.** The gate holds today with zero verification in place, because
`unknown` is treated as minor. Every path below is a way to *open* access, not a
prerequisite for safety.

---

## Path A — Staff vouch (recommended first)

A staff member marks someone as an adult, because they know them.

```sql
update members
   set age_status      = 'adult',
       age_verified_at = now(),
       age_verified_by = 'staff:<uuid>',
       age_method      = 'staff_vouch'
 where id = '<member uuid>';
```

| | |
|---|---|
| **Cost** | $0 |
| **Build time** | Already built. This is one UPDATE. |
| **Friction for member** | None |
| **Accuracy** | High for people staff actually know; useless at scale |
| **Fails when** | You grow past the number of people you can personally vouch for |

**Why this first:** it matches how the ministry already works. Cribs is granted by
staff referral — a human already decides. This just records what that human decided.
For a community measured in dozens-to-low-hundreds, this is not a compromise, it is
the correct answer.

---

## Path B — Self-attestation with a real consequence

Member states their age. Stored with `age_method = 'self_attest'`.

| | |
|---|---|
| **Cost** | $0 |
| **Build time** | ~1 day (one screen, one endpoint) |
| **Friction** | One tap |
| **Accuracy** | Low — a determined kid clicks "yes" |
| **Fails when** | You need it to hold up to scrutiny |

**Only worth shipping if paired with:**
- Self-attested adults reach `mature`, **never** `heavy`. Heavy stays behind a
  human grant, which it already does — `member_sensitivity_ceiling()` requires
  staff/pit for heavy, and self-attestation grants neither.
- A staff member can revoke instantly, and revocation is audited.

**The honest framing:** self-attestation is not verification, it is a documented
intent. Its value is legal and cultural, not technical. That is still worth
something — but do not let it open `heavy`.

---

## Path C — Third-party verification

A vendor (Stripe Identity, Persona, Yoti, or similar) confirms age; you store only
the boolean result, never the document.

| | |
|---|---|
| **Cost** | ~$0.50–$1.50 per check |
| **Build time** | ~1 week |
| **Friction** | High — a kid in crisis will not do this, and should not have to |
| **Accuracy** | High |
| **Fails when** | Cost scales, or friction turns away the people you want |

**Where this actually fits:** not for members. For **Pit responders and staff** —
a small population, a real accountability need, and a group for whom friction is
appropriate because they are taking responsibility for others.

---

## Recommended sequencing

1. **Now:** Path A for everyone. Zero cost, matches existing practice.
2. **When the Pit opens:** Path C for Pit and staff only. Small group, high stakes.
3. **If you ever open public signup at scale:** Path B as the floor, with A and C
   still governing anything above `open` sensitivity.

**Never:** let any automated path grant `heavy`. That is a human decision by design,
and the constraint in `004_content_sensitivity.sql` enforces it structurally.

---

## The property that makes deferral safe

```sql
select coalesce((select age_status = 'adult' from members where id = m_id), false);
```

No row → false. Unknown → false. Minor → false. Lapsed → false.

Verified by exhaustive truth table over 1,104 member states: **704 of 704 non-adult
states see zero sensitive content.** The gate does not depend on which path you pick.
