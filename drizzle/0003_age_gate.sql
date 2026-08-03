-- =====================================================================
-- 0003_age_gate.sql
--
-- The age gate, adapted from D's migration set (archived verbatim at
-- docs/incoming/age-gate-source/) to THIS repo's actual schema.
--
-- WHAT CHANGED IN THE ADAPTATION, AND WHY
--
--   1. Tier already exists here as `member_tier` on `member_roles`
--      ('street','block','crib','pit'), not as a new `tier` type on
--      `members`. The source migration's ('street','block','porch','crib')
--      would have created a SECOND, conflicting tier system. Reusing the
--      live one instead. Live 'pit' already sits top-of-cascade with access
--      to everything, which is exactly D's Pit ruling — no restructuring
--      needed.
--
--   2. Staff / Crib / Pit grants already exist here:
--      members.is_ministry_staff, member_roles.site_role,
--      member_roles.crib_granted_at/by, member_roles.is_misfit_first_responder.
--      The source migration's staff_role / pit_state columns would have
--      duplicated them. Predicates read the live columns.
--
--   3. members.adult_verified_at already exists as a BINARY adult check.
--      It is superseded here rather than duplicated: existing verified
--      adults are migrated into age_status='adult' with their provenance
--      intact (§2). The old column is left in place and marked deprecated
--      so nothing breaks mid-deploy, but it is no longer authoritative.
--      There must be exactly one source of truth for age.
--
-- SAFETY PROPERTIES (unchanged from the source)
--   S1  unknown age   -> treated as minor, everywhere, no exceptions.
--   S2  missing row   -> false. No row, no answer, no access.
--   S3  heavy content -> requires a human grant AND verified adult.
--   S4  engagement    -> can never reach crib or pit. Both are granted.
--   S5  lapsed guardian consent -> minor responder scope collapses.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Age status: tri-state, replacing a binary check.
--
--    'unknown' and 'minor' both deny. They are kept distinct because
--    "we never asked" and "we know they're 14" are different facts, and
--    conflating them loses the second one permanently.
-- ---------------------------------------------------------------------
do $$
begin
    if not exists (select 1 from pg_type where typname = 'age_status') then
        create type age_status as enum ('unknown', 'minor', 'adult');
    end if;
end $$;

alter table members
    add column if not exists age_status      age_status  not null default 'unknown',
    add column if not exists age_verified_at timestamptz,
    add column if not exists age_verified_by text,
    add column if not exists age_method      text;

comment on column members.age_status is
    'unknown|minor|adult. unknown is treated as minor everywhere. Never infer.';
comment on column members.age_method is
    'self_attest | guardian | staff_vouch | doc_review | payment_signal | other';
-- Guarded for the same reason as the backfill in §2 — the column is optional.
do $$
begin
    if exists (
        select 1 from information_schema.columns
         where table_schema = current_schema()
           and table_name   = 'members'
           and column_name  = 'adult_verified_at'
    ) then
        execute $c$
            comment on column members.adult_verified_at is
                'DEPRECATED as of 0003. age_status is authoritative. Retained '
                'so an in-flight deploy does not break; read member_is_adult().'
        $c$;
    end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Carry existing verified adults forward.
--
--    Without this, running the migration would silently DEMOTE every
--    already-verified adult back to unknown — locking people out of
--    things they had legitimately been granted.
-- ---------------------------------------------------------------------
--    GUARDED, because adult_verified_at is not guaranteed to exist. It was
--    added by an earlier migration in this repo, but a database provisioned
--    fresh from a later schema — or any environment that never ran that
--    migration — has no such column, and an unguarded reference is a parse
--    error that aborts the whole transaction. The backfill is a courtesy to
--    existing data, not a requirement, so its absence must be a no-op rather
--    than a failure.
do $$
begin
    if exists (
        select 1 from information_schema.columns
         where table_schema = current_schema()
           and table_name   = 'members'
           and column_name  = 'adult_verified_at'
    ) then
        execute $mig$
            update members
               set age_status      = 'adult',
                   age_verified_at = adult_verified_at,
                   age_verified_by = coalesce(adult_verified_by::text, 'migrated:0003'),
                   age_method      = 'staff_vouch'
             where adult_verified_at is not null
               and age_status = 'unknown'
        $mig$;
        raise notice '0003: carried existing adult_verified_at rows into age_status';
    else
        raise notice '0003: no adult_verified_at column — nothing to carry forward';
    end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Integrity: a non-unknown status must name who decided it.
--    Runs AFTER the backfill so migrated rows satisfy it.
-- ---------------------------------------------------------------------
alter table members drop constraint if exists members_age_provenance_ck;
alter table members add constraint members_age_provenance_ck check (
    (age_status = 'unknown' and age_verified_at is null and age_verified_by is null)
    or
    (age_status <> 'unknown' and age_verified_at is not null and age_verified_by is not null)
);

create index if not exists members_age_status_idx on members (age_status);
create index if not exists members_adults_idx on members (id) where age_status = 'adult';

-- ---------------------------------------------------------------------
-- 4. Audit trail. Age changes are consequential; log every one.
-- ---------------------------------------------------------------------
create table if not exists age_status_audit (
    id          bigserial primary key,
    member_id   uuid not null references members(id) on delete cascade,
    old_status  age_status,
    new_status  age_status not null,
    changed_by  text not null,
    changed_at  timestamptz not null default now(),
    method      text,
    note        text
);

create index if not exists age_status_audit_member_idx
    on age_status_audit (member_id, changed_at desc);

create or replace function age_status_audit_trg()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
    if tg_op = 'UPDATE' and old.age_status is not distinct from new.age_status then
        return new;
    end if;
    insert into age_status_audit (member_id, old_status, new_status, changed_by, method)
    values (new.id,
            case when tg_op = 'UPDATE' then old.age_status else null end,
            new.age_status,
            coalesce(new.age_verified_by, session_user),
            new.age_method);
    return new;
end $$;

drop trigger if exists members_age_status_audit on members;
create trigger members_age_status_audit
    after insert or update of age_status on members
    for each row execute function age_status_audit_trg();

-- ---------------------------------------------------------------------
-- 5. Minor responder scope — DORMANT IN V1.
--
--    D's ruling: a minor who volunteers to stand between someone and the
--    worst night of their life has likely already seen too much, and
--    treating them as a child insults them. The policy does not argue
--    with that. It ships dormant because all six safeguards need a
--    SECOND adult to exist, and today there is one.
--
--    See docs/incoming/age-gate-source/docs/MINOR_RESPONDER_POLICY.md
-- ---------------------------------------------------------------------
alter table member_roles
    add column if not exists pit_minor_scope     boolean not null default false,
    add column if not exists guardian_consent_at timestamptz;

comment on column member_roles.pit_minor_scope is
    'V1: always false. Scoped minor responder. Requires guardian_consent_at.';
comment on column member_roles.guardian_consent_at is
    'Expires after 90 days. Re-signature required — one-time consent becomes '
    'fiction within a month.';

alter table member_roles drop constraint if exists member_roles_minor_scope_consent_ck;
alter table member_roles add constraint member_roles_minor_scope_consent_ck check (
    pit_minor_scope = false or guardian_consent_at is not null
);

-- ---------------------------------------------------------------------
-- 6. The predicates. One place access is decided.
--    coalesce(..., false) throughout — S2, fail closed.
-- ---------------------------------------------------------------------
create or replace function member_is_adult(m_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
    select coalesce((select age_status = 'adult' from members where id = m_id), false);
$$;

comment on function member_is_adult(uuid) is
    'unknown and minor both return false. Missing member returns false.';

create or replace function guardian_consent_valid(m_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
    select coalesce((select guardian_consent_at is not null
                            and guardian_consent_at > now() - interval '90 days'
                     from member_roles where member_id = m_id), false);
$$;

-- Staff = the Cribs key. Granted by a human, never by engagement.
create or replace function member_is_staff(m_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
    select coalesce(
        (select m.is_ministry_staff
                or r.site_role in ('moderator','admin')
                or r.crib_granted_at is not null
         from members m left join member_roles r on r.member_id = m.id
         where m.id = m_id),
        false);
$$;

-- Pit = active Misfit First Responder. Cross-cutting, all tiers.
create or replace function member_is_pit(m_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
    select coalesce((select is_misfit_first_responder
                     from member_roles where member_id = m_id), false);
$$;

-- S5: scope collapses the moment consent lapses.
create or replace function pit_minor_scope_active(m_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
    select coalesce((select r.pit_minor_scope
                            and not member_is_adult(m_id)
                            and guardian_consent_valid(m_id)
                     from member_roles r where r.member_id = m_id), false);
$$;

-- ---------------------------------------------------------------------
-- 7. Place ceiling.
--
--    Non-adults reach 'block' — they can walk the open world. The
--    ministry exists to reach kids; locking them at Street defeats it.
--    What they cannot see there is anything above 'open' sensitivity.
--    Place and content are separate axes (§8).
--
--    Crib and Pit both require a human grant AND verified adult, so
--    engagement can never reach either (S4).
-- ---------------------------------------------------------------------
create or replace function member_tier_ceiling(m_id uuid)
returns member_tier language sql stable security definer
set search_path = pg_catalog, public as $$
    select case
        when member_is_pit(m_id)
             and (member_is_adult(m_id) or pit_minor_scope_active(m_id))
                                          then 'pit'::member_tier
        when member_is_staff(m_id) and member_is_adult(m_id)
                                          then 'crib'::member_tier
        else 'block'::member_tier
    end;
$$;

comment on function member_tier_ceiling(uuid) is
    'Hard cap on where a member may go. Crib and Pit require a human grant '
    'AND verified adult. Engagement alone never exceeds block.';

-- THE access predicate. Cap AND earned tier, both.
create or replace function member_can_access(m_id uuid, required member_tier)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
    select coalesce(
        (select required <= member_tier_ceiling(m_id)
                and (member_is_pit(m_id)
                     or member_is_staff(m_id)
                     or required <= r.tier)
         from member_roles r where r.member_id = m_id),
        false);
$$;

-- ---------------------------------------------------------------------
-- 8. Content sensitivity — the second axis.
--
--    Gating by tier alone forces a bad choice: cap minors at Street and
--    they never enter the open world, or open the Block and the story
--    hints inside it open too. Separating PLACE from CONTENT fixes it.
--
--      tier        -> where you can go
--      sensitivity -> what you can see once you're there
--
--    Alley Cat's eight killings are 'heavy': crib-tier AND adult AND a
--    human grant. The base game is 'open' and never gated — its Chapter 1
--    cut-away is the only depiction, and the player fills in the rest
--    themselves. That is the point.
-- ---------------------------------------------------------------------
do $$
begin
    if not exists (select 1 from pg_type where typname = 'sensitivity') then
        create type sensitivity as enum ('open', 'mature', 'heavy');
    end if;
end $$;

create table if not exists content_items (
    code            text primary key,
    label           text not null,
    min_tier        member_tier not null default 'street',
    min_sensitivity sensitivity not null default 'open',
    note            text
);

insert into content_items (code, label, min_tier, min_sensitivity, note) values
    ('base_campaign', 'Alley Cat — 9 chapter campaign', 'street', 'open',
     'The full base game. Ch.1 cut-away is the only depiction. Never gated.'),
    ('block_hints',   'Block-tier story hints',          'block',  'mature',
     'Implication and aftermath. No depiction. Adult only.'),
    ('the_eight',     'The eight — full account',        'crib',   'heavy',
     'The killings, named and shown. Staff/Pit adults only.'),
    ('ninth_ask',     'The ninth ask — full account',    'crib',   'heavy',
     'The Big Dog returning for Whiskers. Crib only.')
on conflict (code) do nothing;

create or replace function member_sensitivity_ceiling(m_id uuid)
returns sensitivity language sql stable security definer
set search_path = pg_catalog, public as $$
    select case
        when member_is_adult(m_id)
             and (member_is_staff(m_id) or member_is_pit(m_id))
                                     then 'heavy'::sensitivity
        when member_is_adult(m_id)   then 'mature'::sensitivity
        else 'open'::sensitivity
    end;
$$;

-- THE content gate. Both axes. Unknown item code returns false.
create or replace function member_can_view(m_id uuid, item_code text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
    select coalesce(
        (select member_can_access(m_id, ci.min_tier)
                and ci.min_sensitivity <= member_sensitivity_ceiling(m_id)
         from content_items ci where ci.code = item_code),
        false);
$$;

-- ---------------------------------------------------------------------
-- 9. Crisis routing. Adult-only categories never surface to a minor
--    responder — a routing rule, so it executes rather than sitting in
--    a policy document nobody reads at 3am.
-- ---------------------------------------------------------------------
create table if not exists flag_categories (
    code       text primary key,
    label      text not null,
    adult_only boolean not null default true
);

insert into flag_categories (code, label, adult_only) values
    ('self_harm',  'Self-harm / suicidal ideation', true),
    ('abuse',      'Abuse disclosure',              true),
    ('violence',   'Threat of violence',            true),
    ('substance',  'Substance crisis',              true),
    ('grief',      'Grief support',                 false),
    ('loneliness', 'Loneliness / check-in',         false),
    ('welcome',    'New member welcome',            false),
    ('peer',       'Peer encouragement',            false)
on conflict (code) do nothing;

create or replace function can_take_flag(m_id uuid, flag_code text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
    select coalesce(
        (select member_is_pit(m_id)
                and (not fc.adult_only or member_is_adult(m_id))
         from flag_categories fc where fc.code = flag_code),
        false);
$$;

comment on function can_take_flag(uuid, text) is
    'Routing gate. Adult-only categories never surface to a minor responder. '
    'Unknown flag code returns false — fail closed.';

commit;
