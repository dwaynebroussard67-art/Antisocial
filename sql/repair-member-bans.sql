-- =====================================================================
-- REPAIR: member_bans was hand-created with the wrong shape
--
-- WHAT HAPPENED
--   The backend reported `relation "member_bans" does not exist`, and a
--   table was hand-created to satisfy it:
--
--     member_bans(member_id uuid PK, banned_at, unbanned_at, reason, created_at)
--
--   That is not this application's member_bans. The real one is defined in
--   drizzle/0002_ladder_variants_nura.sql and the running code depends on
--   its exact columns. Verified against Postgres 16 — all three ban code
--   paths fail against the hand-made table:
--
--     isBanned()      -> ERROR: column "id" does not exist
--                       (also reversed_at) — and this runs inside
--                       getViewer(), i.e. on EVERY authenticated page load
--     removeAndBan()  -> ERROR: column "banned_by" does not exist
--     reverseBan()    -> ERROR: column "reversed_at" does not exist
--
--   The second one is the dangerous one. When Nura decides a Band A
--   violation (hate speech, predation, threats) the ban INSERT throws, so
--   the account is never actually removed. The site looks like it has ban
--   enforcement and does not.
--
-- THE ACTUAL ROOT CAUSE
--   member_bans didn't exist because migration 0002 was never run against
--   this database. Hand-creating one table treats the symptom. Everything
--   else 0002 creates is also missing:
--
--     tables : content_quarantine, nura_actions, arcade_game_variants
--     enums  : nura_verdict, quarantine_status, nura_action_kind
--     columns: members.adult_verified_at (also hand-added as a stopgap),
--              block_post_replies.status, signal_messages.quarantined_at
--
--   That is also why 0003's backfill needed an existence guard — it was
--   reaching for a column 0002 should have created.
--
-- HOW TO REPAIR — two steps, in order
--
--   1. Run THIS file. It removes the hand-made table so the real
--      definition is not blocked. `CREATE TABLE IF NOT EXISTS` in 0002
--      would otherwise see a table already there, skip it, and leave the
--      wrong shape in place permanently.
--
--   2. Then run the migrations in order:
--
--        node apply-schema.mjs
--
--      It applies every drizzle/*.sql in sequence and skips statements
--      that already applied, so it is safe on a partially-migrated
--      database. Do not hand-write tables to satisfy individual errors —
--      that is what produced this.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

begin;

do $$
declare
    row_count bigint;
    has_wrong_shape boolean;
begin
    if not exists (
        select 1 from information_schema.tables
         where table_schema = current_schema() and table_name = 'member_bans'
    ) then
        raise notice 'repair: no member_bans table — nothing to remove. Run apply-schema.mjs.';
        return;
    end if;

    -- Identify the hand-made table by a column the real one does not have,
    -- and the absence of one it must have. Belt and braces, so this can
    -- never drop a correct table that happens to be present.
    select
        exists (select 1 from information_schema.columns
                 where table_schema = current_schema()
                   and table_name = 'member_bans' and column_name = 'unbanned_at')
        or not exists (select 1 from information_schema.columns
                 where table_schema = current_schema()
                   and table_name = 'member_bans' and column_name = 'reversed_at')
    into has_wrong_shape;

    if not has_wrong_shape then
        raise notice 'repair: member_bans already has the correct shape — leaving it alone.';
        return;
    end if;

    -- Refuse to destroy real ban records. If somebody was actually banned
    -- through this table, a human decides what happens to those rows.
    execute 'select count(*) from member_bans' into row_count;
    if row_count > 0 then
        raise exception
            'repair: member_bans has the wrong shape but holds % row(s). Refusing to drop. '
            'Export those rows, then drop the table manually and run apply-schema.mjs.',
            row_count;
    end if;

    execute 'drop table member_bans';
    raise notice 'repair: dropped the hand-made empty member_bans. NOW RUN: node apply-schema.mjs';
end $$;

commit;

-- After apply-schema.mjs, verify the real shape is in place.
-- Expect 10 rows: id, member_id, banned_by, reason, verdict, quarantine_id,
-- banned_at, reversed_at, reversed_by, reversal_notes
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = current_schema() and table_name = 'member_bans'
 order by ordinal_position;
