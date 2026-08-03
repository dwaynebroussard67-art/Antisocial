# -*- coding: utf-8 -*-
"""
Exhaustive truth-table test of the access predicates.

WHY THIS EXISTS
  No Postgres in this sandbox, and "the SQL looks right" is not evidence.
  The predicate logic is ported 1:1 to Python and driven over the FULL
  cross product of member states. Every safety property is asserted as a
  falsifiable claim over every reachable input, not spot-checked.

  Ported logic is kept structurally identical to the SQL so a reviewer can
  diff them line by line. If the SQL changes, change this and re-run.

SAFETY PROPERTIES UNDER TEST
  S1  unknown age is treated exactly like minor, in every combination.
  S2  a missing member returns false for every predicate.
  S3  crib requires (staff or pit) AND adult.
  S4  tier_progress alone can NEVER reach crib. Engagement is not a key.
  S5  lapsed guardian consent collapses minor scope automatically.
  S6  adult-only flag categories never route to a non-adult.
  S7  no predicate ever raises; all return a bool.
"""
import itertools
import sys
from datetime import datetime, timedelta, timezone

NOW = datetime(2026, 8, 3, tzinfo=timezone.utc)

AGE = ["unknown", "minor", "adult"]
TIERS = ["street", "block", "porch", "crib"]
TIER_RANK = {t: i for i, t in enumerate(TIERS)}
PIT = ["none", "pending", "active", "paused", "revoked"]
STAFF = [None, "minister", "moderator", "admin"]
CONSENT = [None, NOW - timedelta(days=10), NOW - timedelta(days=120)]

failures = []


class Member(dict):
    """A row in members."""
    pass


# ---------------------------------------------------------------- predicates
# Ported 1:1 from 003_access.sql. coalesce(x, false) == the `or False` idiom.

def member_is_adult(m):
    if m is None:
        return False
    return m["age_status"] == "adult"


def guardian_consent_valid(m):
    if m is None:
        return False
    c = m["guardian_consent_at"]
    return c is not None and c > NOW - timedelta(days=90)


def member_is_staff(m):
    if m is None:
        return False
    return m["staff_role"] is not None


def member_is_pit(m):
    if m is None:
        return False
    return m["pit_state"] == "active"


def pit_minor_scope_active(m):
    if m is None:
        return False
    return (m["pit_minor_scope"]
            and not member_is_adult(m)
            and guardian_consent_valid(m))


def member_tier_ceiling(m):
    """Revised in 004: non-adults may enter the Block (the open world)."""
    if m is None:
        return "street"
    if (member_is_staff(m) or member_is_pit(m)) and member_is_adult(m):
        return "crib"
    if member_is_adult(m):
        return "porch"
    return "block"


SENS = ["open", "mature", "heavy"]
SENS_RANK = {s_: i for i, s_ in enumerate(SENS)}

CONTENT = {
    "base_campaign": ("street", "open"),
    "block_hints":   ("block",  "mature"),
    "porch_context": ("porch",  "mature"),
    "the_eight":     ("crib",   "heavy"),
    "ninth_ask":     ("crib",   "heavy"),
}


def member_sensitivity_ceiling(m):
    if m is None:
        return "open"
    if member_is_adult(m) and (member_is_staff(m) or member_is_pit(m)):
        return "heavy"
    if member_is_adult(m):
        return "mature"
    return "open"


def member_can_view(m, item_code):
    if m is None or item_code not in CONTENT:
        return False
    min_tier, min_sens = CONTENT[item_code]
    return (member_can_access(m, min_tier)
            and SENS_RANK[min_sens] <= SENS_RANK[member_sensitivity_ceiling(m)])


def member_can_access(m, required):
    if m is None:
        return False
    if TIER_RANK[required] > TIER_RANK[member_tier_ceiling(m)]:
        return False
    return (member_is_pit(m)
            or member_is_staff(m)
            or TIER_RANK[required] <= TIER_RANK[m["tier_progress"]])


FLAG_ADULT_ONLY = {
    "self_harm": True, "abuse": True, "violence": True, "substance": True,
    "grief": False, "loneliness": False, "welcome": False, "peer": False,
}


def can_take_flag(m, flag_code):
    if m is None or flag_code not in FLAG_ADULT_ONLY:
        return False
    return member_is_pit(m) and (
        not FLAG_ADULT_ONLY[flag_code] or member_is_adult(m))


# ---------------------------------------------------------------- constraints
def violates_db_constraints(m):
    """Rows the DB CHECK constraints would reject. Excluded from testing."""
    if m["pit_minor_scope"] and m["guardian_consent_at"] is None:
        return True                      # members_minor_scope_consent_ck
    if (m["pit_state"] == "active"
            and m["age_status"] != "adult"
            and not m["pit_minor_scope"]):
        return True                      # members_pit_adult_ck
    return False


def all_members():
    for age, tp, pit, staff, consent, scope in itertools.product(
            AGE, TIERS, PIT, STAFF, CONSENT, [False, True]):
        m = Member(age_status=age, tier_progress=tp, pit_state=pit,
                   staff_role=staff, guardian_consent_at=consent,
                   pit_minor_scope=scope)
        if violates_db_constraints(m):
            continue
        yield m


ROWS = list(all_members())

# ---------------------------------------------------------------- S1
# unknown must behave identically to minor in every combination.
for m in ROWS:
    if m["age_status"] != "unknown":
        continue
    twin = Member(m)
    twin["age_status"] = "minor"
    if violates_db_constraints(twin):
        continue
    for t in TIERS:
        if member_can_access(m, t) != member_can_access(twin, t):
            failures.append(
                f"S1 unknown != minor for tier {t}: {dict(m)}")
    if member_tier_ceiling(m) != member_tier_ceiling(twin):
        failures.append(f"S1 ceiling differs: {dict(m)}")
    for f in FLAG_ADULT_ONLY:
        if can_take_flag(m, f) != can_take_flag(twin, f):
            failures.append(f"S1 flag {f} differs: {dict(m)}")

# ---------------------------------------------------------------- S2
for fn, name in [(member_is_adult, "member_is_adult"),
                 (member_is_staff, "member_is_staff"),
                 (member_is_pit, "member_is_pit"),
                 (guardian_consent_valid, "guardian_consent_valid"),
                 (pit_minor_scope_active, "pit_minor_scope_active")]:
    if fn(None) is not False:
        failures.append(f"S2 {name}(missing) did not return False")
for t in TIERS:
    if member_can_access(None, t) is not False:
        failures.append(f"S2 member_can_access(missing, {t}) not False")
for f in list(FLAG_ADULT_ONLY) + ["nonexistent_flag"]:
    if can_take_flag(None, f) is not False:
        failures.append(f"S2 can_take_flag(missing, {f}) not False")

# ---------------------------------------------------------------- S3
for m in ROWS:
    if member_can_access(m, "crib"):
        if not member_is_adult(m):
            failures.append(f"S3 CRIB LEAK to non-adult: {dict(m)}")
        if not (member_is_staff(m) or member_is_pit(m)):
            failures.append(f"S3 CRIB LEAK without grant: {dict(m)}")

# ---------------------------------------------------------------- S4
# The headline property: engagement is not a key. A member with maxed
# tier_progress but no human grant must never reach crib.
for m in ROWS:
    if m["tier_progress"] == "crib" and not (member_is_staff(m) or member_is_pit(m)):
        if member_can_access(m, "crib"):
            failures.append(
                f"S4 ENGAGEMENT REACHED CRIB (no grant): {dict(m)}")
# ...and an unverified member cannot exceed BLOCK no matter what they grind.
for m in ROWS:
    if not member_is_adult(m):
        for t in ["porch", "crib"]:
            if member_can_access(m, t):
                failures.append(
                    f"S4 NON-ADULT EXCEEDED BLOCK at {t}: {dict(m)}")

# ---------------------------------------------------------------- S8
# CONTENT AXIS. A non-adult standing in the Block must see ONLY 'open'
# content. This is the property that lets kids into the open world without
# letting the story hints out.
for m in ROWS:
    for code, (mt, ms) in CONTENT.items():
        if member_can_view(m, code):
            if ms in ("mature", "heavy") and not member_is_adult(m):
                failures.append(
                    f"S8 SENSITIVE CONTENT '{code}' TO NON-ADULT: {dict(m)}")
            if ms == "heavy" and not (member_is_staff(m) or member_is_pit(m)):
                failures.append(
                    f"S8 HEAVY CONTENT '{code}' WITHOUT GRANT: {dict(m)}")
            if mt == "crib" and not member_can_access(m, "crib"):
                failures.append(
                    f"S8 crib content without crib access: {dict(m)}")
    if member_can_view(m, "no_such_item"):
        failures.append(f"S8 unknown content code allowed: {dict(m)}")

# S9: the base campaign must be reachable by EVERYONE. If the gate locks
# kids out of the actual game, the gate is wrong.
for m in ROWS:
    if not member_can_view(m, "base_campaign"):
        failures.append(f"S9 BASE GAME LOCKED for member: {dict(m)}")

# S10: 'the_eight' is the heaviest asset. Enumerate exactly who reaches it.
eight = [m for m in ROWS if member_can_view(m, "the_eight")]
for m in eight:
    if not (member_is_adult(m) and (member_is_staff(m) or member_is_pit(m))):
        failures.append(f"S10 THE EIGHT LEAKED: {dict(m)}")

# ---------------------------------------------------------------- S5
for m in ROWS:
    if m["pit_minor_scope"] and m["guardian_consent_at"] == NOW - timedelta(days=120):
        if pit_minor_scope_active(m):
            failures.append(f"S5 LAPSED CONSENT still active: {dict(m)}")

# ---------------------------------------------------------------- S6
for m in ROWS:
    for f, adult_only in FLAG_ADULT_ONLY.items():
        if can_take_flag(m, f):
            if not member_is_pit(m):
                failures.append(f"S6 non-pit took flag {f}: {dict(m)}")
            if adult_only and not member_is_adult(m):
                failures.append(
                    f"S6 CRISIS FLAG '{f}' ROUTED TO NON-ADULT: {dict(m)}")
    if can_take_flag(m, "unknown_code"):
        failures.append(f"S6 unknown flag code allowed: {dict(m)}")

# ---------------------------------------------------------------- S7
for m in ROWS:
    for t in TIERS:
        if not isinstance(member_can_access(m, t), bool):
            failures.append(f"S7 non-bool from member_can_access: {dict(m)}")
    if member_tier_ceiling(m) not in TIERS:
        failures.append(f"S7 bad ceiling value: {dict(m)}")

# ---------------------------------------------------------------- report
print("=" * 70)
print("ACCESS PREDICATE TRUTH TABLE")
print("=" * 70)
print(f"member states enumerated : {len(ROWS)}")
print(f"access assertions        : {len(ROWS) * len(TIERS)}")
print(f"flag assertions          : {len(ROWS) * len(FLAG_ADULT_ONLY)}")

# Coverage summary: who can actually reach crib?
crib = [m for m in ROWS if member_can_access(m, "crib")]
print(f"\nstates reaching CRIB     : {len(crib)}")
if crib:
    ages = sorted({m["age_status"] for m in crib})
    grants = sorted({("staff" if member_is_staff(m) else "") +
                     ("pit" if member_is_pit(m) else "") for m in crib})
    print(f"  age_status of those    : {ages}")
    print(f"  grant type of those    : {grants}")

non_adults = [m for m in ROWS if not member_is_adult(m)]
in_block = [m for m in non_adults if member_can_access(m, "block")]
sees_sensitive = [m for m in non_adults
                  if any(member_can_view(m, c) for c, (t_, s_) in CONTENT.items()
                         if s_ != "open")]
print(f"non-adult states         : {len(non_adults)}")
print(f"  can enter the Block    : {len(in_block)}")
print(f"  see ANY sensitive item : {len(sees_sensitive)}")
eight_states = [m for m in ROWS if member_can_view(m, "the_eight")]
print(f"states reaching THE EIGHT: {len(eight_states)}")
base_ok = sum(1 for m in ROWS if member_can_view(m, "base_campaign"))
print(f"states with base game    : {base_ok} / {len(ROWS)}")

if failures:
    print(f"\nFAILURES ({len(failures)}):")
    for f_ in failures[:25]:
        print("  FAIL  " + f_)
    if len(failures) > 25:
        print(f"  ... and {len(failures)-25} more")
    sys.exit(1)
print("\nALL SAFETY PROPERTIES HOLD")
