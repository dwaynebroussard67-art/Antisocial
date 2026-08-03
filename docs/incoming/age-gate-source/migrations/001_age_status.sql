-- =====================================================================
-- 001_age_status.sql
-- The age gate. Ships today. Verification method decided later.
--
-- SAFETY PROPERTY: unknown == minor. Every member lands on 'unknown',
-- every tier above Street closes automatically, and nothing opens until
-- a human says it does. Zero verification infrastructure required.
--
-- Idempotent. Safe to re-run. Wrap in a transaction.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. The enum
-- ---------------------------------------------------------------------
do $$
begin
    if not exists (select 1 from pg_type where typname = 'age_status') then
        create type age_status as enum ('unknown', 'minor', 'adult');
    end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. The columns
--    default 'unknown' + not null == every existing row is a minor
--    until a human decides otherwise.
-- ---------------------------------------------------------------------
alter table members
    add column if not exists age_status      age_status  not null default 'unknown',
    add column if not exists age_verified_at timestamptz,
    add column if not exists age_verified_by text,
    add column if not exists age_method      text;

comment on column members.age_status is
    'unknown|minor|adult. unknown is treated as minor everywhere. Never infer.';
comment on column members.age_verified_at is
    'When age_status last moved off unknown. Null while unknown.';
comment on column members.age_verified_by is
    'Human or system that made the call. Free text on purpose - the method is not settled.';
comment on column members.age_method is
    'self_attest | guardian | staff_vouch | doc_review | payment_signal | other';

-- ---------------------------------------------------------------------
-- 3. Integrity: a verified status must carry provenance.
--    Prevents a status flipping to 'adult' with no accountable party.
-- ---------------------------------------------------------------------
alter table members drop constraint if exists members_age_provenance_ck;
alter table members add constraint members_age_provenance_ck check (
    (age_status = 'unknown' and age_verified_at is null and age_verified_by is null)
    or
    (age_status <> 'unknown' and age_verified_at is not null and age_verified_by is not null)
);

-- ---------------------------------------------------------------------
-- 4. Index. Partial - the only hot query is "is this member an adult".
-- ---------------------------------------------------------------------
create index if not exists members_age_status_idx
    on members (age_status);

create index if not exists members_adults_idx
    on members (id) where age_status = 'adult';

-- ---------------------------------------------------------------------
-- 5. Audit trail. Age status changes are consequential; log every one.
-- ---------------------------------------------------------------------
create table if not exists age_status_audit (
    id             bigserial primary key,
    member_id      uuid not null references members(id) on delete cascade,
    old_status     age_status,
    new_status     age_status not null,
    changed_by     text not null,
    changed_at     timestamptz not null default now(),
    method         text,
    note           text
);

create index if not exists age_status_audit_member_idx
    on age_status_audit (member_id, changed_at desc);

create or replace function age_status_audit_trg()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'UPDATE' and old.age_status is not distinct from new.age_status then
        return new;
    end if;
    insert into age_status_audit (member_id, old_status, new_status, changed_by, method)
    values (
        new.id,
        case when tg_op = 'UPDATE' then old.age_status else null end,
        new.age_status,
        coalesce(new.age_verified_by, session_user),
        new.age_method
    );
    return new;
end $$;

drop trigger if exists members_age_status_audit on members;
create trigger members_age_status_audit
    after insert or update of age_status on members
    for each row execute function age_status_audit_trg();

commit;
