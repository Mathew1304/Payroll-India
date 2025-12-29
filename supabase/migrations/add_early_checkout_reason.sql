-- Add early_checkout_reason column to attendance_records table
-- This column stores the reason when employees check out before completing 8 hours

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS early_checkout_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN attendance_records.early_checkout_reason IS 'Reason provided by employee when checking out before completing 8 hours of work';
