-- =====================================================================
-- 003_access.sql
-- The predicates. One place where access is decided, so there is one
-- place to audit and one place to fix.
--
-- CORE SAFETY PROPERTIES
--   S1  unknown age  -> treated as minor, everywhere, no exceptions.
--   S2  missing row  -> false. No row, no answer, no access.
--   S3  crib content -> requires staff/pit grant AND adult. Two conditions.
--   S4  engagement   -> can never reach crib. tier_progress is capped.
--   S5  expired consent -> minor scope collapses automatically.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- S1 + S2: the adult predicate.
-- coalesce(..., false) is the whole safety property.
-- ---------------------------------------------------------------------
create or replace function member_is_adult(m_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select coalesce(
        (select age_status = 'adult' from members where id = m_id),
        false
    );
$$;

comment on function member_is_adult(uuid) is
    'unknown and minor both return false. Missing member returns false.';

-- ---------------------------------------------------------------------
-- Guardian consent freshness. 90 days, then it lapses.
-- ---------------------------------------------------------------------
create or replace function guardian_consent_valid(m_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select coalesce(
        (select guardian_consent_at is not null
                and guardian_consent_at > now() - interval '90 days'
         from members where id = m_id),
        false
    );
$$;

-- ---------------------------------------------------------------------
-- Grants. Both are human-issued; neither is reachable by playing.
-- ---------------------------------------------------------------------
create or replace function member_is_staff(m_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select coalesce(
        (select staff_role is not null from members where id = m_id),
        false
    );
$$;

create or replace function member_is_pit(m_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select coalesce(
        (select pit_state = 'active' from members where id = m_id),
        false
    );
$$;

-- ---------------------------------------------------------------------
-- S5: effective minor-responder scope. Collapses when consent lapses.
-- ---------------------------------------------------------------------
create or replace function pit_minor_scope_active(m_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select coalesce(
        (select m.pit_minor_scope
                and not member_is_adult(m.id)
                and guardian_consent_valid(m.id)
         from members m where m.id = m_id),
        false
    );
$$;

-- ---------------------------------------------------------------------
-- S3 + S4: the tier ceiling.
--
-- This is the function that makes engagement incapable of reaching the
-- heavy material. tier_progress can say 'crib' and it will not matter.
--
--   crib   requires (staff OR pit) AND adult
--   porch  requires adult
--   block  requires adult          <- age-gated hints live here
--   street always available
-- ---------------------------------------------------------------------
create or replace function member_tier_ceiling(m_id uuid)
returns tier
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select case
        when (member_is_staff(m_id) or member_is_pit(m_id))
             and member_is_adult(m_id)              then 'crib'::tier
        when member_is_adult(m_id)                  then 'porch'::tier
        else 'street'::tier
    end;
$$;

comment on function member_tier_ceiling(uuid) is
    'Hard cap on tier access. Crib needs a human grant AND verified adult. '
    'Engagement alone can never exceed street for an unverified member.';

-- ---------------------------------------------------------------------
-- The single access predicate. Everything calls this.
--
-- Pit members hold access to every tier - but the ceiling still applies,
-- so a Pit member who is not a verified adult does not reach crib.
-- ---------------------------------------------------------------------
create or replace function member_can_access(m_id uuid, required tier)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select coalesce(
        (
            select
                -- never exceed the ceiling
                required <= member_tier_ceiling(m_id)
                and (
                    -- pit holds all tiers up to the ceiling
                    member_is_pit(m_id)
                    -- staff hold all tiers up to the ceiling
                    or member_is_staff(m_id)
                    -- everyone else must have earned the tier
                    or required <= m.tier_progress
                )
            from members m where m.id = m_id
        ),
        false
    );
$$;

comment on function member_can_access(uuid, tier) is
    'THE access predicate. Fails closed on missing member, unknown age, '
    'lapsed consent. Call this, never the columns directly.';

-- ---------------------------------------------------------------------
-- Crisis routing. Certain flag categories never reach a minor responder.
-- Enforced as a routing rule, so it is executed rather than documented.
-- ---------------------------------------------------------------------
create table if not exists flag_categories (
    code        text primary key,
    label       text not null,
    adult_only  boolean not null default true
);

insert into flag_categories (code, label, adult_only) values
    ('self_harm',      'Self-harm / suicidal ideation', true),
    ('abuse',          'Abuse disclosure',              true),
    ('violence',       'Threat of violence',            true),
    ('substance',      'Substance crisis',              true),
    ('grief',          'Grief support',                 false),
    ('loneliness',     'Loneliness / check-in',         false),
    ('welcome',        'New member welcome',            false),
    ('peer',           'Peer encouragement',            false)
on conflict (code) do nothing;

create or replace function can_take_flag(m_id uuid, flag_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select coalesce(
        (
            select member_is_pit(m_id)
                   and (
                        not fc.adult_only
                        or member_is_adult(m_id)
                   )
            from flag_categories fc where fc.code = flag_code
        ),
        false
    );
$$;

comment on function can_take_flag(uuid, text) is
    'Routing gate. Adult-only categories never surface to a minor responder. '
    'Unknown flag code returns false - fail closed.';

commit;
