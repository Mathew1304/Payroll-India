-- FULL RLS POLICIES EXPORT


-- ==========================================
-- FROM FILE: 20251215000001_complete_hrms_schema.sql
-- ==========================================


-- ============================================================
-- PART 21: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

ALTER TABLE designations ENABLE ROW LEVEL SECURITY;

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

ALTER TABLE goal_types ENABLE ROW LEVEL SECURITY;

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;

ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 22: RLS POLICIES - ORGANIZATIONS
-- ============================================================

DROP POLICY IF EXISTS "org_users_can_view_own" ON organizations;

CREATE POLICY "org_users_can_view_own"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "org_admins_can_update" ON organizations;

CREATE POLICY "org_admins_can_update"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "org_anyone_can_create" ON organizations;

CREATE POLICY "org_anyone_can_create"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- PART 23: RLS POLICIES - USER_PROFILES
-- ============================================================

DROP POLICY IF EXISTS "users_can_view_own_profile" ON user_profiles;

CREATE POLICY "users_can_view_own_profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;

CREATE POLICY "users_can_update_own_profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_insert_own_profile" ON user_profiles;

CREATE POLICY "users_can_insert_own_profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PART 24: RLS POLICIES - EMPLOYEES
-- ============================================================

DROP POLICY IF EXISTS "employees_org_members_can_view" ON employees;

CREATE POLICY "employees_org_members_can_view"
  ON employees FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "employees_admins_can_manage" ON employees;

CREATE POLICY "employees_admins_can_manage"
  ON employees FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 25: RLS POLICIES - DEPARTMENTS & DESIGNATIONS
-- ============================================================

DROP POLICY IF EXISTS "departments_org_members_view" ON departments;

CREATE POLICY "departments_org_members_view"
  ON departments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "departments_admins_manage" ON departments;

CREATE POLICY "departments_admins_manage"
  ON departments FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "designations_org_members_view" ON designations;

CREATE POLICY "designations_org_members_view"
  ON designations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "designations_admins_manage" ON designations;

CREATE POLICY "designations_admins_manage"
  ON designations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 26: RLS POLICIES - LEAVE MANAGEMENT
-- ============================================================

DROP POLICY IF EXISTS "leave_types_org_view" ON leave_types;

CREATE POLICY "leave_types_org_view"
  ON leave_types FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "leave_types_admins_manage" ON leave_types;

CREATE POLICY "leave_types_admins_manage"
  ON leave_types FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "leave_balances_view_own" ON leave_balances;

CREATE POLICY "leave_balances_view_own"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "leave_balances_admins_manage" ON leave_balances;

CREATE POLICY "leave_balances_admins_manage"
  ON leave_balances FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "leave_applications_view_own" ON leave_applications;

CREATE POLICY "leave_applications_view_own"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "leave_applications_employees_create" ON leave_applications;

CREATE POLICY "leave_applications_employees_create"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "leave_applications_manage" ON leave_applications;

CREATE POLICY "leave_applications_manage"
  ON leave_applications FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 27: RLS POLICIES - ATTENDANCE
-- ============================================================

DROP POLICY IF EXISTS "attendance_view_own" ON attendance;

CREATE POLICY "attendance_view_own"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "attendance_employees_punch" ON attendance;

CREATE POLICY "attendance_employees_punch"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "attendance_update" ON attendance;

CREATE POLICY "attendance_update"
  ON attendance FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 28: RLS POLICIES - HOLIDAYS
-- ============================================================

DROP POLICY IF EXISTS "holidays_org_view" ON holidays;

CREATE POLICY "holidays_org_view"
  ON holidays FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "holidays_admins_manage" ON holidays;

CREATE POLICY "holidays_admins_manage"
  ON holidays FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 29: RLS POLICIES - ANNOUNCEMENTS
-- ============================================================

DROP POLICY IF EXISTS "announcements_org_view" ON announcements;

CREATE POLICY "announcements_org_view"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "announcements_admins_manage" ON announcements;

CREATE POLICY "announcements_admins_manage"
  ON announcements FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 30: RLS POLICIES - TICKETS
-- ============================================================

DROP POLICY IF EXISTS "ticket_categories_org_view" ON ticket_categories;

CREATE POLICY "ticket_categories_org_view"
  ON ticket_categories FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "ticket_categories_admins_manage" ON ticket_categories;

CREATE POLICY "ticket_categories_admins_manage"
  ON ticket_categories FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "tickets_view_own_or_admin" ON tickets;

CREATE POLICY "tickets_view_own_or_admin"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR
    created_by_employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "tickets_create" ON tickets;

CREATE POLICY "tickets_create"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tickets_update" ON tickets;

CREATE POLICY "tickets_update"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "ticket_comments_view" ON ticket_comments;

CREATE POLICY "ticket_comments_view"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM tickets WHERE 
        created_by_user_id = auth.uid()
        OR organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "ticket_comments_create" ON ticket_comments;

CREATE POLICY "ticket_comments_create"
  ON ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM tickets WHERE 
        organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================================
-- PART 31: RLS POLICIES - EXPENSES
-- ============================================================

DROP POLICY IF EXISTS "expense_categories_org_view" ON expense_categories;

CREATE POLICY "expense_categories_org_view"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "expense_categories_admins_manage" ON expense_categories;

CREATE POLICY "expense_categories_admins_manage"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "expenses_view_own" ON expenses;

CREATE POLICY "expenses_view_own"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "expenses_employees_create" ON expenses;

CREATE POLICY "expenses_employees_create"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "expenses_manage" ON expenses;

CREATE POLICY "expenses_manage"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 32: RLS POLICIES - TASKS
-- ============================================================

DROP POLICY IF EXISTS "tasks_view" ON tasks;

CREATE POLICY "tasks_view"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tasks_create" ON tasks;

CREATE POLICY "tasks_create"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tasks_update" ON tasks;

CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- PART 33: RLS POLICIES - GOALS & PERFORMANCE
-- ============================================================

DROP POLICY IF EXISTS "goal_types_org_view" ON goal_types;

CREATE POLICY "goal_types_org_view"
  ON goal_types FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "goal_types_admins_manage" ON goal_types;

CREATE POLICY "goal_types_admins_manage"
  ON goal_types FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "goals_view_own" ON goals;

CREATE POLICY "goals_view_own"
  ON goals FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "goals_manage" ON goals;

CREATE POLICY "goals_manage"
  ON goals FOR ALL
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "performance_reviews_view_own" ON performance_reviews;

CREATE POLICY "performance_reviews_view_own"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "performance_reviews_manage" ON performance_reviews;

CREATE POLICY "performance_reviews_manage"
  ON performance_reviews FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 34: RLS POLICIES - TRAININGS
-- ============================================================

DROP POLICY IF EXISTS "trainings_org_view" ON trainings;

CREATE POLICY "trainings_org_view"
  ON trainings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "trainings_admins_manage" ON trainings;

CREATE POLICY "trainings_admins_manage"
  ON trainings FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "training_enrollments_view" ON training_enrollments;

CREATE POLICY "training_enrollments_view"
  ON training_enrollments FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    training_id IN (
      SELECT id FROM trainings WHERE 
        organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "training_enrollments_manage" ON training_enrollments;

CREATE POLICY "training_enrollments_manage"
  ON training_enrollments FOR ALL
  TO authenticated
  USING (
    training_id IN (
      SELECT id FROM trainings WHERE 
        organization_id IN (
          SELECT organization_id FROM user_profiles 
          WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
        )
    )
  )
  WITH CHECK (
    training_id IN (
      SELECT id FROM trainings WHERE 
        organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================================
-- PART 35: RLS POLICIES - WORK REPORTS
-- ============================================================

DROP POLICY IF EXISTS "work_reports_view_own" ON work_reports;

CREATE POLICY "work_reports_view_own"
  ON work_reports FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "work_reports_employees_manage" ON work_reports;

CREATE POLICY "work_reports_employees_manage"
  ON work_reports FOR ALL
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  )
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 36: RLS POLICIES - DOCUMENTS
-- ============================================================

DROP POLICY IF EXISTS "employee_documents_view_own" ON employee_documents;

CREATE POLICY "employee_documents_view_own"
  ON employee_documents FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "employee_documents_manage" ON employee_documents;

CREATE POLICY "employee_documents_manage"
  ON employee_documents FOR ALL
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 37: RLS POLICIES - ERROR LOGS & IMPORT HISTORY
-- ============================================================

DROP POLICY IF EXISTS "error_logs_admins_view" ON error_logs;

CREATE POLICY "error_logs_admins_view"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "error_logs_anyone_insert" ON error_logs;

CREATE POLICY "error_logs_anyone_insert"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "import_history_org_view" ON import_history;

CREATE POLICY "import_history_org_view"
  ON import_history FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "import_history_admins_manage" ON import_history;

CREATE POLICY "import_history_admins_manage"
  ON import_history FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 41: GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON organizations TO authenticated;

GRANT ALL ON user_profiles TO authenticated;

GRANT ALL ON departments TO authenticated;

GRANT ALL ON designations TO authenticated;

GRANT ALL ON employees TO authenticated;

GRANT ALL ON leave_types TO authenticated;

GRANT ALL ON leave_balances TO authenticated;

GRANT ALL ON leave_applications TO authenticated;

GRANT ALL ON holidays TO authenticated;

GRANT ALL ON attendance TO authenticated;

GRANT ALL ON announcements TO authenticated;

GRANT ALL ON ticket_categories TO authenticated;

GRANT ALL ON tickets TO authenticated;

GRANT ALL ON ticket_comments TO authenticated;

GRANT ALL ON expense_categories TO authenticated;

GRANT ALL ON expenses TO authenticated;

GRANT ALL ON tasks TO authenticated;

GRANT ALL ON goal_types TO authenticated;

GRANT ALL ON goals TO authenticated;

GRANT ALL ON performance_reviews TO authenticated;

GRANT ALL ON trainings TO authenticated;

GRANT ALL ON training_enrollments TO authenticated;

GRANT ALL ON work_reports TO authenticated;

GRANT ALL ON employee_documents TO authenticated;

GRANT ALL ON error_logs TO authenticated;

GRANT ALL ON import_history TO authenticated;


-- ==========================================
-- FROM FILE: 20251215000002_india_payroll_schema.sql
-- ==========================================


-- ============================================================
-- PART 10: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE india_salary_components ENABLE ROW LEVEL SECURITY;

ALTER TABLE india_payroll_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE india_payroll_config ENABLE ROW LEVEL SECURITY;

ALTER TABLE india_monthly_attendance ENABLE ROW LEVEL SECURITY;

ALTER TABLE india_employee_loans ENABLE ROW LEVEL SECURITY;

ALTER TABLE india_employee_advances ENABLE ROW LEVEL SECURITY;

ALTER TABLE india_gratuity_calculations ENABLE ROW LEVEL SECURITY;

ALTER TABLE india_bank_transfer_files ENABLE ROW LEVEL SECURITY;

ALTER TABLE india_tds_declarations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 11: RLS POLICIES FOR india_salary_components
-- ============================================================

DROP POLICY IF EXISTS "india_salary_employees_view_own" ON india_salary_components;

CREATE POLICY "india_salary_employees_view_own"
  ON india_salary_components FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_salary_admins_manage" ON india_salary_components;

CREATE POLICY "india_salary_admins_manage"
  ON india_salary_components FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- ============================================================
-- PART 12: RLS POLICIES FOR india_payroll_records
-- ============================================================

DROP POLICY IF EXISTS "india_payroll_employees_view_own" ON india_payroll_records;

CREATE POLICY "india_payroll_employees_view_own"
  ON india_payroll_records FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_payroll_admins_manage" ON india_payroll_records;

CREATE POLICY "india_payroll_admins_manage"
  ON india_payroll_records FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- ============================================================
-- PART 13: RLS POLICIES FOR india_payroll_config
-- ============================================================

DROP POLICY IF EXISTS "india_config_org_members_manage" ON india_payroll_config;

CREATE POLICY "india_config_org_members_manage"
  ON india_payroll_config FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 14: RLS POLICIES FOR india_monthly_attendance
-- ============================================================

DROP POLICY IF EXISTS "india_attendance_employees_view_own" ON india_monthly_attendance;

CREATE POLICY "india_attendance_employees_view_own"
  ON india_monthly_attendance FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_attendance_admins_manage" ON india_monthly_attendance;

CREATE POLICY "india_attendance_admins_manage"
  ON india_monthly_attendance FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 15: RLS POLICIES FOR india_employee_loans
-- ============================================================

DROP POLICY IF EXISTS "india_loans_employees_view_own" ON india_employee_loans;

CREATE POLICY "india_loans_employees_view_own"
  ON india_employee_loans FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_loans_admins_manage" ON india_employee_loans;

CREATE POLICY "india_loans_admins_manage"
  ON india_employee_loans FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 16: RLS POLICIES FOR india_employee_advances
-- ============================================================

DROP POLICY IF EXISTS "india_advances_employees_view_own" ON india_employee_advances;

CREATE POLICY "india_advances_employees_view_own"
  ON india_employee_advances FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_advances_admins_manage" ON india_employee_advances;

CREATE POLICY "india_advances_admins_manage"
  ON india_employee_advances FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 17: RLS POLICIES FOR india_gratuity_calculations
-- ============================================================

DROP POLICY IF EXISTS "india_gratuity_employees_view_own" ON india_gratuity_calculations;

CREATE POLICY "india_gratuity_employees_view_own"
  ON india_gratuity_calculations FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_gratuity_admins_manage" ON india_gratuity_calculations;

CREATE POLICY "india_gratuity_admins_manage"
  ON india_gratuity_calculations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 18: RLS POLICIES FOR india_bank_transfer_files
-- ============================================================

DROP POLICY IF EXISTS "india_bank_files_admins_manage" ON india_bank_transfer_files;

CREATE POLICY "india_bank_files_admins_manage"
  ON india_bank_transfer_files FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 19: RLS POLICIES FOR india_tds_declarations
-- ============================================================

DROP POLICY IF EXISTS "india_tds_employees_manage_own" ON india_tds_declarations;

CREATE POLICY "india_tds_employees_manage_own"
  ON india_tds_declarations FOR ALL
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_tds_admins_manage" ON india_tds_declarations;

CREATE POLICY "india_tds_admins_manage"
  ON india_tds_declarations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 22: GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON india_salary_components TO authenticated;

GRANT ALL ON india_payroll_records TO authenticated;

GRANT ALL ON india_payroll_config TO authenticated;

GRANT ALL ON india_monthly_attendance TO authenticated;

GRANT ALL ON india_employee_loans TO authenticated;

GRANT ALL ON india_employee_advances TO authenticated;

GRANT ALL ON india_gratuity_calculations TO authenticated;

GRANT ALL ON india_bank_transfer_files TO authenticated;

GRANT ALL ON india_tds_declarations TO authenticated;


-- ==========================================
-- FROM FILE: 20251215000003_create_database_functions.sql
-- ==========================================


-- Enable RLS
ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "employee_invitations_org_manage" ON employee_invitations;

CREATE POLICY "employee_invitations_org_manage"
  ON employee_invitations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Allow public read for verification (by invitation code only)
DROP POLICY IF EXISTS "employee_invitations_public_verify" ON employee_invitations;

CREATE POLICY "employee_invitations_public_verify"
  ON employee_invitations FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON employee_invitations TO authenticated;

-- ============================================================
-- GRANT EXECUTE PERMISSIONS ON FUNCTIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.create_new_organization_flow TO authenticated;

GRANT EXECUTE ON FUNCTION public.link_employee_to_user TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_organization TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_employee_code TO authenticated;


-- ==========================================
-- FROM FILE: 20251216000001_fix_rls_and_logging.sql
-- ==========================================


-- ============================================================
-- FIX RLS POLICIES AND ADD LOGGING FUNCTION
-- Fixes infinite recursion in user_profiles and adds log_error RPC
-- ============================================================

-- ============================================================
-- PART 1: FIX INFINITE RECURSION IN USER_PROFILES RLS POLICY
-- ============================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "users_can_view_own_profile" ON user_profiles;

-- Create a simpler policy that doesn't cause recursion
-- Users can view their own profile
CREATE POLICY "users_can_view_own_profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create a separate policy for viewing other profiles in the same organization
-- This uses a SECURITY DEFINER function to avoid recursion
DROP POLICY IF EXISTS "users_can_view_org_profiles" ON user_profiles;

CREATE POLICY "users_can_view_org_profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
  );

-- ============================================================
-- PART 2: FIX ORGANIZATIONS RLS POLICY
-- ============================================================

-- Drop and recreate the organizations view policy to avoid recursion
DROP POLICY IF EXISTS "org_users_can_view_own" ON organizations;

CREATE POLICY "org_users_can_view_own"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id = get_user_org_id_safe()
    OR
    get_user_role_safe() = 'super_admin'
  );

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_error TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_org_id_safe TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_role_safe TO authenticated;

-- ============================================================
-- PART 6: UPDATE OTHER RLS POLICIES TO USE HELPER FUNCTIONS
-- ============================================================

-- Update organizations policies
DROP POLICY IF EXISTS "org_admins_can_update" ON organizations;

CREATE POLICY "org_admins_can_update"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'super_admin')
  );

-- Update employees policies
DROP POLICY IF EXISTS "employees_org_members_can_view" ON employees;

CREATE POLICY "employees_org_members_can_view"
  ON employees FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "employees_admins_can_manage" ON employees;

CREATE POLICY "employees_admins_can_manage"
  ON employees FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update departments policies
DROP POLICY IF EXISTS "departments_org_members_view" ON departments;

CREATE POLICY "departments_org_members_view"
  ON departments FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "departments_admins_manage" ON departments;

CREATE POLICY "departments_admins_manage"
  ON departments FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update designations policies
DROP POLICY IF EXISTS "designations_org_members_view" ON designations;

CREATE POLICY "designations_org_members_view"
  ON designations FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "designations_admins_manage" ON designations;

CREATE POLICY "designations_admins_manage"
  ON designations FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update leave_types policies
DROP POLICY IF EXISTS "leave_types_org_view" ON leave_types;

CREATE POLICY "leave_types_org_view"
  ON leave_types FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "leave_types_admins_manage" ON leave_types;

CREATE POLICY "leave_types_admins_manage"
  ON leave_types FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update leave_balances policies
DROP POLICY IF EXISTS "leave_balances_org_view" ON leave_balances;

CREATE POLICY "leave_balances_org_view"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
  );

DROP POLICY IF EXISTS "leave_balances_admins_manage" ON leave_balances;

CREATE POLICY "leave_balances_admins_manage"
  ON leave_balances FOR ALL
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update leave_applications policies
DROP POLICY IF EXISTS "leave_applications_employees_view_own" ON leave_applications;

CREATE POLICY "leave_applications_employees_view_own"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
  );

DROP POLICY IF EXISTS "leave_applications_employees_create" ON leave_applications;

CREATE POLICY "leave_applications_employees_create"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
  );

DROP POLICY IF EXISTS "leave_applications_admins_manage" ON leave_applications;

CREATE POLICY "leave_applications_admins_manage"
  ON leave_applications FOR ALL
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'manager', 'super_admin')
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'manager', 'super_admin')
  );

-- Update holidays policies
DROP POLICY IF EXISTS "holidays_org_view" ON holidays;

CREATE POLICY "holidays_org_view"
  ON holidays FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "holidays_admins_manage" ON holidays;

CREATE POLICY "holidays_admins_manage"
  ON holidays FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update attendance policies
DROP POLICY IF EXISTS "attendance_org_view" ON attendance;

CREATE POLICY "attendance_org_view"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
  );

DROP POLICY IF EXISTS "attendance_admins_manage" ON attendance;

CREATE POLICY "attendance_admins_manage"
  ON attendance FOR ALL
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE organization_id = get_user_org_id_safe()
    )
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );

-- Update announcements policies
DROP POLICY IF EXISTS "announcements_org_view" ON announcements;

CREATE POLICY "announcements_org_view"
  ON announcements FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id_safe());

DROP POLICY IF EXISTS "announcements_admins_manage" ON announcements;

CREATE POLICY "announcements_admins_manage"
  ON announcements FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id_safe()
    AND get_user_role_safe() IN ('admin', 'hr_manager', 'super_admin')
  );


-- ==========================================
-- FROM FILE: 20251218000001_fix_leave_applications_rls.sql
-- ==========================================


-- Fix RLS policy for leave_applications to allow employees to create their own applications
-- The issue: employees need to provide organization_id, but the policy should auto-populate it

DROP POLICY IF EXISTS "leave_applications_employees_create" ON leave_applications;

CREATE POLICY "leave_applications_employees_create"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if the employee_id matches the user's employee_id
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    AND
    -- AND the organization_id matches the user's organization
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Also ensure admins can still create applications
DROP POLICY IF EXISTS "leave_applications_manage" ON leave_applications;

CREATE POLICY "leave_applications_manage"
  ON leave_applications FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );


-- ==========================================
-- FROM FILE: 20251219000001_create_attendance_records_view.sql
-- ==========================================



-- ==========================================
-- FROM FILE: 20251219000002_create_payroll_settings.sql
-- ==========================================


-- Enable RLS
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "payroll_settings_view_org"
  ON public.payroll_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "payroll_settings_manage_admin"
  ON public.payroll_settings FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );


-- ==========================================
-- FROM FILE: 20251219000003_add_code_generation_functions.sql
-- ==========================================



-- ==========================================
-- FROM FILE: 20251219000004_update_employee_invitations_schema.sql
-- ==========================================



-- ==========================================
-- FROM FILE: 20251230000001_add_user_id_to_employees.sql
-- ==========================================



-- ==========================================
-- FROM FILE: 20251230000002_create_organization_admins.sql
-- ==========================================


-- Enable RLS
ALTER TABLE organization_admins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view their own admin profile" 
  ON organization_admins FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update their own admin profile" 
  ON organization_admins FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert their own admin profile" 
  ON organization_admins FOR INSERT 
  WITH CHECK (auth.uid() = user_id);


-- ==========================================
-- FROM FILE: 20251230000003_claim_employee_profile.sql
-- ==========================================


-- Grant access
GRANT EXECUTE ON FUNCTION public.claim_employee_profile TO authenticated;


-- ==========================================
-- FROM FILE: 20251230000004_fix_employee_self_view_rls.sql
-- ==========================================


-- Allow users to view their own employee record directly via user_id
CREATE POLICY "users_can_view_own_employee_profile"
ON employees FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


-- ==========================================
-- FROM FILE: 20251230000005_add_banking_columns.sql
-- ==========================================



-- ==========================================
-- FROM FILE: add_early_checkout_reason.sql
-- ==========================================



-- ==========================================
-- FROM FILE: add_goals_department_fk.sql
-- ==========================================



-- ==========================================
-- FROM FILE: add_office_location_fields.sql
-- ==========================================



-- ==========================================
-- FROM FILE: add_task_submission_fields.sql
-- ==========================================



-- ==========================================
-- FROM FILE: add_tasks_columns.sql
-- ==========================================



-- ==========================================
-- FROM FILE: create_goal_details_tables.sql
-- ==========================================


-- Enable RLS
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.goal_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_milestones
CREATE POLICY "Enable read access for authenticated users" ON public.goal_milestones
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.goal_milestones
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.goal_milestones
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.goal_milestones
    FOR DELETE TO authenticated USING (true);

-- RLS Policies for goal_comments
CREATE POLICY "Enable read access for authenticated users" ON public.goal_comments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.goal_comments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.goal_comments
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.goal_comments
    FOR DELETE TO authenticated USING (true);


-- ==========================================
-- FROM FILE: fix_goals_completion_date.sql
-- ==========================================



-- ==========================================
-- FROM FILE: fix_goals_progress.sql
-- ==========================================



-- ==========================================
-- FROM FILE: fix_goals_schema.sql
-- ==========================================



-- ==========================================
-- FROM FILE: fix_notifications_schema.sql
-- ==========================================


-- Enable RLS
ALTER TABLE public.employee_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.employee_notifications;

CREATE POLICY "Users can view their own notifications"
    ON public.employee_notifications
    FOR SELECT
    USING (
        employee_id IN (
            SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.employee_notifications;

CREATE POLICY "Users can update their own notifications"
    ON public.employee_notifications
    FOR UPDATE
    USING (
        employee_id IN (
            SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );


-- ==========================================
-- FROM FILE: fix_performance_reviews_schema.sql
-- ==========================================



-- ==========================================
-- FROM FILE: update_tasks_status_check.sql
-- ==========================================
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
