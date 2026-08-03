-- NURA DOSSIER 1 — schema pushed via `npx drizzle-kit push` (see src/db/schema.ts).
-- This file documents the one hand-written piece of DDL that drizzle-kit does
-- not express declaratively: the append-only guard on nura_log.
--
-- Apply:
--   psql "$DATABASE_URL" -f src/db/migrations-manual/0001_nura_log_append_only.sql
--
-- nura_log records every Tier-1/2/3 flag and every consequence Nura logs.
-- It must never be edited or deleted, even by the app's own DB role — this
-- is belt-and-suspenders on top of the one-door service (nura-service.ts)
-- only ever calling INSERT against this table.

CREATE OR REPLACE FUNCTION nura_log_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'nura_log is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nura_log_no_update ON nura_log;
CREATE TRIGGER nura_log_no_update
  BEFORE UPDATE ON nura_log
  FOR EACH ROW EXECUTE FUNCTION nura_log_append_only();

DROP TRIGGER IF EXISTS nura_log_no_delete ON nura_log;
CREATE TRIGGER nura_log_no_delete
  BEFORE DELETE ON nura_log
  FOR EACH ROW EXECUTE FUNCTION nura_log_append_only();
