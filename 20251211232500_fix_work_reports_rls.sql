-- Fix work_reports RLS policies - Version 2
-- This handles cases where employee_id might be NULL in organization_members

-- Drop existing policies
DROP POLICY IF EXISTS "Employees can view own reports" ON work_reports;
DROP POLICY IF EXISTS "Managers can view team reports" ON work_reports;
DROP POLICY IF EXISTS "Employees can create own reports" ON work_reports;
DROP POLICY IF EXISTS "Employees can update own reports" ON work_reports;
DROP POLICY IF EXISTS "Managers can review reports" ON work_reports;
DROP POLICY IF EXISTS "Employees can delete own draft reports" ON work_reports;

-- Recreate policies with better handling

-- Employees can view their own reports
CREATE POLICY "Employees can view own reports"
  ON work_reports FOR SELECT
  TO authenticated
  USING (
    employee_id = (
      SELECT employee_id FROM organization_members 
      WHERE user_id = auth.uid() AND employee_id IS NOT NULL
      LIMIT 1
    )
  );

-- Managers and HR can view reports of employees in their organization
CREATE POLICY "Managers can view team reports"
  ON work_reports FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Employees can create their own reports
-- This policy checks that the employee_id being inserted matches the user's employee_id
CREATE POLICY "Employees can create own reports"
  ON work_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (
      SELECT employee_id FROM organization_members 
      WHERE user_id = auth.uid() AND employee_id IS NOT NULL
      LIMIT 1
    )
    AND
    organization_id = (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Employees can update their own reports
CREATE POLICY "Employees can update own reports"
  ON work_reports FOR UPDATE
  TO authenticated
  USING (
    employee_id = (
      SELECT employee_id FROM organization_members 
      WHERE user_id = auth.uid() AND employee_id IS NOT NULL
      LIMIT 1
    )
  )
  WITH CHECK (
    employee_id = (
      SELECT employee_id FROM organization_members 
      WHERE user_id = auth.uid() AND employee_id IS NOT NULL
      LIMIT 1
    )
  );

-- Managers can update reports (for review)
CREATE POLICY "Managers can review reports"
  ON work_reports FOR UPDATE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Employees can delete their own draft reports
CREATE POLICY "Employees can delete own draft reports"
  ON work_reports FOR DELETE
  TO authenticated
  USING (
    employee_id = (
      SELECT employee_id FROM organization_members 
      WHERE user_id = auth.uid() AND employee_id IS NOT NULL
      LIMIT 1
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
        employee_id = (
          SELECT employee_id FROM organization_members 
          WHERE user_id = auth.uid() AND employee_id IS NOT NULL
          LIMIT 1
        )
        OR
        organization_id = (
          SELECT organization_id FROM organization_members 
          WHERE user_id = auth.uid()
          LIMIT 1
        )
    )
  );

CREATE POLICY "Users can create comments"
  ON work_report_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    work_report_id IN (
      SELECT id FROM work_reports WHERE
        employee_id = (
          SELECT employee_id FROM organization_members 
          WHERE user_id = auth.uid() AND employee_id IS NOT NULL
          LIMIT 1
        )
        OR
        organization_id = (
          SELECT organization_id FROM organization_members 
          WHERE user_id = auth.uid()
          LIMIT 1
        )
    )
  );
