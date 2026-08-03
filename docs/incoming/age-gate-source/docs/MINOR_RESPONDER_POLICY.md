# Minor Responder Policy

**V1 status: dormant.** `pit_minor_scope` defaults to `false` and the database
constraint `members_minor_scope_consent_ck` blocks it from being set without
guardian consent on file. The Pit ships adults-only.

This document exists so the policy is written while thinking is clear, not
drafted under pressure the first time a fifteen-year-old asks to help.

---

## The ruling this implements

> "If you are a minor child, say, I don't care how old you are, but you are in a
> situation where you're agreeing to try to save somebody's life, you are probably
> already an adult. You've probably seen things that you shouldn't have seen."

That is correct, and the policy below does not argue with it. A kid who volunteers
to stand between someone and the worst night of their life has already been through
something. Treating them as a child insults them.

The policy is not about whether they are capable. It is about what the ministry owes
them in return, and what has to exist before that debt can be paid.

---

## Six mechanisms

### 1. Scoped role, not reduced rank
A minor in the Pit is not a lesser responder. They hold a **different post**:
presence, welcome, peer encouragement — the one thing an adult responder cannot
offer, which is *I have been where you are and I am still here.*

What they do not hold is the crisis call.

**Enforced by:** `can_take_flag()` — categories `self_harm`, `abuse`, `violence`,
`substance` are `adult_only = true` and never surface.

### 2. Routing before exposure
Adult-only flags never reach a minor responder's queue. Not "they decline it" —
they never see it. Exposure is the harm; declining happens after exposure.

**Enforced by:** routing rule in `003_access.sql`, not a policy paragraph.
Verified over all 1,104 member states: zero adult-only flags route to a non-adult.

### 3. Never alone
Every minor-responder interaction is paired to a named adult plus NURA. This is the
same two-adult pattern already designed for unsealing — no new idea required, just
apply the existing one.

### 4. Consent that expires
Guardian signs. Consent lapses after **90 days** and requires re-signature.
One-time consent becomes fiction within a month; expiring consent keeps a parent
genuinely in the loop.

**Enforced by:** `guardian_consent_valid()` — scope collapses automatically on
lapse, with no admin action required. Verified: every lapsed-consent state
returns `false`.

### 5. Mandatory debrief
After any flagged interaction, a required conversation with an adult. Not offered —
automatic. A kid who carries other people's crises gets hurt by them, and the
ministry that recruited them owns that.

### 6. A terminating adult
Every escalation path ends at a named adult with reporting responsibility. If
someone discloses abuse to a fifteen-year-old responder, the chain cannot end there.

---

## Activation checklist

Do not set `pit_minor_scope = true` for anyone until **all** of these are true:

- [ ] At least **two** adults on staff who can hold the pairing requirement
- [ ] A named adult per escalation path, with reporting responsibility understood
- [ ] Guardian consent form drafted and reviewed by someone with legal standing
- [ ] Debrief process written and someone assigned to run it
- [ ] Mandatory-reporter obligations for your state understood in writing
- [ ] The minor, the guardian, and the staff all understand exactly what is happening

The constraint in the database will keep refusing until consent exists. The
checklist is what keeps it honest after that.

---

## Why adults-only in V1

Not because the instinct about those kids is wrong. It isn't.

Because **every one of the six mechanisms above requires a second adult to exist**,
and today there is one of you. Mechanism 3 needs a pair. Mechanism 5 needs someone
to run the debrief. Mechanism 6 needs a terminating adult who is not also the
person who recruited them.

Ship the Pit adults-only. Open the door the day the staff exists to hold it.

**This is a sequencing call, and it is reversible the moment the checklist clears.**
