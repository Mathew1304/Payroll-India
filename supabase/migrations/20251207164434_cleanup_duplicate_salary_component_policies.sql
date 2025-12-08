/*
  # Clean Up Duplicate Salary Component Policies
  
  1. Changes
    - Remove old/duplicate policies that may conflict
    - Keep only the new comprehensive policies
  
  2. Tables Affected
    - qatar_salary_components
    - saudi_salary_components
*/

-- Remove old duplicate policies for Qatar
DROP POLICY IF EXISTS "Org members can manage org employee salaries" ON qatar_salary_components;
DROP POLICY IF EXISTS "Employees can view own qatar salary" ON qatar_salary_components;

-- Remove old duplicate policies for Saudi
DROP POLICY IF EXISTS "Org members can manage org employee salaries" ON saudi_salary_components;
DROP POLICY IF EXISTS "Employees can view own saudi salary" ON saudi_salary_components;