/*
  # Fix Salary Components RLS Policies
  
  1. Changes
    - Drop existing restrictive RLS policies for qatar_salary_components and saudi_salary_components
    - Create new permissive policies that allow organization members to manage salary components
    - Allow users to insert/update salary components for employees in their organization
  
  2. Security
    - Users can only manage salary components within their organization
    - Maintains data isolation between organizations
    - Employees can view their own salary components
*/

-- Qatar Salary Components
DROP POLICY IF EXISTS "HR can manage salary components" ON qatar_salary_components;
DROP POLICY IF EXISTS "Employees can view own salary components" ON qatar_salary_components;

-- Create new policies for Qatar salary components
CREATE POLICY "Organization members can manage salary components"
  ON qatar_salary_components
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own qatar salary"
  ON qatar_salary_components
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Saudi Salary Components
DROP POLICY IF EXISTS "HR can manage salary components" ON saudi_salary_components;
DROP POLICY IF EXISTS "Employees can view own salary components" ON saudi_salary_components;

-- Create new policies for Saudi salary components
CREATE POLICY "Organization members can manage salary components"
  ON saudi_salary_components
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own saudi salary"
  ON saudi_salary_components
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );
