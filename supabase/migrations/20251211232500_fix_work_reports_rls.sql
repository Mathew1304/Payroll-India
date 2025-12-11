-- Fix work_reports RLS policies to work with organization_members table
-- This migration updates the RLS policies to use organization_members instead of user_profiles

-- Drop existing policies
DROP POLICY IF EXISTS "Employees can view own reports" ON work_reports;
DROP POLICY IF EXISTS "Managers can view team reports" ON work_reports;
DROP POLICY IF EXISTS "Employees can create own reports" ON work_reports;
DROP POLICY IF EXISTS "Employees can update own reports" ON work_reports;
DROP POLICY IF EXISTS "Managers can review reports" ON work_reports;
DROP POLICY IF EXISTS "Employees can delete own draft reports" ON work_reports;

-- Recreate policies using organization_members table

-- Employees can view their own reports
CREATE POLICY "Employees can view own reports"
  ON work_reports FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Managers and HR can view reports of employees in their organization
CREATE POLICY "Managers can view team reports"
  ON work_reports FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Employees can create their own reports
CREATE POLICY "Employees can create own reports"
  ON work_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM organization_members 
      WHERE user_id = auth.uid() AND employee_id IS NOT NULL
    )
  );

-- Employees can update their own reports (if draft or submitted)
CREATE POLICY "Employees can update own reports"
  ON work_reports FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Managers can update reports (for review)
CREATE POLICY "Managers can review reports"
  ON work_reports FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Employees can delete their own draft reports
CREATE POLICY "Employees can delete own draft reports"
  ON work_reports FOR DELETE
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND status = 'draft'
  );

-- Update work_report_comments policies as well
DROP POLICY IF EXISTS "Users can view comments on accessible reports" ON work_report_comments;
DROP POLICY IF EXISTS "Users can create comments" ON work_report_comments;

CREATE POLICY "Users can view comments on accessible reports"
  ON work_report_comments FOR SELECT
  TO authenticated
  USING (
    work_report_id IN (
      SELECT id FROM work_reports WHERE
        employee_id IN (
          SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
        )
        OR
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can create comments"
  ON work_report_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    work_report_id IN (
      SELECT id FROM work_reports WHERE
        employee_id IN (
          SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
        )
        OR
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    )
  );
