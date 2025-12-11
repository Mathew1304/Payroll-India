-- Fix Qatar Payroll Columns to match Frontend
-- 1. Rename payment_reference to bank_reference_number
-- 2. Add payment_status column

DO $$ 
BEGIN
  -- Rename payment_reference to bank_reference_number if it exists and bank_reference_number does not
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'payment_reference') THEN
    ALTER TABLE qatar_payroll_records RENAME COLUMN payment_reference TO bank_reference_number;
  END IF;

  -- Add payment_status if it does not exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'payment_status') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;

  -- Add check constraint for payment_status if desired, or leave as text for flexibility
  -- For now, we'll just index it
END $$;

-- Create index for the new/renamed columns
CREATE INDEX IF NOT EXISTS idx_qatar_payroll_records_payment_status ON qatar_payroll_records(payment_status);
-- Index for bank_reference_number might be useful for lookups
CREATE INDEX IF NOT EXISTS idx_qatar_payroll_records_bank_ref ON qatar_payroll_records(bank_reference_number);
