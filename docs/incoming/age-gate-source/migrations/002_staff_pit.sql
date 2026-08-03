-- =====================================================================
-- 002_staff_pit.sql
-- Cribs and the Pit. Three INDEPENDENT grants, not one ladder.
--
-- RULING (yours): Cribs is not climbed, it is granted. Staff referral is
-- a human gate. Engagement can never reach it. The Pit is cross-cutting:
-- a Pit member holds access to every tier, because they volunteered to
-- stand between someone and the worst night of their life.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Tier enum. street < block < porch < crib is a PROGRESSION order,
--    used only for content that is progression-gated. crib is NOT
--    reachable by progression - see member_tier_ceiling() in access.sql.
-- ---------------------------------------------------------------------
do $$
begin
    if not exists (select 1 from pg_type where typname = 'tier') then
        create type tier as enum ('street', 'block', 'porch', 'crib');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'pit_status') then
        create type pit_status as enum ('none', 'pending', 'active', 'paused', 'revoked');
    end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Grants
-- ---------------------------------------------------------------------
alter table members
    -- progression: earned by playing. Cannot exceed the ceiling.
    add column if not exists tier_progress   tier       not null default 'street',

    -- staff: granted by a human. The Cribs key.
    add column if not exists staff_role      text,
    add column if not exists staff_granted_by uuid references members(id),
    add column if not exists staff_granted_at timestamptz,

    -- pit: granted by a human. Cross-cutting all-tier access.
    add column if not exists pit_state       pit_status not null default 'none',
    add column if not exists pit_granted_by  uuid references members(id),
    add column if not exists pit_granted_at  timestamptz,

    -- minor responder: dormant in V1. See docs/MINOR_RESPONDER_POLICY.md
    add column if not exists pit_minor_scope    boolean not null default false,
    add column if not exists guardian_consent_at timestamptz;

comment on column members.tier_progress is
    'Earned by playing. Never grants crib. Never grants pit.';
comment on column members.staff_role is
    'Non-null == staff. The Cribs key. Granted by a human, never by engagement.';
comment on column members.pit_state is
    'Pit membership. active == access to every tier regardless of tier_progress.';
comment on column members.pit_minor_scope is
    'V1: always false. Reserved for scoped minor responders. Requires guardian_consent_at.';
comment on column members.guardian_consent_at is
    'Expires after 90 days. Re-signature required. See minor responder policy.';

-- ---------------------------------------------------------------------
-- 3. Integrity constraints
-- ---------------------------------------------------------------------

-- Staff and Pit grants must name the granting human.
alter table members drop constraint if exists members_staff_provenance_ck;
alter table members add constraint members_staff_provenance_ck check (
    (staff_role is null and staff_granted_by is null and staff_granted_at is null)
    or
    (staff_role is not null and staff_granted_by is not null and staff_granted_at is not null)
);

alter table members drop constraint if exists members_pit_provenance_ck;
alter table members add constraint members_pit_provenance_ck check (
    (pit_state = 'none' and pit_granted_by is null and pit_granted_at is null)
    or
    (pit_state <> 'none' and pit_granted_by is not null and pit_granted_at is not null)
);

-- V1 HARD LOCK: no minor scope without guardian consent on file.
-- When the policy activates, this constraint stays - it is the enforcement.
alter table members drop constraint if exists members_minor_scope_consent_ck;
alter table members add constraint members_minor_scope_consent_ck check (
    pit_minor_scope = false or guardian_consent_at is not null
);

-- V1 HARD LOCK: an active Pit member who is not a verified adult must
-- carry the minor scope flag. No silent minors on the crisis queue.
alter table members drop constraint if exists members_pit_adult_ck;
alter table members add constraint members_pit_adult_ck check (
    pit_state <> 'active'
    or age_status = 'adult'
    or pit_minor_scope = true
);

-- ---------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------
create index if not exists members_staff_idx
    on members (id) where staff_role is not null;

create index if not exists members_pit_active_idx
    on members (id) where pit_state = 'active';

commit;
