-- Rollback for 0001_nura_log_append_only.sql
-- Only ever run this by explicit human decision — removing the guard means
-- nura_log can be mutated, which breaks the audit trail promise in the
-- Nura doctrine ("nothing is permanently destroyed / history is never wiped").

DROP TRIGGER IF EXISTS nura_log_no_update ON nura_log;
DROP TRIGGER IF EXISTS nura_log_no_delete ON nura_log;
DROP FUNCTION IF EXISTS nura_log_append_only();
