-- =====================================================================
-- GRANTS RUNBOOK — the canonical way to open each door
--
-- Every grant below is a HUMAN ACT. None of them is reachable by playing,
-- posting, donating, or any other engagement signal. That is the point:
-- D's ruling is that Cribs is granted, not climbed.
--
-- Run these in the Supabase SQL Editor. No credential leaves your hands.
-- =====================================================================


-- =====================================================================
-- WHY THERE ARE THREE STAFF-ISH COLUMNS AND NOT ONE
--
-- It is tempting to collapse these into a single "staff" flag. Don't —
-- they record three different facts, and merging them loses information
-- you will want later:
--
--   members.is_ministry_staff      "This person works for the ministry."
--   member_roles.crib_granted_at   "A human vouched for this volunteer."
--   member_roles.site_role         "This person moderates the platform."
--
-- A heavy volunteer is not staff. A moderator is not necessarily either.
-- All three open Cribs (member_is_staff() ORs them), because all three
-- describe someone a human deliberately let in — but only one of them is
-- true of any given person, and the record should say which.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. AGE — the prerequisite for everything above Street
--
-- Nothing else in this file works without this. Crib, Pit and all
-- 'mature'/'heavy' content require member_is_adult() = true, and that
-- reads age_status and nothing else.
--
-- The provenance columns are NOT optional — a constraint rejects an
-- age_status change that doesn't name who decided it.
-- ---------------------------------------------------------------------
update members
   set age_status      = 'adult',
       age_verified_at = now(),
       age_verified_by = 'staff:misfitministries2026@gmail.com',
       age_method      = 'staff_vouch'
 where email = 'PERSON@example.com';

-- Recording a KNOWN minor is a real action, not a no-op. 'unknown' and
-- 'minor' both deny access, but only 'minor' is a fact you can act on.
update members
   set age_status      = 'minor',
       age_verified_at = now(),
       age_verified_by = 'staff:misfitministries2026@gmail.com',
       age_method      = 'guardian'
 where email = 'PERSON@example.com';


-- ---------------------------------------------------------------------
-- 2a. STAFF — someone who works for the ministry. Opens Cribs.
-- ---------------------------------------------------------------------
update members
   set is_ministry_staff = true
 where email = 'PERSON@example.com';


-- ---------------------------------------------------------------------
-- 2b. VOUCHED VOLUNTEER — the referral path into Cribs.
--
-- D: "for staff members or heavy volunteers, in which case it would be a
-- referral system from staff." This is that referral. Records WHO
-- vouched, so a grant is always traceable to a person.
-- ---------------------------------------------------------------------
update member_roles r
   set crib_granted_at = now(),
       crib_granted_by = (select id from members where email = 'VOUCHER@example.com'),
       tier            = 'crib'
  from members m
 where m.id = r.member_id
   and m.email = 'PERSON@example.com';


-- ---------------------------------------------------------------------
-- 2c. PLATFORM MODERATOR / ADMIN — authority over content, not a ministry role.
--
-- This is what alertStaff() queries when Nura needs a human, and what
-- gates /moderation/quarantine. Grant it to whoever actually answers
-- those alerts.
-- ---------------------------------------------------------------------
update member_roles r
   set site_role = 'moderator'   -- or 'admin'
  from members m
 where m.id = r.member_id
   and m.email = 'PERSON@example.com';


-- ---------------------------------------------------------------------
-- 3. PIT — Misfit First Responder. Access to every tier.
--
-- D: "these people have offered to volunteer to give their time to try to
-- save people's lives."
--
-- ADULTS ONLY IN V1. A non-adult granted Pit gets a ceiling of 'block'
-- rather than 'pit' — the grant is recorded but does not open the door,
-- because every minor-responder safeguard needs a second adult to exist
-- and today there is one. See docs/incoming/age-gate-source/docs/
-- MINOR_RESPONDER_POLICY.md. Verify age (§1) first.
-- ---------------------------------------------------------------------
update member_roles r
   set is_misfit_first_responder = true,
       responder_activated_at    = now(),
       tier                      = 'pit'
  from members m
 where m.id = r.member_id
   and m.email = 'PERSON@example.com';


-- =====================================================================
-- VERIFY — always check the predicates, never the columns.
--
-- The columns are inputs. These functions are the answer, and they are
-- what the application actually calls.
-- =====================================================================
select m.email,
       m.age_status,
       member_is_adult(m.id)              as is_adult,
       member_is_staff(m.id)              as opens_cribs,
       member_is_pit(m.id)                as is_pit,
       member_tier_ceiling(m.id)          as max_tier,
       member_sensitivity_ceiling(m.id)   as max_sensitivity,
       member_can_view(m.id, 'the_eight') as sees_the_eight
  from members m
 where m.email = 'PERSON@example.com';

-- Expected for a fresh member with nothing granted:
--   unknown | f | f | f | block | open | f
--
-- Expected for a verified-adult staff member:
--   adult   | t | t | f | crib  | heavy | t


-- =====================================================================
-- WHO HOLDS WHAT — the audit query. Run it periodically.
-- =====================================================================
select m.email,
       m.age_status,
       m.is_ministry_staff,
       r.site_role,
       r.is_misfit_first_responder as pit,
       r.crib_granted_at is not null as crib_vouched,
       r.tier,
       member_tier_ceiling(m.id) as effective_ceiling
  from members m
  left join member_roles r on r.member_id = m.id
 where m.is_ministry_staff
    or r.site_role <> 'member'
    or r.is_misfit_first_responder
    or r.crib_granted_at is not null
 order by m.email;

-- Age changes are logged automatically — every one, with who and how.
--
-- Ordered by id, not changed_at: rows written in the same transaction share
-- a timestamp, and ordering by changed_at returns them in arbitrary order —
-- which makes a status change look like it was never recorded.
select a.id, a.changed_at, m.email, a.old_status, a.new_status, a.changed_by, a.method
  from age_status_audit a
  join members m on m.id = a.member_id
 order by a.id desc
 limit 50;
