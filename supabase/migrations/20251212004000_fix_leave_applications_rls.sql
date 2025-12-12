-- Migration: Fix Leave Applications RLS Policies
-- Description: Add RLS policy so employees can view their own leave applications
-- Author: System
-- Date: 2025-12-12

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Employees view own applications" ON leave_applications;
DROP POLICY IF EXISTS "Employees create own applications" ON leave_applications;

-- Employees can view their own leave applications
CREATE POLICY "Employees view own applications"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Employees can create their own leave applications  
CREATE POLICY "Employees create own applications"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
