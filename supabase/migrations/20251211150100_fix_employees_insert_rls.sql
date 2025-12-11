-- Fix RLS policy for employees table to allow admins to insert without existing employee record
-- This resolves the chicken-and-egg problem where admins need to create their own profile

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "HR and Admins can create employees" ON employees;

-- Create new INSERT policy checking organization_members directly
CREATE POLICY "HR and Admins can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if user is an admin/hr in the organization being inserted into
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = employees.organization_id
      AND user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'hr')
    )
  );
