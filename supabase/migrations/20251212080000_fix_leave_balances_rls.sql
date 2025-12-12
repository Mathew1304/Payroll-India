-- Fix leave_balances RLS policies to use organization_members instead of user_profiles
-- This allows employees to view their leave balances correctly

-- Drop existing policies
DROP POLICY IF EXISTS "Employees can view own leave balance" ON leave_balances;
DROP POLICY IF EXISTS "Managers can view team leave balance" ON leave_balances;
DROP POLICY IF EXISTS "HR and Admins can view all leave balances" ON leave_balances;
DROP POLICY IF EXISTS "HR and Admins can manage leave balances" ON leave_balances;

-- Recreate policies with organization_members

-- Employees can view their own leave balances
CREATE POLICY "Employees can view own leave balance"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
  );

-- Managers can view team member leave balances
CREATE POLICY "Managers can view team leave balance"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN organization_members om ON om.employee_id = e.id
      WHERE om.user_id = auth.uid()
        AND om.role = 'manager'
        AND leave_balances.employee_id IN (
          SELECT id FROM employees WHERE reporting_manager_id = e.id
        )
    )
  );

-- HR and Admins can view all leave balances in their organization
CREATE POLICY "HR and Admins can view all leave balances"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN employees e ON e.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'super_admin', 'hr')
        AND e.id = leave_balances.employee_id
    )
  );

-- HR and Admins can manage leave balances in their organization
CREATE POLICY "HR and Admins can manage leave balances"
  ON leave_balances FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN employees e ON e.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'super_admin', 'hr')
        AND e.id = leave_balances.employee_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN employees e ON e.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'super_admin', 'hr')
        AND e.id = leave_balances.employee_id
    )
  );
