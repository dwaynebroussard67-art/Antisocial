-- SET THE ADMINISTRATIVE ACCOUNT
--
-- Same thing scripts/seed-admin.ts does, as plain SQL — for running in the
-- Supabase dashboard (SQL Editor -> New query -> paste -> Run) when you
-- don't want to set up a local environment just to flip one role.
--
-- Nothing here needs a DATABASE_URL, because the dashboard is already
-- signed in to the database.
--
-- Safe to run more than once. Deletes nothing.

BEGIN;

-- 1. The set-aside administrative account exists.
INSERT INTO members (email, is_ministry_staff)
VALUES ('misfitministries2026@gmail.com', true)
ON CONFLICT (email) DO UPDATE SET is_ministry_staff = true;

-- 2. It holds admin, at Pit tier.
--    site_role is what alertStaff() checks when Nura needs a human.
INSERT INTO member_roles (member_id, site_role, tier)
SELECT id, 'admin'::site_role, 'pit'::member_tier
  FROM members
 WHERE email = 'misfitministries2026@gmail.com'
ON CONFLICT (member_id)
DO UPDATE SET site_role = 'admin'::site_role, tier = 'pit'::member_tier;

-- 3. No other account holds admin.
--    This is the half that separates administrative authority from a
--    personal account. Tier is deliberately left alone — this removes
--    admin rights, not someone's standing in the community. No member row
--    is deleted (that would cascade away their posts and history).
UPDATE member_roles
   SET site_role = 'member'::site_role
 WHERE site_role = 'admin'::site_role
   AND member_id <> (SELECT id FROM members WHERE email = 'misfitministries2026@gmail.com');

COMMIT;

-- Check the result — this should return exactly one row:
--   misfitministries2026@gmail.com | admin | pit
SELECT m.email, r.site_role, r.tier
  FROM member_roles r
  JOIN members m ON m.id = r.member_id
 WHERE r.site_role = 'admin';
