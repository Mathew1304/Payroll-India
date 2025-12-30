-- ============================================================
-- MISSING RLS: ATTENDANCE RECORDS & OFFICE LOCATIONS
-- ============================================================

ALTER TABLE office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- OFFICE LOCATIONS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "office_locations_org_view" ON office_locations;

CREATE POLICY "office_locations_org_view"
  ON office_locations FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "office_locations_admins_manage" ON office_locations;

CREATE POLICY "office_locations_admins_manage"
  ON office_locations FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- ============================================================
-- ATTENDANCE RECORDS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "attendance_records_view_own_or_admin" ON attendance_records;

CREATE POLICY "attendance_records_view_own_or_admin"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    (
       organization_id = get_user_org_id_safe() 
       AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "attendance_records_employees_insert" ON attendance_records;

CREATE POLICY "attendance_records_employees_insert"
  ON attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    (
       organization_id = get_user_org_id_safe() 
       AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "attendance_records_update_own_or_admin" ON attendance_records;

CREATE POLICY "attendance_records_update_own_or_admin"
  ON attendance_records FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    (
       organization_id = get_user_org_id_safe() 
       AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
    )
  );

GRANT ALL ON office_locations TO authenticated;
GRANT ALL ON attendance_records TO authenticated;
