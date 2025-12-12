-- Migration: Auto-update leave balances on approval
-- Description: Trigger to update leave_balances when leave application is approved
-- Author: System
-- Date: 2025-12-12

-- Function to update leave balance when application is approved
CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Update the leave balance (available_leaves is auto-calculated)
    UPDATE leave_balances
    SET used_leaves = used_leaves + NEW.total_days
    WHERE 
      employee_id = NEW.employee_id 
      AND leave_type_id = NEW.leave_type_id
      AND year = EXTRACT(YEAR FROM NEW.from_date);
  END IF;
  
  -- If status changed from approved to something else, reverse the update
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE leave_balances
    SET used_leaves = used_leaves - NEW.total_days
    WHERE 
      employee_id = NEW.employee_id 
      AND leave_type_id = NEW.leave_type_id
      AND year = EXTRACT(YEAR FROM NEW.from_date);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_leave_balance ON leave_applications;
CREATE TRIGGER trigger_update_leave_balance
  AFTER UPDATE ON leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_balance_on_approval();

COMMENT ON FUNCTION update_leave_balance_on_approval() IS 'Automatically updates leave balances when leave application is approved or unapproved';
