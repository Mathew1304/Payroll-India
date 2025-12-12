-- Migration: Automated Leave Balance Functions
-- Description: Adds automation functions and triggers for leave balances
-- Author: System
-- Date: 2025-12-12

-- Function to auto-initialize leave balances for new employees
CREATE OR REPLACE FUNCTION auto_initialize_employee_leave_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_leave_type RECORD;
  v_quota numeric(5,2);
  v_current_year integer := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
BEGIN
  IF NEW.is_active = true THEN
    FOR v_leave_type IN 
      SELECT id FROM leave_types 
      WHERE organization_id = NEW.organization_id AND is_active = true
    LOOP
      SELECT COALESCE(yearly_quota, 12) INTO v_quota
      FROM leave_policies
      WHERE leave_type_id = v_leave_type.id
        AND employment_type = NEW.employment_type
        AND is_active = true
      LIMIT 1;
      
      v_quota := COALESCE(v_quota, 12);
      
      INSERT INTO leave_balances (
        employee_id, leave_type_id, year, total_quota, used_leaves, pending_leaves
      )
      VALUES (NEW.id, v_leave_type.id, v_current_year, v_quota, 0, 0)
      ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-initialize balances
DROP TRIGGER IF EXISTS trigger_auto_initialize_leave_balances ON employees;
CREATE TRIGGER trigger_auto_initialize_leave_balances
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION auto_initialize_employee_leave_balances();

-- Function to seed balances for existing employees
CREATE OR REPLACE FUNCTION seed_existing_employee_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee RECORD;
  v_leave_type RECORD;
  v_quota numeric(5,2);
  v_current_year integer := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
BEGIN
  FOR v_employee IN 
    SELECT id, organization_id, employment_type FROM employees WHERE is_active = true
  LOOP
    FOR v_leave_type IN 
      SELECT id FROM leave_types WHERE organization_id = v_employee.organization_id AND is_active = true
    LOOP
      SELECT COALESCE(yearly_quota, 12) INTO v_quota
      FROM leave_policies
      WHERE leave_type_id = v_leave_type.id
        AND employment_type = v_employee.employment_type
        AND is_active = true
      LIMIT 1;
      
      v_quota := COALESCE(v_quota, 12);
      
      INSERT INTO leave_balances (
        employee_id, leave_type_id, year, total_quota, used_leaves, pending_leaves
      )
      VALUES (v_employee.id, v_leave_type.id, v_current_year, v_quota, 0, 0)
      ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- Seed balances
SELECT seed_existing_employee_balances();
