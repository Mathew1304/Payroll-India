/*
  # Fix Employees RLS - Remove Overly Permissive Policy

  1. Changes
    - Drop the "Allow authenticated access" policy which has `qual: true` and allows all users to see all employees
    - This policy is too permissive and may cause conflicts with organization-based policies
    - Keep the proper scoped policies:
      * Users can view organization employees (SELECT within their org)
      * HR and Admin can manage (INSERT/UPDATE/DELETE within their org)
      * Employees can view own record (SELECT their own data)
  
  2. Security
    - Removes overly broad access policy
    - Maintains proper organization-scoped access control
*/

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated access" ON employees;
