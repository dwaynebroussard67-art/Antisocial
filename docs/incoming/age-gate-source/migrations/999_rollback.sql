-- =====================================================================
-- 999_rollback.sql
-- Full reversal of 001-004. Run only if you need to back all of it out.
--
-- WARNING: drops the audit trail. Export age_status_audit first if you
-- need to keep the record of who verified whom.
-- =====================================================================

begin;

drop function if exists member_can_view(uuid, text);
drop function if exists member_sensitivity_ceiling(uuid);
drop function if exists can_take_flag(uuid, text);
drop function if exists member_can_access(uuid, tier);
drop function if exists member_tier_ceiling(uuid);
drop function if exists pit_minor_scope_active(uuid);
drop function if exists member_is_pit(uuid);
drop function if exists member_is_staff(uuid);
drop function if exists guardian_consent_valid(uuid);
drop function if exists member_is_adult(uuid);

drop table if exists content_items;
drop table if exists flag_categories;

drop trigger if exists members_age_status_audit on members;
drop function if exists age_status_audit_trg();
drop table if exists age_status_audit;

alter table members
    drop constraint if exists members_age_provenance_ck,
    drop constraint if exists members_staff_provenance_ck,
    drop constraint if exists members_pit_provenance_ck,
    drop constraint if exists members_minor_scope_consent_ck,
    drop constraint if exists members_pit_adult_ck;

drop index if exists members_age_status_idx;
drop index if exists members_adults_idx;
drop index if exists members_staff_idx;
drop index if exists members_pit_active_idx;

alter table members
    drop column if exists age_status,
    drop column if exists age_verified_at,
    drop column if exists age_verified_by,
    drop column if exists age_method,
    drop column if exists tier_progress,
    drop column if exists staff_role,
    drop column if exists staff_granted_by,
    drop column if exists staff_granted_at,
    drop column if exists pit_state,
    drop column if exists pit_granted_by,
    drop column if exists pit_granted_at,
    drop column if exists pit_minor_scope,
    drop column if exists guardian_consent_at;

drop type if exists sensitivity;
drop type if exists pit_status;
drop type if exists tier;
drop type if exists age_status;

commit;
