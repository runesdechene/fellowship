-- Plan 4 / Phase 5a (correctif) : la migration 5a a recree par erreur des policies admin sur
-- event_reports. Or ces policies avaient ete VOLONTAIREMENT retirees : les bilans post-festival
-- sont strictement prives a leur auteur (cf. use-admin.ts, retrait de useAdminReports). On les
-- redrop pour preserver cette confidentialite. L'acces auteur reste via event_reports_write_actor.
DROP POLICY IF EXISTS "admin_update_reports" ON event_reports;
DROP POLICY IF EXISTS "admin_delete_reports" ON event_reports;
DROP POLICY IF EXISTS "admin_select_reports" ON event_reports;
