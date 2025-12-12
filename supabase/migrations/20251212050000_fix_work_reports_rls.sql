-- Fix Work Reports RLS Policies to use organization_members instead of user_profiles
-- This ensures employees can create and view their reports, and admins can view all reports

-- Drop existing policies
DROP POLICY IF EXISTS "Employees can view own reports" ON work_reports;
DROP POLICY IF EXISTS "Managers can view team reports" ON work_reports;
DROP POLICY IF EXISTS "Employees can create own reports" ON work_reports;
DROP POLICY IF EXISTS "Employees can update own reports" ON work_reports;
DROP POLICY IF EXISTS "Managers can review reports" ON work_reports;
DROP POLICY IF EXISTS "Employees can delete own draft reports" ON work_reports;

-- Drop comment policies
DROP POLICY IF EXISTS "Users can view comments on accessible reports" ON work_report_comments;
DROP POLICY IF EXISTS "Users can create comments" ON work_report_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON work_report_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON work_report_comments;

-- Recreate work_reports policies using organization_members

-- Employees can view their own reports
CREATE POLICY "Employees can view own reports"
  ON work_reports FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
  );

-- Admins, managers, HR can view all reports in their organization
CREATE POLICY "Admins can view all reports"
  ON work_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = work_reports.organization_id
      AND role IN ('admin', 'super_admin', 'manager', 'hr')
    )
  );

-- Employees can create their own reports
CREATE POLICY "Employees can create own reports"
  ON work_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    AND organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
  );

-- Employees can update their own reports
CREATE POLICY "Employees can update own reports"
  ON work_reports FOR UPDATE
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
  );

-- Admins, managers, HR can update any report in their organization (for review)
CREATE POLICY "Admins can update reports"
  ON work_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = work_reports.organization_id
      AND role IN ('admin', 'super_admin', 'manager', 'hr')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = work_reports.organization_id
      AND role IN ('admin', 'super_admin', 'manager', 'hr')
    )
  );

-- Employees can delete their own draft reports
CREATE POLICY "Employees can delete own draft reports"
  ON work_reports FOR DELETE
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    AND status = 'draft'
  );

-- Recreate work_report_comments policies

-- Users can view comments on reports they can access
CREATE POLICY "Users can view comments on accessible reports"
  ON work_report_comments FOR SELECT
  TO authenticated
  USING (
    work_report_id IN (
      SELECT id FROM work_reports WHERE
        employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        OR
        EXISTS (
          SELECT 1 FROM organization_members 
          WHERE user_id = auth.uid() 
          AND organization_id = work_reports.organization_id
          AND role IN ('admin', 'super_admin', 'manager', 'hr')
        )
    )
  );

-- Users can create comments on reports they can access
CREATE POLICY "Users can create comments"
  ON work_report_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    work_report_id IN (
      SELECT id FROM work_reports WHERE
        employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        OR
        EXISTS (
          SELECT 1 FROM organization_members 
          WHERE user_id = auth.uid() 
          AND organization_id = work_reports.organization_id
          AND role IN ('admin', 'super_admin', 'manager', 'hr')
        )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON work_report_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON work_report_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
