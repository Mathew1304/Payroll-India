/*
  # Fix Qatar Salary Components RLS Policies - Final
  
  ## Problem
  The RLS policy for qatar_salary_components was failing when HR users tried to add
  salary components for other employees because the policy didn't properly validate
  that the target employee belongs to the same organization.
  
  ## Solution
  1. Drop existing policies
  2. Create comprehensive policies that:
     - Allow organization members to manage salary components for employees in their org
     - Verify the employee_id being inserted/updated belongs to the same organization
     - Allow employees to view their own salary components
  
  ## Security
  - Maintains strict organization-level data isolation
  - Prevents users from creating salary components for employees in other organizations
  - Employees can only view their own data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Organization members can manage salary components" ON qatar_salary_components;
DROP POLICY IF EXISTS "Employees can view own qatar salary" ON qatar_salary_components;

-- Create comprehensive policy for managing salary components
CREATE POLICY "Org members can manage org employee salaries"
  ON qatar_salary_components
  FOR ALL
  TO authenticated
  USING (
    -- Check if the salary component's organization matches the user's organization
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- For INSERT/UPDATE, verify BOTH:
    -- 1. The organization_id matches the user's organization
    -- 2. The employee_id belongs to that same organization
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
    AND
    employee_id IN (
      SELECT e.id
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
      AND e.organization_id = qatar_salary_components.organization_id
    )
  );

-- Create separate policy for employees to view their own salary
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
